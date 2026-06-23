const { query, withTransaction } = require("../db/postgres");
const attributeRepository = require("./attributeRepository");
const { loadRelatedFittingsForHandle } = require("../domain/fittingsRelated");
const {
  INTERIOR_DOORS_CATEGORY_SLUG,
  computeInteriorKitPrice,
  loadInteriorKitParts,
} = require("../domain/interiorKitPrice");
const { normalizeProductBadges, resolveProductBadges, syncSaleBadge } = require("../domain/productBadges");
const {
  applySaleRulesOn,
  applySaleRulesOff,
  readSaleBasePrice,
  withSaleBasePrice,
} = require("../domain/salePricing");
const saleSettingsRepository = require("./saleSettingsRepository");
const { allocateUniqueSlug } = require("../domain/productSlug");
const {
  ensureProductBadgesColumn,
  ensureProductSaleColumns,
  ensureProductSlugColumn,
  ensureLatinProductSlugs,
  ensureSeoColumns,
} = require("../db/schemaPatches");

/**
 * Репозиторий товаров на новой схеме (JSONB attrs + единое дерево categories).
 * Публичная поверхность совместима со старой: те же функции, те же поля в ответе.
 *
 * Карточка товара = «модель + цвет» (и при необходимости «модель + стекло»).
 * Размер/открывание лежат в product_variants.
 * Соседи по цвету и по стеклу группируются через products.model_key + name
 * (атрибуты product-scope `color` и `glass`).
 */

/** Популярность: `attrs.sort_order`, пусто/нечисло → 0; больше — выше в списке. */
const displayOrderExpr = `(CASE
  WHEN NULLIF(BTRIM(COALESCE(p.attrs->>'sort_order', '')), '') IS NULL THEN 0
  WHEN BTRIM(COALESCE(p.attrs->>'sort_order', '')) ~ '^-?[0-9]+$'
    THEN BTRIM(COALESCE(p.attrs->>'sort_order', ''))::bigint
  ELSE 0
END)`;

const stableProductIdSort = "p.id ASC";

const popularitySortSql = `${displayOrderExpr} DESC, p.name ASC, ${stableProductIdSort}`;

const sortMap = {
  popularity: popularitySortSql,
  "alphabet-asc": `p.name ASC, ${stableProductIdSort}`,
  "alphabet-desc": `p.name DESC, ${stableProductIdSort}`,
  "price-asc": `p.price ASC, ${stableProductIdSort}`,
  "price-desc": `p.price DESC, ${stableProductIdSort}`,
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

/**
 * Парсит значение `attrs.pogonazh_id` в массив уникальных непустых ID. Поддерживает:
 *  - одиночную строку («826»);
 *  - строку со списком, разделённым `,`, `;` или пробелом («826, 871»);
 *  - массив (если когда-нибудь положат `["826","871"]`).
 *
 * Используется и при чтении (поиск аксессуаров), и при CSV-апсерте (слияние
 * значений у одного SKU из нескольких строк CSV).
 */
const parsePogonazhIdList = (raw) => {
  if (raw === undefined || raw === null) return [];
  const tokens = [];
  const visit = (value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    String(value)
      .split(/[\s,;]+/)
      .forEach((piece) => {
        const trimmed = piece.trim();
        if (trimmed) tokens.push(trimmed);
      });
  };
  visit(raw);
  return Array.from(new Set(tokens));
};

const ensureAttrs = (raw) => {
  if (isPlainObject(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (isPlainObject(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return {};
};

const parseImageUrlsJson = (raw) => {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(isStorefrontImageUrl);
};

/** Заглушка в БД вместо реального фото (см. scripts/clear-placeholder-image-x.js). */
const isStorefrontImageUrl = (url) => {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  return raw.toUpperCase() !== "X";
};

/** SQL-фильтр валидного URL картинки для витрины (алиас таблицы — image_url без префикса). */
const validStorefrontImageUrlSql = `
  NULLIF(BTRIM(image_url), '') IS NOT NULL
  AND upper(trim(image_url)) <> 'X'
`;

const productImageSubquery = `
  COALESCE(
    (
      SELECT image_url FROM product_images
      WHERE product_id = p.id AND ${validStorefrontImageUrlSql}
      ORDER BY sort_order, id
      LIMIT 1
    ),
    (
      SELECT image_url FROM product_variants
      WHERE product_id = p.id AND is_active = TRUE AND ${validStorefrontImageUrlSql}
      ORDER BY sort_order, id
      LIMIT 1
    ),
    ''
  )
`;

const hoverImageSubquery = `
  (
    SELECT image_url FROM product_images
    WHERE product_id = p.id AND ${validStorefrontImageUrlSql}
    ORDER BY sort_order, id
    OFFSET 1
    LIMIT 1
  )
`;

/** Публичная витрина: без хотя бы одной реальной картинки карточка в списках не показывается. */
const storefrontListedProductPredicatesSql = `
  (
    EXISTS (
      SELECT 1 FROM product_images pi
      WHERE pi.product_id = p.id
        AND NULLIF(BTRIM(pi.image_url), '') IS NOT NULL
        AND upper(trim(pi.image_url)) <> 'X'
    )
    OR EXISTS (
      SELECT 1 FROM product_variants pv
      WHERE pv.product_id = p.id
        AND pv.is_active = TRUE
        AND NULLIF(BTRIM(pv.image_url), '') IS NOT NULL
        AND upper(trim(pv.image_url)) <> 'X'
    )
  )
`;

const splitTaxonomy = (row) => {
  // row.parentName/parentSlug — это корень, row.categoryName/categorySlug — лист (потенциально подкатегория)
  if (row.parentSlug) {
    return {
      category: row.parentName,
      categorySlug: row.parentSlug,
      subcategory: row.categoryName,
      subcategorySlug: row.categorySlug,
    };
  }
  return {
    category: row.categoryName,
    categorySlug: row.categorySlug,
    subcategory: null,
    subcategorySlug: null,
  };
};

/** Соединение product → category → parent category. */
const taxonomyJoin = `
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
`;

const taxonomySelect = `
  c.name AS "categoryName",
  c.slug AS "categorySlug",
  parent.name AS "parentName",
  parent.slug AS "parentSlug"
`;

const parseSearchTerms = (search) =>
  String(search || "")
    .trim()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

/**
 * Поиск по каталогу: каждое слово из запроса должно встретиться хотя бы в одном
 * из полей — name, sku или любом текстовом значении attrs (цвет, оттенок, коллекция…).
 * Так «браво-22 snow» находит карточку с name «Браво-22» и оттенком «Snow Art».
 */
const buildCatalogSearchSql = (search, addParam) => {
  const terms = parseSearchTerms(search);
  if (terms.length === 0) return null;

  const termClauses = terms.map((term) => {
    const pattern = addParam(`%${term}%`);
    return `(
      p.name ILIKE ${pattern}
      OR p.sku ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM jsonb_each_text(p.attrs) AS search_attr(key, value)
        WHERE search_attr.value ILIKE ${pattern}
      )
    )`;
  });

  return `(${termClauses.join(" AND ")})`;
};

const buildScopeWhere = (filters, addParam) => {
  const where = ["p.is_active = TRUE"];
  const scopeCats = Array.isArray(filters.scopeCategories) ? filters.scopeCategories : [];
  const scopeSubs = Array.isArray(filters.scopeSubcategories) ? filters.scopeSubcategories : [];
  const scopeOr = filters.scopeOr === true;
  const userCats = Array.isArray(filters.categories) ? filters.categories : [];
  const userSubs = Array.isArray(filters.subcategories) ? filters.subcategories : [];

  const searchSql = buildCatalogSearchSql(filters.search, addParam);
  if (searchSql) where.push(searchSql);

  // scope от страницы каталога
  if (scopeOr && scopeCats.length > 0 && scopeSubs.length > 0) {
    where.push(
      `(COALESCE(parent.slug, c.slug) = ANY(${addParam(scopeCats)})
        OR c.slug = ANY(${addParam(scopeSubs)}))`,
    );
  } else {
    if (scopeCats.length > 0) {
      where.push(`COALESCE(parent.slug, c.slug) = ANY(${addParam(scopeCats)})`);
    }
    if (scopeSubs.length > 0) {
      where.push(`c.slug = ANY(${addParam(scopeSubs)})`);
    }
  }

  // выбор пользователя поверх scope
  if (userCats.length > 0) {
    where.push(`COALESCE(parent.slug, c.slug) = ANY(${addParam(userCats)})`);
  }
  if (userSubs.length > 0) {
    where.push(`c.slug = ANY(${addParam(userSubs)})`);
  }

  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    where.push(`p.price >= ${addParam(filters.minPrice)}`);
  }
  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    where.push(`p.price <= ${addParam(filters.maxPrice)}`);
  }

  if (filters.onSale === true) {
    where.push(`p.is_on_sale = TRUE`);
    where.push(`p.compare_at_price IS NOT NULL`);
    where.push(`p.compare_at_price > p.price`);
  }

  where.push(storefrontListedProductPredicatesSql);

  return where;
};

const parseFilterValues = (raw) => {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const value = String(raw || "").trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
  }
  if (value.includes("||")) {
    return value.split("||").map((item) => item.trim()).filter(Boolean);
  }
  return [
    value,
    ...value.split(",").map((item) => item.trim()).filter(Boolean),
  ].filter((entry, index, arr) => arr.indexOf(entry) === index);
};

const applyAttributeFilters = (filters, addParam, where, attrDefByCode) => {
  Object.entries(filters.attributeFilters || {}).forEach(([rawCode, rawValue]) => {
    // Числовые диапазоны: attr_<code>_min/_max
    if (rawCode.endsWith("_min")) {
      const code = rawCode.replace(/_min$/, "");
      const num = Number(String(rawValue ?? "").trim());
      if (!Number.isFinite(num)) return;
      where.push(`(p.attrs->>${addParam(code)})::numeric >= ${addParam(num)}`);
      return;
    }
    if (rawCode.endsWith("_max")) {
      const code = rawCode.replace(/_max$/, "");
      const num = Number(String(rawValue ?? "").trim());
      if (!Number.isFinite(num) || num <= 0) return;
      where.push(`(p.attrs->>${addParam(code)})::numeric <= ${addParam(num)}`);
      return;
    }

    const values = parseFilterValues(rawValue);
    if (values.length === 0) return;

    const def = attrDefByCode.get(rawCode);
    if (def && def.scope === "variant") {
      where.push(`
        EXISTS (
          SELECT 1 FROM product_variants pvf
          WHERE pvf.product_id = p.id
            AND pvf.attrs->>${addParam(rawCode)} = ANY(${addParam(values)})
        )
      `);
      return;
    }

    where.push(`p.attrs->>${addParam(rawCode)} = ANY(${addParam(values)})`);
  });
};

/** Cached for the lifetime of the Node process — attribute definitions change rarely. */
let attributeDefCache = null;

const loadAttributeDefMap = async () => {
  if (attributeDefCache) return attributeDefCache;
  const defs = await attributeRepository.listAttributes();
  attributeDefCache = new Map(defs.map((def) => [def.code, def]));
  return attributeDefCache;
};

const listProducts = async (filters) => {
  await ensureProductBadgesColumn();
  await ensureProductSaleColumns();
  await ensureLatinProductSlugs();
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const attrDefByCode = await loadAttributeDefMap();
  const where = buildScopeWhere(filters, addParam);
  applyAttributeFilters(filters, addParam, where, attrDefByCode);

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const sortSql = sortMap[filters.sort] || sortMap.popularity;

  const countRes = await query(
    `
    SELECT COUNT(DISTINCT p.id)::int AS total
    FROM products p
    ${taxonomyJoin}
    ${whereSql}
    `,
    params,
  );

  const limitParam = addParam(filters.limit);
  const offsetParam = addParam(filters.offset);

  const itemsRes = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.price,
      p.is_on_sale AS "isOnSale",
      p.compare_at_price AS "compareAtPrice",
      p.badges,
      p.attrs->>'pogonazh_id' AS "_pogonazhIdRaw",
      COALESCE(parent.id, c.id) AS "_rootCategoryId",
      p.attrs->>'color' AS color,
      (
        SELECT COALESCE(
          json_agg(json_build_object('id', x.pid, 'label', x.gl) ORDER BY x.gl),
          '[]'::json
        )
        FROM (
          SELECT MIN(sib.id) AS pid, NULLIF(TRIM(sib.attrs->>'glass'), '') AS gl
          FROM products sib
          WHERE p.model_key IS NOT NULL
            AND sib.model_key = p.model_key
            AND sib.name = p.name
            AND sib.is_active = TRUE
            AND NULLIF(TRIM(sib.attrs->>'glass'), '') IS NOT NULL
            AND (
              NULLIF(TRIM(p.attrs->>'color'), '') IS NULL
              OR NULLIF(TRIM(sib.attrs->>'color'), '') = NULLIF(TRIM(p.attrs->>'color'), '')
            )
          GROUP BY NULLIF(TRIM(sib.attrs->>'glass'), '')
        ) x
        WHERE x.gl IS NOT NULL
      ) AS "glassOptions",
      ${productImageSubquery} AS image,
      ${hoverImageSubquery} AS "hoverImage",
      ${taxonomySelect}
    FROM products p
    ${taxonomyJoin}
    ${whereSql}
    ORDER BY ${sortSql}
    LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    params,
  );

  const baseItems = itemsRes.rows.map((row) => {
    const taxonomy = splitTaxonomy(row);
    return {
      id: Number(row.id),
      sku: row.sku,
      slug: row.slug || null,
      name: row.name,
      color: row.color || null,
      glassOptions: (() => {
        let raw = row.glassOptions;
        if (raw && typeof raw === "string") {
          try {
            raw = JSON.parse(raw);
          } catch {
            raw = [];
          }
        }
        const arr = Array.isArray(raw) ? raw : [];
        return arr
          .map((o) => ({
            id: Number(o.id),
            label: String(o.label || "").trim(),
          }))
          .filter((o) => Number.isInteger(o.id) && o.id > 0 && o.label);
      })(),
      price: Number(row.price),
      isOnSale: row.isOnSale === true,
      compareAtPrice:
        row.compareAtPrice === null || row.compareAtPrice === undefined
          ? null
          : Number(row.compareAtPrice),
      badges: resolveProductBadges(row.badges),
      image: row.image || "",
      hoverImage: row.hoverImage || null,
      category: taxonomy.category,
      categorySlug: taxonomy.categorySlug,
      subcategory: taxonomy.subcategory,
      subcategorySlug: taxonomy.subcategorySlug,
      _pogonazhIdRaw: row._pogonazhIdRaw || null,
      _rootCategoryId: Number(row._rootCategoryId) || null,
    };
  });

  const items = filters.includeKitPrice === false
    ? baseItems.map(({ _pogonazhIdRaw, _rootCategoryId, ...rest }) => ({ ...rest, kitPrice: null }))
    : await attachInteriorKitPricesToListItems(baseItems);

  return { total: countRes.rows[0].total, items };
};

const attachInteriorKitPricesToListItems = async (items) => {
  const cache = new Map();

  return Promise.all(
    items.map(async (item) => {
      let kitPrice = null;

      if (item.categorySlug === INTERIOR_DOORS_CATEGORY_SLUG && item._pogonazhIdRaw) {
        const pogonazhIds = parsePogonazhIdList(item._pogonazhIdRaw);
        if (pogonazhIds.length > 0) {
          const cacheKey = `${[...pogonazhIds].sort().join("|")}:${item._rootCategoryId ?? ""}`;
          if (!cache.has(cacheKey)) {
            cache.set(
              cacheKey,
              await loadInteriorKitParts({
                pogonazhIds,
                excludeRootCategoryId: item._rootCategoryId,
              }),
            );
          }
          kitPrice = computeInteriorKitPrice(item.price, cache.get(cacheKey));
        }
      }

      const { _pogonazhIdRaw, _rootCategoryId, ...publicItem } = item;
      return { ...publicItem, kitPrice };
    }),
  );
};

const buildMetaScope = (constraints) => {
  const pageCats = Array.isArray(constraints.scopeCategories) && constraints.scopeCategories.length > 0
    ? constraints.scopeCategories
    : Array.isArray(constraints.categories)
      ? constraints.categories
      : [];
  const pageSubs = Array.isArray(constraints.scopeSubcategories) && constraints.scopeSubcategories.length > 0
    ? constraints.scopeSubcategories
    : Array.isArray(constraints.subcategorySlugs)
      ? constraints.subcategorySlugs
      : [];
  const scopeOr = constraints.scopeOr === true;
  if (scopeOr && pageCats.length > 0 && pageSubs.length > 0) return { mode: "or", pageCats, pageSubs };
  if (pageCats.length > 0) return { mode: "categories", pageCats, pageSubs: [] };
  if (pageSubs.length > 0) return { mode: "subcategories", pageCats: [], pageSubs };
  return { mode: "none", pageCats: [], pageSubs: [] };
};

/**
 * Каждый SQL ниже исполняется со своим собственным набором bind-параметров —
 * иначе при параллельном вызове query() через Promise.all() Postgres получит
 * больше/меньше плейсхолдеров, чем нужно (и выдаст «передано неверное число параметров»).
 */
const makeBindings = () => {
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  return { params, addParam };
};

const buildMetaScopeSql = (mode, pageCats, pageSubs, addParam) => {
  if (mode === "categories") {
    const pageCatParam = addParam(pageCats);
    return {
      pageCatParam,
      pageSubParam: null,
      productScopeCondition: `AND COALESCE(parent.slug, c.slug) = ANY(${pageCatParam}::text[])`,
    };
  }
  if (mode === "subcategories") {
    const pageSubParam = addParam(pageSubs);
    return {
      pageCatParam: null,
      pageSubParam,
      productScopeCondition: `AND c.slug = ANY(${pageSubParam}::text[])`,
    };
  }
  if (mode === "or") {
    const pageCatParam = addParam(pageCats);
    const pageSubParam = addParam(pageSubs);
    return {
      pageCatParam,
      pageSubParam,
      productScopeCondition: `AND (COALESCE(parent.slug, c.slug) = ANY(${pageCatParam}::text[])
        OR c.slug = ANY(${pageSubParam}::text[]))`,
    };
  }
  return { pageCatParam: null, pageSubParam: null, productScopeCondition: "" };
};

const listFilterMeta = async (constraints = {}) => {
  const { mode, pageCats, pageSubs } = buildMetaScope(constraints);

  const restrictAttrIds =
    Array.isArray(constraints.allowedAttributeIds) && constraints.allowedAttributeIds.length > 0
      ? constraints.allowedAttributeIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : null;

  // Каждый из этих четырёх запросов получает свой params/addParam, чтобы pg не путал биндинги.
  const categoriesBind = makeBindings();
  const categoriesScope = buildMetaScopeSql(mode, pageCats, pageSubs, categoriesBind.addParam);
  const categoriesSql = mode === "categories"
    ? `SELECT id, name, slug, sort_order AS "sortOrder"
       FROM categories
       WHERE parent_id IS NULL AND slug = ANY(${categoriesScope.pageCatParam}::text[])
       ORDER BY sort_order, name`
    : mode === "subcategories"
      ? `SELECT DISTINCT c.id, c.name, c.slug, c.sort_order AS "sortOrder"
         FROM categories c
         JOIN categories s ON s.parent_id = c.id
         WHERE c.parent_id IS NULL AND s.slug = ANY(${categoriesScope.pageSubParam}::text[])
         ORDER BY c.sort_order, c.name`
      : mode === "or"
        ? `SELECT DISTINCT c.id, c.name, c.slug, c.sort_order AS "sortOrder"
           FROM categories c
           WHERE c.parent_id IS NULL
             AND (c.slug = ANY(${categoriesScope.pageCatParam}::text[])
               OR c.id IN (SELECT s.parent_id FROM categories s WHERE s.parent_id IS NOT NULL AND s.slug = ANY(${categoriesScope.pageSubParam}::text[])))
           ORDER BY c.sort_order, c.name`
        : `SELECT id, name, slug, sort_order AS "sortOrder"
           FROM categories
           WHERE parent_id IS NULL
           ORDER BY sort_order, name`;

  const subcategoriesBind = makeBindings();
  const subcategoriesScope = buildMetaScopeSql(mode, pageCats, pageSubs, subcategoriesBind.addParam);
  const subcategoriesSql = mode === "categories"
    ? `SELECT s.id, s.name, s.slug, c.slug AS "categorySlug"
       FROM categories s
       JOIN categories c ON c.id = s.parent_id
       WHERE s.parent_id IS NOT NULL AND c.slug = ANY(${subcategoriesScope.pageCatParam}::text[])
       ORDER BY c.sort_order, s.sort_order, s.name`
    : mode === "subcategories"
      ? `SELECT s.id, s.name, s.slug, c.slug AS "categorySlug"
         FROM categories s
         JOIN categories c ON c.id = s.parent_id
         WHERE s.parent_id IS NOT NULL AND s.slug = ANY(${subcategoriesScope.pageSubParam}::text[])
         ORDER BY c.sort_order, s.sort_order, s.name`
      : mode === "or"
        ? `SELECT DISTINCT s.id, s.name, s.slug, c.slug AS "categorySlug"
           FROM categories s
           JOIN categories c ON c.id = s.parent_id
           WHERE s.parent_id IS NOT NULL
             AND (c.slug = ANY(${subcategoriesScope.pageCatParam}::text[]) OR s.slug = ANY(${subcategoriesScope.pageSubParam}::text[]))
           ORDER BY c.sort_order, s.sort_order, s.name`
        : `SELECT s.id, s.name, s.slug, c.slug AS "categorySlug"
           FROM categories s
           JOIN categories c ON c.id = s.parent_id
           WHERE s.parent_id IS NOT NULL
           ORDER BY c.sort_order, s.sort_order, s.name`;

  const priceBind = makeBindings();
  const priceScope = buildMetaScopeSql(mode, pageCats, pageSubs, priceBind.addParam);
  const priceSql = `
    SELECT MIN(p.price)::int AS min, MAX(p.price)::int AS max
    FROM products p
    ${taxonomyJoin}
    WHERE p.is_active = TRUE
      AND ${storefrontListedProductPredicatesSql}
      ${priceScope.productScopeCondition}
  `;

  const filterableBind = makeBindings();
  const filterableSql = restrictAttrIds && restrictAttrIds.length > 0
    ? `SELECT id, code, name, type, unit, options, scope
       FROM attribute_definitions
       WHERE id = ANY(${filterableBind.addParam(restrictAttrIds)}::bigint[])
       ORDER BY sort_order ASC, id ASC`
    : `SELECT id, code, name, type, unit, options, scope
       FROM attribute_definitions
       WHERE is_filterable = TRUE
       ORDER BY sort_order ASC, id ASC`;

  const [categoriesRes, subcategoriesRes, priceRes, filterableRes] = await Promise.all([
    query(categoriesSql, categoriesBind.params),
    query(subcategoriesSql, subcategoriesBind.params),
    query(priceSql, priceBind.params),
    query(filterableSql, filterableBind.params),
  ]);

  // Числовые диапазоны (только product-scope; для variant-scope min/max не нужен — переключаем UI на список значений).
  const filterable = filterableRes.rows;
  if (restrictAttrIds && restrictAttrIds.length > 0) {
    const orderIndex = new Map(restrictAttrIds.map((id, index) => [Number(id), index]));
    filterable.sort(
      (a, b) =>
        (orderIndex.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER),
    );
  }
  const productAttrs = filterable.filter((a) => a.scope === "product");
  const variantAttrs = filterable.filter((a) => a.scope === "variant");

  const rangesByCode = new Map();
  const productNumberAttrs = productAttrs.filter((a) => a.type === "number");
  if (productNumberAttrs.length > 0) {
    const codes = productNumberAttrs.map((a) => a.code);
    const bind = makeBindings();
    const scope = buildMetaScopeSql(mode, pageCats, pageSubs, bind.addParam);
    const codesParam = bind.addParam(codes);
    const rangeRes = await query(
      `
      SELECT
        code,
        MIN(value)::float8 AS min,
        MAX(value)::float8 AS max
      FROM (
        SELECT
          unnested.key AS code,
          (unnested.value #>> '{}')::numeric AS value
        FROM products p
        ${taxonomyJoin}
        CROSS JOIN LATERAL jsonb_each(p.attrs) AS unnested
        WHERE p.is_active = TRUE
          AND ${storefrontListedProductPredicatesSql}
          AND unnested.key = ANY(${codesParam}::text[])
          AND jsonb_typeof(unnested.value) IN ('number', 'string')
          AND (unnested.value #>> '{}') ~ '^-?[0-9]+(\\.[0-9]+)?$'
          ${scope.productScopeCondition}
      ) numeric_attrs
      GROUP BY code
      `,
      bind.params,
    );
    rangeRes.rows.forEach((row) => {
      rangesByCode.set(row.code, { min: Number(row.min), max: Number(row.max) });
    });
  }

  // Текст/option/boolean ценности по product-scope атрибутам.
  const productTextOptionAttrs = productAttrs.filter((a) =>
    ["text", "option", "boolean"].includes(a.type),
  );
  const textValuesByCode = new Map();
  if (productTextOptionAttrs.length > 0) {
    const codes = productTextOptionAttrs.map((a) => a.code);
    const bind = makeBindings();
    const scope = buildMetaScopeSql(mode, pageCats, pageSubs, bind.addParam);
    const codesParam = bind.addParam(codes);
    const valuesRes = await query(
      `
      SELECT
        unnested.key AS code,
        unnested.value #>> '{}' AS value
      FROM products p
      ${taxonomyJoin}
      CROSS JOIN LATERAL jsonb_each(p.attrs) AS unnested
      WHERE p.is_active = TRUE
        AND ${storefrontListedProductPredicatesSql}
        AND unnested.key = ANY(${codesParam}::text[])
        AND unnested.value #>> '{}' IS NOT NULL
        AND unnested.value #>> '{}' <> ''
        ${scope.productScopeCondition}
      GROUP BY unnested.key, unnested.value #>> '{}'
      ORDER BY unnested.key, value
      `,
      bind.params,
    );
    valuesRes.rows.forEach((row) => {
      if (!textValuesByCode.has(row.code)) textValuesByCode.set(row.code, []);
      textValuesByCode.get(row.code).push(row.value);
    });
  }

  // Для variant-scope — собираем значения из вариантов.
  const variantValuesByCode = new Map();
  if (variantAttrs.length > 0) {
    const codes = variantAttrs.map((a) => a.code);
    const bind = makeBindings();
    const scope = buildMetaScopeSql(mode, pageCats, pageSubs, bind.addParam);
    const codesParam = bind.addParam(codes);
    const variantRes = await query(
      `
      SELECT
        unnested.key AS code,
        unnested.value #>> '{}' AS value
      FROM products p
      ${taxonomyJoin}
      JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
      CROSS JOIN LATERAL jsonb_each(pv.attrs) AS unnested
      WHERE p.is_active = TRUE
        AND ${storefrontListedProductPredicatesSql}
        AND unnested.key = ANY(${codesParam}::text[])
        AND unnested.value #>> '{}' IS NOT NULL
        AND unnested.value #>> '{}' <> ''
        ${scope.productScopeCondition}
      GROUP BY unnested.key, unnested.value #>> '{}'
      ORDER BY unnested.key, value
      `,
      bind.params,
    );
    variantRes.rows.forEach((row) => {
      if (!variantValuesByCode.has(row.code)) variantValuesByCode.set(row.code, []);
      variantValuesByCode.get(row.code).push(row.value);
    });
  }

  const attributeFilters = filterable.map((attr) => {
    if (attr.type === "number" && attr.scope === "product") {
      const range = rangesByCode.get(attr.code) || { min: 0, max: 0 };
      return {
        code: attr.code,
        name: attr.name,
        type: attr.type,
        unit: attr.unit || null,
        min: range.min,
        max: range.max,
      };
    }
    const inlineOptions = Array.isArray(attr.options) ? attr.options : [];
    const values =
      attr.scope === "variant"
        ? variantValuesByCode.get(attr.code) || inlineOptions
        : textValuesByCode.get(attr.code) || inlineOptions;
    return {
      code: attr.code,
      name: attr.name,
      type: attr.type,
      unit: attr.unit || null,
      values: [...new Set(values)],
    };
  });

  const priceMeta = priceRes.rows[0] || { min: 0, max: 0 };

  return {
    categories: categoriesRes.rows,
    subcategories: subcategoriesRes.rows,
    attributeFilters,
    price: {
      min: Number(priceMeta.min || 0),
      max: Number(priceMeta.max || 0),
    },
  };
};

const getProductBySlug = async (slug) => {
  await ensureLatinProductSlugs();
  const raw = String(slug || "").trim();
  if (!raw) return null;
  const res = await query(
    `SELECT id FROM products WHERE slug = $1 AND is_active = TRUE LIMIT 1`,
    [raw],
  );
  if (res.rows.length === 0) return null;
  return getProductById(Number(res.rows[0].id));
};

const getProductById = async (id) => {
  await ensureProductBadgesColumn();
  await ensureProductSaleColumns();
  await ensureLatinProductSlugs();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const productRes = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.price,
      p.is_on_sale AS "isOnSale",
      p.compare_at_price AS "compareAtPrice",
      p.model_key AS "modelKey",
      p.badges,
      p.attrs,
      p.seo_title AS "seoTitle",
      p.seo_description AS "seoDescription",
      c.id AS "categoryId",
      parent.id AS "parentCategoryId",
      ${taxonomySelect}
    FROM products p
    ${taxonomyJoin}
    WHERE p.id = $1 AND p.is_active = TRUE
    LIMIT 1
    `,
    [numericId],
  );

  if (productRes.rows.length === 0) return null;
  const row = productRes.rows[0];
  const productAttrs = ensureAttrs(row.attrs);
  const taxonomy = splitTaxonomy(row);

  const [imagesRes, variantsRes, attrDefs] = await Promise.all([
    query(
      `SELECT image_url AS "imageUrl"
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order, id`,
      [numericId],
    ),
    query(
      `
      SELECT pv.id, pv.sku, pv.price, pv.image_url AS "imageUrl",
             pv.sort_order AS "sortOrder", pv.is_active AS "isActive", pv.attrs
      FROM product_variants pv
      WHERE pv.product_id = $1 AND pv.is_active = TRUE
      ORDER BY pv.sort_order, pv.id
      `,
      [numericId],
    ),
    attributeRepository.listAttributes(),
  ]);

  let images = imagesRes.rows.map((r) => r.imageUrl).filter(isStorefrontImageUrl);
  if (images.length === 0) {
    const variantImage = variantsRes.rows
      .map((r) => r.imageUrl)
      .find(isStorefrontImageUrl);
    if (variantImage) images = [variantImage];
  }
  const primaryImage = images[0] || "";

  const attrDefByCode = new Map(attrDefs.map((def) => [def.code, def]));

  // attributes — характеристики «модели», только product-scope и с флагом «на карточке».
  const attributes = attrDefs
    .filter((def) => def.scope === "product" && def.isVisibleOnProduct !== false)
    .map((def) => {
      const raw = productAttrs[def.code];
      if (raw === undefined || raw === null || raw === "") return null;
      const display = def.unit && String(raw).trim() !== "" ? `${raw} ${def.unit}` : String(raw);
      return { code: def.code, name: def.name, value: display };
    })
    .filter(Boolean);

  const attrGlass = String(productAttrs.glass ?? "").trim();
  const attrColor = String(productAttrs.color ?? "").trim();
  const colorGlassDb = attrGlass === "" ? null : attrGlass;
  const glassColorDb = attrColor === "" ? null : attrColor;

  // Соседи по цвету: та же модель (model_key + name), при заполненном стекле у текущей
  // карточки — только карточки с тем же стеклом; при пустом стекле — только карточки
  // без стекла (чтобы не смешивать «Орех без вставки» с «Белый + стекло»).
  let colorVariants = [];
  if (row.modelKey) {
    const colorRes = await query(
      `
      SELECT
        p.id,
        p.slug,
        p.attrs->>'color' AS color,
        ${productImageSubquery} AS image
      FROM products p
      WHERE p.model_key = $1
        AND p.name = $2
        AND p.is_active = TRUE
        AND (
          ($3::text IS NULL AND COALESCE(NULLIF(TRIM(p.attrs->>'glass'), ''), '') = '')
          OR ($3::text IS NOT NULL AND COALESCE(NULLIF(TRIM(p.attrs->>'glass'), ''), '') = $3::text)
        )
      ORDER BY p.id
      `,
      [row.modelKey, row.name, colorGlassDb],
    );
    colorVariants = colorRes.rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug || null,
      color: r.color || "",
      image: r.image || "",
      isCurrent: Number(r.id) === numericId,
    }));
    const byColor = new Map();
    for (const entry of colorVariants) {
      const key = entry.color.trim() || `__id_${entry.id}`;
      const existing = byColor.get(key);
      if (!existing || entry.isCurrent) {
        byColor.set(key, entry);
      }
    }
    colorVariants = Array.from(byColor.values()).sort((a, b) => a.id - b.id);
  }

  // Соседи по стеклу: та же модель, при заполненном цвете — только тот же цвет.
  let glassVariants = [];
  if (row.modelKey) {
    const glassRes = await query(
      `
      SELECT
        p.id,
        p.slug,
        p.attrs->>'glass' AS glass,
        ${productImageSubquery} AS image
      FROM products p
      WHERE p.model_key = $1
        AND p.name = $2
        AND p.is_active = TRUE
        AND (
          ($3::text IS NULL AND COALESCE(NULLIF(TRIM(p.attrs->>'color'), ''), '') = '')
          OR ($3::text IS NOT NULL AND COALESCE(NULLIF(TRIM(p.attrs->>'color'), ''), '') = $3::text)
        )
      ORDER BY p.id
      `,
      [row.modelKey, row.name, glassColorDb],
    );
    const rawGlass = glassRes.rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug || null,
      glass: String(r.glass || "").trim(),
      image: r.image || "",
      isCurrent: Number(r.id) === numericId,
    }));
    const distinctGlass = new Set(rawGlass.map((r) => r.glass).filter(Boolean));
    if (distinctGlass.size > 1) {
      glassVariants = rawGlass;
      const byGlass = new Map();
      for (const entry of glassVariants) {
        const key = entry.glass.trim() || `__id_${entry.id}`;
        const existing = byGlass.get(key);
        if (!existing || entry.isCurrent) {
          byGlass.set(key, entry);
        }
      }
      glassVariants = Array.from(byGlass.values()).sort((a, b) => a.id - b.id);
    }
  }

  // Варианты + variant-scope selectors.
  const variantSelectorMap = new Map();
  const variants = variantsRes.rows.map((variantRow) => {
    const variantAttrs = ensureAttrs(variantRow.attrs);
    const variantAttributes = Object.entries(variantAttrs)
      .map(([code, raw]) => {
        const def = attrDefByCode.get(code);
        const name = def ? def.name : code;
        const unit = def?.unit ? ` ${def.unit}` : "";
        const isVariantAxis = def?.scope === "variant";
        if (isVariantAxis) {
          if (!variantSelectorMap.has(code)) {
            variantSelectorMap.set(code, { code, name, values: new Set() });
          }
          variantSelectorMap.get(code).values.add(String(raw));
        }
        return {
          code,
          name,
          value: String(raw).trim() === "" ? null : `${raw}${unit}`,
          rawValue: String(raw),
          isVariantAxis,
        };
      })
      .filter((entry) => entry.value !== null);
    return {
      id: Number(variantRow.id),
      sku: variantRow.sku,
      price: variantRow.price === null ? Number(row.price) : Number(variantRow.price),
      image: variantRow.imageUrl || primaryImage,
      sortOrder: Number(variantRow.sortOrder) || 0,
      attributes: variantAttributes,
    };
  });

  const variantSelectors = Array.from(variantSelectorMap.values()).map((entry) => ({
    code: entry.code,
    name: entry.name,
    values: Array.from(entry.values),
  }));

  // Аксессуары/погонаж: товары, у которых среди значений `attrs->>'pogonazh_id'`
  // есть хотя бы один общий ID с текущим товаром. У одного SKU может быть несколько
  // ID погонажа, накопленных при импорте CSV (см. mergeJsonbAttrs ниже): они хранятся
  // как строка «826,871», поэтому совпадение ищем как пересечение множеств.
  // Из выдачи исключаем всю корневую ветку текущего товара — дверь видит только товары
  // из ДРУГИХ корневых категорий (типичный кейс — отдельная категория «Погонаж»),
  // и наоборот.
  const pogonazhIds = parsePogonazhIdList(productAttrs.pogonazh_id);
  // Корневая категория текущего товара: если у его категории есть родитель — это родитель,
  // иначе сама категория. Сравниваем по id, чтобы исключить всю ветку (например, всё дерево
  // «Межкомнатные двери», когда товар лежит в подкатегории «Экошпон»).
  const currentRootCategoryId =
    Number(row.parentCategoryId ?? row.categoryId) || null;
  let accessories = [];
  if (pogonazhIds.length > 0) {
    const accRes = await query(
      `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.price,
        p.attrs,
        ${productImageSubquery} AS image,
        c.name AS "categoryName",
        parent.name AS "parentName",
        COALESCE(parent.id, c.id) AS "rootCategoryId"
      FROM products p
      ${taxonomyJoin}
      WHERE p.is_active = TRUE
        AND p.id <> $1
        AND EXISTS (
          SELECT 1
          FROM regexp_split_to_table(
            COALESCE(NULLIF(TRIM(p.attrs->>'pogonazh_id'), ''), ''),
            E'[\\\\s,;]+'
          ) AS token(value)
          WHERE token.value <> '' AND token.value = ANY($2::text[])
        )
        AND ($3::bigint IS NULL OR COALESCE(parent.id, c.id) <> $3::bigint)
      ORDER BY
        -- Сначала «Наличники» и «Коробки» (на «Н»/«К»), потом «Доборы» (на «Д»),
        -- потом всё остальное. Внутри каждой группы — по алфавиту.
        CASE
          WHEN LOWER(LEFT(TRIM(p.name), 1)) IN ('н', 'к') THEN 0
          WHEN LOWER(LEFT(TRIM(p.name), 1)) = 'д' THEN 1
          ELSE 2
        END,
        p.name
      LIMIT 50
      `,
      [numericId, pogonazhIds, currentRootCategoryId],
    );
    accessories = accRes.rows.map((accRow) => {
      const accAttrs = ensureAttrs(accRow.attrs);
      // Краткий список атрибутов: только product-scope, непустые, без служебного pogonazh_id.
      const accAttributes = attrDefs
        .filter((def) => def.scope === "product" && def.code !== "pogonazh_id")
        .map((def) => {
          const raw = accAttrs[def.code];
          if (raw === undefined || raw === null || String(raw).trim() === "") return null;
          const display = def.unit ? `${raw} ${def.unit}` : String(raw);
          return { code: def.code, name: def.name, value: display };
        })
        .filter(Boolean);
      return {
        id: Number(accRow.id),
        sku: accRow.sku,
        name: accRow.name,
        price: Number(accRow.price),
        image: accRow.image || "",
        category: accRow.parentName || accRow.categoryName || "",
        attributes: accAttributes,
      };
    });
  }

  const relatedFittings = await loadRelatedFittingsForHandle({
    productId: numericId,
    productAttrs,
    taxonomy,
    attrDefs,
  });

  let kitPricing = null;
  let kitPrice = null;
  if (taxonomy.categorySlug === INTERIOR_DOORS_CATEGORY_SLUG && pogonazhIds.length > 0) {
    kitPricing = await loadInteriorKitParts({
      pogonazhIds,
      excludeRootCategoryId: currentRootCategoryId,
    });
    kitPrice = computeInteriorKitPrice(Number(row.price), kitPricing);
  }

  return {
    id: numericId,
    sku: row.sku,
    slug: row.slug || null,
    name: row.name,
    price: Number(row.price),
    isOnSale: row.isOnSale === true,
    compareAtPrice:
      row.compareAtPrice === null || row.compareAtPrice === undefined
        ? null
        : Number(row.compareAtPrice),
    image: primaryImage,
    images,
    category: taxonomy.category,
    categorySlug: taxonomy.categorySlug,
    subcategory: taxonomy.subcategory,
    subcategorySlug: taxonomy.subcategorySlug,
    attributes,
    variants,
    variantSelectors,
    colorVariants,
    glassVariants,
    accessories,
    relatedFittings,
    pogonazhIds,
    kitPricing,
    kitPrice,
    badges: resolveProductBadges(row.badges),
    seoTitle: row.seoTitle || null,
    seoDescription: row.seoDescription || null,
  };
};

/**
 * Карта category_id → { categoryId (корень), subcategoryId (лист или null) }.
 * Нужна, чтобы admin-API продолжал работать с двумя FK (categoryId + subcategoryId).
 */
const splitCategoryId = async (productCategoryId) => {
  const res = await query(
    `
    SELECT id, parent_id
    FROM categories
    WHERE id = $1
    `,
    [productCategoryId],
  );
  if (!res.rows[0]) return { categoryId: null, subcategoryId: null };
  const row = res.rows[0];
  if (row.parent_id === null) {
    return { categoryId: Number(row.id), subcategoryId: null };
  }
  return { categoryId: Number(row.parent_id), subcategoryId: Number(row.id) };
};

const listAdminProducts = async () => {
  const res = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.price,
      p.is_active AS "isActive",
      p.category_id AS "leafCategoryId",
      c.parent_id AS "parentCategoryId",
      ${productImageSubquery} AS "imageUrl",
      (SELECT COUNT(*)::int FROM product_variants pv WHERE pv.product_id = p.id) AS "variantsCount"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ORDER BY p.id DESC
    LIMIT 200
    `,
  );
  return res.rows.map((row) => {
    const leafId = Number(row.leafCategoryId);
    const parentId = row.parentCategoryId === null ? null : Number(row.parentCategoryId);
    return {
      id: Number(row.id),
      sku: row.sku,
      name: row.name,
      price: Number(row.price),
      imageUrl: row.imageUrl || "",
      isActive: row.isActive !== false,
      categoryId: parentId !== null ? parentId : leafId,
      subcategoryId: parentId !== null ? leafId : null,
      variantsCount: Number(row.variantsCount) || 0,
    };
  });
};

const getAdminProductById = async (id) => {
  const productRes = await query(
    `
    SELECT
      p.id, p.sku, p.name, p.price, p.attrs, p.model_key AS "modelKey",
      p.is_active AS "isActive",
      p.category_id AS "leafCategoryId",
      c.parent_id AS "parentCategoryId",
      ${productImageSubquery} AS "imageUrl"
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = $1
    LIMIT 1
    `,
    [id],
  );
  if (productRes.rows.length === 0) return null;
  const row = productRes.rows[0];
  const productAttrs = ensureAttrs(row.attrs);
  const leafId = Number(row.leafCategoryId);
  const parentId = row.parentCategoryId === null ? null : Number(row.parentCategoryId);

  const attrDefs = await attributeRepository.listAttributes();
  const attrDefByCode = new Map(attrDefs.map((def) => [def.code, def]));

  const productAttributes = Object.entries(productAttrs)
    .map(([code, value]) => {
      const def = attrDefByCode.get(code);
      if (!def) return null;
      const isNumber = def.type === "number";
      return {
        attributeId: def.id,
        valueText: isNumber ? null : String(value ?? ""),
        valueNumber: isNumber ? Number(value) : null,
        valueOptionId: null,
      };
    })
    .filter(Boolean);

  const variantsRes = await query(
    `
    SELECT pv.id, pv.sku, pv.price, pv.image_url AS "imageUrl",
           pv.sort_order AS "sortOrder", pv.is_active AS "isActive", pv.attrs
    FROM product_variants pv
    WHERE pv.product_id = $1
    ORDER BY pv.sort_order, pv.id
    `,
    [id],
  );

  const variants = variantsRes.rows.map((variantRow) => {
    const attrs = ensureAttrs(variantRow.attrs);
    return {
      id: Number(variantRow.id),
      sku: variantRow.sku,
      price: variantRow.price === null ? null : Number(variantRow.price),
      imageUrl: variantRow.imageUrl || "",
      sortOrder: Number(variantRow.sortOrder) || 0,
      isActive: variantRow.isActive !== false,
      attributes: Object.entries(attrs)
        .map(([code, value]) => {
          const def = attrDefByCode.get(code);
          if (!def) return null;
          const isNumber = def.type === "number";
          return {
            attributeId: def.id,
            valueText: isNumber ? null : String(value ?? ""),
            valueNumber: isNumber ? Number(value) : null,
            valueOptionId: null,
          };
        })
        .filter(Boolean),
    };
  });

  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    price: Number(row.price),
    imageUrl: row.imageUrl || "",
    isActive: row.isActive !== false,
    categoryId: parentId !== null ? parentId : leafId,
    subcategoryId: parentId !== null ? leafId : null,
    modelKey: row.modelKey || null,
    attributes: productAttributes,
    variants,
  };
};

/** Уникальные значения product-scope атрибута из `products.attrs` (для фильтра в админке). */
const listProductAttributeDistinctValues = async ({
  code,
  categoryId = null,
  subcategoryId = null,
  search = "",
}) => {
  const attrCode = String(code || "").trim();
  if (!attrCode || !/^[a-z0-9_]+$/i.test(attrCode)) return [];

  const defRes = await query(
    `SELECT code, scope FROM attribute_definitions WHERE code = $1 LIMIT 1`,
    [attrCode],
  );
  const def = defRes.rows[0];
  if (!def || def.scope === "variant") return [];

  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const codeParam = addParam(attrCode);
  const whereParts = [
    `TRIM(COALESCE(p.attrs->>${codeParam}, '')) <> ''`,
  ];
  if (String(search || "").trim()) {
    const t = String(search).trim();
    whereParts.push(`(p.name ILIKE ${addParam(`%${t}%`)} OR p.sku ILIKE ${addParam(`%${t}%`)})`);
  }
  if (categoryId) {
    whereParts.push(
      `(p.category_id = ${addParam(Number(categoryId))} OR c.parent_id = ${addParam(Number(categoryId))})`,
    );
  }
  if (subcategoryId) {
    whereParts.push(`p.category_id = ${addParam(Number(subcategoryId))}`);
  }

  const res = await query(
    `
    SELECT DISTINCT TRIM(p.attrs->>${codeParam}) AS value
    FROM products p
    ${taxonomyJoin}
    WHERE ${whereParts.join(" AND ")}
    ORDER BY value
    `,
    params,
  );
  return res.rows.map((row) => String(row.value || "").trim()).filter(Boolean);
};

const buildProductsTableWhere = ({
  search = "",
  categoryId = null,
  subcategoryId = null,
  attributeFilters = {},
  manufacturer = null,
  hit = null,
  onSale = null,
  ids = null,
  includeManufacturer = true,
}) => {
  const manufacturerTrimmed =
    manufacturer !== undefined && manufacturer !== null && String(manufacturer).trim()
      ? String(manufacturer).trim()
      : null;

  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const whereParts = [];

  if (Array.isArray(ids) && ids.length > 0) {
    const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    if (numericIds.length > 0) {
      whereParts.push(`p.id = ANY(${addParam(numericIds)}::bigint[])`);
    }
  }

  if (String(search || "").trim()) {
    const t = String(search).trim();
    whereParts.push(`(p.name ILIKE ${addParam(`%${t}%`)} OR p.sku ILIKE ${addParam(`%${t}%`)})`);
  }
  if (categoryId) {
    whereParts.push(
      `(p.category_id = ${addParam(Number(categoryId))} OR c.parent_id = ${addParam(Number(categoryId))})`,
    );
  }
  if (subcategoryId) {
    whereParts.push(`p.category_id = ${addParam(Number(subcategoryId))}`);
  }

  Object.entries(attributeFilters || {}).forEach(([code, value]) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    whereParts.push(`p.attrs->>${addParam(code)} ILIKE ${addParam(`%${normalized}%`)}`);
  });

  if (includeManufacturer && manufacturerTrimmed) {
    whereParts.push(
      `LOWER(TRIM(COALESCE(p.attrs->>'manufacturer', ''))) = LOWER(${addParam(manufacturerTrimmed)})`,
    );
  }

  if (hit === true) {
    whereParts.push(`COALESCE(p.badges, ARRAY[]::text[]) @> ARRAY['hit']::text[]`);
  } else if (hit === false) {
    whereParts.push(`NOT (COALESCE(p.badges, ARRAY[]::text[]) @> ARRAY['hit']::text[])`);
  }

  if (onSale === true) {
    whereParts.push(`p.is_on_sale = TRUE`);
  } else if (onSale === false) {
    whereParts.push(`p.is_on_sale = FALSE`);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  return { whereSql, params, manufacturerTrimmed };
};

const listProductsTable = async ({
  page = 1,
  limit = 100,
  search = "",
  categoryId = null,
  subcategoryId = null,
  attributeFilters = {},
  manufacturer = null,
  hit = null,
  onSale = null,
}) => {
  await ensureProductBadgesColumn();
  await ensureProductSaleColumns();
  await ensureSeoColumns();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  const offset = (safePage - 1) * safeLimit;

  const baseWhere = buildProductsTableWhere({
    search,
    categoryId,
    subcategoryId,
    attributeFilters,
    manufacturer,
    hit,
    onSale,
    includeManufacturer: false,
  });
  const fullWhere = buildProductsTableWhere({
    search,
    categoryId,
    subcategoryId,
    attributeFilters,
    manufacturer,
    hit,
    onSale,
    includeManufacturer: true,
  });

  const manufacturerNonEmpty = `TRIM(COALESCE(p.attrs->>'manufacturer', '')) <> ''`;
  const manufacturersWhereSql = baseWhere.whereSql
    ? `${baseWhere.whereSql} AND ${manufacturerNonEmpty}`
    : `WHERE ${manufacturerNonEmpty}`;

  const manufacturersRes = await query(
    `
    SELECT DISTINCT TRIM(p.attrs->>'manufacturer') AS name
    FROM products p
    ${taxonomyJoin}
    ${manufacturersWhereSql}
    ORDER BY name
    `,
    baseWhere.params,
  );
  const manufacturers = manufacturersRes.rows.map((r) => String(r.name || "").trim()).filter(Boolean);

  const countRes = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM products p
    ${taxonomyJoin}
    ${fullWhere.whereSql}
    `,
    fullWhere.params,
  );

  const listParams = [...fullWhere.params];
  const addListParam = (value) => {
    listParams.push(value);
    return `$${listParams.length}`;
  };
  const limitParam = addListParam(safeLimit);
  const offsetParam = addListParam(offset);

  const rowsRes = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.slug,
      p.price,
      p.is_on_sale AS "isOnSale",
      p.compare_at_price AS "compareAtPrice",
      p.attrs,
      p.badges,
      p.seo_title AS "seoTitle",
      p.seo_description AS "seoDescription",
      p.model_key AS "modelKey",
      p.is_active AS "isActive",
      COALESCE(parent.name, c.name) AS category,
      COALESCE(parent.name IS NULL, FALSE) AS "categoryIsRoot",
      CASE WHEN parent.id IS NOT NULL THEN c.name ELSE '' END AS subcategory,
      (SELECT COUNT(*)::int FROM product_variants pv WHERE pv.product_id = p.id) AS "variantsCount",
      (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS "imagesCount",
      ${productImageSubquery} AS "primaryImageUrl",
      COALESCE(
        (SELECT json_agg(pi.image_url ORDER BY pi.sort_order, pi.id)
         FROM product_images pi
         WHERE pi.product_id = p.id),
        '[]'::json
      ) AS "imageUrls",
      ${displayOrderExpr} AS "displayOrder"
    FROM products p
    ${taxonomyJoin}
    ${fullWhere.whereSql}
    ORDER BY ${displayOrderExpr} DESC, p.id DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    listParams,
  );

  const attributesRes = await query(
    `
    SELECT id, code, name, type, options, scope,
           is_filterable AS "isFilterable",
           is_visible_on_product AS "isVisibleOnProduct",
           sort_order AS "sortOrder"
    FROM attribute_definitions
    ORDER BY sort_order ASC, id ASC
    `,
  );
  const categoriesRes = await query(
    `SELECT id, name FROM categories WHERE parent_id IS NULL ORDER BY sort_order, name`,
  );
  const subcategoriesRes = await query(
    `SELECT id, parent_id AS "categoryId", name FROM categories WHERE parent_id IS NOT NULL ORDER BY sort_order, name`,
  );

  return {
    total: countRes.rows[0].total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(countRes.rows[0].total / safeLimit)),
    manufacturers,
    attributes: attributesRes.rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      name: row.name,
      type: row.type,
      isFilterable: row.isFilterable !== false,
      isVisibleOnProduct: row.isVisibleOnProduct !== false,
      isVariantAxis: row.scope === "variant",
      options: Array.isArray(row.options) ? row.options : [],
    })),
    categories: categoriesRes.rows,
    subcategories: subcategoriesRes.rows,
    rows: rowsRes.rows.map((row) => ({
      id: Number(row.id),
      sku: row.sku,
      name: row.name,
      slug: row.slug || null,
      price: Number(row.price),
      isOnSale: row.isOnSale === true,
      compareAtPrice:
        row.compareAtPrice === null || row.compareAtPrice === undefined
          ? null
          : Number(row.compareAtPrice),
      modelKey: row.modelKey || null,
      category: row.category,
      subcategory: row.subcategory,
      isActive: row.isActive !== false,
      displayOrder: Number(row.displayOrder) || 0,
      badges: normalizeProductBadges(row.badges),
      attributes: ensureAttrs(row.attrs),
      variantsCount: Number(row.variantsCount || 0),
      imagesCount: Number(row.imagesCount || 0),
      primaryImageUrl: row.primaryImageUrl || "",
      imageUrls: parseImageUrlsJson(row.imageUrls),
      seoTitle: row.seoTitle || null,
      seoDescription: row.seoDescription || null,
    })),
  };
};

const parseVariantsJson = (raw) => {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [];
  return list.map((variant) => ({
    sku: String(variant.sku || ""),
    price:
      variant.price === null || variant.price === undefined ? null : Number(variant.price),
    imageUrl: variant.imageUrl || variant.image_url || "",
    attributes: ensureAttrs(variant.attrs),
    sortOrder: Number(variant.sortOrder ?? variant.sort_order) || 0,
  }));
};

const listProductsForExport = async ({
  search = "",
  categoryId = null,
  subcategoryId = null,
  attributeFilters = {},
  manufacturer = null,
  hit = null,
  onSale = null,
  ids = null,
}) => {
  await ensureProductBadgesColumn();
  await ensureProductSaleColumns();

  const { whereSql, params } = buildProductsTableWhere({
    search,
    categoryId,
    subcategoryId,
    attributeFilters,
    manufacturer,
    hit,
    onSale,
    ids,
    includeManufacturer: true,
  });

  const rowsRes = await query(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.slug,
      p.price,
      p.is_on_sale AS "isOnSale",
      p.compare_at_price AS "compareAtPrice",
      p.attrs,
      p.badges,
      p.model_key AS "modelKey",
      p.is_active AS "isActive",
      COALESCE(parent.name, c.name) AS category,
      CASE WHEN parent.id IS NOT NULL THEN c.name ELSE '' END AS subcategory,
      ${displayOrderExpr} AS "displayOrder",
      COALESCE(
        (SELECT json_agg(pi.image_url ORDER BY pi.sort_order, pi.id)
         FROM product_images pi
         WHERE pi.product_id = p.id),
        '[]'::json
      ) AS "imageUrls",
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'sku', pv.sku,
            'price', pv.price,
            'imageUrl', pv.image_url,
            'attrs', pv.attrs,
            'sortOrder', pv.sort_order
          )
          ORDER BY pv.sort_order, pv.id
        )
         FROM product_variants pv
         WHERE pv.product_id = p.id),
        '[]'::json
      ) AS variants
    FROM products p
    ${taxonomyJoin}
    ${whereSql}
    ORDER BY ${displayOrderExpr} DESC, p.id DESC
    `,
    params,
  );

  return rowsRes.rows.map((row) => ({
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    slug: row.slug || null,
    price: Number(row.price),
    isOnSale: row.isOnSale === true,
    compareAtPrice:
      row.compareAtPrice === null || row.compareAtPrice === undefined
        ? null
        : Number(row.compareAtPrice),
    modelKey: row.modelKey || null,
    category: row.category,
    subcategory: row.subcategory,
    isActive: row.isActive !== false,
    displayOrder: Number(row.displayOrder) || 0,
    badges: normalizeProductBadges(row.badges),
    attributes: ensureAttrs(row.attrs),
    imageUrls: parseImageUrlsJson(row.imageUrls),
    variants: parseVariantsJson(row.variants),
  }));
};

const productAttrsFromPayload = (attributes, attrDefById) => {
  const out = {};
  for (const entry of attributes || []) {
    const def = attrDefById.get(Number(entry.attributeId));
    if (!def) continue;
    const value = attributeRepository.resolveAttributeValue(def, entry);
    if (value === null || value === undefined || value === "") continue;
    out[def.code] = value;
  }
  return out;
};

const partitionAttributesByScope = (attributes, attrDefById) => {
  const product = [];
  const variant = [];
  for (const entry of attributes || []) {
    const def = attrDefById.get(Number(entry.attributeId));
    if (!def) continue;
    if (def.scope === "variant") variant.push(entry);
    else product.push(entry);
  }
  return { product, variant };
};

const writeProductImages = async (client, productId, images) => {
  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
  if (!Array.isArray(images) || images.length === 0) return;
  let order = 0;
  for (const url of images) {
    const cleaned = String(url || "").trim();
    if (!cleaned) continue;
    await client.query(
      `
      INSERT INTO product_images(product_id, image_url, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, image_url) DO UPDATE SET sort_order = EXCLUDED.sort_order
      `,
      [productId, cleaned, order],
    );
    order += 10;
  }
};

const writeVariants = async (client, productId, variants, attrDefById) => {
  await client.query("DELETE FROM product_variants WHERE product_id = $1", [productId]);
  for (const variant of variants) {
    const variantAttrs = productAttrsFromPayload(variant.attributes || [], attrDefById);
    await client.query(
      `
      INSERT INTO product_variants(product_id, sku, price, image_url, attrs, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      `,
      [
        productId,
        variant.sku,
        variant.price ?? null,
        variant.imageUrl || null,
        JSON.stringify(variantAttrs),
        Number(variant.sortOrder) || 0,
        variant.isActive !== false,
      ],
    );
  }
};

/** В API admin-формы categoryId — корень, subcategoryId — лист. Возвращаем итоговый category_id. */
const resolveTargetCategoryId = (payload) => {
  if (payload.subcategoryId) return Number(payload.subcategoryId);
  if (payload.categoryId) return Number(payload.categoryId);
  return null;
};

const createProduct = async (payload) => {
  await ensureProductSlugColumn();
  return withTransaction(async (client) => {
    const attrDefs = await attributeRepository.listAttributes();
    const attrDefById = new Map(attrDefs.map((def) => [def.id, def]));
    const partitioned = partitionAttributesByScope(payload.attributes, attrDefById);
    const productAttrs = productAttrsFromPayload(partitioned.product, attrDefById);
    const targetCategoryId = resolveTargetCategoryId(payload);
    if (!targetCategoryId) throw new Error("categoryId is required");

    const slug = await allocateUniqueSlug(client, payload.name, productAttrs);
    const inserted = await client.query(
      `
      INSERT INTO products(category_id, sku, slug, name, model_key, price, attrs, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
      RETURNING id, sku, slug, name, price, model_key AS "modelKey", category_id AS "categoryId",
                is_active AS "isActive"
      `,
      [
        targetCategoryId,
        payload.sku,
        slug,
        payload.name,
        payload.modelKey || null,
        payload.price,
        JSON.stringify(productAttrs),
        payload.isActive !== false,
      ],
    );
    const productId = Number(inserted.rows[0].id);

    if (payload.imageUrl) {
      await writeProductImages(client, productId, [payload.imageUrl]);
    }

    if (Array.isArray(payload.variants)) {
      await writeVariants(client, productId, payload.variants, attrDefById);
    } else {
      // По умолчанию — один вариант, повторяющий SKU карточки.
      const fallbackAttrs = productAttrsFromPayload(partitioned.variant, attrDefById);
      await client.query(
        `
        INSERT INTO product_variants(product_id, sku, price, image_url, attrs, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5::jsonb, 0, $6)
        ON CONFLICT (sku) DO NOTHING
        `,
        [
          productId,
          payload.sku,
          payload.price,
          payload.imageUrl || null,
          JSON.stringify(fallbackAttrs),
          payload.isActive !== false,
        ],
      );
    }

    return inserted.rows[0];
  });
};

const updateProduct = async (id, payload) =>
  withTransaction(async (client) => {
    const attrDefs = await attributeRepository.listAttributes();
    const attrDefById = new Map(attrDefs.map((def) => [def.id, def]));
    const partitioned = partitionAttributesByScope(payload.attributes, attrDefById);
    const productAttrs = productAttrsFromPayload(partitioned.product, attrDefById);
    const targetCategoryId = resolveTargetCategoryId(payload);
    if (!targetCategoryId) throw new Error("categoryId is required");

    const updated = await client.query(
      `
      UPDATE products
      SET
        category_id = $2,
        sku = $3,
        name = $4,
        model_key = $5,
        price = $6,
        attrs = $7::jsonb,
        is_active = $8,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, sku, name, price, model_key AS "modelKey", category_id AS "categoryId",
                is_active AS "isActive"
      `,
      [
        id,
        targetCategoryId,
        payload.sku,
        payload.name,
        payload.modelKey || null,
        payload.price,
        JSON.stringify(productAttrs),
        payload.isActive !== false,
      ],
    );

    if (payload.imageUrl !== undefined) {
      await writeProductImages(client, Number(id), payload.imageUrl ? [payload.imageUrl] : []);
    }

    if (Array.isArray(payload.variants)) {
      await writeVariants(client, Number(id), payload.variants, attrDefById);
    }

    return updated.rows[0];
  });

const DEFAULT_IMPORT_IMAGE = "https://picsum.photos/seed/imported/500/360";

/** Категория комплектующего / погонажа — без автоматической заглушки при импорте без фото. */
const isPogonazhCategory = (slug, name) => {
  const s = String(slug || "").toLowerCase();
  const n = String(name || "").trim().toLowerCase();
  if (n.includes("погонаж")) return true;
  if (s.includes("погонаж")) return true;
  if (s.includes("pogonazh") || s.includes("molding") || s.includes("trim")) return true;
  return false;
};

const mergeJsonbAttrs = (existing, incoming) => {
  const merged = ensureAttrs(existing);
  for (const [k, v] of Object.entries(incoming || {})) {
    if (v === null || v === undefined || v === "") continue;
    // У одного SKU может быть несколько ID погонажа. При CSV-апсерте копим их,
    // а не перезаписываем: если в нескольких строках CSV (или в нескольких заливках
    // подряд) один и тот же SKU встречается с разными `pogonazh_id`, итоговое
    // значение — объединение всех непустых ID без дубликатов.
    if (k === "pogonazh_id") {
      const combined = parsePogonazhIdList([merged[k], v]);
      merged[k] = combined.length > 0 ? combined.join(",") : merged[k] ?? v;
      continue;
    }
    merged[k] = v;
  }
  return merged;
};

const upsertProductBySku = async (payload) =>
  withTransaction(async (client) => {
    const attrDefs = await attributeRepository.listAttributes();
    const attrDefById = new Map(attrDefs.map((def) => [def.id, def]));
    const partitioned = partitionAttributesByScope(payload.attributes, attrDefById);
    const incomingProductAttrs = productAttrsFromPayload(partitioned.product, attrDefById);
    // CSV-импорт может класть variant-scope атрибуты в общий список — собираем их вместе
    // с явными payload.variantAttributes, чтобы не терять данные.
    const variantPayload = [...(payload.variantAttributes || []), ...partitioned.variant];
    const incomingVariantAttrs = productAttrsFromPayload(variantPayload, attrDefById);

    const existingRes = await client.query(
      `
      SELECT id, sku, name, category_id, price, attrs, is_active, model_key
      FROM products
      WHERE sku = $1
      LIMIT 1
      `,
      [payload.sku],
    );
    const existing = existingRes.rows[0] || null;
    const present = payload.present || {};
    let product;

    const resolvedCategoryId = payload.subcategoryId
      ? Number(payload.subcategoryId)
      : payload.categoryId
        ? Number(payload.categoryId)
        : null;

    const incomingModelKey =
      payload.modelKey !== undefined && payload.modelKey !== null
        ? String(payload.modelKey).trim() || null
        : null;

    if (existing) {
      const mergedName = present.name ? payload.name : existing.name;
      const mergedCategoryId = present.category && resolvedCategoryId ? resolvedCategoryId : existing.category_id;
      const mergedPrice = present.price ? payload.price : Number(existing.price);
      const mergedAttrs = mergeJsonbAttrs(existing.attrs, incomingProductAttrs);
      const mergedIsActive = present.isActive !== undefined ? payload.isActive : existing.is_active;
      const mergedModelKey = present.modelKey ? incomingModelKey : existing.model_key;

      const updateRes = await client.query(
        `
        UPDATE products
        SET
          name = $2,
          category_id = $3,
          price = $4,
          attrs = $5::jsonb,
          is_active = $6,
          model_key = $7,
          updated_at = NOW()
        WHERE sku = $1
        RETURNING id, sku
        `,
        [
          payload.sku,
          mergedName,
          mergedCategoryId,
          mergedPrice,
          JSON.stringify(mergedAttrs),
          mergedIsActive ?? true,
          mergedModelKey,
        ],
      );
      product = updateRes.rows[0];
    } else {
      if (!resolvedCategoryId || !present.category) {
        throw new Error("category is required for new product");
      }
      const insertName = present.name ? payload.name : payload.sku;
      const insertPrice = present.price ? payload.price : 0;
      const insertSlug = await allocateUniqueSlug(client, insertName, incomingProductAttrs);
      const insertRes = await client.query(
        `
        INSERT INTO products(category_id, sku, slug, name, model_key, price, attrs, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        RETURNING id, sku
        `,
        [
          resolvedCategoryId,
          payload.sku,
          insertSlug,
          insertName,
          incomingModelKey,
          insertPrice,
          JSON.stringify(incomingProductAttrs),
          payload.isActive ?? true,
        ],
      );
      product = insertRes.rows[0];
    }

    if (present.images && Array.isArray(payload.images) && payload.images.length > 0) {
      await client.query("DELETE FROM product_images WHERE product_id = $1", [product.id]);
      for (let index = 0; index < payload.images.length; index += 1) {
        const imageUrl = String(payload.images[index] || "").trim();
        if (!imageUrl) continue;
        await client.query(
          `
          INSERT INTO product_images(product_id, image_url, sort_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, image_url) DO UPDATE SET sort_order = EXCLUDED.sort_order
          `,
          [product.id, imageUrl, index * 10],
        );
      }
    } else if (!existing && payload.imageUrl) {
      await client.query(
        `INSERT INTO product_images(product_id, image_url, sort_order)
         VALUES ($1, $2, 0)
         ON CONFLICT (product_id, image_url) DO NOTHING`,
        [product.id, payload.imageUrl],
      );
    } else if (!existing) {
      const catRes = await client.query(
        `SELECT slug, name FROM categories WHERE id = $1 LIMIT 1`,
        [resolvedCategoryId],
      );
      const cat = catRes.rows[0];
      if (!isPogonazhCategory(cat?.slug, cat?.name)) {
        await client.query(
          `INSERT INTO product_images(product_id, image_url, sort_order)
           VALUES ($1, $2, 0)
           ON CONFLICT (product_id, image_url) DO NOTHING`,
          [product.id, DEFAULT_IMPORT_IMAGE],
        );
      }
    }

    const applyVariantPatch = payload.applyVariantPatch === true;

    if (applyVariantPatch && payload.variantSku) {
      const productRow = await client.query(
        `SELECT price FROM products WHERE id = $1 LIMIT 1`,
        [product.id],
      );
      const productPrice = Number(productRow.rows[0]?.price ?? 0);

      const variantImageUrl = present.variantImageUrl ? payload.variantImageUrl ?? null : null;

      await client.query(
        `
        INSERT INTO product_variants(product_id, sku, price, image_url, attrs, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE)
        ON CONFLICT (sku) DO UPDATE SET
          product_id = EXCLUDED.product_id,
          price = COALESCE(EXCLUDED.price, product_variants.price),
          image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
          attrs = product_variants.attrs || EXCLUDED.attrs,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
        `,
        [
          product.id,
          payload.variantSku,
          present.variantPrice ? payload.variantPrice : productPrice,
          variantImageUrl,
          JSON.stringify(incomingVariantAttrs),
          Number(payload.variantSortOrder) || 0,
        ],
      );
    } else if (!existing) {
      const productRow = await client.query(
        `SELECT price FROM products WHERE id = $1 LIMIT 1`,
        [product.id],
      );
      const productPrice = Number(productRow.rows[0]?.price ?? 0);
      await client.query(
        `
        INSERT INTO product_variants(product_id, sku, price, image_url, attrs, sort_order, is_active)
        VALUES ($1, $2, $3, $4, '{}'::jsonb, 0, TRUE)
        ON CONFLICT (sku) DO NOTHING
        `,
        [product.id, payload.sku, productPrice, payload.imageUrl || null],
      );
    }

    return product;
  });

/** Порядок выдачи в каталоге: `attrs.sort_order` (число; больше — выше при сортировке «по популярности»). */
const patchProductBadges = async (id, badges) => {
  await ensureProductBadgesColumn();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const normalized = normalizeProductBadges(badges);
  const res = await query(
    `
    UPDATE products
    SET badges = $2::text[], updated_at = NOW()
    WHERE id = $1
    RETURNING id, badges
    `,
    [numericId, normalized],
  );
  if (!res.rows[0]) return null;
  return {
    id: Number(res.rows[0].id),
    badges: normalizeProductBadges(res.rows[0].badges),
  };
};

const patchProductSale = async (id, payload) => {
  await ensureProductBadgesColumn();
  await ensureProductSaleColumns();
  await ensureSeoColumns();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const currentRes = await query(
    `SELECT price, badges, is_on_sale AS "isOnSale", compare_at_price AS "compareAtPrice", attrs
     FROM products WHERE id = $1 LIMIT 1`,
    [numericId],
  );
  if (!currentRes.rows[0]) return null;
  const current = currentRes.rows[0];
  const currentAttrs = ensureAttrs(current.attrs);
  const saleBaseFromAttrs = readSaleBasePrice(currentAttrs);

  const applyRules = payload.applySaleRules === true;
  const togglingOn = payload.isOnSale === true && current.isOnSale !== true;
  const togglingOff = payload.isOnSale === false && current.isOnSale === true;
  const useRules =
    applyRules ||
    (togglingOn && payload.price === undefined && payload.compareAtPrice === undefined) ||
    (togglingOff && payload.price === undefined);

  let price =
    payload.price !== undefined && payload.price !== null
      ? Math.round(Number(payload.price))
      : Number(current.price);
  if (!Number.isFinite(price) || price < 0) price = Number(current.price);

  let isOnSale =
    payload.isOnSale !== undefined ? Boolean(payload.isOnSale) : current.isOnSale === true;

  let compareAtPrice =
    payload.compareAtPrice !== undefined && payload.compareAtPrice !== null
      ? Math.round(Number(payload.compareAtPrice))
      : current.compareAtPrice === null || current.compareAtPrice === undefined
        ? null
        : Number(current.compareAtPrice);

  let nextAttrs = { ...currentAttrs };

  if (useRules && togglingOn) {
    const settings = await saleSettingsRepository.getSaleSettings();
    const applied = applySaleRulesOn(price, settings);
    if (applied.error) return { error: applied.error };
    price = applied.price;
    compareAtPrice = applied.compareAtPrice;
    isOnSale = true;
    nextAttrs = withSaleBasePrice(nextAttrs, applied.saleBasePrice);
  } else if (useRules && togglingOff) {
    const applied = applySaleRulesOff({
      price,
      compareAtPrice,
      saleBasePrice: saleBaseFromAttrs,
    });
    price = applied.price;
    compareAtPrice = applied.compareAtPrice;
    isOnSale = false;
    nextAttrs = withSaleBasePrice(nextAttrs, null);
  } else if (!isOnSale) {
    compareAtPrice = null;
    nextAttrs = withSaleBasePrice(nextAttrs, null);
  } else if (isOnSale && !Number.isFinite(compareAtPrice)) {
    return { error: "Старая цена должна быть больше текущей" };
  } else if (isOnSale) {
    if (!Number.isFinite(compareAtPrice) || compareAtPrice <= price) {
      return { error: "Старая цена должна быть больше текущей" };
    }
  }

  const badges = syncSaleBadge(current.badges, isOnSale);

  const res = await query(
    `
    UPDATE products
    SET
      price = $2,
      is_on_sale = $3,
      compare_at_price = $4,
      badges = $5::text[],
      attrs = $6::jsonb,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, price, is_on_sale AS "isOnSale", compare_at_price AS "compareAtPrice", badges
    `,
    [numericId, price, isOnSale, compareAtPrice, badges, JSON.stringify(nextAttrs)],
  );
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: Number(row.id),
    price: Number(row.price),
    isOnSale: row.isOnSale === true,
    compareAtPrice:
      row.compareAtPrice === null || row.compareAtPrice === undefined
        ? null
        : Number(row.compareAtPrice),
    badges: normalizeProductBadges(row.badges),
  };
};

const patchProductDisplayOrder = async (id, rawOrder) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const n = Math.trunc(Number(rawOrder));
  const order = Number.isFinite(n) ? n : 0;
  const res = await query(
    `
    UPDATE products
    SET
      attrs = jsonb_set(COALESCE(attrs, '{}'::jsonb), '{sort_order}', to_jsonb($2::text), true),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id,
      (CASE
        WHEN NULLIF(BTRIM(COALESCE(attrs->>'sort_order', '')), '') IS NULL THEN 0
        WHEN BTRIM(COALESCE(attrs->>'sort_order', '')) ~ '^-?[0-9]+$'
          THEN BTRIM(COALESCE(attrs->>'sort_order', ''))::bigint
        ELSE 0
      END) AS "displayOrder"
    `,
    [numericId, String(order)],
  );
  if (!res.rows[0]) return null;
  return { id: Number(res.rows[0].id), displayOrder: Number(res.rows[0].displayOrder) || 0 };
};

const patchProductSeo = async (id, payload = {}) => {
  await ensureSeoColumns();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const seoTitle = payload.seoTitle === undefined ? null : String(payload.seoTitle || "").trim() || null;
  const seoDescription =
    payload.seoDescription === undefined ? null : String(payload.seoDescription || "").trim() || null;
  const res = await query(
    `
    UPDATE products
    SET seo_title = $2, seo_description = $3, updated_at = NOW()
    WHERE id = $1
    RETURNING id, seo_title AS "seoTitle", seo_description AS "seoDescription"
    `,
    [numericId, seoTitle, seoDescription],
  );
  if (!res.rows[0]) return null;
  return {
    id: Number(res.rows[0].id),
    seoTitle: res.rows[0].seoTitle || null,
    seoDescription: res.rows[0].seoDescription || null,
  };
};

const deleteAllProducts = async () => {
  const result = await query("DELETE FROM products");
  return Number(result.rowCount ?? 0);
};

/** Удаление по таксономии админки: подкатегория — только лист; только категория — корень и все дочерние. */
const deleteProductsByCategoryScope = async ({ categoryId = null, subcategoryId = null }) => {
  const subId = subcategoryId ? Number(subcategoryId) : null;
  const catId = categoryId ? Number(categoryId) : null;
  if (subId) {
    const result = await query(`DELETE FROM products WHERE category_id = $1`, [subId]);
    return Number(result.rowCount ?? 0);
  }
  if (catId) {
    const result = await query(
      `
      DELETE FROM products p
      USING categories c
      WHERE c.id = p.category_id
        AND (p.category_id = $1 OR c.parent_id = $1)
      `,
      [catId],
    );
    return Number(result.rowCount ?? 0);
  }
  return 0;
};

const listActiveProductSlugs = async () => {
  const result = await query(
    `
    SELECT p.slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories parent ON parent.id = c.parent_id
    WHERE p.is_active = TRUE
      AND p.slug IS NOT NULL
      AND TRIM(p.slug) <> ''
      AND lower(coalesce(parent.name, c.name, '')) NOT LIKE '%погонаж%'
      AND lower(coalesce(parent.slug, c.slug, '')) NOT LIKE '%погонаж%'
      AND lower(coalesce(parent.slug, c.slug, '')) NOT LIKE '%pogonazh%'
      AND lower(coalesce(parent.slug, c.slug, '')) NOT LIKE '%molding%'
      AND lower(coalesce(parent.slug, c.slug, '')) NOT LIKE '%trim%'
    ORDER BY p.id ASC
    `,
  );
  return result.rows.map((row) => String(row.slug));
};

/** Публичный список фабрик (производителей) для витрины: имя, число моделей, обложка. */
const listPublicManufacturers = async ({
  categoryRootSlug = null,
  manufacturerNames = null,
} = {}) => {
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const whereParts = [
    "p.is_active = TRUE",
    storefrontListedProductPredicatesSql,
    `TRIM(COALESCE(p.attrs->>'manufacturer', '')) <> ''`,
  ];

  if (categoryRootSlug) {
    whereParts.push(`COALESCE(parent.slug, c.slug) = ${addParam(String(categoryRootSlug).trim())}`);
  }

  if (Array.isArray(manufacturerNames) && manufacturerNames.length > 0) {
    const normalizedNames = manufacturerNames
      .map((name) => String(name || "").trim().toLowerCase())
      .filter(Boolean);
    if (normalizedNames.length > 0) {
      whereParts.push(
        `LOWER(TRIM(p.attrs->>'manufacturer')) = ANY(${addParam(normalizedNames)}::text[])`,
      );
    }
  }

  const res = await query(
    `
    WITH ranked AS (
      SELECT
        TRIM(p.attrs->>'manufacturer') AS name,
        ${productImageSubquery} AS image,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(p.attrs->>'manufacturer'))
          ORDER BY ${displayOrderExpr} DESC, p.id ASC
        ) AS rn,
        COUNT(*) OVER (PARTITION BY LOWER(TRIM(p.attrs->>'manufacturer'))) AS product_count
      FROM products p
      ${taxonomyJoin}
      WHERE ${whereParts.join(" AND ")}
    )
    SELECT
      name,
      product_count::int AS "productCount",
      NULLIF(TRIM(image), '') AS "coverImage"
    FROM ranked
    WHERE rn = 1
    ORDER BY name ASC
    `,
    params,
  );
  return res.rows.map((row) => ({
    name: String(row.name || "").trim(),
    productCount: Number(row.productCount) || 0,
    coverImage: row.coverImage ? String(row.coverImage) : null,
  }));
};

/** Публичный список коллекций производителя в рамках категории. */
const listPublicCollections = async ({
  categoryRootSlug = null,
  manufacturerName = null,
  collectionAttrCode = "collection",
} = {}) => {
  const attrCode = String(collectionAttrCode || "collection").trim() || "collection";
  if (!/^[a-z0-9_]+$/i.test(attrCode)) {
    return [];
  }
  const collectionExpr = `p.attrs->>'${attrCode}'`;

  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const manufacturerTrimmed = String(manufacturerName || "").trim();
  if (!manufacturerTrimmed) return [];

  const whereParts = [
    "p.is_active = TRUE",
    storefrontListedProductPredicatesSql,
    `TRIM(COALESCE(${collectionExpr}, '')) <> ''`,
    `LOWER(TRIM(COALESCE(p.attrs->>'manufacturer', ''))) = LOWER(${addParam(manufacturerTrimmed)})`,
  ];

  if (categoryRootSlug) {
    whereParts.push(`COALESCE(parent.slug, c.slug) = ${addParam(String(categoryRootSlug).trim())}`);
  }

  const res = await query(
    `
    WITH ranked AS (
      SELECT
        TRIM(${collectionExpr}) AS name,
        ${productImageSubquery} AS image,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(${collectionExpr}))
          ORDER BY ${displayOrderExpr} DESC, p.id ASC
        ) AS rn,
        COUNT(*) OVER (PARTITION BY LOWER(TRIM(${collectionExpr}))) AS product_count
      FROM products p
      ${taxonomyJoin}
      WHERE ${whereParts.join(" AND ")}
    )
    SELECT
      name,
      product_count::int AS "productCount",
      NULLIF(TRIM(image), '') AS "coverImage"
    FROM ranked
    WHERE rn = 1
    ORDER BY name ASC
    `,
    params,
  );
  return res.rows.map((row) => ({
    name: String(row.name || "").trim(),
    productCount: Number(row.productCount) || 0,
    coverImage: row.coverImage ? String(row.coverImage) : null,
  }));
};

module.exports = {
  listProducts,
  listFilterMeta,
  listActiveProductSlugs,
  listPublicManufacturers,
  listPublicCollections,
  getProductById,
  getProductBySlug,
  listAdminProducts,
  getAdminProductById,
  listProductsTable,
  listProductsForExport,
  listProductAttributeDistinctValues,
  createProduct,
  updateProduct,
  upsertProductBySku,
  patchProductBadges,
  patchProductSale,
  patchProductDisplayOrder,
  patchProductSeo,
  deleteAllProducts,
  deleteProductsByCategoryScope,
  splitCategoryId,
};

const { withTransaction } = require("./postgres");

/**
 * Чистая схема для каталога дверей.
 *
 *   categories         — единое дерево (вход/межком/фурнитура + дочерние «подкатегории»).
 *   catalog_pages      — витрины: scope = массив slug категорий + список filter-codes.
 *   attribute_definitions
 *                      — словарь характеристик с inline-options (JSONB) и scope
 *                        (product/variant) вместо четырёх булевых флагов.
 *   products           — карточка модели (одна комбинация цвет/стекло и т.п.). attrs — JSONB.
 *                        model_key группирует варианты одной модели (переключатели цвета и стекла).
 *   product_images     — единственный источник изображений (product.image_url нет).
 *   product_variants   — размер/открывание; attrs — JSONB.
 *
 * Старая схема (14 таблиц с EAV + audit_log + 3 M2M) сносится целиком.
 */

const dropLegacySql = `
DROP TABLE IF EXISTS
  audit_log,
  product_variant_attribute_values,
  product_attribute_values,
  service_rows,
  service_sections,
  portfolio_images,
  portfolio_projects,
  promotion_banners,
  product_images,
  product_variants,
  products,
  catalog_page_labels,
  catalog_page_filter_attributes,
  catalog_page_subcategories,
  catalog_page_categories,
  catalog_pages,
  attribute_options,
  attribute_definitions,
  subcategories,
  categories
CASCADE;

DROP FUNCTION IF EXISTS log_row_change() CASCADE;
`;

const createSchemaSql = `
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT categories_parent_name_unique UNIQUE (parent_id, name)
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE TABLE catalog_pages (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_slugs TEXT[] NOT NULL DEFAULT '{}'::text[],
  filter_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_catalog_pages_category_slugs ON catalog_pages USING gin (category_slugs);

CREATE TABLE catalog_page_labels (
  id BIGSERIAL PRIMARY KEY,
  catalog_page_id BIGINT NOT NULL REFERENCES catalog_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_catalog_page_labels_catalog_page_id ON catalog_page_labels(catalog_page_id);

CREATE TABLE promotion_banners (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  background_image_url TEXT NOT NULL,
  catalog_page_slug TEXT NOT NULL DEFAULT 'all',
  filter_manufacturer TEXT,
  filter_collection TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotion_banners_active_sort ON promotion_banners(is_active, sort_order);

CREATE TABLE attribute_definitions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'option', 'boolean')),
  unit TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope TEXT NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'variant')),
  is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_on_product BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  model_key TEXT,
  price INTEGER NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  badges TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_on_sale BOOLEAN NOT NULL DEFAULT FALSE,
  compare_at_price INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_model_key ON products(model_key) WHERE model_key IS NOT NULL;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_slug ON products(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_products_attrs ON products USING gin (attrs jsonb_path_ops);

CREATE TABLE product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, image_url)
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  price INTEGER,
  image_url TEXT,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_attrs ON product_variants USING gin (attrs jsonb_path_ops);

CREATE TABLE portfolio_projects (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE portfolio_images (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id, image_url)
);

CREATE INDEX idx_portfolio_images_project_id ON portfolio_images(project_id);

CREATE TABLE service_sections (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_rows (
  id BIGSERIAL PRIMARY KEY,
  section_id BIGINT NOT NULL REFERENCES service_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_service_rows_section_id ON service_rows(section_id);
`;

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, "-")
    .replace(/[^a-zа-я0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const seedTaxonomy = async (client) => {
  const rootCategories = [
    { name: "Входные двери", slug: "entry-doors" },
    { name: "Межкомнатные двери", slug: "interior-doors" },
    { name: "Фурнитура", slug: "fittings" },
  ];

  const subcategoryMap = {
    "entry-doors": [
      { name: "Премиум", slug: "premium" },
      { name: "Стандарт", slug: "standard" },
    ],
    "interior-doors": [
      { name: "Classic", slug: "interior-classic" },
      { name: "Modern", slug: "interior-modern" },
    ],
    fittings: [{ name: "Ручки", slug: "handles" }],
  };

  const rootIds = {};
  let order = 0;
  for (const cat of rootCategories) {
    order += 10;
    const res = await client.query(
      `INSERT INTO categories(parent_id, name, slug, sort_order)
       VALUES (NULL, $1, $2, $3) RETURNING id`,
      [cat.name, cat.slug, order],
    );
    rootIds[cat.slug] = Number(res.rows[0].id);
  }

  const childIds = {};
  for (const [parentSlug, subs] of Object.entries(subcategoryMap)) {
    let subOrder = 0;
    for (const sub of subs) {
      subOrder += 10;
      const res = await client.query(
        `INSERT INTO categories(parent_id, name, slug, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [rootIds[parentSlug], sub.name, sub.slug, subOrder],
      );
      childIds[sub.slug] = Number(res.rows[0].id);
    }
  }

  return { rootIds, childIds };
};

const seedAttributes = async (client) => {
  const attrs = [
    {
      code: "thickness",
      name: "Толщина полотна",
      type: "number",
      unit: "мм",
      scope: "product",
      isFilterable: true,
    },
    {
      code: "width",
      name: "Ширина",
      type: "number",
      unit: "мм",
      scope: "product",
      isFilterable: true,
    },
    {
      code: "height",
      name: "Высота",
      type: "number",
      unit: "мм",
      scope: "product",
      isFilterable: true,
    },
    {
      code: "color",
      name: "Цвет",
      type: "option",
      unit: null,
      scope: "product",
      isFilterable: true,
      options: [],
    },
    {
      code: "glass",
      name: "Стекло",
      type: "option",
      unit: null,
      scope: "product",
      isFilterable: true,
      options: [],
    },
    {
      code: "fill",
      name: "Наполнение",
      type: "option",
      unit: null,
      scope: "product",
      isFilterable: true,
      options: ["Пенопласт", "Минеральная плита"],
    },
    {
      code: "glazing",
      name: "Со стеклопакетом",
      type: "boolean",
      unit: null,
      scope: "product",
      isFilterable: true,
    },
    {
      code: "manufacturer",
      name: "Производитель",
      type: "text",
      unit: null,
      scope: "product",
      isFilterable: true,
    },
    {
      code: "pogonazh_id",
      name: "Идентификатор погонажа",
      type: "text",
      unit: null,
      scope: "product",
      isFilterable: false,
    },
    {
      code: "size",
      name: "Размер",
      type: "option",
      unit: null,
      scope: "variant",
      isFilterable: false,
      options: ["800x2000", "860x2050", "900x2050", "600x2000", "700x2000"],
    },
    {
      code: "opening",
      name: "Открывание",
      type: "option",
      unit: null,
      scope: "variant",
      isFilterable: false,
      options: ["Левое", "Правое"],
    },
  ];

  const ids = {};
  let order = 0;
  for (const attr of attrs) {
    order += 10;
    const res = await client.query(
      `INSERT INTO attribute_definitions(code, name, type, unit, options, scope, is_filterable, sort_order)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING id`,
      [
        attr.code,
        attr.name,
        attr.type,
        attr.unit,
        JSON.stringify(attr.options || []),
        attr.scope,
        attr.isFilterable,
        order,
      ],
    );
    ids[attr.code] = Number(res.rows[0].id);
  }
  return ids;
};

const seedCatalogPages = async (client) => {
  const pages = [
    { slug: "all", name: "Общий каталог", categories: [], filters: [] },
    {
      slug: "vhodnye-dveri",
      name: "Входные двери",
      categories: ["entry-doors"],
      filters: ["color", "fill", "thickness", "manufacturer"],
    },
    {
      slug: "termo-dveri",
      name: "Уличные двери с терморазрывом",
      categories: ["entry-doors"],
      filters: ["color", "fill", "thickness"],
    },
    {
      slug: "dveri-mezhkomnatnyye",
      name: "Межкомнатные двери",
      categories: ["interior-doors"],
      filters: ["color", "glass", "width", "height", "manufacturer"],
    },
    {
      slug: "furnitura",
      name: "Фурнитура",
      categories: ["fittings"],
      filters: ["color", "manufacturer"],
    },
  ];

  let order = 0;
  for (const page of pages) {
    order += 10;
    await client.query(
      `INSERT INTO catalog_pages(slug, name, category_slugs, filter_codes, sort_order)
       VALUES ($1, $2, $3::text[], $4::text[], $5)`,
      [page.slug, page.name, page.categories, page.filters, order],
    );
  }
};

const seedDemoProducts = async (client, { rootIds, childIds }) => {
  const items = [
    {
      sku: "ENTRY-PREMIUM-01",
      name: "Премиум-вход «Сапфир»",
      categoryId: childIds.premium,
      modelKey: null,
      price: 84900,
      attrs: {
        color: "Чёрный",
        fill: "Минеральная плита",
        thickness: 80,
        width: 860,
        height: 2050,
        manufacturer: "Браво",
        glazing: "Нет",
      },
      images: ["https://picsum.photos/seed/entry-premium-01/600/800"],
      variants: [
        { sku: "ENTRY-PREMIUM-01-L", attrs: { size: "860x2050", opening: "Левое" } },
        { sku: "ENTRY-PREMIUM-01-R", attrs: { size: "860x2050", opening: "Правое" } },
      ],
    },
    {
      sku: "ENTRY-STANDARD-01",
      name: "Стандарт-вход «Аркадия»",
      categoryId: childIds.standard,
      modelKey: null,
      price: 42500,
      attrs: {
        color: "Графит",
        fill: "Пенопласт",
        thickness: 60,
        width: 860,
        height: 2050,
        manufacturer: "Браво",
        glazing: "Нет",
      },
      images: ["https://picsum.photos/seed/entry-standard-01/600/800"],
      variants: [
        { sku: "ENTRY-STANDARD-01-L", attrs: { size: "860x2050", opening: "Левое" } },
        { sku: "ENTRY-STANDARD-01-R", attrs: { size: "860x2050", opening: "Правое" } },
      ],
    },
    {
      sku: "BRAVO-CLASSIC-01-WHITE",
      name: "Браво Classic 01",
      categoryId: childIds["interior-classic"],
      modelKey: "bravo-classic-01",
      price: 18900,
      attrs: {
        color: "Белый",
        glass: "Прозрачное",
        width: 700,
        height: 2000,
        manufacturer: "Браво",
      },
      images: ["https://picsum.photos/seed/bravo-classic-01-white/600/800"],
      variants: [
        { sku: "BRAVO-CLASSIC-01-WHITE-700", attrs: { size: "700x2000", opening: "Левое" } },
        { sku: "BRAVO-CLASSIC-01-WHITE-800", attrs: { size: "800x2000", opening: "Левое" } },
      ],
    },
    {
      sku: "BRAVO-CLASSIC-01-WHITE-MATTE",
      name: "Браво Classic 01",
      categoryId: childIds["interior-classic"],
      modelKey: "bravo-classic-01",
      price: 19200,
      attrs: {
        color: "Белый",
        glass: "Матовое",
        width: 700,
        height: 2000,
        manufacturer: "Браво",
      },
      images: ["https://picsum.photos/seed/bravo-classic-01-white-matte/600/800"],
      variants: [
        { sku: "BRAVO-CLASSIC-01-WHITE-MATTE-700", attrs: { size: "700x2000", opening: "Левое" } },
        { sku: "BRAVO-CLASSIC-01-WHITE-MATTE-800", attrs: { size: "800x2000", opening: "Левое" } },
      ],
    },
    {
      sku: "BRAVO-CLASSIC-01-WALNUT",
      name: "Браво Classic 01",
      categoryId: childIds["interior-classic"],
      modelKey: "bravo-classic-01",
      price: 19500,
      attrs: { color: "Орех", width: 700, height: 2000, manufacturer: "Браво" },
      images: ["https://picsum.photos/seed/bravo-classic-01-walnut/600/800"],
      variants: [
        { sku: "BRAVO-CLASSIC-01-WALNUT-700", attrs: { size: "700x2000", opening: "Правое" } },
      ],
    },
    {
      sku: "BRAVO-MODERN-02-GREY",
      name: "Браво Modern 02",
      categoryId: childIds["interior-modern"],
      modelKey: null,
      price: 23900,
      attrs: { color: "Серый", width: 800, height: 2000, manufacturer: "Браво" },
      images: ["https://picsum.photos/seed/bravo-modern-02-grey/600/800"],
      variants: [
        { sku: "BRAVO-MODERN-02-GREY-800", attrs: { size: "800x2000", opening: "Левое" } },
      ],
    },
    {
      sku: "HANDLE-CLASSIC-01",
      name: "Ручка Classic 01",
      categoryId: childIds.handles,
      modelKey: null,
      price: 1490,
      attrs: { color: "Графит", manufacturer: "Браво" },
      images: ["https://picsum.photos/seed/handle-classic-01/600/600"],
      variants: [],
    },
  ];

  void rootIds;

  for (const item of items) {
    const res = await client.query(
      `INSERT INTO products(category_id, sku, name, model_key, price, attrs, is_active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, TRUE)
       RETURNING id`,
      [item.categoryId, item.sku, item.name, item.modelKey, item.price, JSON.stringify(item.attrs)],
    );
    const productId = Number(res.rows[0].id);

    for (let i = 0; i < item.images.length; i += 1) {
      await client.query(
        `INSERT INTO product_images(product_id, image_url, sort_order)
         VALUES ($1, $2, $3)`,
        [productId, item.images[i], i * 10],
      );
    }

    let variantOrder = 0;
    for (const variant of item.variants) {
      variantOrder += 10;
      await client.query(
        `INSERT INTO product_variants(product_id, sku, price, image_url, attrs, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE)`,
        [
          productId,
          variant.sku,
          variant.price ?? null,
          variant.imageUrl ?? null,
          JSON.stringify(variant.attrs || {}),
          variantOrder,
        ],
      );
    }
  }
};

const seedServices = async (client) => {
  const { DEFAULT_SERVICE_SECTIONS } = require("../domain/defaultServices");
  for (const section of DEFAULT_SERVICE_SECTIONS) {
    const sectionRes = await client.query(
      `INSERT INTO service_sections(title, sort_order) VALUES ($1, $2) RETURNING id`,
      [section.title, section.sortOrder],
    );
    const sectionId = Number(sectionRes.rows[0].id);
    let rowOrder = 0;
    for (const row of section.rows) {
      rowOrder += 10;
      await client.query(
        `
        INSERT INTO service_rows(section_id, name, price, notes, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [sectionId, row.name, row.price, row.notes, rowOrder],
      );
    }
  }
};

const initSchema = async () => {
  await withTransaction(async (client) => {
    await client.query(dropLegacySql);
    await client.query(createSchemaSql);
    const taxonomy = await seedTaxonomy(client);
    await seedAttributes(client);
    await seedCatalogPages(client);
    await seedDemoProducts(client, taxonomy);
    await seedServices(client);
  });
};

module.exports = { initSchema, slugify };

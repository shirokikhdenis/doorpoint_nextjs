const { formatDveriProductDisplayTitle } = require("./dveri-product-display.js");

const DEFAULT_DVERI_PRICING_RULE = {
  multiplier: 1,
  roundUpTo: null,
  adjustment: 0,
};

const normalizePricingRule = (raw) => {
  const multiplier = Number(raw?.multiplier ?? DEFAULT_DVERI_PRICING_RULE.multiplier);
  const roundRaw = raw?.roundUpTo;
  const roundUpTo =
    roundRaw === null || roundRaw === undefined || roundRaw === 0
      ? null
      : Math.max(1, Math.round(Number(roundRaw)));
  const adjustment = Math.round(Number(raw?.adjustment ?? 0));

  return {
    multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : DEFAULT_DVERI_PRICING_RULE.multiplier,
    roundUpTo: roundUpTo != null && Number.isFinite(roundUpTo) ? roundUpTo : null,
    adjustment: Number.isFinite(adjustment) ? adjustment : 0,
  };
};

const computeRetailPrice = (dealerPrice, rule) => {
  const dealer = Number(dealerPrice ?? 0);
  if (!Number.isFinite(dealer) || dealer <= 0) return null;

  const normalized = normalizePricingRule(rule);
  let price = dealer * normalized.multiplier;

  if (normalized.roundUpTo != null && normalized.roundUpTo > 0) {
    price = Math.ceil(price / normalized.roundUpTo) * normalized.roundUpTo;
  }

  price += normalized.adjustment;
  const result = Math.round(price);
  return result > 0 ? result : null;
};

const resolveCategoryPricingRule = (categoryId, categories, rules) => {
  const byId = new Map(categories.map((cat) => [cat.id, cat]));
  let current = categoryId ?? null;

  while (current != null) {
    const override = rules.categoryRules[String(current)];
    if (override) return normalizePricingRule(override);
    const cat = byId.get(current);
    current = cat?.parentId ?? null;
  }

  return normalizePricingRule(rules.defaultRule);
};

const lookupStorefrontPrice = (vendorCode, storefrontPrices) => {
  const code = String(vendorCode || "").trim();
  if (!code || !storefrontPrices) return null;
  const price = storefrontPrices[code];
  return price != null && price > 0 ? price : null;
};

const getCategorySubtreeIds = (rootCategoryId, categories) => {
  const byParent = new Map();
  for (const category of categories) {
    const parentId = category.parentId ?? null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(category);
    byParent.set(parentId, siblings);
  }

  const ids = new Set();
  const walk = (categoryId) => {
    ids.add(categoryId);
    for (const child of byParent.get(categoryId) ?? []) {
      walk(child.id);
    }
  };
  walk(rootCategoryId);
  return ids;
};

const filterProductsByCategorySubtree = (products, categories, categoryId) => {
  if (!products || categoryId == null) return [];
  const subtreeIds = getCategorySubtreeIds(categoryId, categories);
  return products.filter(
    (product) => product.categoryId != null && subtreeIds.has(product.categoryId),
  );
};

const expandProductCompareLines = (product) => {
  if (product.options.length > 0) {
    return product.options
      .filter((option) => String(option.vendorCode || "").trim())
      .map((option) => ({
        product,
        vendorCode: String(option.vendorCode).trim(),
        optionTitle: option.title || null,
        dealerPrice: option.priceDealerFinal,
      }));
  }

  const vendorCode = String(product.vendorCode || "").trim();
  if (!vendorCode) return [];

  return [
    {
      product,
      vendorCode,
      optionTitle: null,
      dealerPrice: product.priceDealerFinal,
    },
  ];
};

const compareReconcileRows = (a, b) =>
  a.productTitle.localeCompare(b.productTitle, "ru") ||
  String(a.optionTitle ?? "").localeCompare(String(b.optionTitle ?? ""), "ru") ||
  a.vendorCode.localeCompare(b.vendorCode, "ru");

const compareReconcileRowsByDiff = (a, b) => {
  const diffOrder = Math.abs(b.diff) - Math.abs(a.diff);
  if (diffOrder !== 0) return diffOrder;
  return compareReconcileRows(a, b);
};

const buildDveriPriceReconcileReport = ({
  products,
  categories,
  pricingRules,
  storefrontPrices,
  categoryId,
}) => {
  if (categoryId == null) return null;

  const category = categories.find((item) => item.id === categoryId);
  if (!category) return null;

  const inCategory = filterProductsByCategorySubtree(products, categories, categoryId);
  const matches = [];
  const storefrontLower = [];
  const storefrontHigher = [];
  let skippedNoStorefront = 0;
  let skippedNoCalculated = 0;

  for (const product of inCategory) {
    const rule = resolveCategoryPricingRule(product.categoryId, categories, pricingRules);

    for (const line of expandProductCompareLines(product)) {
      const calculatedPrice = computeRetailPrice(line.dealerPrice, rule);
      const storefrontPrice = lookupStorefrontPrice(line.vendorCode, storefrontPrices);

      if (calculatedPrice == null) {
        skippedNoCalculated += 1;
        continue;
      }
      if (storefrontPrice == null) {
        skippedNoStorefront += 1;
        continue;
      }

      const diff = storefrontPrice - calculatedPrice;
      const status = diff === 0 ? "match" : diff < 0 ? "storefront_lower" : "storefront_higher";

      const row = {
        productId: product.id,
        productTitle: formatDveriProductDisplayTitle(product),
        vendorCode: line.vendorCode,
        optionTitle: line.optionTitle,
        categoryPath: product.categoryPath,
        dealerPrice: line.dealerPrice,
        calculatedPrice,
        storefrontPrice,
        diff,
        status,
      };

      if (status === "match") matches.push(row);
      else if (status === "storefront_lower") storefrontLower.push(row);
      else storefrontHigher.push(row);
    }
  }

  matches.sort(compareReconcileRows);
  storefrontLower.sort(compareReconcileRowsByDiff);
  storefrontHigher.sort(compareReconcileRowsByDiff);

  return {
    categoryId,
    categoryTitle: category.path || category.title,
    totalCompared: matches.length + storefrontLower.length + storefrontHigher.length,
    matchCount: matches.length,
    storefrontLowerCount: storefrontLower.length,
    storefrontHigherCount: storefrontHigher.length,
    skippedNoStorefront,
    skippedNoCalculated,
    matches,
    storefrontLower,
    storefrontHigher,
  };
};

module.exports = {
  buildDveriPriceReconcileReport,
  filterProductsByCategorySubtree,
  getCategorySubtreeIds,
};

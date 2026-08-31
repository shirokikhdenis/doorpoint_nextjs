const productRepository = require("../repositories/productRepository");
const { formatProductDisplayName } = require("../../product-display-name");
const { slugifyPart } = require("../domain/productSlug");
const { resolveAbsoluteUrl, buildProductPageUrl } = require("../vk/vkPayloadBuilder");

const getSiteUrl = () => {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (fromEnv) {
    if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) return fromEnv;
    return `https://${fromEnv}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const categoryIdFor = (name) => slugifyPart(String(name || "").trim()) || "dveri";

const productPicture = (product) =>
  (Array.isArray(product.imageUrls) && product.imageUrls.find(Boolean)) ||
  product.primaryImageUrl ||
  "";

const isExportableProduct = (product, siteUrl) => {
  if (product.isActive === false) return false;
  const category = String(product.category || "").toLowerCase();
  if (category.includes("погонаж")) return false;
  const picture = resolveAbsoluteUrl(productPicture(product), siteUrl);
  const url = buildProductPageUrl(product, siteUrl);
  const price = Math.max(0, Math.round(Number(product.price) || 0));
  return Boolean(picture && url && price);
};

const offerXml = (product, siteUrl) => {
  const picture = resolveAbsoluteUrl(productPicture(product), siteUrl);
  const url = buildProductPageUrl(product, siteUrl);
  if (!picture || !url || product.isActive === false) return "";

  const attrs = product.attributes && typeof product.attributes === "object" ? product.attributes : {};
  const name = formatProductDisplayName({
    name: product.name,
    color: attrs.color,
    glass: attrs.glass,
    manufacturer: attrs.manufacturer,
    category: product.category,
  });
  const vendor = String(attrs.manufacturer || "").trim();
  const price = Math.max(0, Math.round(Number(product.price) || 0));
  if (!price) return "";

  const lines = [
    `    <offer id="${xmlEscape(product.sku || product.id)}" available="true">`,
    `      <url>${xmlEscape(url)}</url>`,
    `      <price>${price}</price>`,
  ];
  if (
    product.isOnSale &&
    product.compareAtPrice &&
    Number(product.compareAtPrice) > price
  ) {
    lines.push(`      <oldprice>${Math.round(Number(product.compareAtPrice))}</oldprice>`);
  }
  lines.push(`      <currencyId>RUR</currencyId>`);
  lines.push(
    `      <categoryId>${xmlEscape(categoryIdFor(product.category || "Двери"))}</categoryId>`,
  );
  lines.push(`      <picture>${xmlEscape(picture)}</picture>`);
  lines.push(`      <name>${xmlEscape(name)}</name>`);
  if (vendor) lines.push(`      <vendor>${xmlEscape(vendor)}</vendor>`);
  if (product.sku) lines.push(`      <vendorCode>${xmlEscape(product.sku)}</vendorCode>`);
  lines.push(`    </offer>`);
  return lines.join("\n");
};

const buildYandexYml = async () => {
  const siteUrl = getSiteUrl();
  const products = (await productRepository.listProductsForExport({})).filter((product) =>
    isExportableProduct(product, siteUrl),
  );
  const categories = new Map();
  for (const product of products) {
    const name = String(product.category || "Двери").trim() || "Двери";
    const id = categoryIdFor(name);
    if (!categories.has(id)) categories.set(id, name);
  }
  if (categories.size === 0) categories.set("dveri", "Двери");
  const categoryXml = [...categories.entries()]
    .map(([id, name]) => `      <category id="${xmlEscape(id)}">${xmlEscape(name)}</category>`)
    .join("\n");
  const offers = products
    .map((product) => offerXml(product, siteUrl))
    .filter(Boolean)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<yml_catalog date="${new Date().toISOString().slice(0, 16)}">`,
    `  <shop>`,
    `    <name>Дверная Точка</name>`,
    `    <company>Дверная Точка</company>`,
    `    <url>${xmlEscape(siteUrl)}</url>`,
    `    <currencies>`,
    `      <currency id="RUR" rate="1"/>`,
    `    </currencies>`,
    `    <categories>`,
    categoryXml,
    `    </categories>`,
    `    <offers>`,
    offers,
    `    </offers>`,
    `  </shop>`,
    `</yml_catalog>`,
    ``,
  ].join("\n");
};

module.exports = {
  buildYandexYml,
};

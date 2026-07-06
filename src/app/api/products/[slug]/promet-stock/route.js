import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService");
const prometStockService = require("@/lib/server/services/prometStockService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const PROMET_MANUFACTURER = "Промет";

const isPrometProduct = (product) => {
  const manufacturerName = String(product.manufacturerName || "").trim();
  if (manufacturerName === PROMET_MANUFACTURER) return true;
  const manufacturerAttr = (product.attributes || []).find((attr) => attr.code === "manufacturer");
  return String(manufacturerAttr?.value || "").trim() === PROMET_MANUFACTURER;
};

const resolveManufacturerArticle = (product, variantSku) => {
  const legacyProductArticle = String(product.manufacturerId || "").trim();
  const requestedSku = String(variantSku || "").trim();
  if (requestedSku) {
    const variant = (product.variants || []).find((item) => String(item.sku) === requestedSku);
    const variantArticle = String(variant?.manufacturerId || "").trim();
    if (variantArticle) return variantArticle;
  }
  const firstVariantArticle = (product.variants || [])
    .map((item) => String(item.manufacturerId || "").trim())
    .find(Boolean);
  return legacyProductArticle || firstVariantArticle || "";
};

export const GET = async (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Not found" }, 404);
    }

    const params = await context.params;
    const variantSku = new URL(request.url).searchParams.get("variantSku");
    const product = await catalogService.getProductByRef(params.slug);
    if (!product) {
      return json({ message: "Product not found" }, 404);
    }

    if (!isPrometProduct(product)) {
      return json({ found: false, reason: "not_promet" });
    }

    const article = resolveManufacturerArticle(product, variantSku);
    if (!article) {
      return json({
        found: false,
        reason: "no_manufacturer_id",
        message: "Заполните variant_attr:manufacturer_id (Артикул Promet) для варианта",
      });
    }

    const stockResult = await prometStockService.getStockByArticle(article);
    if (!stockResult.ok) {
      return json(
        {
          found: false,
          reason: "service_error",
          message: stockResult.message || stockResult.error,
        },
        stockResult.status || 502,
      );
    }

    if (!stockResult.found) {
      return json({
        found: false,
        reason: "not_in_promet",
        article,
        message: "Остаток не найден в Promet",
        actualAt: stockResult.actualAt,
        cached: stockResult.cached,
      });
    }

    return json(stockResult);
  });

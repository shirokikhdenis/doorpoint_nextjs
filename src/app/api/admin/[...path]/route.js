import { createRequire } from "node:module";
import { invalidateStorefrontCache } from "@/lib/server/cache/invalidate-storefront";

const require = createRequire(import.meta.url);
const adminService = require("@/lib/server/services/adminService");
const csvImportService = require("@/lib/server/services/csvImportService");
const promotionService = require("@/lib/server/services/promotionService");
const leadService = require("@/lib/server/services/leadService");
const { withErrorHandling, json, empty, getQuery, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const match = (path, method, expectedMethod, ...segments) =>
  method === expectedMethod && path.length === segments.length && segments.every((s, i) => path[i] === s);

const handle = async (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const params = await context.params;
    const path = Array.isArray(params.path) ? params.path : [];
    const query = getQuery(request);
    const body = await readBody(request);
    const method = request.method;

    if (match(path, method, "GET", "bootstrap")) return json(await adminService.listBootstrap());
    if (match(path, method, "GET", "attributes")) return json(await adminService.listAttributes());
    if (match(path, method, "POST", "catalog-pages")) {
      const created = await adminService.createCatalogPage(body);
      await invalidateStorefrontCache("catalog-pages");
      return json(created, 201);
    }
    if (path[0] === "catalog-pages" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateCatalogPage(Number(path[1]), body);
      if (!updated) return json({ message: "Catalog page not found" }, 404);
      await invalidateStorefrontCache("catalog-pages");
      return json(updated);
    }
    if (path[0] === "catalog-pages" && path.length === 2 && method === "DELETE") {
      const deleted = await adminService.deleteCatalogPage(Number(path[1]));
      if (!deleted) return json({ message: "Catalog page not found or cannot delete default page" }, 404);
      await invalidateStorefrontCache("catalog-pages");
      return empty(204);
    }

    if (match(path, method, "GET", "catalog-page-labels")) {
      if (!query.catalogPageId) return json({ message: "catalogPageId is required" }, 400);
      const result = await adminService.listCatalogPageLabels(query.catalogPageId);
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      return json(result.labels);
    }
    if (match(path, method, "POST", "catalog-page-labels")) {
      const result = await adminService.createCatalogPageLabel(body);
      if (!result.ok) return json({ message: result.message }, result.status || 400);
      await invalidateStorefrontCache("catalog-pages");
      return json(result.label, 201);
    }
    if (path[0] === "catalog-page-labels" && path.length === 2 && method === "PUT") {
      const result = await adminService.updateCatalogPageLabel(Number(path[1]), body);
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      await invalidateStorefrontCache("catalog-pages");
      return json(result.label);
    }
    if (path[0] === "catalog-page-labels" && path.length === 2 && method === "DELETE") {
      const result = await adminService.deleteCatalogPageLabel(Number(path[1]));
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      await invalidateStorefrontCache("catalog-pages");
      return empty(204);
    }

    if (match(path, method, "POST", "categories")) {
      const created = await adminService.createCategory(body);
      await invalidateStorefrontCache("products");
      return json(created, 201);
    }
    if (path[0] === "categories" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateCategory(Number(path[1]), body);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "categories" && path.length === 2 && method === "DELETE") {
      const result = await adminService.deleteCategory(Number(path[1]));
      if (result.ok) {
        await invalidateStorefrontCache("products");
        return empty(204);
      }
      if (result.reason === "not_found") return json({ message: "Category not found" }, 404);
      if (result.reason === "category_in_use") {
        return json(
          {
            message: `В категории и её подкатегориях ещё ${result.productsCount} товаров. Перенесите или удалите их сначала.`,
            ...result,
          },
          409,
        );
      }
      return json({ message: "Не удалось удалить категорию", ...result }, 400);
    }

    if (match(path, method, "POST", "subcategories")) {
      const created = await adminService.createSubcategory(body);
      await invalidateStorefrontCache("products");
      return json(created, 201);
    }
    if (path[0] === "subcategories" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateSubcategory(Number(path[1]), body);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "subcategories" && path.length === 2 && method === "DELETE") {
      const result = await adminService.deleteSubcategory(Number(path[1]));
      if (result.ok) {
        await invalidateStorefrontCache("products");
        return empty(204);
      }
      if (result.reason === "not_found") return json({ message: "Subcategory not found" }, 404);
      if (result.reason === "subcategory_in_use") {
        return json(
          {
            message: `В подкатегории ещё ${result.productsCount} товаров. Перенесите или удалите их сначала.`,
            ...result,
          },
          409,
        );
      }
      return json({ message: "Не удалось удалить подкатегорию", ...result }, 400);
    }

    if (match(path, method, "POST", "attributes")) {
      const created = await adminService.createAttribute(body);
      await invalidateStorefrontCache("products");
      return json(created, 201);
    }
    if (path[0] === "attributes" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateAttribute(Number(path[1]), body);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (match(path, method, "POST", "attribute-options")) {
      const created = await adminService.createAttributeOption(body);
      await invalidateStorefrontCache("products");
      return json(created, 201);
    }

    if (match(path, method, "POST", "products")) {
      const created = await adminService.createProduct(body);
      await invalidateStorefrontCache("products");
      return json(created, 201);
    }
    if (match(path, method, "DELETE", "products")) {
      const rawSub = query.subcategoryId;
      const rawCat = query.categoryId;
      const subStr = rawSub !== undefined && rawSub !== null ? String(rawSub).trim() : "";
      const catStr = rawCat !== undefined && rawCat !== null ? String(rawCat).trim() : "";
      const hasScopeQuery = subStr !== "" || catStr !== "";
      if (hasScopeQuery) {
        const subNum = subStr !== "" ? Number(subStr) : null;
        const catNum = catStr !== "" ? Number(catStr) : null;
        const scopedOk =
          (subNum != null && Number.isFinite(subNum) && subNum > 0) ||
          (catNum != null && Number.isFinite(catNum) && catNum > 0);
        if (!scopedOk) return json({ message: "Некорректный categoryId или subcategoryId" }, 400);
        const deleted = await adminService.deleteProductsByCategoryScope(query);
        await invalidateStorefrontCache("products");
        return json({ deleted });
      }
      const deleted = await adminService.deleteAllProducts();
      await invalidateStorefrontCache("products");
      return json({ deleted });
    }
    if (path[0] === "products" && path.length === 3 && path[2] === "display-order" && method === "PATCH") {
      const updated = await adminService.patchProductDisplayOrder(Number(path[1]), body);
      if (!updated) return json({ message: "Product not found" }, 404);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "products" && path.length === 3 && path[2] === "badges" && method === "PATCH") {
      if (!Array.isArray(body.badges)) {
        return json({ message: "badges must be an array" }, 400);
      }
      const updated = await adminService.patchProductBadges(Number(path[1]), body);
      if (!updated) return json({ message: "Product not found" }, 404);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "products" && path.length === 3 && path[2] === "sale" && method === "PATCH") {
      const updated = await adminService.patchProductSale(Number(path[1]), body);
      if (updated?.error) return json({ message: updated.error }, 400);
      if (!updated) return json({ message: "Product not found" }, 404);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "products" && path.length === 3 && path[2] === "seo" && method === "PATCH") {
      const updated = await adminService.patchProductSeo(Number(path[1]), body);
      if (!updated) return json({ message: "Product not found" }, 404);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "products" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateProduct(Number(path[1]), body);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (path[0] === "products" && path.length === 2 && method === "GET") {
      const product = await adminService.getProductForEdit(Number(path[1]));
      return product ? json(product) : json({ message: "Product not found" }, 404);
    }

    if (match(path, method, "GET", "products-table")) return json(await adminService.getProductsTable(query));
    if (match(path, method, "GET", "sale-settings")) return json(await adminService.getSaleSettings());
    if (match(path, method, "PATCH", "sale-settings")) {
      const updated = await adminService.updateSaleSettings(body);
      await invalidateStorefrontCache("products");
      return json(updated);
    }
    if (match(path, method, "GET", "product-attribute-values")) {
      if (!String(query.code || "").trim()) {
        return json({ message: "code is required" }, 400);
      }
      return json(await adminService.getProductAttributeDistinctValues(query));
    }
    if (match(path, method, "POST", "import", "csv")) {
      if (!Array.isArray(body.rows)) return json({ message: "rows must be an array" }, 400);
      const result = await csvImportService.importRows(body.rows);
      await invalidateStorefrontCache("products");
      return json(result);
    }

    if (match(path, method, "GET", "promotions")) {
      return json(await promotionService.listAllPromotions());
    }
    if (match(path, method, "POST", "promotions")) {
      const result = await promotionService.createPromotion(body);
      if (!result.ok) return json({ message: result.message }, 400);
      await invalidateStorefrontCache("promotions");
      return json(result.banner, 201);
    }
    if (path[0] === "promotions" && path.length === 2 && method === "PUT") {
      const result = await promotionService.updatePromotion(Number(path[1]), body);
      if (!result.ok) return json({ message: result.message }, result.status || 400);
      await invalidateStorefrontCache("promotions");
      return json(result.banner);
    }
    if (path[0] === "promotions" && path.length === 2 && method === "DELETE") {
      const result = await promotionService.deletePromotion(Number(path[1]));
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      await invalidateStorefrontCache("promotions");
      return empty(204);
    }
    if (match(path, method, "PATCH", "promotions", "reorder")) {
      const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
      const result = await promotionService.reorderPromotions(orderedIds);
      await invalidateStorefrontCache("promotions");
      return json(result);
    }

    if (match(path, method, "POST", "leads")) {
      const result = await leadService.createAdminOrder(body);
      if (!result.ok) return json({ message: result.message }, 400);
      return json(result.lead, 201);
    }
    if (match(path, method, "GET", "leads")) {
      const result = await leadService.listLeads(query);
      if (!result.ok) return json({ message: result.message }, result.status || 400);
      return json({ items: result.items });
    }
    if (path[0] === "leads" && path.length === 2 && method === "GET") {
      const result = await leadService.getLeadById(Number(path[1]));
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      return json(result.lead);
    }
    if (path[0] === "leads" && path.length === 2 && method === "PATCH") {
      const result = await leadService.updateLead(Number(path[1]), body);
      if (!result.ok) return json({ message: result.message }, result.status || 400);
      return json(result.lead);
    }
    if (path[0] === "leads" && path.length === 2 && method === "DELETE") {
      const result = await leadService.deleteLead(Number(path[1]));
      if (!result.ok) return json({ message: result.message }, result.status || 404);
      return empty(204);
    }

    return json({ message: "Not found" }, 404);
  });

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

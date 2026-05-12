import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const adminService = require("@/lib/server/services/adminService");
const csvImportService = require("@/lib/server/services/csvImportService");
const { withErrorHandling, json, empty, getQuery, readBody } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

const match = (path, method, expectedMethod, ...segments) =>
  method === expectedMethod && path.length === segments.length && segments.every((s, i) => path[i] === s);

const handle = async (request, context) =>
  withErrorHandling(async () => {
    const params = await context.params;
    const path = Array.isArray(params.path) ? params.path : [];
    const query = getQuery(request);
    const body = await readBody(request);
    const method = request.method;

    if (match(path, method, "GET", "bootstrap")) return json(await adminService.listBootstrap());
    if (match(path, method, "POST", "catalog-pages")) return json(await adminService.createCatalogPage(body), 201);
    if (path[0] === "catalog-pages" && path.length === 2 && method === "PUT") {
      const updated = await adminService.updateCatalogPage(Number(path[1]), body);
      return updated ? json(updated) : json({ message: "Catalog page not found" }, 404);
    }
    if (path[0] === "catalog-pages" && path.length === 2 && method === "DELETE") {
      const deleted = await adminService.deleteCatalogPage(Number(path[1]));
      return deleted ? empty(204) : json({ message: "Catalog page not found or cannot delete default page" }, 404);
    }

    if (match(path, method, "POST", "categories")) return json(await adminService.createCategory(body), 201);
    if (path[0] === "categories" && path.length === 2 && method === "PUT") return json(await adminService.updateCategory(Number(path[1]), body));
    if (path[0] === "categories" && path.length === 2 && method === "DELETE") {
      const result = await adminService.deleteCategory(Number(path[1]));
      if (result.ok) return empty(204);
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

    if (match(path, method, "POST", "subcategories")) return json(await adminService.createSubcategory(body), 201);
    if (path[0] === "subcategories" && path.length === 2 && method === "PUT") return json(await adminService.updateSubcategory(Number(path[1]), body));
    if (path[0] === "subcategories" && path.length === 2 && method === "DELETE") {
      const result = await adminService.deleteSubcategory(Number(path[1]));
      if (result.ok) return empty(204);
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

    if (match(path, method, "POST", "attributes")) return json(await adminService.createAttribute(body), 201);
    if (path[0] === "attributes" && path.length === 2 && method === "PUT") return json(await adminService.updateAttribute(Number(path[1]), body));
    if (match(path, method, "POST", "attribute-options")) return json(await adminService.createAttributeOption(body), 201);

    if (match(path, method, "POST", "products")) return json(await adminService.createProduct(body), 201);
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
        return json({ deleted: await adminService.deleteProductsByCategoryScope(query) });
      }
      return json({ deleted: await adminService.deleteAllProducts() });
    }
    if (path[0] === "products" && path.length === 2 && method === "PUT") return json(await adminService.updateProduct(Number(path[1]), body));
    if (path[0] === "products" && path.length === 2 && method === "GET") {
      const product = await adminService.getProductForEdit(Number(path[1]));
      return product ? json(product) : json({ message: "Product not found" }, 404);
    }

    if (match(path, method, "GET", "products-table")) return json(await adminService.getProductsTable(query));
    if (match(path, method, "POST", "import", "csv")) {
      if (!Array.isArray(body.rows)) return json({ message: "rows must be an array" }, 400);
      return json(await csvImportService.importRows(body.rows));
    }

    return json({ message: "Not found" }, 404);
  });

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;

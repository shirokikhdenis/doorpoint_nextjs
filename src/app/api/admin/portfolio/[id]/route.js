import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const portfolioService = require("@/lib/server/services/portfolioService");
const { invalidateStorefrontCache } = require("@/lib/server/cache/invalidate-storefront");
const { withErrorHandling, json, empty, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const PUT = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const body = await readBody(request);
    const updated = await portfolioService.updateProject(Number(params.id), body);
    if (updated) await invalidateStorefrontCache("portfolio");
    return updated ? json(updated) : json({ message: "Проект не найден" }, 404);
  });

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const deleted = await portfolioService.deleteProject(Number(params.id));
    if (deleted) await invalidateStorefrontCache("portfolio");
    return deleted ? empty(204) : json({ message: "Проект не найден" }, 404);
  });

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const servicesService = require("@/lib/server/services/servicesService");
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
    const updated = await servicesService.updateSection(Number(params.id), body);
    return updated ? json(updated) : json({ message: "Раздел не найден" }, 404);
  });

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const deleted = await servicesService.deleteSection(Number(params.id));
    return deleted ? empty(204) : json({ message: "Раздел не найден" }, 404);
  });

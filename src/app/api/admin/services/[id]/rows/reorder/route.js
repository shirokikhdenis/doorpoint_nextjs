import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const servicesService = require("@/lib/server/services/servicesService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const PATCH = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const body = await readBody(request);
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
    try {
      const section = await servicesService.reorderRows(Number(params.id), orderedIds);
      return section ? json(section) : json({ message: "Раздел не найден" }, 404);
    } catch (error) {
      return json(
        { message: error instanceof Error ? error.message : "Не удалось изменить порядок" },
        400,
      );
    }
  });

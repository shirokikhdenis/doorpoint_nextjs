import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exhibitionDoorService = require("@/lib/server/services/exhibitionDoorService");
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
    const result = await exhibitionDoorService.updateExhibitionDoor(Number(params.id), body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    return json(result.item);
  });

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const result = await exhibitionDoorService.deleteExhibitionDoor(Number(params.id));
    if (!result.ok) return json({ message: result.message }, result.status || 404);
    return empty(204);
  });

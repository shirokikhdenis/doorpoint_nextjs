import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const armaPhotosService = require("@/lib/server/services/armaPhotosService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const POST = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await readBody(request);
    const result = await armaPhotosService.createArmaTagCategory(body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    return json(result.item, 201);
  });

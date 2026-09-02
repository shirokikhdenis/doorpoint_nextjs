import { createRequire } from "node:module";
import { invalidateStorefrontCache } from "@/lib/server/cache/invalidate-storefront";

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

export const PATCH = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const body = await readBody(request);
    const result = await armaPhotosService.updateArmaTag(params.id, body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    await invalidateStorefrontCache("arma-photos");
    return json(result.item);
  });

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const result = await armaPhotosService.deleteArmaTag(params.id);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    await invalidateStorefrontCache("arma-photos");
    return json({ ok: true });
  });

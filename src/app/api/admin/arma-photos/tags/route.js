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

export const POST = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await readBody(request);
    const result = await armaPhotosService.createArmaTag(body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    await invalidateStorefrontCache("arma-photos");
    return json(result.item, 201);
  });

export const PATCH = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await readBody(request);
    const result = await armaPhotosService.reorderArmaTags(body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    await invalidateStorefrontCache("arma-photos");
    return json(await armaPhotosService.listAdminArmaGallery());
  });

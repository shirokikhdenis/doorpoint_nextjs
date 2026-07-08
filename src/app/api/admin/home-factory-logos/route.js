import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const homeFactoryLogoService = require("@/lib/server/services/homeFactoryLogoService");
const { invalidateStorefrontCache } = require("@/lib/server/cache/invalidate-storefront");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const GET = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const items = await homeFactoryLogoService.listAdminEntries();
    return json({ items });
  });

export const PUT = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await readBody(request);
    const result = await homeFactoryLogoService.saveAdminEntries(body.items);
    if (!result.ok) return json({ message: result.message }, 400);
    await invalidateStorefrontCache("factories");
    return json({ items: result.items });
  });

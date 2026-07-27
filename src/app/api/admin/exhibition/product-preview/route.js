import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exhibitionDoorService = require("@/lib/server/services/exhibitionDoorService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
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
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const categoryType = searchParams.get("categoryType");
    const result = await exhibitionDoorService.getProductPreview({ productId, categoryType });
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    return json(result.preview);
  });

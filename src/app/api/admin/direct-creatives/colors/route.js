import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { listCreativeColorVariants } = require("@/lib/server/services/directCreativeService");
const { withErrorHandling, json, getQuery } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }
    const query = getQuery(request);
    const result = await listCreativeColorVariants(query.productId);
    if (!result.ok) {
      return json({ message: result.message }, result.status || 400);
    }
    return json({ variants: result.variants });
  });

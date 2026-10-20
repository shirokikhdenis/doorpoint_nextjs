import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getApartmentCatalog } = require("@/lib/server/services/configuratorCatalogService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }
    return json(await getApartmentCatalog());
  });

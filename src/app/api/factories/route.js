import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const factoryService = require("@/lib/server/services/factoryService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { STOREFRONT_API_CACHE_CONTROL } = require("@/lib/server/cache/storefront-cache");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    const sections = await factoryService.listPublicFactorySections();
    return json(
      { sections },
      200,
      { headers: { "Cache-Control": STOREFRONT_API_CACHE_CONTROL } },
    );
  });

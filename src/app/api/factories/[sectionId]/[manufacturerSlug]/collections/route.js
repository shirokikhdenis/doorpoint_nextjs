import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const collectionService = require("@/lib/server/services/collectionService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { STOREFRONT_API_CACHE_CONTROL } = require("@/lib/server/cache/storefront-cache");

export const runtime = "nodejs";

export const GET = (request, context) =>
  withErrorHandling(async () => {
    const { sectionId, manufacturerSlug } = await context.params;
    const page = await collectionService.getManufacturerCollectionsPage(sectionId, manufacturerSlug);
    if (!page) {
      return json({ message: "Not found" }, 404);
    }
    return json(page, 200, { headers: { "Cache-Control": STOREFRONT_API_CACHE_CONTROL } });
  });

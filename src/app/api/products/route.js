import { createRequire } from "node:module";
import {
  getCachedProducts,
  STOREFRONT_API_CACHE_CONTROL,
} from "@/lib/server/cache/storefront-cache";

const require = createRequire(import.meta.url);
const { withErrorHandling, json, getQuery } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async (request) =>
  withErrorHandling(async () => {
    const result = await getCachedProducts(getQuery(request));
    return json(result, 200, {
      headers: { "Cache-Control": STOREFRONT_API_CACHE_CONTROL },
    });
  });

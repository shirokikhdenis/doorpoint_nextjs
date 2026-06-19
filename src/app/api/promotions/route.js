import { createRequire } from "node:module";
import {
  getCachedActivePromotions,
  STOREFRONT_API_CACHE_CONTROL,
} from "@/lib/server/cache/storefront-cache";

const require = createRequire(import.meta.url);
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async () =>
  withErrorHandling(async () => {
    const result = await getCachedActivePromotions();
    return json(result, 200, {
      headers: { "Cache-Control": STOREFRONT_API_CACHE_CONTROL },
    });
  });

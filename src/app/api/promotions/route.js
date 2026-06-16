import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const promotionService = require("@/lib/server/services/promotionService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async () =>
  withErrorHandling(async () => json(await promotionService.listActivePromotions()));

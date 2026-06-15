import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const portfolioService = require("@/lib/server/services/portfolioService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    const items = await portfolioService.listPublicPortfolio();
    return json({ items });
  });

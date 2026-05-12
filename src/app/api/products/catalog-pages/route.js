import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async () =>
  withErrorHandling(async () => {
    const result = await catalogService.listCatalogPages();
    return json(result);
  });

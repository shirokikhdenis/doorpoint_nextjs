import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService");
const { withErrorHandling, json, getQuery } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async (request) =>
  withErrorHandling(async () => {
    const result = await catalogService.getFilterMeta(getQuery(request));
    return json(result);
  });

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async (_, context) =>
  withErrorHandling(async () => {
    const params = await context.params;
    const result = await catalogService.getProductById(params.id);
    if (!result) return json({ message: "Product not found" }, 404);
    return json(result);
  });

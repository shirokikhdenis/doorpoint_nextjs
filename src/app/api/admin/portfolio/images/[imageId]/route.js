import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const portfolioService = require("@/lib/server/services/portfolioService");
const { withErrorHandling, json, empty } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const params = await context.params;
    const result = await portfolioService.deleteImage(Number(params.imageId));
    return result ? empty(204) : json({ message: "Фото не найдено" }, 404);
  });

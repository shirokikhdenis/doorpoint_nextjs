import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const homePageService = require("@/lib/server/services/homePageService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async (request) =>
  withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const catalogPage = searchParams.get("catalogPage");
    if (!catalogPage) {
      return json({ message: "catalogPage is required" }, 400);
    }

    const excludeRaw = searchParams.get("exclude") || "";
    const excludeIds = excludeRaw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const count = Math.min(24, Math.max(1, Number(searchParams.get("count")) || 8));

    const items = await homePageService.pickRandomHits(catalogPage, { excludeIds, count });
    return json({ items });
  });

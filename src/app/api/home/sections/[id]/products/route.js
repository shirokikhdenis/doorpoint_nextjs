import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const homeProductSectionService = require("@/lib/server/services/homeProductSectionService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async (request, context) =>
  withErrorHandling(async () => {
    const params = await context.params;
    const sectionId = Number(params.id);
    if (!Number.isFinite(sectionId) || sectionId <= 0) {
      return json({ message: "Invalid section id" }, 400);
    }

    const { searchParams } = new URL(request.url);
    const excludeRaw = searchParams.get("exclude") || "";
    const excludeIds = excludeRaw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const count = Math.min(24, Math.max(1, Number(searchParams.get("count")) || 8));

    const items = await homeProductSectionService.pickSectionProducts(sectionId, {
      excludeIds,
      count,
    });
    return json({ items });
  });

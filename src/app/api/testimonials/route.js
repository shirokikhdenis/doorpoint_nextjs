import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const testimonialService = require("@/lib/server/services/testimonialService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "6");
    const items = await testimonialService.listPublicTestimonials(limit);
    return json({ items });
  });

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const testimonialService = require("@/lib/server/services/testimonialService");
const { invalidateStorefrontCache } = require("@/lib/server/cache/invalidate-storefront");
const { withErrorHandling, json, empty, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const PUT = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const body = await readBody(request);
    const result = await testimonialService.updateTestimonial(Number(params.id), body);
    if (!result.ok) return json({ message: result.message }, result.status || 400);
    await invalidateStorefrontCache("testimonials");
    return json(result.item);
  });

export const DELETE = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const result = await testimonialService.deleteTestimonial(Number(params.id));
    if (!result.ok) return json({ message: result.message }, result.status || 404);
    await invalidateStorefrontCache("testimonials");
    return empty(204);
  });

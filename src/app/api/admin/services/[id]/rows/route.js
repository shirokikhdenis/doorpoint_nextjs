import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const servicesService = require("@/lib/server/services/servicesService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const POST = (request, context) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const params = await context.params;
    const body = await readBody(request);
    const row = await servicesService.createRow(Number(params.id), body);
    return json(row, 201);
  });

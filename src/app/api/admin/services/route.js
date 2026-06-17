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

export const GET = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const sections = await servicesService.listAdminServices();
    return json({ sections });
  });

export const POST = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await readBody(request);
    const section = await servicesService.createSection(body);
    return json(section, 201);
  });

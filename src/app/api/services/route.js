import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const servicesService = require("@/lib/server/services/servicesService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    const sections = await servicesService.listPublicServices();
    return json({ sections });
  });

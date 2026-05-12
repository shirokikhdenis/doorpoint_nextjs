import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { withErrorHandling, json } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

export const GET = async () =>
  withErrorHandling(async () =>
    json({
      status: "ok",
      uptime: process.uptime()
    })
  );

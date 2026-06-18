import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { exportProductsCsv } = require("@/lib/server/services/csvExportService");
const { withErrorHandling, getQuery } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const GET = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const query = getQuery(request);
    const { csv, filename } = await exportProductsCsv(query);

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  });

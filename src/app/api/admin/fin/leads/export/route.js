import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const leadService = require("@/lib/server/services/leadService");
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
    const result = await leadService.exportFinanceLeadsCsv(query);
    if (!result.ok) {
      return new Response(JSON.stringify({ message: result.message }), {
        status: result.status || 400,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(result.csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${result.filename}"`,
        "cache-control": "no-store",
      },
    });
  });

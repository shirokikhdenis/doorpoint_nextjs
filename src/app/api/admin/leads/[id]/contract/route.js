import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const contractDocumentService = require("@/lib/server/services/contractDocumentService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const encodeContentDisposition = (filename) => {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

export const GET = (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const params = await context.params;
    const leadId = Number(params.id);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return json({ message: "Некорректный id заявки" }, 400);
    }

    const result = await contractDocumentService.generateContractForLead(leadId);
    if (!result.ok) {
      return json({ message: result.message }, result.status || 404);
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": encodeContentDisposition(result.filename),
        "Cache-Control": "no-store",
      },
    });
  });

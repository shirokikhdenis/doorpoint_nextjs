import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const commercialProposalPdfService = require("@/lib/server/services/commercialProposalPdfService");
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
    const productId = Number(params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return json({ message: "Некорректный id товара" }, 400);
    }

    const result = await commercialProposalPdfService.generateKpPdfForProduct(productId);
    if (!result.ok) {
      return json({ message: result.message }, result.status || 404);
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": encodeContentDisposition(result.filename),
        "Cache-Control": "no-store",
      },
    });
  });

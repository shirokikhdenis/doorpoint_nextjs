import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exhibitionPriceTagPdfService = require("@/lib/server/services/exhibitionPriceTagPdfService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const encodeContentDisposition = (filename) => {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

export const POST = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const body = await readBody(request);
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const result = await exhibitionPriceTagPdfService.generatePriceTagsForExhibitionDoors(ids);
    if (!result.ok) {
      return json({ message: result.message }, result.status || 400);
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

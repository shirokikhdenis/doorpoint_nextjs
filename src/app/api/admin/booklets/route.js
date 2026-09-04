import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  generateBookletPdf,
  getBookletMeta,
} = require("@/lib/server/services/bookletPdfService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const encodeContentDisposition = (filename) => {
  const asciiFallback = String(filename).replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

export const GET = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }
    return json(await getBookletMeta());
  });

export const POST = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const body = await readBody(request);
    const result = await generateBookletPdf(body);
    if (!result.ok) {
      return json({ message: result.message, warnings: result.warnings }, result.status || 400);
    }

    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": encodeContentDisposition(result.filename),
        "Cache-Control": "no-store",
        "X-Booklet-Warnings": encodeURIComponent(JSON.stringify(warnings)),
      },
    });
  });

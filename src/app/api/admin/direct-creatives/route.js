import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { generateDirectCreatives } = require("@/lib/server/services/directCreativeService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const encodeContentDisposition = (filename) => {
  const asciiFallback = String(filename).replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

export const POST = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const body = await readBody(request);
    const result = await generateDirectCreatives(body);
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
        "X-Creative-Warnings": encodeURIComponent(JSON.stringify(warnings)),
      },
    });
  });

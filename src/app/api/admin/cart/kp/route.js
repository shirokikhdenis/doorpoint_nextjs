import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cartCommercialProposalService = require("@/lib/server/services/cartCommercialProposalService");
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
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return json({ message: "Корзина пуста" }, 400);
    }

    const format = String(body?.format || "pdf").trim().toLowerCase();
    if (format !== "pdf" && format !== "png") {
      return json({ message: "format must be pdf or png" }, 400);
    }

    const result = await cartCommercialProposalService.generateCartKpFiles({ items, format });
    if (!result.ok) {
      return json({ message: result.message }, result.status || 400);
    }

    const file = format === "png" ? result.png : result.pdf;
    if (!file?.buffer) {
      return json({ message: "Не удалось сформировать файл" }, 500);
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": encodeContentDisposition(file.filename),
        "Cache-Control": "no-store",
      },
    });
  });

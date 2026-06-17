import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const leadService = require("@/lib/server/services/leadService");
const measureLeadService = require("@/lib/server/services/measureLeadService");
const { checkRateLimit } = require("@/lib/server/leads/rateLimit");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");

export const runtime = "nodejs";

const clientIp = (request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
};

export const POST = async (request) =>
  withErrorHandling(async () => {
    const limit = checkRateLimit(clientIp(request));
    if (!limit.allowed) {
      return json(
        { message: `Слишком много заявок. Повторите через ${limit.retryAfterSec} с.` },
        429,
      );
    }

    const body = await readBody(request);
    const sourcePage = request.headers.get("referer") || "";
    const result = await leadService.createMeasureLead(body, { sourcePage });

    if (!result.ok) {
      return json({ message: result.message || "Ошибка отправки" }, result.status || 500);
    }

    const mailResult = await measureLeadService.sendMeasureLeadMail({
      name: result.lead.customerName,
      phone: result.lead.phone,
      comment: result.lead.clientComment,
      sourcePage: result.lead.sourcePage || sourcePage,
    });

    if (!mailResult.ok) {
      console.error("[measure-lead] email failed:", mailResult.message);
    }

    return json({ ok: true });
  });

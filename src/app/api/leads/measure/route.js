import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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
    const result = await measureLeadService.submitMeasureLead(body, { sourcePage });

    if (!result.ok) {
      return json({ message: result.message || "Ошибка отправки" }, result.status || 500);
    }

    return json({ ok: true });
  });

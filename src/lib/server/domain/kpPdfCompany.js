const SITE_NAME = "Дверная Точка";
const SITE_PHONE_DISPLAY = "+7 921 290 5999";
const SITE_EMAIL = "doorpoint29@yandex.ru";
const SITE_ADDRESS_SHORT = "Архангельск, ТЦ «Новосёл», Московский пр., 25";
const SITE_LOGO_PATH = "/uploads/Logo-01.png";
const KP_VALIDITY_DAYS = 14;

const BRAND_COLOR = "#2c2cb7";
const TEXT_MUTED = "#71717a";
const TEXT_PRIMARY = "#18181b";
const SURFACE_MUTED = "#f4f4f5";
const BORDER_COLOR = "#e4e4e7";

const normalizeSiteUrl = (raw) => {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
};

const getSiteUrl = () => {
  const fromEnv = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const buildProductPageUrl = (slug) => {
  const ref = String(slug || "").trim();
  if (!ref) return getSiteUrl();
  return `${getSiteUrl()}/product/${encodeURIComponent(ref)}`;
};

module.exports = {
  SITE_NAME,
  SITE_PHONE_DISPLAY,
  SITE_EMAIL,
  SITE_ADDRESS_SHORT,
  SITE_LOGO_PATH,
  KP_VALIDITY_DAYS,
  BRAND_COLOR,
  TEXT_MUTED,
  TEXT_PRIMARY,
  SURFACE_MUTED,
  BORDER_COLOR,
  getSiteUrl,
  buildProductPageUrl,
};

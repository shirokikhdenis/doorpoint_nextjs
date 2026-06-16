import type { Metadata } from "next";

export const SITE_NAME = "Дверная Точка";
export const SITE_TITLE = "Салон дверей Дверная Точка";
export const SITE_DEFAULT_DESCRIPTION =
  "Входные и межкомнатные двери в Архангельске: каталог, бесплатный замер, доставка и монтаж под ключ.";

/** Default Open Graph image (logo). */
export const SITE_OG_IMAGE_PATH = "/uploads/Logo-01.png";

const normalizeSiteUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
};

export const getSiteUrl = (): string => {
  const fromEnv = normalizeSiteUrl(String(process.env.NEXT_PUBLIC_SITE_URL || ""));
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

export const getMetadataBase = (): URL => new URL(`${getSiteUrl()}/`);

export const absoluteUrl = (path: string): string => {
  const base = getSiteUrl();
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
};

export const buildPageTitle = (pageTitle: string): string => `${pageTitle} — ${SITE_TITLE}`;

export const defaultOpenGraph = (): NonNullable<Metadata["openGraph"]> => ({
  type: "website",
  locale: "ru_RU",
  siteName: SITE_NAME,
  images: [{ url: SITE_OG_IMAGE_PATH, alt: SITE_NAME }],
});

export const YANDEX_METRIKA_GOALS = {
  measureLead: "measure_lead",
  cartLead: "cart_lead",
  phoneClick: "phone_click",
  socialClick: "social_click",
} as const;

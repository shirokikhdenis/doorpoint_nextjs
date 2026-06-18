import { createRequire } from "node:module";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { isPogonazhCatalogPageSlug } from "@/lib/pogonazh-category";
import { buildCatalogSeoCopy, SEO_COPY } from "@/lib/seo-copy";
import {
  absoluteUrl,
  SITE_DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  SITE_TITLE,
  getSiteUrl,
} from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<
    Array<{
      id: number;
      name: string;
      slug: string;
      isActive?: boolean;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }>
  >;
};
const { query } = require("@/lib/server/db/postgres") as {
  query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type SeoPageRow = {
  key: string;
  label: string;
  path: string;
  canonicalUrl: string;
  title: string;
  description: string;
  titleSource: "code" | "override" | "mixed";
  descriptionSource: "code" | "override" | "mixed";
  inSitemap: boolean;
  robotsNote?: string;
  editHint?: string;
};

export type SeoAdminSnapshot = {
  global: {
    siteName: string;
    siteTitle: string;
    defaultDescription: string;
    siteUrl: string;
    siteUrlSource: string;
    ogImagePath: string;
    ogImageUrl: string;
    metadataBase: string;
  };
  staticPages: SeoPageRow[];
  catalogPages: SeoPageRow[];
  products: {
    activeTotal: number;
    withTitleOverride: number;
    withDescriptionOverride: number;
    pogonazhNoindex: number;
  };
  technical: {
    sitemapUrl: string;
    robotsHost: string;
    robotsDisallow: string[];
    adminIndexed: boolean;
  };
};

const hasOverride = (value: string | null | undefined): boolean =>
  String(value ?? "").trim().length > 0;

const resolveSource = (
  override: string | null | undefined,
  presetMatchesResolved: boolean,
): "code" | "override" | "mixed" => {
  if (!hasOverride(override)) return "code";
  return presetMatchesResolved ? "mixed" : "override";
};

const STATIC_PAGE_DEFS = [
  { key: "home", label: "Главная", path: "/", copy: SEO_COPY.home, inSitemap: true },
  { key: "contact", label: "Контакты", path: "/contact", copy: SEO_COPY.contact, inSitemap: true },
  { key: "uslugi", label: "Услуги", path: "/uslugi", copy: SEO_COPY.uslugi, inSitemap: true },
  {
    key: "portfolio",
    label: "Портфолио",
    path: "/portfolio",
    copy: SEO_COPY.portfolio,
    inSitemap: true,
  },
  {
    key: "privacy",
    label: "Политика конфиденциальности",
    path: "/privacy",
    copy: SEO_COPY.privacy,
    inSitemap: false,
  },
  {
    key: "catalog-all",
    label: "Каталог (все)",
    path: "/catalog",
    copy: SEO_COPY.catalog.all,
    inSitemap: true,
  },
] as const;

const countProductSeo = async (): Promise<SeoAdminSnapshot["products"]> => {
  try {
    const res = await query(`
      SELECT
        COUNT(*)::int AS "activeTotal",
        COUNT(*) FILTER (
          WHERE p.seo_title IS NOT NULL AND BTRIM(p.seo_title) <> ''
        )::int AS "withTitleOverride",
        COUNT(*) FILTER (
          WHERE p.seo_description IS NOT NULL AND BTRIM(p.seo_description) <> ''
        )::int AS "withDescriptionOverride",
        COUNT(*) FILTER (
          WHERE (
            COALESCE(parent.name, c.name) ILIKE '%погонаж%'
            OR c.name ILIKE '%погонаж%'
            OR COALESCE(parent.slug, c.slug) ILIKE '%pogonazh%'
            OR c.slug ILIKE '%pogonazh%'
            OR c.slug ILIKE 'karniz%'
            OR c.slug ILIKE 'dobor%'
          )
        )::int AS "pogonazhNoindex"
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE p.is_active = TRUE
    `);
    const row = res.rows[0] ?? {};
    return {
      activeTotal: Number(row.activeTotal) || 0,
      withTitleOverride: Number(row.withTitleOverride) || 0,
      withDescriptionOverride: Number(row.withDescriptionOverride) || 0,
      pogonazhNoindex: Number(row.pogonazhNoindex) || 0,
    };
  } catch {
    return {
      activeTotal: 0,
      withTitleOverride: 0,
      withDescriptionOverride: 0,
      pogonazhNoindex: 0,
    };
  }
};

export const getSeoAdminSnapshot = async (): Promise<SeoAdminSnapshot> => {
  const siteUrl = getSiteUrl();
  const siteUrlFromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();

  const staticPages: SeoPageRow[] = STATIC_PAGE_DEFS.map((page) => ({
    key: page.key,
    label: page.label,
    path: page.path,
    canonicalUrl: absoluteUrl(page.path),
    title: page.copy.title,
    description: page.copy.description,
    titleSource: "code",
    descriptionSource: "code",
    inSitemap: page.inSitemap,
    editHint: "src/lib/seo-copy.ts",
  }));

  const catalogPages: SeoPageRow[] = [];
  try {
    const pages = await catalogService.listCatalogPages();
    for (const page of pages) {
      if (!page.slug || page.slug === "all") continue;
      const preset =
        SEO_COPY.catalog[page.slug as keyof typeof SEO_COPY.catalog] ?? null;
      const seo = buildCatalogSeoCopy(page.slug, page.name, {
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
      });
      const path = catalogPagePath(page.slug);
      const isPogonazh = isPogonazhCatalogPageSlug(page.slug);

      catalogPages.push({
        key: `catalog-${page.slug}`,
        label: page.name || page.slug,
        path,
        canonicalUrl: absoluteUrl(path),
        title: seo.title,
        description: seo.description,
        titleSource: resolveSource(
          page.seoTitle,
          hasOverride(page.seoTitle) && preset?.title === seo.title,
        ),
        descriptionSource: resolveSource(
          page.seoDescription,
          hasOverride(page.seoDescription) && preset?.description === seo.description,
        ),
        inSitemap: page.isActive !== false && !isPogonazh,
        robotsNote: isPogonazh ? "noindex (погонаж)" : undefined,
        editHint: "/admin/catalog-pages",
      });
    }
    catalogPages.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  } catch {
    // catalog section stays empty
  }

  const products = await countProductSeo();

  return {
    global: {
      siteName: SITE_NAME,
      siteTitle: SITE_TITLE,
      defaultDescription: SITE_DEFAULT_DESCRIPTION,
      siteUrl,
      siteUrlSource: siteUrlFromEnv
        ? "NEXT_PUBLIC_SITE_URL"
        : process.env.VERCEL_URL
          ? "VERCEL_URL"
          : "fallback (localhost)",
      ogImagePath: SITE_OG_IMAGE_PATH,
      ogImageUrl: absoluteUrl(SITE_OG_IMAGE_PATH),
      metadataBase: `${siteUrl}/`,
    },
    staticPages,
    catalogPages,
    products,
    technical: {
      sitemapUrl: absoluteUrl("/sitemap.xml"),
      robotsHost: absoluteUrl("/"),
      robotsDisallow: ["/admin/", "/api/", "/cart", "/database", "/door-quiz"],
      adminIndexed: false,
    },
  };
};

import Link from "next/link";
import { catalogPagePath } from "@/lib/catalog-page-paths";

type CatalogPaginationLinksProps = {
  catalogPage: string;
  page: number;
  total: number;
  limit: number;
  extraPath?: string;
  extraQuery?: Record<string, string>;
};

const hrefForPage = (
  catalogPage: string,
  page: number,
  extraPath: string,
  extraQuery: Record<string, string>,
): string => {
  const path = `${catalogPagePath(catalogPage)}${extraPath}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extraQuery)) {
    if (value.trim()) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

export function CatalogPaginationLinks({
  catalogPage,
  page,
  total,
  limit,
  extraPath = "",
  extraQuery = {},
}: CatalogPaginationLinksProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  if (windowStart > 1) pages.push(1);
  for (let i = windowStart; i <= windowEnd; i += 1) pages.push(i);
  if (windowEnd < totalPages) pages.push(totalPages);
  const unique = [...new Set(pages)];

  return (
    <nav
      aria-label="Страницы каталога"
      className="flex flex-wrap items-center justify-center gap-1 pt-3"
      data-testid="catalog-pagination"
    >
      {page > 1 ? (
        <Link
          href={hrefForPage(catalogPage, page - 1, extraPath, extraQuery)}
          prefetch={false}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:border-zinc-500"
        >
          Назад
        </Link>
      ) : null}
      {unique.map((item, index) => {
        const prev = unique[index - 1];
        const gap = prev && item - prev > 1;
        return (
          <span key={item} className="contents">
            {gap ? <span className="px-1 text-zinc-400">…</span> : null}
            <Link
              href={hrefForPage(catalogPage, item, extraPath, extraQuery)}
              prefetch={false}
              aria-current={item === page ? "page" : undefined}
              className={
                item === page
                  ? "rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:border-zinc-500"
              }
            >
              {item}
            </Link>
          </span>
        );
      })}
      {page < totalPages ? (
        <Link
          href={hrefForPage(catalogPage, page + 1, extraPath, extraQuery)}
          prefetch={false}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:border-zinc-500"
        >
          Вперёд
        </Link>
      ) : null}
    </nav>
  );
}

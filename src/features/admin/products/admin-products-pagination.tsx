"use client";

type AdminProductsPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  shown: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

function buildPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function AdminProductsPagination({
  page,
  totalPages,
  total,
  shown,
  loading,
  onPageChange,
}: AdminProductsPaginationProps) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
      <span>
        Показано <strong className="text-zinc-800">{shown}</strong> из{" "}
        <strong className="text-zinc-800">{total}</strong> · страница{" "}
        <strong className="text-zinc-800">{page}</strong> из{" "}
        <strong className="text-zinc-800">{totalPages}</strong>
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(1)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          «
        </button>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ←
        </button>
        {pages.map((item, index) =>
          item === "…" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-zinc-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(item)}
              className={`min-w-8 rounded-md border px-2 py-1 text-xs ${
                item === page
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-100"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          →
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(totalPages)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          »
        </button>
        <label className="ml-2 inline-flex items-center gap-1.5 text-xs">
          Перейти
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            disabled={loading}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const value = Number((event.target as HTMLInputElement).value);
              if (!Number.isFinite(value)) return;
              onPageChange(Math.min(totalPages, Math.max(1, Math.trunc(value))));
            }}
            className="w-14 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-center text-xs"
          />
        </label>
      </div>
    </div>
  );
}

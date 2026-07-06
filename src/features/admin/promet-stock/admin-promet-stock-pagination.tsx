"use client";

import { Button } from "@/components/ui/button";

type AdminPrometStockPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function AdminPrometStockPagination({
  page,
  pageSize,
  total,
  loading,
  onPrev,
  onNext,
}: AdminPrometStockPaginationProps) {
  if (total === 0) return null;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-4 py-3 text-sm text-admin-text-secondary">
      <span>
        Показано {start + 1}–{end} из {total}
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={onPrev}>
          Назад
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pages || loading}
          onClick={onNext}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}

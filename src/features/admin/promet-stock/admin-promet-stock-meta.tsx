"use client";

import { formatDate, formatNum } from "./promet-stock-utils";
import type { PrometStockResponse } from "./types";

type AdminPrometStockMetaProps = {
  raw: PrometStockResponse;
  filteredCount: number;
};

export function AdminPrometStockMeta({ raw, filteredCount }: AdminPrometStockMetaProps) {
  const total = raw.count ?? raw.data?.length ?? 0;
  const actualAt = raw.generatedAt || raw.fetchedAt;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-admin-border-subtle pt-4 text-sm text-admin-text-secondary">
      <span>
        <strong className="text-admin-text">Всего позиций:</strong> {formatNum(total)}
      </span>
      <span>
        <strong className="text-admin-text">После фильтров:</strong> {formatNum(filteredCount)}
      </span>
      <span>Данные актуальны на {formatDate(actualAt)}</span>
    </div>
  );
}

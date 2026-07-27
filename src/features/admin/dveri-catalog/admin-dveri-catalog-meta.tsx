"use client";

import { formatDate, formatNum } from "./dveri-catalog-utils";
import type { DveriCatalogResponse } from "./types";

type AdminDveriCatalogMetaProps = {
  raw: DveriCatalogResponse;
  filteredCount: number;
};

export function AdminDveriCatalogMeta({ raw, filteredCount }: AdminDveriCatalogMetaProps) {
  const total = raw.stats?.productCount ?? raw.products?.length ?? 0;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-admin-border-subtle pt-4 text-sm text-admin-text-secondary">
      <span>
        <strong className="text-admin-text">Всего товаров:</strong> {formatNum(total)}
      </span>
      <span>
        <strong className="text-admin-text">После фильтров:</strong> {formatNum(filteredCount)}
      </span>
      <span>Город: {raw.cityLabel}</span>
      <span>Данные актуальны на {formatDate(raw.fetchedAt)}</span>
    </div>
  );
}

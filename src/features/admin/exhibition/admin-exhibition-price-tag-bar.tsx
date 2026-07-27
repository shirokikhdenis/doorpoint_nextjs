"use client";

import { Button } from "@/components/ui/button";

type AdminExhibitionPriceTagBarProps = {
  selectedCount: number;
  loading: boolean;
  onDownload: () => void;
  onClearSelection: () => void;
};

export function AdminExhibitionPriceTagBar({
  selectedCount,
  loading,
  onDownload,
  onClearSelection,
}: AdminExhibitionPriceTagBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-admin-border bg-admin-surface-muted px-4 py-3 text-sm">
      <span className="text-admin-text-secondary">Выбрано: {selectedCount}</span>
      <Button type="button" size="sm" disabled={loading} onClick={onDownload}>
        {loading ? "Формирование…" : "Скачать ценники"}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onClearSelection}>
        Снять выбор
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import {
  downloadBookletPdf,
  fetchBookletMeta,
  fetchBookletPreview,
  type BookletMeta,
} from "@/lib/client/admin-booklets";
import {
  BOOKLET_FORMATS,
  DEFAULT_COUPON_TEXT,
  DEFAULT_HEADLINE,
  DEFAULT_SUBHEAD,
  HEADLINE_PRESETS,
  MAX_COUPON_LEN,
  MAX_HEADLINE_LEN,
  MAX_SUBHEAD_LEN,
  getFormatById,
  type BookletFormatId,
} from "@/lib/booklet-formats";
import { BookletProductPicker } from "./booklet-product-picker";
import type { BookletProduct } from "./types";

export function AdminBookletsView() {
  const [meta, setMeta] = useState<BookletMeta | null>(null);
  const [formatId, setFormatId] = useState<BookletFormatId>("a4");
  const [entryProducts, setEntryProducts] = useState<BookletProduct[]>([]);
  const [interiorProducts, setInteriorProducts] = useState<BookletProduct[]>([]);
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE);
  const [subhead, setSubhead] = useState(DEFAULT_SUBHEAD);
  const [couponText, setCouponText] = useState(DEFAULT_COUPON_TEXT);
  const [showPrices, setShowPrices] = useState(true);
  const [showComparePrices, setShowComparePrices] = useState(true);
  const [showCoupon, setShowCoupon] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  const format = getFormatById(formatId) ?? BOOKLET_FORMATS[0];
  const presets = meta?.headlinePresets?.length ? meta.headlinePresets : HEADLINE_PRESETS;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const next = await fetchBookletMeta();
        if (cancelled) return;
        setMeta(next);
        if (next.defaultSubhead) setSubhead(next.defaultSubhead);
        if (next.defaultCouponText) setCouponText(next.defaultCouponText);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Не удалось загрузить категории");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setEntryProducts((current) =>
      current.length > format.maxEntry ? current.slice(0, format.maxEntry) : current,
    );
    setInteriorProducts((current) =>
      current.length > format.maxInterior ? current.slice(0, format.maxInterior) : current,
    );
  }, [format.maxEntry, format.maxInterior]);

  const requestPayload = useMemo(
    () => ({
      format: format.id,
      entryProductIds: entryProducts.map((item) => item.id),
      interiorProductIds: interiorProducts.map((item) => item.id),
      showPrices,
      showComparePrices: showPrices && showComparePrices,
      showCoupon,
      headline,
      subhead,
      couponText,
    }),
    [
      format.id,
      entryProducts,
      interiorProducts,
      showPrices,
      showComparePrices,
      showCoupon,
      headline,
      subhead,
      couponText,
    ],
  );

  const canGenerate = entryProducts.length > 0 || interiorProducts.length > 0;

  useEffect(() => {
    if (!canGenerate) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setPreviewLabel("");
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const run = async () => {
        setPreviewLoading(true);
        setError("");
        try {
          const { blob, filename, warnings } = await fetchBookletPreview(requestPayload);
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setPreviewLabel(filename);
          setPreviewWarnings(warnings);
        } catch (caught) {
          if (!cancelled) {
            setPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return "";
            });
            setPreviewLabel("");
            setPreviewWarnings([]);
            setError(caught instanceof Error ? caught.message : "Не удалось собрать превью");
          }
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      };
      void run();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canGenerate, requestPayload]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDownload = async () => {
    if (!canGenerate) return;
    setDownloadLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await downloadBookletPdf(requestPayload);
      setNotice(`Скачан файл ${result.filename}`);
      if (result.warnings.length) setPreviewWarnings(result.warnings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось скачать PDF");
    } finally {
      setDownloadLoading(false);
    }
  };

  const categoryLabels = meta?.categoryLabels ?? {
    entry: "Входные двери",
    interior: "Межкомнатные двери",
  };

  return (
    <AdminPage
      title="Буклеты"
      description="Рекламные листовки и буклеты салона: контакты, сайт и примеры входных и межкомнатных дверей. Превью в браузере, скачивание PDF для печати."
      actions={
        <Button
          variant="brand"
          disabled={!canGenerate || downloadLoading}
          onClick={() => void handleDownload()}
        >
          {downloadLoading ? "Скачивание…" : "Скачать PDF"}
        </Button>
      }
    >
      {error ? (
        <AdminNotice variant="error" onDismiss={() => setError("")}>
          {error}
        </AdminNotice>
      ) : null}
      {notice ? (
        <AdminNotice variant="success" onDismiss={() => setNotice("")}>
          {notice}
        </AdminNotice>
      ) : null}
      {previewWarnings.length > 0 ? (
        <AdminNotice variant="warning" onDismiss={() => setPreviewWarnings([])}>
          {previewWarnings.join(" ")}
        </AdminNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]">
        <div className="space-y-6">
          <AdminCard title="Формат" description="Размер готового PDF для печати на обычном принтере.">
            <div className="grid gap-2 sm:grid-cols-3">
              {BOOKLET_FORMATS.map((item) => {
                const selected = item.id === format.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={downloadLoading}
                    onClick={() => setFormatId(item.id)}
                    className={
                      selected
                        ? "rounded border border-admin-text bg-admin-surface-muted px-3 py-2 text-left"
                        : "rounded border border-admin-border bg-admin-surface px-3 py-2 text-left hover:border-admin-text/40"
                    }
                  >
                    <span className="block text-sm font-medium text-admin-text">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-admin-text-muted">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </AdminCard>

          <AdminCard title="Текст на буклете">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs text-admin-text-muted">Пресет заголовка</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={downloadLoading}
                      onClick={() => setHeadline(preset.headline)}
                      className="rounded border border-admin-border px-2 py-1 text-xs text-admin-text hover:bg-admin-surface-muted disabled:opacity-60"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-admin-text-muted">Заголовок</span>
                <input
                  value={headline}
                  maxLength={MAX_HEADLINE_LEN}
                  disabled={downloadLoading}
                  onChange={(event) => setHeadline(event.target.value)}
                  className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-admin-text-muted">Подзаголовок / УТП</span>
                <input
                  value={subhead}
                  maxLength={MAX_SUBHEAD_LEN}
                  disabled={downloadLoading}
                  onChange={(event) => setSubhead(event.target.value)}
                  className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={showPrices}
                  disabled={downloadLoading}
                  onChange={(event) => setShowPrices(event.target.checked)}
                />
                Показывать цены («от … ₽»)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={showComparePrices}
                  disabled={downloadLoading || !showPrices}
                  onChange={(event) => setShowComparePrices(event.target.checked)}
                />
                Перечёркнутая старая цена (если есть акция)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={showCoupon}
                  disabled={downloadLoading}
                  onChange={(event) => setShowCoupon(event.target.checked)}
                />
                Купон / оффер на предъявителя
              </label>
              {showCoupon ? (
                <label className="block space-y-1">
                  <span className="text-xs text-admin-text-muted">Текст купона</span>
                  <input
                    value={couponText}
                    maxLength={MAX_COUPON_LEN}
                    disabled={downloadLoading}
                    onChange={(event) => setCouponText(event.target.value)}
                    className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                  />
                </label>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard title={categoryLabels.entry} description={`До ${format.maxEntry} моделей.`}>
            <BookletProductPicker
              products={entryProducts}
              onChange={setEntryProducts}
              categoryId={meta?.categoryIds.entry ?? null}
              categoryLabel={categoryLabels.entry}
              maxItems={format.maxEntry}
              disabled={downloadLoading}
            />
          </AdminCard>

          <AdminCard
            title={categoryLabels.interior}
            description={`До ${format.maxInterior} моделей.`}
          >
            <BookletProductPicker
              products={interiorProducts}
              onChange={setInteriorProducts}
              categoryId={meta?.categoryIds.interior ?? null}
              categoryLabel={categoryLabels.interior}
              maxItems={format.maxInterior}
              disabled={downloadLoading}
            />
          </AdminCard>
        </div>

        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <AdminCard
            title="Превью"
            description={previewLabel || "PDF появится после выбора хотя бы одной модели."}
          >
            {canGenerate ? (
              <div className="relative overflow-hidden rounded border border-admin-border bg-admin-surface-muted">
                {previewUrl ? (
                  <iframe
                    title="Превью буклета"
                    src={previewUrl}
                    className="h-[720px] w-full bg-white"
                  />
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-sm text-admin-text-muted">
                    {previewLoading ? "Собираем превью…" : "Нет превью"}
                  </div>
                )}
                {previewLoading && previewUrl ? (
                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-admin-surface/80 px-3 py-1 text-center text-xs text-admin-text-muted">
                    Обновляем превью…
                  </div>
                ) : null}
              </div>
            ) : (
              <AdminEmptyState
                title="Выберите модели"
                description="Добавьте входные или межкомнатные двери — справа появится PDF."
              />
            )}
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}

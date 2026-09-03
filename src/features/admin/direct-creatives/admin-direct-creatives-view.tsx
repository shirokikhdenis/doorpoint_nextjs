"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  downloadDirectCreativesZip,
  fetchDirectCreativePreview,
} from "@/lib/client/admin-direct-creatives";
import {
  ALLOWED_SCALES,
  DEFAULT_CTA_TEXT,
  DEFAULT_SCALE,
  DEFAULT_SIZE_IDS,
  DIRECT_CREATIVE_SIZES,
  MAX_CTA_LEN,
  MAX_JPEG_BYTES,
  MAX_PRODUCTS,
  MAX_SITE_NAME_LEN,
  formatCreativeBrandLine,
} from "@/lib/direct-creative-sizes";
import { getSiteUrl } from "@/lib/site-seo";
import { DirectCreativeProductPicker } from "./direct-creative-product-picker";
import type { DirectCreativeProduct } from "./types";

const YANDEX_SIZES_URL =
  "https://yandex.ru/support/direct/ru/unified-performance-campaign/create-image";

const FAMILY_LABELS: Record<string, string> = {
  portrait: "Вертикальные",
  card: "Карточки",
  landscape: "16:9",
  wide: "Широкие баннеры",
};

const FAMILY_ORDER = ["portrait", "card", "landscape", "wide"];

export function AdminDirectCreativesView() {
  const [products, setProducts] = useState<DirectCreativeProduct[]>([]);
  const [sizeIds, setSizeIds] = useState<string[]>(DEFAULT_SIZE_IDS);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [zipLoading, setZipLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [siteName, setSiteName] = useState(() => formatCreativeBrandLine(getSiteUrl()));
  const [ctaText, setCtaText] = useState(DEFAULT_CTA_TEXT);
  const [showDiscountBadge, setShowDiscountBadge] = useState(true);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  const selectedSizes = useMemo(
    () => DIRECT_CREATIVE_SIZES.filter((size) => sizeIds.includes(size.id)),
    [sizeIds],
  );

  const previewProduct = products[0] ?? null;
  const previewSize = selectedSizes[0] ?? null;
  const outputCount = products.length * selectedSizes.length;
  const shownPreviewUrl = previewProduct && previewSize ? previewUrl : "";

  const requestPayload = useMemo(
    () => ({
      productIds: products.map((item) => item.id),
      sizeIds: selectedSizes.map((size) => size.id),
      scale,
      siteName,
      ctaText,
      showDiscountBadge,
      texts: products.map((item) => ({
        productId: item.id,
        name: item.title,
        priceLabel: item.priceLabel,
        compareLabel: item.compareLabel,
        photoProductIds: item.selectedPhotoIds,
      })),
    }),
    [products, selectedSizes, scale, siteName, ctaText, showDiscountBadge],
  );

  useEffect(() => {
    if (!previewProduct || !previewSize) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const run = async () => {
        setPreviewLoading(true);
        setError("");
        try {
          const { blob, filename, warnings } = await fetchDirectCreativePreview({
            productIds: [previewProduct.id],
            sizeIds: [previewSize.id],
            scale,
            siteName,
            ctaText,
            showDiscountBadge,
            texts: [
              {
                productId: previewProduct.id,
                name: previewProduct.title,
                priceLabel: previewProduct.priceLabel,
                compareLabel: previewProduct.compareLabel,
                photoProductIds: previewProduct.selectedPhotoIds,
              },
            ],
          });
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          const pixels = {
            width: previewSize.blockWidth * scale,
            height: previewSize.blockHeight * scale,
          };
          setPreviewLabel(
            `${previewProduct.title || previewProduct.name} · ${pixels.width}×${pixels.height} · ${filename}`,
          );
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
  }, [previewProduct, previewSize, scale, siteName, ctaText, showDiscountBadge]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const toggleSize = (id: string) => {
    setSizeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleDownload = async () => {
    setZipLoading(true);
    setError("");
    setNotice("");
    try {
      await downloadDirectCreativesZip(requestPayload);
      setNotice(
        outputCount === 1
          ? "ZIP с одним креативом скачан."
          : `ZIP с ${outputCount} креативами скачан.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось скачать ZIP");
    } finally {
      setZipLoading(false);
    }
  };

  const canGenerate = products.length > 0 && selectedSizes.length > 0;

  return (
    <AdminPage
      title="Креативы Директ"
      description="JPG-баннеры для Яндекс Директа: фото двери, наименование и цена. Выберите модели и размеры блоков — скачается ZIP."
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <AdminCard
            title="Модели дверей"
            description={`До ${MAX_PRODUCTS} штук. На каждый баннер — одна дверь. Текст на карточке можно править.`}
          >
            <div className="space-y-4">
              <DirectCreativeProductPicker
                products={products}
                onChange={setProducts}
                disabled={zipLoading}
              />
              <label className="block space-y-1">
                <span className="text-xs text-admin-text-muted">Подпись на баннере</span>
                <input
                  value={siteName}
                  maxLength={MAX_SITE_NAME_LEN}
                  disabled={zipLoading}
                  placeholder="домен или оставьте пустым"
                  onChange={(event) => setSiteName(event.target.value)}
                  className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-admin-text-muted">Текст кнопки</span>
                <input
                  value={ctaText}
                  maxLength={MAX_CTA_LEN}
                  disabled={zipLoading}
                  onChange={(event) => setCtaText(event.target.value)}
                  className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={showDiscountBadge}
                  disabled={zipLoading}
                  onChange={(event) => setShowDiscountBadge(event.target.checked)}
                />
                Плашка скидки
              </label>
            </div>
          </AdminCard>

          <AdminCard
            title="Размеры блоков"
            description={
              <>
                Яндекс принимает JPG/PNG до {Math.round(MAX_JPEG_BYTES / 1024)} КБ. Лучше грузить 2×
                или 3× от размера блока.{" "}
                <a
                  href={YANDEX_SIZES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-admin-text underline underline-offset-2"
                >
                  Справка Директа
                </a>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-admin-text-secondary">Масштаб</p>
                <div className="flex flex-wrap gap-2">
                  {ALLOWED_SCALES.map((value) => (
                    <label
                      key={value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded border border-admin-border bg-admin-surface-muted px-3 py-1.5 text-sm"
                    >
                      <input
                        type="radio"
                        name="direct-scale"
                        checked={scale === value}
                        onChange={() => setScale(value)}
                        disabled={zipLoading}
                      />
                      {value}×
                    </label>
                  ))}
                </div>
              </div>

              {FAMILY_ORDER.map((family) => {
                const sizes = DIRECT_CREATIVE_SIZES.filter((size) => size.family === family);
                return (
                  <div key={family}>
                    <p className="mb-2 text-sm font-medium text-admin-text-secondary">
                      {FAMILY_LABELS[family]}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sizes.map((size) => {
                        const outW = size.blockWidth * scale;
                        const outH = size.blockHeight * scale;
                        return (
                          <label
                            key={size.id}
                            className="flex cursor-pointer items-start gap-2 rounded border border-admin-border bg-admin-surface-muted px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={sizeIds.includes(size.id)}
                              onChange={() => toggleSize(size.id)}
                              disabled={zipLoading}
                            />
                            <span>
                              <span className="block font-medium text-admin-text">
                                {size.label}
                                {size.popular ? (
                                  <span className="ml-2 text-xs font-normal text-admin-text-muted">
                                    популярный
                                  </span>
                                ) : null}
                                {size.note ? (
                                  <span className="ml-2 text-xs font-normal text-admin-text-muted">
                                    {size.note}
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-xs text-admin-text-muted">
                                на выходе {outW} × {outH}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Превью" description="Первая выбранная модель и первый размер.">
            {!canGenerate ? (
              <p className="text-sm text-admin-text-muted">
                Выберите хотя бы одну дверь и один размер.
              </p>
            ) : previewLoading && !shownPreviewUrl ? (
              <p className="text-sm text-admin-text-muted">Собираем превью…</p>
            ) : shownPreviewUrl ? (
              <div className="space-y-2">
                <img
                  src={shownPreviewUrl}
                  alt="Превью креатива"
                  className="max-h-[520px] w-full bg-admin-surface-muted object-contain"
                />
                <p className="text-xs text-admin-text-muted">
                  {previewLoading ? "Обновляем… " : null}
                  {previewLabel}
                </p>
              </div>
            ) : (
              <p className="text-sm text-admin-text-muted">Превью появится после генерации.</p>
            )}
          </AdminCard>

          <AdminCard>
            <div className="space-y-3">
              <p className="text-sm text-admin-text-secondary">
                В ZIP: {outputCount || 0} JPG
                {products.length > 0 && selectedSizes.length > 0
                  ? ` (${products.length} × ${selectedSizes.length})`
                  : ""}
                . Имя файла: артикул_ширинаxвысота.jpg.
              </p>
              <Button
                type="button"
                disabled={!canGenerate || zipLoading}
                onClick={() => void handleDownload()}
              >
                {zipLoading ? "Формирование…" : "Скачать ZIP"}
              </Button>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}

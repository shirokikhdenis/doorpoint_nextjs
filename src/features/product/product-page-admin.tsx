"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AttributeCell } from "@/features/admin/products/admin-product-cells";
import { AdminProductFlagFields } from "@/features/admin/products/admin-product-flag-fields";
import type { AttributeDef } from "@/features/admin/products/types";
import { uploadAdminStorefrontImage } from "@/features/admin/admin-image-upload";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/lib/client/use-admin-session";
import { isMergedStorefrontImageUrl } from "@/lib/client/image-src";
import {
  DEFAULT_PRODUCT_FLAG_COLOR,
  normalizeClientFlagColor,
  normalizeClientFlagLabel,
} from "@/lib/client/product-flag";
import type { ProductData } from "@/lib/client/normalizers";
import { cn } from "@/lib/utils";

const HIDDEN_ATTR_CODES = new Set(["pogonazh_id", "manufacturer_id"]);

type AdminProductPayload = {
  attributes?: Array<{
    attributeId: number;
    valueText?: string | null;
    valueNumber?: number | null;
  }>;
  flagLabel?: string | null;
  flagColor?: string | null;
};

const originalGalleryUrls = (product: ProductData) => {
  const source = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  return source.filter((url) => url && !isMergedStorefrontImageUrl(url));
};

const adminIconButtonClass = (active = false) =>
  cn(
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition",
    active
      ? "border-brand bg-brand text-white hover:bg-brand/90"
      : "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100",
  );

export function useProductPageAdmin() {
  const { isAdmin, loading } = useAdminSession();
  const [editing, setEditing] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [error, setError] = useState("");
  const adminMode = !loading && isAdmin;

  useEffect(() => {
    if (!adminMode) setEditing(false);
  }, [adminMode]);

  return {
    adminMode,
    editing,
    setEditing,
    photosBusy,
    setPhotosBusy,
    error,
    setError,
  };
}

export function ProductPageAdminBar({
  editing,
  onToggle,
}: {
  editing: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={editing ? "Завершить редактирование" : "Редактировать карточку"}
      aria-label={editing ? "Завершить редактирование" : "Редактировать карточку"}
      aria-pressed={editing}
      data-testid="product-admin-edit-toggle"
      className={adminIconButtonClass(editing)}
    >
      {editing ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )}
    </button>
  );
}

export function ProductPageAdminFlag({
  product,
  editing,
  onReload,
}: {
  product: ProductData;
  editing: boolean;
  onReload: () => Promise<void>;
}) {
  const [flagLabel, setFlagLabel] = useState("");
  const [flagColor, setFlagColor] = useState(DEFAULT_PRODUCT_FLAG_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!editing) return;
    setFlagLabel(String(product.flagLabel || ""));
    setFlagColor(String(product.flagColor || "").trim() || DEFAULT_PRODUCT_FLAG_COLOR);
    setError("");
    setNotice("");
  }, [editing, product.flagLabel, product.flagColor, product.id]);

  const save = async () => {
    if (!product.id || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}/flag`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flagLabel: normalizeClientFlagLabel(flagLabel),
          flagColor: normalizeClientFlagColor(flagColor),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Не удалось сохранить флажок");
      }
      setNotice("Флажок сохранён");
      await onReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить флажок");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3">
      <p className="mb-3 text-xs text-zinc-500">
        Можно добавить или удалить фото, изменить характеристики и флажок. Склейка входной двери
        пересоберётся сама.
      </p>
      <AdminProductFlagFields
        idPrefix={`product-page-${product.id}`}
        flagLabel={flagLabel}
        flagColor={flagColor}
        onFlagLabelChange={setFlagLabel}
        onFlagColorChange={setFlagColor}
        disabled={saving}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить флажок"}
        </Button>
        {notice ? <span className="text-xs text-emerald-700">{notice}</span> : null}
        {error ? <span className="text-xs text-rose-700">{error}</span> : null}
      </div>
    </div>
  );
}

export function ProductPageAdminAttributes({
  product,
  editing,
  onReload,
}: {
  product: ProductData;
  editing: boolean;
  onReload: () => Promise<void>;
}) {
  const [defs, setDefs] = useState<AttributeDef[]>([]);
  const [values, setValues] = useState<Record<number, string | number | null>>({});
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!editing || !product.id) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoadError("");
      try {
        const [attrRes, productRes] = await Promise.all([
          fetch("/api/admin/attributes", { credentials: "include" }),
          fetch(`/api/admin/products/${product.id}`, { credentials: "include" }),
        ]);
        if (!attrRes.ok) throw new Error("Не удалось загрузить список характеристик");
        if (!productRes.ok) throw new Error("Не удалось загрузить значения характеристик");
        const attrJson = (await attrRes.json()) as AttributeDef[] | { attributes?: AttributeDef[] };
        const attrList = Array.isArray(attrJson) ? attrJson : attrJson.attributes || [];
        const productJson = (await productRes.json()) as AdminProductPayload;
        const nextValues: Record<number, string | number | null> = {};
        for (const entry of productJson.attributes || []) {
          const id = Number(entry.attributeId);
          if (!Number.isInteger(id) || id <= 0) continue;
          if (entry.valueNumber != null && Number.isFinite(Number(entry.valueNumber))) {
            nextValues[id] = Number(entry.valueNumber);
          } else {
            nextValues[id] = entry.valueText ?? "";
          }
        }
        if (!cancelled) {
          setDefs(attrList);
          setValues(nextValues);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : "Ошибка загрузки характеристик");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [editing, product.id, reloadToken]);

  const editableDefs = useMemo(
    () =>
      defs.filter(
        (def) =>
          !def.isVariantAxis &&
          def.isVisibleOnProduct !== false &&
          !HIDDEN_ATTR_CODES.has(String(def.code || "")),
      ),
    [defs],
  );

  if (!editing) return null;

  return (
    <div className="mt-8 border-t border-sky-200 pt-6">
      <h2 className="text-lg font-semibold text-zinc-900">Характеристики</h2>
      {loadError ? <p className="mt-2 text-sm text-rose-700">{loadError}</p> : null}
      <div className="mt-3 space-y-0">
        {editableDefs.map((def) => (
          <div
            key={def.id}
            className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-zinc-200 py-2 text-sm sm:grid-cols-[minmax(9rem,38%)_1fr]"
          >
            <span className="text-zinc-600">{def.name}</span>
            <div className="min-w-0">
              <AttributeCell
                productId={product.id}
                attribute={def}
                value={values[def.id] ?? ""}
                editable
                onSaved={() => {
                  setReloadToken((value) => value + 1);
                  void onReload();
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useProductAdminPhotos(
  product: ProductData | null,
  onReload: () => Promise<void>,
  onBusy: (busy: boolean) => void,
  onError: (message: string) => void,
) {
  const persist = useCallback(
    async (next: string[]) => {
      if (!product?.id) return;
      onBusy(true);
      onError("");
      try {
        const response = await fetch(`/api/admin/products/${product.id}/images`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ images: next }),
        });
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.message || "Не удалось сохранить фото");
        }
        await onReload();
      } catch (caught) {
        onError(caught instanceof Error ? caught.message : "Не удалось сохранить фото");
      } finally {
        onBusy(false);
      }
    },
    [onBusy, onError, onReload, product?.id],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!product || files.length === 0) return;
      onBusy(true);
      onError("");
      try {
        const uploaded: string[] = [];
        for (const file of files) {
          uploaded.push(await uploadAdminStorefrontImage(file, "products"));
        }
        await persist([...originalGalleryUrls(product), ...uploaded]);
      } catch (caught) {
        onBusy(false);
        onError(caught instanceof Error ? caught.message : "Не удалось загрузить фото");
      }
    },
    [onBusy, onError, persist, product],
  );

  const removeImage = useCallback(
    async (url: string) => {
      if (!product || isMergedStorefrontImageUrl(url)) return;
      const remaining = originalGalleryUrls(product).filter((item) => item !== url);
      if (remaining.length === originalGalleryUrls(product).length) return;
      const last = originalGalleryUrls(product).length <= 1;
      const ok = window.confirm(
        last
          ? "Удалить последнее фото? Товар может пропасть из каталога."
          : "Удалить это фото с карточки?",
      );
      if (!ok) return;
      await persist(remaining);
    },
    [persist, product],
  );

  return { addFiles, removeImage };
}

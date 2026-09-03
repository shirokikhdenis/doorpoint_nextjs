"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AttributeCell } from "@/features/admin/products/admin-product-cells";
import type { AttributeDef } from "@/features/admin/products/types";
import { uploadAdminStorefrontImage } from "@/features/admin/admin-image-upload";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/lib/client/use-admin-session";
import { isMergedStorefrontImageUrl } from "@/lib/client/image-src";
import type { ProductData } from "@/lib/client/normalizers";

const HIDDEN_ATTR_CODES = new Set(["pogonazh_id", "manufacturer_id"]);

type AdminProductPayload = {
  attributes?: Array<{
    attributeId: number;
    valueText?: string | null;
    valueNumber?: number | null;
  }>;
};

const originalGalleryUrls = (product: ProductData) => {
  const source = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  return source.filter((url) => url && !isMergedStorefrontImageUrl(url));
};

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
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-sky-950">
          Режим администратора
        </span>
        <Button
          type="button"
          size="sm"
          variant={editing ? "outline" : "brand"}
          onClick={onToggle}
          data-testid="product-admin-edit-toggle"
        >
          {editing ? "Готово" : "Редактировать карточку"}
        </Button>
      </div>
      {editing ? (
        <p className="mt-1.5 text-xs text-sky-950/80">
          Можно добавить или удалить фото и изменить характеристики. Склейка входной двери
          пересоберётся сама.
        </p>
      ) : null}
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

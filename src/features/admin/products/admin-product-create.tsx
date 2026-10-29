"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadAdminStorefrontImage } from "@/features/admin/admin-image-upload";
import {
  AdminFormField,
  AdminInputField,
  AdminSelectField,
} from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { useBodyScrollLock } from "@/lib/client/use-body-scroll-lock";
import {
  PRODUCT_ATTR_HINTS,
  PRODUCT_GENERAL_HINTS,
  getRequiredVariantAttrCodes,
  getRulesForRootSlug,
  isProductAttrRequired,
} from "@/lib/client/product-required-attrs";
import { DEFAULT_PRODUCT_FLAG_COLOR } from "@/lib/client/product-flag";
import { AdminProductFlagFields } from "./admin-product-flag-fields";
import type { AttributeDef, CategoryRef, SubcategoryRef } from "./types";

type AdminProductCreateProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (productId: number) => void;
  attributes: AttributeDef[];
  categories: CategoryRef[];
  subcategories: SubcategoryRef[];
};

type VariantDraft = {
  key: string;
  size: string;
  opening: string;
  price: string;
  sku: string;
};

type ExampleSearchRow = {
  id: number;
  name: string;
  sku: string;
  primaryImageUrl?: string;
};

type ExampleProductPayload = {
  id: number;
  sku: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  subcategoryId: number | null;
  modelKey: string | null;
  attributes: Array<{
    attributeId: number;
    valueText: string | null;
    valueNumber: number | null;
  }>;
  variants: Array<{
    sku: string;
    price: number | null;
    attributes: Array<{
      attributeId: number;
      valueText: string | null;
      valueNumber: number | null;
    }>;
  }>;
};

type PendingExampleApply = {
  label: string;
  attributes: ExampleProductPayload["attributes"];
  variants: ExampleProductPayload["variants"];
  imageUrl: string;
};

const optionValues = (attribute: AttributeDef): string[] =>
  (attribute.options || [])
    .map((option) => (typeof option === "string" ? option : option.value))
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const isTruthyBoolean = (value: string) =>
  ["да", "yes", "true", "1"].includes(value.trim().toLowerCase());

const slugPart = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

const newVariantKey = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyVariant = (price = ""): VariantDraft => ({
  key: newVariantKey(),
  size: "",
  opening: "",
  price,
  sku: "",
});

const mergeUniqueValues = (...lists: Array<Iterable<string> | undefined>) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const value = String(raw || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }
  }
  return out;
};

const exampleAttrToString = (
  entry: { valueText: string | null; valueNumber: number | null },
  type: string,
): string => {
  if (type === "number") {
    if (entry.valueNumber !== null && entry.valueNumber !== undefined && !Number.isNaN(entry.valueNumber)) {
      return String(entry.valueNumber);
    }
    return String(entry.valueText ?? "").trim();
  }
  const text = String(entry.valueText ?? "").trim();
  if (text) return text;
  if (entry.valueNumber !== null && entry.valueNumber !== undefined && !Number.isNaN(entry.valueNumber)) {
    return String(entry.valueNumber);
  }
  return "";
};

const attrsScopeKey = (categoryId: number, subcategoryId: number) =>
  `${categoryId || 0}:${subcategoryId || 0}`;

const reorderImageUrls = (urls: string[], dragUrl: string, targetUrl: string): string[] => {
  const from = urls.indexOf(dragUrl);
  const to = urls.indexOf(targetUrl);
  if (from < 0 || to < 0 || from === to) return urls;
  const next = [...urls];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export function AdminProductCreate({
  open,
  onClose,
  onCreated,
  attributes,
  categories,
  subcategories,
}: AdminProductCreateProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [flagLabel, setFlagLabel] = useState("");
  const [flagColor, setFlagColor] = useState(DEFAULT_PRODUCT_FLAG_COLOR);
  const [categoryId, setCategoryId] = useState(0);
  const [subcategoryId, setSubcategoryId] = useState(0);
  const [attrValues, setAttrValues] = useState<Record<number, string>>({});
  const [existingAttrValues, setExistingAttrValues] = useState<Record<string, string[]>>({});
  const [usedAttrCodes, setUsedAttrCodes] = useState<string[]>([]);
  const [attrsLoading, setAttrsLoading] = useState(false);
  const [attrsScopeReady, setAttrsScopeReady] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [dragImageUrl, setDragImageUrl] = useState<string | null>(null);
  const [overImageUrl, setOverImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exampleSearch, setExampleSearch] = useState("");
  const [exampleResults, setExampleResults] = useState<ExampleSearchRow[]>([]);
  const [exampleSearching, setExampleSearching] = useState(false);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleLabel, setExampleLabel] = useState("");
  const [pendingExample, setPendingExample] = useState<PendingExampleApply | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropPointerDownRef = useRef(false);

  const productAttributes = useMemo(
    () => attributes.filter((attribute) => !attribute.isVariantAxis),
    [attributes],
  );
  const variantAttributes = useMemo(
    () => attributes.filter((attribute) => attribute.isVariantAxis),
    [attributes],
  );
  const attrByCode = useMemo(() => {
    const map = new Map<string, AttributeDef>();
    for (const attribute of attributes) {
      map.set(attribute.code, attribute);
    }
    return map;
  }, [attributes]);
  const availableCodes = useMemo(() => attributes.map((item) => item.code), [attributes]);

  const rootSlug = useMemo(() => {
    const match = categories.find((item) => item.id === categoryId);
    return match?.slug || "";
  }, [categories, categoryId]);

  const rules = useMemo(() => getRulesForRootSlug(rootSlug), [rootSlug]);
  const requiredVariantCodes = useMemo(
    () => getRequiredVariantAttrCodes(rootSlug, availableCodes),
    [rootSlug, availableCodes],
  );
  const showVariants = rules.requireVariants && requiredVariantCodes.length > 0;

  const sizeAttr = attrByCode.get("size");
  const openingAttr = attrByCode.get("opening");
  const sizeOptions = sizeAttr ? optionValues(sizeAttr) : [];
  const openingOptions = openingAttr ? optionValues(openingAttr) : ["Левое", "Правое"];

  const categorySubcategories = useMemo(
    () =>
      subcategories.filter((item) => Number(item.categoryId) === Number(categoryId)),
    [subcategories, categoryId],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSku("");
    setName("");
    setPrice("");
    setModelKey("");
    setIsActive(true);
    setFlagLabel("");
    setFlagColor(DEFAULT_PRODUCT_FLAG_COLOR);
    setCategoryId(0);
    setSubcategoryId(0);
    setAttrValues({});
    setExistingAttrValues({});
    setUsedAttrCodes([]);
    setAttrsLoading(false);
    setAttrsScopeReady(null);
    setVariants([emptyVariant()]);
    setImageUrls([]);
    setDragImageUrl(null);
    setOverImageUrl(null);
    setExampleSearch("");
    setExampleResults([]);
    setExampleLabel("");
    setPendingExample(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = exampleSearch.trim();
    if (q.length < 2) {
      setExampleResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setExampleSearching(true);
        try {
          const params = new URLSearchParams({ search: q, limit: "8", page: "1" });
          if (categoryId) params.set("categoryId", String(categoryId));
          if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
          const response = await fetch(`/api/admin/products-table?${params.toString()}`, {
            credentials: "include",
          });
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as { rows?: ExampleSearchRow[] };
          setExampleResults(Array.isArray(json.rows) ? json.rows : []);
        } catch {
          setExampleResults([]);
        } finally {
          setExampleSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, exampleSearch, categoryId, subcategoryId]);

  useEffect(() => {
    if (!open) return;
    const scope = attrsScopeKey(categoryId, subcategoryId);
    if (!categoryId && !subcategoryId) {
      setUsedAttrCodes([]);
      setExistingAttrValues({});
      setAttrsLoading(false);
      setAttrsScopeReady(scope);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setAttrsLoading(true);
    setAttrsScopeReady(null);

    void (async () => {
      try {
        const scopeParams = new URLSearchParams();
        if (categoryId) scopeParams.set("categoryId", String(categoryId));
        if (subcategoryId) scopeParams.set("subcategoryId", String(subcategoryId));

        const codesResponse = await fetch(
          `/api/admin/product-attribute-codes?${scopeParams.toString()}`,
          { credentials: "include", signal: controller.signal },
        );
        const codesPayload = (await codesResponse.json().catch(() => null)) as
          | { codes?: string[]; message?: string }
          | null;
        const codes = codesResponse.ok && Array.isArray(codesPayload?.codes)
          ? codesPayload.codes.map((code) => String(code || "").trim()).filter(Boolean)
          : [];
        if (cancelled) return;
        setUsedAttrCodes(codes);

        const valueEntries = await Promise.all(
          codes.map(async (code) => {
            try {
              const params = new URLSearchParams({ code });
              if (categoryId) params.set("categoryId", String(categoryId));
              if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
              const response = await fetch(
                `/api/admin/product-attribute-values?${params.toString()}`,
                { credentials: "include", signal: controller.signal },
              );
              if (!response.ok) return [code, [] as string[]] as const;
              const payload = (await response.json().catch(() => null)) as unknown;
              const values = Array.isArray(payload)
                ? payload.map((item) => String(item || "").trim()).filter(Boolean)
                : [];
              return [code, values] as const;
            } catch {
              return [code, [] as string[]] as const;
            }
          }),
        );
        if (cancelled) return;
        setExistingAttrValues(Object.fromEntries(valueEntries));
      } catch {
        if (!cancelled) {
          setUsedAttrCodes([]);
          setExistingAttrValues({});
        }
      } finally {
        if (!cancelled) {
          setAttrsLoading(false);
          setAttrsScopeReady(scope);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, categoryId, subcategoryId]);

  const visibleProductAttributes = useMemo(() => {
    if (!categoryId) return [];
    const used = new Set(usedAttrCodes);
    if (used.size === 0) {
      // First product in group: show group-required fields so create is possible.
      return productAttributes.filter((attribute) =>
        isProductAttrRequired(rootSlug, attribute.code, availableCodes),
      );
    }
    return productAttributes.filter((attribute) => used.has(attribute.code));
  }, [categoryId, usedAttrCodes, productAttributes, rootSlug, availableCodes]);

  useEffect(() => {
    if (pendingExample) return;
    const visibleIds = new Set(visibleProductAttributes.map((attribute) => attribute.id));
    setAttrValues((current) => {
      const next: Record<number, string> = {};
      for (const [id, value] of Object.entries(current)) {
        const numericId = Number(id);
        if (visibleIds.has(numericId)) next[numericId] = value;
      }
      return next;
    });
  }, [visibleProductAttributes, pendingExample]);

  useEffect(() => {
    if (!pendingExample || attrsLoading || !categoryId) return;
    const currentScope = attrsScopeKey(categoryId, subcategoryId);
    // Wait until group attribute codes are loaded — otherwise values get applied
    // against the required-only visible set and then pruned before the full list appears.
    if (attrsScopeReady !== currentScope) return;

    const nextValues: Record<number, string> = {};
    for (const entry of pendingExample.attributes) {
      const def = attributes.find((item) => item.id === Number(entry.attributeId));
      if (!def || def.isVariantAxis) continue;
      const asString = exampleAttrToString(entry, def.type);
      if (asString) nextValues[def.id] = asString;
    }
    setAttrValues(nextValues);

    const sizeId = sizeAttr?.id;
    const openingId = openingAttr?.id;
    const nextVariants: VariantDraft[] = pendingExample.variants.map((variant) => {
      let size = "";
      let opening = "";
      for (const entry of variant.attributes || []) {
        if (sizeId && Number(entry.attributeId) === sizeId) {
          size = exampleAttrToString(entry, sizeAttr?.type || "text");
        }
        if (openingId && Number(entry.attributeId) === openingId) {
          opening = exampleAttrToString(entry, openingAttr?.type || "text");
        }
      }
      return {
        key: newVariantKey(),
        size,
        opening,
        price: variant.price != null ? String(variant.price) : "",
        sku: "",
      };
    });
    setVariants(nextVariants.length > 0 ? nextVariants : [emptyVariant()]);

    if (pendingExample.imageUrl) {
      setImageUrls([pendingExample.imageUrl]);
    }
    setExampleLabel(pendingExample.label);
    setPendingExample(null);
    setExampleSearch("");
    setExampleResults([]);
  }, [
    pendingExample,
    attrsLoading,
    attrsScopeReady,
    categoryId,
    subcategoryId,
    attributes,
    sizeAttr?.id,
    sizeAttr?.type,
    openingAttr?.id,
    openingAttr?.type,
  ]);

  const setAttrValue = (attributeId: number, value: string) => {
    setAttrValues((current) => ({ ...current, [attributeId]: value }));
  };

  const clearExample = () => {
    setExampleLabel("");
    setPendingExample(null);
  };

  const applyExampleProduct = async (row: ExampleSearchRow) => {
    if (exampleLoading) return;
    setExampleLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${row.id}`, {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | (ExampleProductPayload & { message?: string })
        | null;
      if (!response.ok || !payload?.id) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }

      setCategoryId(Number(payload.categoryId) || 0);
      setSubcategoryId(Number(payload.subcategoryId) || 0);
      setName(String(payload.name || ""));
      setPrice(payload.price != null ? String(payload.price) : "");
      setModelKey(String(payload.modelKey || ""));
      setIsActive(true);
      setSku("");
      setPendingExample({
        label: `${payload.name} · ${payload.sku}`,
        attributes: Array.isArray(payload.attributes) ? payload.attributes : [],
        variants: Array.isArray(payload.variants) ? payload.variants : [],
        imageUrl: String(payload.imageUrl || "").trim(),
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Не удалось загрузить товар-образец",
      );
    } finally {
      setExampleLoading(false);
    }
  };

  const suggestionsForAttribute = (attribute: AttributeDef) =>
    mergeUniqueValues(optionValues(attribute), existingAttrValues[attribute.code]);

  const buildAttributePayload = (list: AttributeDef[], values: Record<number, string>) =>
    list.map((attribute) => {
      const raw = values[attribute.id] ?? "";
      if (attribute.type === "number") {
        const trimmed = raw.trim();
        return {
          attributeId: attribute.id,
          valueText: null,
          valueNumber: trimmed === "" ? null : Number(trimmed.replace(",", ".")),
          valueOptionId: null,
        };
      }
      if (attribute.type === "boolean") {
        const trimmed = raw.trim();
        return {
          attributeId: attribute.id,
          valueText: trimmed === "" ? "" : isTruthyBoolean(trimmed) ? "Да" : "Нет",
          valueNumber: null,
          valueOptionId: null,
        };
      }
      return {
        attributeId: attribute.id,
        valueText: raw,
        valueNumber: null,
        valueOptionId: null,
      };
    });

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadAdminStorefrontImage(file, "products"));
      }
      setImageUrls((current) => [...current, ...uploaded]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validateClient = () => {
    const nextSku = sku.trim();
    const nextName = name.trim();
    if (!nextSku || !nextName) return "Укажите SKU и название";
    if (!categoryId) return "Укажите группу (категорию)";
    const parsedPrice = Number(String(price).replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return "Цена должна быть неотрицательным числом";
    }
    if (imageUrls.length === 0) return "Добавьте хотя бы одно фото — иначе товар не появится в каталоге";

    for (const attribute of visibleProductAttributes) {
      if (!isProductAttrRequired(rootSlug, attribute.code, availableCodes)) continue;
      const raw = String(attrValues[attribute.id] ?? "").trim();
      if (!raw) return `Заполните обязательную характеристику: ${attribute.name}`;
    }

    if (showVariants) {
      if (variants.length === 0) return "Добавьте хотя бы одну разновидность (размер/открывание)";
      for (const [index, variant] of variants.entries()) {
        if (requiredVariantCodes.includes("size") && sizeAttr && !variant.size.trim()) {
          return `Разновидность ${index + 1}: укажите размер`;
        }
        if (requiredVariantCodes.includes("opening") && openingAttr && !variant.opening.trim()) {
          return `Разновидность ${index + 1}: укажите открывание`;
        }
      }
    }
    return "";
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || uploading) return;
    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    const parsedPrice = Math.round(Number(String(price).replace(",", ".")));
    const nextSku = sku.trim();
    setSaving(true);
    setError("");
    try {
      const payloadAttributes = buildAttributePayload(visibleProductAttributes, attrValues);

      let variantsPayload: Array<{
        sku: string;
        price: number;
        attributes: ReturnType<typeof buildAttributePayload>;
        sortOrder: number;
        isActive: boolean;
      }> | undefined;

      if (showVariants) {
        variantsPayload = variants.map((variant, index) => {
          const variantSku =
            variant.sku.trim() ||
            [nextSku, slugPart(variant.size), slugPart(variant.opening)].filter(Boolean).join("--");
          const values: Record<number, string> = {};
          if (sizeAttr) values[sizeAttr.id] = variant.size;
          if (openingAttr) values[openingAttr.id] = variant.opening;
          const variantPriceRaw = variant.price.trim()
            ? Number(String(variant.price).replace(",", "."))
            : parsedPrice;
          return {
            sku: variantSku,
            price: Number.isFinite(variantPriceRaw) ? Math.round(variantPriceRaw) : parsedPrice,
            attributes: buildAttributePayload(variantAttributes, values),
            sortOrder: index,
            isActive: true,
          };
        });
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: nextSku,
          name: name.trim(),
          price: parsedPrice,
          categoryId,
          subcategoryId: subcategoryId || null,
          modelKey: modelKey.trim() || null,
          isActive,
          flagLabel,
          flagColor,
          imageUrl: imageUrls[0],
          imageUrls,
          attributes: payloadAttributes,
          variants: variantsPayload,
          enforceRequiredAttrs: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; id?: number | string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }
      const productId = Number(payload?.id);
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error("Товар создан, но сервер не вернул id");
      }
      onCreated(productId);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать товар");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Новый товар"
      onMouseDown={(event) => {
        backdropPointerDownRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only close when press AND release both started on the dimmed backdrop.
        // Selecting text in an input and releasing outside would otherwise fire
        // click on this common ancestor and dismiss the drawer.
        if (!backdropPointerDownRef.current) return;
        if (event.target !== event.currentTarget) return;
        if (!saving) onClose();
      }}
    >
      <form
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl"
        onSubmit={(event) => void save(event)}
        onMouseDown={(event) => {
          backdropPointerDownRef.current = false;
          event.stopPropagation();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Новый товар</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Заполните группу, характеристики и фото. Без фото товар не попадёт в каталог.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

          <section className="space-y-2 rounded-md border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-950">
            <p className="font-semibold">Почему важны характеристики</p>
            <ul className="list-disc space-y-1 pl-4">
              {PRODUCT_GENERAL_HINTS.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
              {rootSlug ? (
                <li>
                  Для группы <span className="font-mono">{rootSlug}</span> обязательны:{" "}
                  {[
                    ...rules.productAttrs.filter((code) => availableCodes.includes(code)),
                    ...(showVariants ? requiredVariantCodes : []),
                  ].join(", ") || "только основные поля и фото"}
                  .
                </li>
              ) : null}
            </ul>
          </section>

          <section className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/70 p-3">
            <h3 className="text-sm font-semibold text-zinc-800">Товар-образец</h3>
            <p className="text-xs text-zinc-500">
              Выберите готовый товар — подставятся группа, характеристики, разновидности и фото.
              SKU нужно указать свой.
            </p>
            {exampleLabel ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <span>
                  Образец: <span className="font-medium">{exampleLabel}</span>
                  {exampleLoading || pendingExample ? " · применяем…" : ""}
                </span>
                <button
                  type="button"
                  className="text-xs text-emerald-800 underline underline-offset-2"
                  onClick={clearExample}
                  disabled={exampleLoading}
                >
                  Сбросить
                </button>
              </div>
            ) : null}
            <input
              type="search"
              value={exampleSearch}
              onChange={(event) => setExampleSearch(event.target.value)}
              placeholder="Поиск по названию или артикулу…"
              className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
              disabled={exampleLoading}
            />
            {exampleSearching ? (
              <p className="text-xs text-zinc-500">Ищем…</p>
            ) : exampleResults.length > 0 ? (
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded border border-zinc-200 bg-white">
                {exampleResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-60"
                      disabled={exampleLoading}
                      onClick={() => void applyExampleProduct(row)}
                    >
                      {row.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.primaryImageUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-400">
                          нет
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900">{row.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{row.sku}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : exampleSearch.trim().length >= 2 ? (
              <p className="text-xs text-zinc-500">Ничего не найдено</p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">1. Группа</h3>
            <AdminSelectField
              id="create-product-category"
              label="Группа (категория)"
              value={categoryId || ""}
              required
              onChange={(event) => {
                const next = Number(event.target.value) || 0;
                setCategoryId(next);
                setSubcategoryId(0);
                clearExample();
              }}
            >
              <option value="">Выберите группу</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.slug ? ` (${category.slug})` : ""}
                </option>
              ))}
            </AdminSelectField>
            <AdminSelectField
              id="create-product-subcategory"
              label="Подкатегория"
              value={subcategoryId || ""}
              onChange={(event) => {
                setSubcategoryId(Number(event.target.value) || 0);
                clearExample();
              }}
              disabled={!categoryId}
              hint="Лист в дереве каталога. Если не указать — товар привяжется к группе."
            >
              <option value="">Без подкатегории</option>
              {categorySubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </AdminSelectField>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">2. Основные поля</h3>
            <AdminInputField
              id="create-product-sku"
              label="SKU"
              value={sku}
              required
              onChange={(event) => setSku(event.target.value)}
            />
            <AdminInputField
              id="create-product-name"
              label="Название"
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
            <AdminInputField
              id="create-product-price"
              label="Цена, ₽"
              type="number"
              min={0}
              step={1}
              value={price}
              required
              onChange={(event) => setPrice(event.target.value)}
            />
            <AdminInputField
              id="create-product-model-key"
              label="model_key"
              value={modelKey}
              onChange={(event) => setModelKey(event.target.value)}
              hint={PRODUCT_ATTR_HINTS.model_key}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Активен на витрине
            </label>
            <AdminProductFlagFields
              idPrefix="create-product"
              flagLabel={flagLabel}
              flagColor={flagColor}
              onFlagLabelChange={setFlagLabel}
              onFlagColorChange={setFlagColor}
              disabled={saving}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">3. Характеристики</h3>
            <p className="text-xs text-zinc-500">
              Показаны только поля, которые уже заполнены у товаров этой группы. Можно выбрать
              значение из списка или вписать своё.
            </p>
            {!categoryId ? (
              <p className="text-sm text-zinc-500">Сначала выберите группу.</p>
            ) : attrsLoading ? (
              <p className="text-sm text-zinc-500">Загрузка характеристик группы…</p>
            ) : visibleProductAttributes.length === 0 ? (
              <p className="text-sm text-zinc-500">
                У товаров этой группы пока нет заполненных характеристик.
              </p>
            ) : (
              visibleProductAttributes.map((attribute) => {
                const fieldId = `create-attr-${attribute.id}`;
                const listId = `${fieldId}-list`;
                const value = attrValues[attribute.id] ?? "";
                const required = isProductAttrRequired(rootSlug, attribute.code, availableCodes);
                const baseHint =
                  PRODUCT_ATTR_HINTS[attribute.code] ||
                  `${attribute.code} · ${attribute.type}${required ? " · обязательно" : ""}`;
                const hint = `${baseHint} Можно выбрать из списка или ввести своё.`;
                const label = required ? `${attribute.name} *` : attribute.name;

                if (attribute.type === "boolean") {
                  const selectValue = value === "" ? "" : isTruthyBoolean(value) ? "Да" : "Нет";
                  return (
                    <AdminSelectField
                      key={attribute.id}
                      id={fieldId}
                      label={label}
                      hint={hint}
                      value={selectValue}
                      required={required}
                      onChange={(event) => setAttrValue(attribute.id, event.target.value)}
                    >
                      <option value="">Не задано</option>
                      <option value="Да">Да</option>
                      <option value="Нет">Нет</option>
                    </AdminSelectField>
                  );
                }

                const suggestions = suggestionsForAttribute(attribute);
                return (
                  <AdminFormField key={attribute.id} label={label} htmlFor={fieldId} hint={hint}>
                    <Input
                      id={fieldId}
                      list={listId}
                      type={attribute.type === "number" ? "number" : "text"}
                      value={value}
                      required={required}
                      autoComplete="off"
                      placeholder={
                        suggestions.length > 0
                          ? "Выберите или введите своё"
                          : "Введите значение"
                      }
                      onChange={(event) => setAttrValue(attribute.id, event.target.value)}
                    />
                    <datalist id={listId}>
                      {suggestions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </AdminFormField>
                );
              })
            )}
          </section>

          {showVariants ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-800">4. Разновидности</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants((current) => [...current, emptyVariant(price)])}
                >
                  + вариант
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                {PRODUCT_ATTR_HINTS.size} {PRODUCT_ATTR_HINTS.opening}
              </p>
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={variant.key}
                    className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-2"
                  >
                    {sizeAttr ? (
                      <AdminFormField
                        label={`Размер #${index + 1}${
                          requiredVariantCodes.includes("size") ? " *" : ""
                        }`}
                        htmlFor={`create-variant-size-${variant.key}`}
                        hint="Можно выбрать из списка или ввести своё"
                      >
                        <Input
                          id={`create-variant-size-${variant.key}`}
                          list={`create-variant-size-list-${variant.key}`}
                          value={variant.size}
                          required={requiredVariantCodes.includes("size")}
                          autoComplete="off"
                          placeholder="например 800x2000"
                          onChange={(event) =>
                            setVariants((current) =>
                              current.map((row) =>
                                row.key === variant.key
                                  ? { ...row, size: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                        <datalist id={`create-variant-size-list-${variant.key}`}>
                          {sizeOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </AdminFormField>
                    ) : null}
                    {openingAttr ? (
                      <AdminFormField
                        label={`Открывание${
                          requiredVariantCodes.includes("opening") ? " *" : ""
                        }`}
                        htmlFor={`create-variant-opening-${variant.key}`}
                        hint="Можно выбрать из списка или ввести своё"
                      >
                        <Input
                          id={`create-variant-opening-${variant.key}`}
                          list={`create-variant-opening-list-${variant.key}`}
                          value={variant.opening}
                          required={requiredVariantCodes.includes("opening")}
                          autoComplete="off"
                          placeholder="Левое / Правое"
                          onChange={(event) =>
                            setVariants((current) =>
                              current.map((row) =>
                                row.key === variant.key
                                  ? { ...row, opening: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                        <datalist id={`create-variant-opening-list-${variant.key}`}>
                          {openingOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </AdminFormField>
                    ) : null}
                    <AdminInputField
                      id={`create-variant-price-${variant.key}`}
                      label="Цена варианта"
                      type="number"
                      min={0}
                      step={1}
                      value={variant.price}
                      placeholder={price || "как у товара"}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((row) =>
                            row.key === variant.key ? { ...row, price: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    <AdminInputField
                      id={`create-variant-sku-${variant.key}`}
                      label="SKU варианта"
                      value={variant.sku}
                      placeholder="авто из SKU + размер + открывание"
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((row) =>
                            row.key === variant.key ? { ...row, sku: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    {variants.length > 1 ? (
                      <button
                        type="button"
                        className="text-left text-xs text-red-600 hover:underline sm:col-span-2"
                        onClick={() =>
                          setVariants((current) => current.filter((row) => row.key !== variant.key))
                        }
                      >
                        Удалить вариант
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">
              {showVariants ? "5" : "4"}. Фото *
            </h3>
            <p className="text-xs text-zinc-500">
              Без реального изображения товар не попадает в листинг каталога. Перетащите фото,
              чтобы задать порядок
              {rootSlug === "entry-doors"
                ? " — для входных первое и второе склеятся на витрине (лицо + торец)."
                : " (первое — основное)."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Загрузка…" : "Загрузить фото"}
              </Button>
            </div>
            {imageUrls.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {imageUrls.map((url, index) => {
                  const isDragging = dragImageUrl === url;
                  const isOver = overImageUrl === url && dragImageUrl !== url;
                  return (
                    <li
                      key={url}
                      draggable={!uploading && !saving}
                      onDragStart={() => {
                        if (uploading || saving) return;
                        setDragImageUrl(url);
                      }}
                      onDragEnd={() => {
                        setDragImageUrl(null);
                        setOverImageUrl(null);
                      }}
                      onDragOver={(event) => {
                        if (uploading || saving) return;
                        event.preventDefault();
                        setOverImageUrl(url);
                      }}
                      onDragLeave={() => {
                        if (overImageUrl === url) setOverImageUrl(null);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (uploading || saving || !dragImageUrl || dragImageUrl === url) return;
                        setImageUrls((current) => reorderImageUrls(current, dragImageUrl, url));
                        setDragImageUrl(null);
                        setOverImageUrl(null);
                      }}
                      className={`relative overflow-hidden rounded border bg-zinc-50 transition ${
                        uploading || saving
                          ? "opacity-60"
                          : "cursor-grab active:cursor-grabbing"
                      } ${isDragging ? "opacity-40" : ""} ${
                        isOver
                          ? "border-sky-500 ring-2 ring-sky-400/40"
                          : "border-zinc-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        draggable={false}
                        className="pointer-events-none h-24 w-full object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        title="Удалить фото"
                        disabled={uploading || saving}
                        className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs text-zinc-700 disabled:opacity-50"
                        onClick={() =>
                          setImageUrls((current) => current.filter((item) => item !== url))
                        }
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Фото ещё не выбраны.</p>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Создание…" : "Создать товар"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { cn } from "@/lib/utils";
import type { AttributeDef, CategoryRef, SubcategoryRef } from "./types";

type ProductAttributeValue = {
  attributeId: number;
  valueText: string | null;
  valueNumber: number | null;
  valueOptionId: number | null;
};

type ProductForEdit = {
  id: number;
  sku: string;
  name: string;
  price: number;
  isActive: boolean;
  categoryId: number;
  subcategoryId: number | null;
  modelKey: string | null;
  attributes: ProductAttributeValue[];
};

type AdminProductEditorProps = {
  productId: number;
  productName: string;
  attributes: AttributeDef[];
  categories: CategoryRef[];
  subcategories: SubcategoryRef[];
  onSaved: () => void;
  children: React.ReactNode;
  className?: string;
};

const optionValues = (attribute: AttributeDef): string[] =>
  (attribute.options || [])
    .map((option) => (typeof option === "string" ? option : option.value))
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const attrValueToString = (entry: ProductAttributeValue | undefined, type: string): string => {
  if (!entry) return "";
  if (type === "number") {
    if (entry.valueNumber === null || entry.valueNumber === undefined || Number.isNaN(entry.valueNumber)) {
      return "";
    }
    return String(entry.valueNumber);
  }
  return String(entry.valueText ?? "").trim();
};

const isTruthyBoolean = (value: string) =>
  ["да", "yes", "true", "1"].includes(value.trim().toLowerCase());

export function AdminProductEditor({
  productId,
  productName,
  attributes,
  categories,
  subcategories,
  onSaved,
  children,
  className,
}: AdminProductEditorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [modelKey, setModelKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState(0);
  const [subcategoryId, setSubcategoryId] = useState(0);
  const [attrValues, setAttrValues] = useState<Record<number, string>>({});
  const [attrOrderIds, setAttrOrderIds] = useState<number[]>([]);

  const productAttributes = useMemo(
    () => attributes.filter((attribute) => !attribute.isVariantAxis),
    [attributes],
  );

  const orderedProductAttributes = useMemo(() => {
    const byId = new Map(productAttributes.map((attribute) => [attribute.id, attribute]));
    const ordered = attrOrderIds
      .map((id) => byId.get(id))
      .filter((attribute): attribute is AttributeDef => Boolean(attribute));
    const seen = new Set(ordered.map((attribute) => attribute.id));
    return [...ordered, ...productAttributes.filter((attribute) => !seen.has(attribute.id))];
  }, [productAttributes, attrOrderIds]);

  const categorySubcategories = useMemo(
    () => subcategories.filter((item) => item.categoryId === categoryId),
    [subcategories, categoryId],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, saving]);

  const applyProduct = (product: ProductForEdit) => {
    setSku(product.sku || "");
    setName(product.name || "");
    setPrice(String(product.price ?? 0));
    setModelKey(product.modelKey || "");
    setIsActive(product.isActive !== false);
    setCategoryId(Number(product.categoryId) || 0);
    setSubcategoryId(Number(product.subcategoryId) || 0);
    const byId = new Map((product.attributes || []).map((entry) => [Number(entry.attributeId), entry]));
    const next: Record<number, string> = {};
    for (const attribute of productAttributes) {
      next[attribute.id] = attrValueToString(byId.get(attribute.id), attribute.type);
    }
    setAttrValues(next);
    setAttrOrderIds(
      [...productAttributes]
        .sort((left, right) => {
          const leftFilled = String(next[left.id] ?? "").trim() !== "";
          const rightFilled = String(next[right.id] ?? "").trim() !== "";
          if (leftFilled === rightFilled) return 0;
          return leftFilled ? -1 : 1;
        })
        .map((attribute) => attribute.id),
    );
  };

  const openEditor = async () => {
    setOpen(true);
    setLoading(true);
    setSaving(false);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      const product = (await response.json()) as ProductForEdit;
      applyProduct(product);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить товар");
    } finally {
      setLoading(false);
    }
  };

  const setAttrValue = (attributeId: number, value: string) => {
    setAttrValues((current) => ({ ...current, [attributeId]: value }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;
    const nextName = name.trim();
    const nextSku = sku.trim();
    if (!nextName || !nextSku) {
      setError("Укажите SKU и название");
      return;
    }
    if (!categoryId) {
      setError("Укажите категорию");
      return;
    }
    const parsedPrice = Number(String(price).replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Цена должна быть неотрицательным числом");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payloadAttributes = productAttributes.map((attribute) => {
        const raw = attrValues[attribute.id] ?? "";
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

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: nextSku,
          name: nextName,
          price: Math.round(parsedPrice),
          categoryId,
          subcategoryId: subcategoryId || null,
          modelKey: modelKey.trim() || null,
          isActive,
          attributes: payloadAttributes,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      setOpen(false);
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить товар");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void openEditor()}
        aria-label={`Редактировать ${productName}`}
        title={productName}
        className={cn(
          "max-w-full text-left font-medium text-zinc-900 hover:text-brand hover:underline",
          className,
        )}
      >
        {children}
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex justify-end bg-black/40"
              role="dialog"
              aria-modal="true"
              aria-label={`Редактирование: ${productName}`}
              onClick={() => {
                if (!saving) setOpen(false);
              }}
            >
              <form
                className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
                onSubmit={(event) => void save(event)}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-zinc-200 px-5 py-4">
                  <h2 className="text-lg font-semibold text-zinc-900">Редактирование товара</h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">{productName}</p>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                  {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
                  {loading ? <p className="text-sm text-zinc-500">Загрузка…</p> : null}

                  {!loading ? (
                    <>
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-800">Основные поля</h3>
                        <AdminInputField
                          id={`product-${productId}-sku`}
                          label="SKU"
                          value={sku}
                          onChange={(event) => setSku(event.target.value)}
                          required
                        />
                        <AdminInputField
                          id={`product-${productId}-name`}
                          label="Название"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                        />
                        <AdminInputField
                          id={`product-${productId}-price`}
                          label="Цена, ₽"
                          type="number"
                          min={0}
                          step={1}
                          value={price}
                          onChange={(event) => setPrice(event.target.value)}
                        />
                        <AdminInputField
                          id={`product-${productId}-model-key`}
                          label="model_key"
                          value={modelKey}
                          onChange={(event) => setModelKey(event.target.value)}
                          hint="Группирует цвета/стекло одной модели. Пусто — без группы."
                        />
                        <AdminSelectField
                          id={`product-${productId}-category`}
                          label="Категория"
                          value={categoryId || ""}
                          onChange={(event) => {
                            const next = Number(event.target.value) || 0;
                            setCategoryId(next);
                            setSubcategoryId(0);
                          }}
                        >
                          <option value="">Выберите категорию</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </AdminSelectField>
                        <AdminSelectField
                          id={`product-${productId}-subcategory`}
                          label="Подкатегория"
                          value={subcategoryId || ""}
                          onChange={(event) => setSubcategoryId(Number(event.target.value) || 0)}
                          disabled={!categoryId}
                        >
                          <option value="">Без подкатегории</option>
                          {categorySubcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                        </AdminSelectField>
                        <label className="flex items-center gap-2 text-sm text-zinc-800">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(event) => setIsActive(event.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          Активен на витрине
                        </label>
                      </section>

                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-800">Атрибуты</h3>
                        {orderedProductAttributes.length === 0 ? (
                          <p className="text-sm text-zinc-500">Справочник атрибутов пуст.</p>
                        ) : (
                          orderedProductAttributes.map((attribute) => {
                            const fieldId = `product-${productId}-attr-${attribute.id}`;
                            const value = attrValues[attribute.id] ?? "";
                            const options = optionValues(attribute);
                            const hint = `${attribute.code} · ${attribute.type}`;

                            if (attribute.type === "boolean") {
                              const selectValue =
                                value === "" ? "" : isTruthyBoolean(value) ? "Да" : "Нет";
                              return (
                                <AdminSelectField
                                  key={attribute.id}
                                  id={fieldId}
                                  label={attribute.name}
                                  hint={hint}
                                  value={selectValue}
                                  onChange={(event) => setAttrValue(attribute.id, event.target.value)}
                                >
                                  <option value="">Не задано</option>
                                  <option value="Да">Да</option>
                                  <option value="Нет">Нет</option>
                                </AdminSelectField>
                              );
                            }

                            if (attribute.type === "option" && options.length > 0) {
                              const selectOptions =
                                value && !options.includes(value) ? [value, ...options] : options;
                              return (
                                <AdminSelectField
                                  key={attribute.id}
                                  id={fieldId}
                                  label={attribute.name}
                                  hint={hint}
                                  value={value}
                                  onChange={(event) => setAttrValue(attribute.id, event.target.value)}
                                >
                                  <option value="">Не задано</option>
                                  {selectOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </AdminSelectField>
                              );
                            }

                            return (
                              <AdminInputField
                                key={attribute.id}
                                id={fieldId}
                                label={attribute.name}
                                hint={hint}
                                type={attribute.type === "number" ? "number" : "text"}
                                value={value}
                                onChange={(event) => setAttrValue(attribute.id, event.target.value)}
                              />
                            );
                          })
                        )}
                      </section>
                    </>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={saving || loading}>
                    {saving ? "Сохраняем…" : "Сохранить"}
                  </Button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

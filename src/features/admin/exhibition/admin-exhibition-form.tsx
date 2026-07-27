"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/client/format";
import { AdminConfirmButton } from "@/features/admin/ui/admin-confirm-button";
import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { CATEGORY_OPTIONS } from "./constants";
import { ProductSearchField } from "./product-search-field";
import type {
  ExhibitionDoorRow,
  ExhibitionFormState,
  ExhibitionMeta,
  ProductPreviewResponse,
  ProductSearchRow,
} from "./types";

const emptyForm = (): ExhibitionFormState => ({
  categoryType: "entry",
  productId: null,
  productName: "",
  productSku: "",
  coatingColor: "",
  coatingType: "",
  manufacturerName: "",
  accessories: [],
  price: null,
  kitPrice: null,
  sortOrder: 0,
});

const rowToForm = (row: ExhibitionDoorRow): ExhibitionFormState => ({
  categoryType: row.categoryType,
  productId: row.productId,
  productName: row.productName,
  productSku: row.productSku,
  coatingColor: row.coatingColor,
  coatingType: row.coatingType,
  manufacturerName: row.manufacturerName,
  accessories: row.accessories,
  price: row.price,
  kitPrice: row.kitPrice,
  sortOrder: row.sortOrder,
});

type AdminExhibitionFormProps = {
  meta: ExhibitionMeta | null;
  manufacturers: string[];
  editingRow: ExhibitionDoorRow | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: ExhibitionFormState) => Promise<void>;
  onDelete?: (row: ExhibitionDoorRow) => Promise<void>;
};

export function AdminExhibitionForm({
  meta,
  manufacturers,
  editingRow,
  saving,
  onCancel,
  onSubmit,
  onDelete,
}: AdminExhibitionFormProps) {
  const [form, setForm] = useState<ExhibitionFormState>(emptyForm);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchRow | null>(null);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [manufacturerOptions, setManufacturerOptions] = useState<string[]>(manufacturers);

  useEffect(() => {
    if (editingRow) {
      setForm(rowToForm(editingRow));
      setSelectedProduct(
        editingRow.productId
          ? {
              id: editingRow.productId,
              name: editingRow.productName,
              sku: editingRow.productSku,
              color: editingRow.coatingColor || null,
            }
          : null,
      );
      setColorOptions(editingRow.coatingColor ? [editingRow.coatingColor] : []);
    } else {
      setForm(emptyForm());
      setSelectedProduct(null);
      setColorOptions([]);
    }
    setPreviewError("");
  }, [editingRow]);

  useEffect(() => {
    setManufacturerOptions(manufacturers);
  }, [manufacturers]);

  const categoryId = useMemo(() => {
    if (!meta) return null;
    return form.categoryType === "entry" ? meta.categoryIds.entry : meta.categoryIds.interior;
  }, [form.categoryType, meta]);

  const applyPreview = (preview: ProductPreviewResponse) => {
    setForm((prev) => ({
      ...prev,
      productId: preview.snapshot.productId,
      productName: preview.snapshot.productName,
      productSku: preview.snapshot.productSku,
      manufacturerName: preview.snapshot.manufacturerName,
      coatingColor: preview.snapshot.coatingColor,
      coatingType: preview.snapshot.coatingType,
      price: preview.snapshot.price,
      kitPrice: preview.snapshot.kitPrice,
      accessories: preview.snapshot.accessories,
    }));
    setColorOptions(preview.colorOptions);
    setManufacturerOptions(preview.manufacturers);
  };

  const loadPreview = async (productId: number) => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const params = new URLSearchParams({
        productId: String(productId),
        categoryType: form.categoryType,
      });
      const response = await fetch(`/api/admin/exhibition/product-preview?${params.toString()}`);
      const data = (await response.json().catch(() => ({}))) as ProductPreviewResponse & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить данные товара");
      }
      applyPreview(data);
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : "Ошибка загрузки товара");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProductChange = (product: ProductSearchRow | null) => {
    setSelectedProduct(product);
    if (!product) {
      setForm((prev) => ({
        ...prev,
        productId: null,
        productName: "",
        productSku: "",
        coatingType: "",
        accessories: [],
        price: null,
        kitPrice: null,
      }));
      return;
    }
    void loadPreview(product.id);
  };

  const handleCategoryChange = (categoryType: ExhibitionFormState["categoryType"]) => {
    setForm((prev) => ({
      ...prev,
      categoryType,
      productId: null,
      productName: "",
      productSku: "",
      coatingType: "",
      accessories: [],
      price: null,
      kitPrice: categoryType === "interior" ? prev.kitPrice : null,
    }));
    setSelectedProduct(null);
    setPreviewError("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  const colorSelectValue = colorOptions.includes(form.coatingColor) ? form.coatingColor : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminSelectField
          id="exhibition-form-category"
          label="Категория"
          value={form.categoryType}
          onChange={(e) =>
            handleCategoryChange(e.target.value as ExhibitionFormState["categoryType"])
          }
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelectField>

        <AdminInputField
          id="exhibition-form-sort-order"
          label="Порядок"
          type="number"
          value={form.sortOrder}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-admin-text-secondary">
          Наименование
        </label>
        <ProductSearchField
          categoryType={form.categoryType}
          categoryId={categoryId}
          value={selectedProduct}
          onChange={handleProductChange}
          disabled={saving || previewLoading}
        />
        {previewLoading ? <p className="mt-1 text-xs text-admin-text-muted">Загрузка данных…</p> : null}
        {previewError ? <p className="mt-1 text-xs text-red-600">{previewError}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminSelectField
          id="exhibition-form-color-select"
          label="Цвет покрытия (из базы)"
          value={colorSelectValue}
          onChange={(e) => setForm((prev) => ({ ...prev, coatingColor: e.target.value }))}
        >
          <option value="">Выберите цвет</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </AdminSelectField>

        <AdminInputField
          id="exhibition-form-color-custom"
          label="Цвет покрытия (свой вариант)"
          value={form.coatingColor}
          onChange={(e) => setForm((prev) => ({ ...prev, coatingColor: e.target.value }))}
        />
      </div>

      <AdminInputField
        id="exhibition-form-coating-type"
        label="Вид покрытия"
        value={form.coatingType}
        onChange={(e) => setForm((prev) => ({ ...prev, coatingType: e.target.value }))}
      />

      <AdminSelectField
        id="exhibition-form-manufacturer"
        label="Фабрика"
        value={form.manufacturerName}
        onChange={(e) => setForm((prev) => ({ ...prev, manufacturerName: e.target.value }))}
      >
        <option value="">Не выбрана</option>
        {manufacturerOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </AdminSelectField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInputField
          id="exhibition-form-price"
          label="Цена"
          type="number"
          min={0}
          value={form.price ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              price: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
        />

        {form.categoryType === "interior" ? (
          <AdminInputField
            id="exhibition-form-kit-price"
            label="Цена за комплект"
            type="number"
            min={0}
            value={form.kitPrice ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                kitPrice: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        ) : null}
      </div>

      {form.accessories.length > 0 ? (
        <div className="overflow-x-auto rounded border border-admin-border">
          <table className="min-w-full text-sm">
            <thead className="bg-admin-surface-muted text-left text-admin-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Комплектующее</th>
                <th className="px-3 py-2 font-medium">Категория</th>
                <th className="px-3 py-2 font-medium">Цена</th>
              </tr>
            </thead>
            <tbody>
              {form.accessories.map((item) => (
                <tr key={`${item.id}-${item.sku}`} className="border-t border-admin-border">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-admin-text-secondary">{item.category || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{formatPrice(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-admin-text-muted">
          Комплектующие появятся после выбора товара из каталога.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || previewLoading || !form.productName.trim()}>
          {saving ? "Сохранение…" : editingRow ? "Сохранить изменения" : "Добавить дверь"}
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
          Отмена
        </Button>
        {editingRow && onDelete ? (
          <AdminConfirmButton
            confirmMessage="Удалить запись с выставки?"
            disabled={saving}
            onConfirm={() => onDelete(editingRow)}
          >
            Удалить
          </AdminConfirmButton>
        ) : null}
      </div>
    </form>
  );
}

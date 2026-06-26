"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminNotice } from "@/features/admin/ui/admin-notice";
import { AdminPage } from "@/features/admin/ui/admin-page";
import { AdminBootstrap, AdminCatalogPage, normalizeAdminBootstrap } from "@/lib/client/normalizers";

type AttributeDef = {
  id: number;
  code: string;
  name: string;
  type: string;
  options?: unknown[];
};

type SectionFilters = {
  categories: string[];
  subcategories: string[];
  attrSelections: Record<string, string[]>;
  onSale: boolean;
};

type SectionRow = {
  id: number;
  title: string;
  catalogPageSlug: string;
  sortOrder: number;
  isActive: boolean;
  productLimit: number;
  filters: SectionFilters;
  catalogHref: string;
};

type FormState = {
  title: string;
  catalogPageSlug: string;
  sortOrder: number;
  isActive: boolean;
  productLimit: number;
  categories: string[];
  onSale: boolean;
  attrRows: Array<{ code: string; value: string }>;
};

const SUBCATEGORY_FILTER_CODE = "__subcategory__";

const emptyFilterRow = (): { code: string; value: string } => ({ code: "", value: "" });

const emptyForm = (): FormState => ({
  title: "",
  catalogPageSlug: "",
  sortOrder: 0,
  isActive: true,
  productLimit: 8,
  categories: [],
  onSale: false,
  attrRows: [emptyFilterRow()],
});

const attrRowsFromFilters = (filters: SectionFilters) => {
  const subRows = filters.subcategories.map((slug) => ({
    code: SUBCATEGORY_FILTER_CODE,
    value: slug,
  }));
  const attrRows = Object.entries(filters.attrSelections).flatMap(([code, values]) =>
    values.map((value) => ({ code, value })),
  );
  const rows = [...subRows, ...attrRows];
  return rows.length ? rows : [emptyFilterRow()];
};

const buildFiltersPayload = (form: FormState): SectionFilters => {
  const attrSelections: Record<string, string[]> = {};
  const subcategories: string[] = [];

  form.attrRows.forEach((row) => {
    const code = row.code.trim();
    const value = row.value.trim();
    if (!code || !value) return;
    if (code === SUBCATEGORY_FILTER_CODE) {
      if (!subcategories.includes(value)) subcategories.push(value);
      return;
    }
    if (!attrSelections[code]) attrSelections[code] = [];
    if (!attrSelections[code].includes(value)) attrSelections[code].push(value);
  });

  return {
    categories: form.categories,
    subcategories,
    attrSelections,
    onSale: form.onSale,
  };
};

const formFromSection = (section: SectionRow): FormState => ({
  title: section.title,
  catalogPageSlug: section.catalogPageSlug,
  sortOrder: section.sortOrder,
  isActive: section.isActive,
  productLimit: section.productLimit,
  categories: [...section.filters.categories],
  onSale: section.filters.onSale,
  attrRows: attrRowsFromFilters(section.filters),
});

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ slug: string; name: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (slug: string) => {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  };
  if (options.length === 0) {
    return (
      <div className="text-xs text-zinc-500">
        {label}: нет доступных значений для выбранной витрины
      </div>
    );
  }
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-medium text-zinc-600">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.slug} className="inline-flex items-center gap-1.5 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={selected.includes(opt.slug)}
              onChange={() => toggle(opt.slug)}
            />
            {opt.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function AdminHomeSectionsPage() {
  const [bootstrap, setBootstrap] = useState<AdminBootstrap>({
    categories: [],
    subcategories: [],
    attributes: [],
    products: [],
    catalogPages: [],
  });
  const [attributeDefs, setAttributeDefs] = useState<AttributeDef[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [createForm, setCreateForm] = useState<FormState>(emptyForm());
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const attrByCode = useMemo(() => {
    const map = new Map<string, AttributeDef>();
    attributeDefs.forEach((a) => map.set(a.code, a));
    return map;
  }, [attributeDefs]);

  const pageBySlug = useMemo(() => {
    const map = new Map<string, AdminCatalogPage>();
    bootstrap.catalogPages.forEach((p) => map.set(p.slug, p));
    return map;
  }, [bootstrap.catalogPages]);

  const vitrineScopeSlugs = (page: AdminCatalogPage | undefined): Set<string> | null => {
    if (!page) return null;
    const slugs = new Set<string>();
    page.categories.forEach((c) => {
      if (c.slug) slugs.add(c.slug);
    });
    page.subcategories.forEach((s) => {
      if (s.slug) slugs.add(s.slug);
      if (s.categorySlug) slugs.add(s.categorySlug);
    });
    return slugs.size > 0 ? slugs : null;
  };

  const categoryOptionsFor = (catalogPageSlug: string) => {
    const page = pageBySlug.get(catalogPageSlug);
    const scope = vitrineScopeSlugs(page);
    const roots = bootstrap.categories
      .filter((c) => c.slug)
      .map((c) => ({ slug: c.slug, name: c.name }));

    if (!scope) return roots;

    const parentSlugsFromSubs = new Set(
      (page?.subcategories ?? [])
        .map((s) => s.categorySlug)
        .filter((slug): slug is string => Boolean(slug)),
    );

    const scoped = roots.filter(
      (c) => scope.has(c.slug) || parentSlugsFromSubs.has(c.slug),
    );
    return scoped.length > 0 ? scoped : roots;
  };

  const subcategoryOptionsFor = (catalogPageSlug: string, selectedCategories: string[]) => {
    const page = pageBySlug.get(catalogPageSlug);
    const scope = vitrineScopeSlugs(page);

    if (page?.subcategories.length) {
      let fromPage = page.subcategories
        .filter((s) => s.slug)
        .map((s) => ({ slug: s.slug, name: s.name, categorySlug: s.categorySlug || "" }));
      if (selectedCategories.length > 0) {
        fromPage = fromPage.filter(
          (s) => !s.categorySlug || selectedCategories.includes(s.categorySlug),
        );
      }
      if (fromPage.length > 0) {
        return fromPage.map(({ slug, name }) => ({ slug, name }));
      }
    }

    const allSubs = bootstrap.subcategories
      .map((s) => {
        const cat = bootstrap.categories.find((c) => c.id === s.categoryId);
        return { slug: s.slug || "", name: s.name, categorySlug: cat?.slug || "" };
      })
      .filter((s) => s.slug);

    const matchesScope = (s: { slug: string; categorySlug: string }) => {
      if (!scope) return true;
      if (scope.has(s.slug)) return true;
      if (s.categorySlug && scope.has(s.categorySlug)) return true;
      return false;
    };

    let filtered = allSubs.filter(matchesScope);

    if (filtered.length === 0 && page?.categories.length) {
      const pageRootSlugs = new Set(page.categories.map((c) => c.slug).filter(Boolean));
      filtered = allSubs.filter((s) => s.categorySlug && pageRootSlugs.has(s.categorySlug));
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((s) => selectedCategories.includes(s.categorySlug));
    }

    return filtered.map(({ slug, name }) => ({ slug, name }));
  };

  const allowedFilterAttrs = (catalogPageSlug: string) => {
    const page = pageBySlug.get(catalogPageSlug);
    if (page?.filterAttributes.length) return page.filterAttributes;
    return attributeDefs.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type }));
  };

  const reloadSections = async () => {
    const response = await fetch("/api/admin/home-sections");
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || "Не удалось загрузить секции");
    }
    const json = (await response.json()) as SectionRow[];
    setSections(Array.isArray(json) ? json : []);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [br, attrs] = await Promise.all([
          fetch("/api/admin/bootstrap"),
          fetch("/api/admin/attributes"),
        ]);
        if (!br.ok) throw new Error("Не удалось загрузить bootstrap");
        setBootstrap(normalizeAdminBootstrap(await br.json()));
        if (attrs.ok) {
          const json = (await attrs.json()) as AttributeDef[];
          setAttributeDefs(Array.isArray(json) ? json : []);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Ошибка");
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;
      try {
        await reloadSections();
      } catch (caught) {
        if (!cancelled) {
          setError((prev) =>
            prev
              ? prev
              : caught instanceof Error
                ? caught.message
                : "Не удалось загрузить секции",
          );
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderValueInput = (
    code: string,
    value: string,
    onChange: (value: string) => void,
    idPrefix: string,
    subcategoryOptions: Array<{ slug: string; name: string }>,
  ) => {
    if (code === SUBCATEGORY_FILTER_CODE) {
      return (
        <select
          id={`${idPrefix}-value`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-[180px] flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
        >
          <option value="">Подкатегория</option>
          {subcategoryOptions.map((opt) => (
            <option key={opt.slug} value={opt.slug}>
              {opt.name}
            </option>
          ))}
        </select>
      );
    }

    const def = code ? attrByCode.get(code) : undefined;
    const opts = Array.isArray(def?.options) ? def!.options!.map((o) => String(o)) : [];
    if (opts.length > 0 && def?.type !== "number") {
      return (
        <select
          id={`${idPrefix}-value`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-[140px] flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
        >
          <option value="">—</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        id={`${idPrefix}-value`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Значение"
        className="min-w-[140px] flex-1 rounded border border-zinc-200 px-2 py-1.5 text-sm"
      />
    );
  };

  const renderFormFields = (
    form: FormState,
    setForm: (updater: (prev: FormState) => FormState) => void,
    idPrefix: string,
  ) => {
    const filterAttrs = allowedFilterAttrs(form.catalogPageSlug);
    const categoryOptions = categoryOptionsFor(form.catalogPageSlug);
    const subcategoryOptions = subcategoryOptionsFor(form.catalogPageSlug, form.categories);

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Заголовок
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-56 rounded border border-zinc-200 px-2 py-1.5 text-sm"
              placeholder="Двери из массива"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Витрина
            <select
              value={form.catalogPageSlug}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  catalogPageSlug: e.target.value,
                  categories: [],
                  attrRows: [emptyFilterRow()],
                }))
              }
              className="min-w-[220px] rounded border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Выберите витрину</option>
              {bootstrap.catalogPages.map((page) => (
                <option key={page.id} value={page.slug}>
                  {page.name} ({page.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Порядок
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
              className="w-24 rounded border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Лимит карточек
            <input
              type="number"
              min={1}
              max={24}
              value={form.productLimit}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  productLimit: Math.min(24, Math.max(1, Number(e.target.value) || 8)),
                }))
              }
              className="w-24 rounded border border-zinc-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Активна
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={form.onSale}
              onChange={(e) => setForm((prev) => ({ ...prev, onSale: e.target.checked }))}
            />
            Только акции
          </label>
        </div>

        {form.catalogPageSlug ? (
          <>
            <MultiSelect
              label="Категории"
              options={categoryOptions}
              selected={form.categories}
              onChange={(categories) =>
                setForm((prev) => {
                  const allowedSubs = new Set(
                    subcategoryOptionsFor(prev.catalogPageSlug, categories).map((s) => s.slug),
                  );
                  return {
                    ...prev,
                    categories,
                    attrRows: prev.attrRows.map((row) =>
                      row.code === SUBCATEGORY_FILTER_CODE &&
                      row.value &&
                      !allowedSubs.has(row.value)
                        ? { ...row, value: "" }
                        : row,
                    ),
                  };
                })
              }
            />
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-600">
                Атрибуты и подкатегории
              </span>
              {form.attrRows.map((row, index) => (
                <div key={`${idPrefix}-attr-${index}`} className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.code}
                    onChange={(e) => {
                      const code = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        attrRows: prev.attrRows.map((r, i) =>
                          i === index ? { code, value: code !== r.code ? "" : r.value } : r,
                        ),
                      }));
                    }}
                    className="rounded border border-zinc-200 px-2 py-1.5 text-sm"
                  >
                    <option value="">Условие</option>
                    <option value={SUBCATEGORY_FILTER_CODE}>Подкатегория</option>
                    {filterAttrs.map((a) => (
                      <option key={a.id} value={a.code}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                  {renderValueInput(
                    row.code,
                    row.value,
                    (value) => {
                      setForm((prev) => ({
                        ...prev,
                        attrRows: prev.attrRows.map((r, i) => (i === index ? { ...r, value } : r)),
                      }));
                    },
                    `${idPrefix}-${index}`,
                    subcategoryOptions,
                  )}
                  <button
                    type="button"
                    className="text-xs text-rose-600"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        attrRows:
                          prev.attrRows.length <= 1
                            ? [emptyFilterRow()]
                            : prev.attrRows.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Удалить
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-zinc-700 underline"
                onClick={() => setForm((prev) => ({ ...prev, attrRows: [...prev.attrRows, emptyFilterRow()] }))}
              >
                + условие
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (creating) return;
    if (!createForm.title.trim()) {
      setError("Введите заголовок");
      return;
    }
    if (!createForm.catalogPageSlug) {
      setError("Выберите витрину");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/home-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          catalogPageSlug: createForm.catalogPageSlug,
          sortOrder: createForm.sortOrder,
          isActive: createForm.isActive,
          productLimit: createForm.productLimit,
          filters: buildFiltersPayload(createForm),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка создания");
      setCreateForm(emptyForm());
      setNotice("Секция создана");
      await reloadSections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (id: number) => {
    if (!editForm || savingId) return;
    if (!editForm.title.trim()) {
      setError("Введите заголовок");
      return;
    }
    if (!editForm.catalogPageSlug) {
      setError("Выберите витрину");
      return;
    }
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/home-sections/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          catalogPageSlug: editForm.catalogPageSlug,
          sortOrder: editForm.sortOrder,
          isActive: editForm.isActive,
          productLimit: editForm.productLimit,
          filters: buildFiltersPayload(editForm),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Ошибка сохранения");
      setNotice("Секция сохранена");
      setEditingId(null);
      setEditForm(null);
      await reloadSections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setSavingId(null);
    }
  };

  const removeSection = async (row: SectionRow) => {
    if (!window.confirm(`Удалить секцию «${row.title}»?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/home-sections/${row.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message || "Ошибка удаления");
      }
      setNotice("Секция удалена");
      if (editingId === row.id) {
        setEditingId(null);
        setEditForm(null);
      }
      await reloadSections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка");
    }
  };

  return (
    <AdminPage
      title="Блоки товаров на главной"
      description="Настраиваемые секции под хитами продаж: заголовок, витрина, категории, подкатегории и атрибуты."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Открыть главную</Link>
        </Button>
      }
    >
      {notice ? <AdminNotice variant="success">{notice}</AdminNotice> : null}
      {error ? <AdminNotice variant="error">{error}</AdminNotice> : null}

      {loading ? (
        <AdminCard className="p-6">
          <p className="text-sm text-zinc-500">Загрузка…</p>
        </AdminCard>
      ) : (
        <>
          <AdminCard className="p-4">
            <form onSubmit={submitCreate} className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-800">Новая секция</h2>
              {renderFormFields(createForm, (updater) => setCreateForm((prev) => updater(prev)), "create")}
              <button
                type="submit"
                disabled={creating}
                className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {creating ? "Создаём…" : "Создать секцию"}
              </button>
            </form>
          </AdminCard>

          <AdminCard className="p-4">
            <h2 className="text-sm font-semibold text-zinc-800">Секции на главной</h2>
            {sections.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">Пока нет секций.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {sections.map((row) => (
                  <li key={row.id} className="rounded border border-zinc-200 p-3">
                    {editingId === row.id && editForm ? (
                      <div className="space-y-3">
                        {renderFormFields(editForm, (updater) =>
                          setEditForm((prev) => (prev ? updater(prev) : prev)),
                        "edit")}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(row.id)}
                            disabled={savingId === row.id}
                            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:bg-zinc-300"
                          >
                            {savingId === row.id ? "Сохраняем…" : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(null);
                            }}
                            className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-900">{row.title}</p>
                          <p className="text-sm text-zinc-600">
                            {row.catalogPageSlug} · порядок {row.sortOrder} · лимит {row.productLimit}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {row.isActive ? "активна" : "скрыта"}
                            {row.filters.categories.length
                              ? ` · категории: ${row.filters.categories.join(", ")}`
                              : ""}
                            {row.filters.subcategories.length
                              ? ` · подкатегории: ${row.filters.subcategories.join(", ")}`
                              : ""}
                            {Object.keys(row.filters.attrSelections).length
                              ? ` · атрибуты: ${Object.entries(row.filters.attrSelections)
                                  .map(([code, values]) => `${code}=${values.join("|")}`)
                                  .join("; ")}`
                              : ""}
                          </p>
                          {row.catalogHref ? (
                            <Link href={row.catalogHref} className="text-xs text-brand underline">
                              Ссылка «Весь каталог»
                            </Link>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setEditForm(formFromSection(row));
                            }}
                            className="rounded border border-zinc-300 px-2 py-1 text-sm"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeSection(row)}
                            className="rounded border border-rose-200 px-2 py-1 text-sm text-rose-700"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </>
      )}
    </AdminPage>
  );
}

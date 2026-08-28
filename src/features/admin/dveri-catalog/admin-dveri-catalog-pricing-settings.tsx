"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { DVERI_ROUND_UP_OPTIONS } from "./constants";
import type { DveriCatalogCategory, DveriCategoryPricingRule, DveriPricingRulesState } from "./types";
import { describePricingRule } from "@/lib/dveri-catalog-utils";

type AdminDveriCatalogPricingSettingsProps = {
  categories: DveriCatalogCategory[];
  rules: DveriPricingRulesState;
  ready: boolean;
  onDefaultRuleChange: (patch: Partial<DveriCategoryPricingRule>) => void;
  onCategoryRuleChange: (categoryId: number, patch: Partial<DveriCategoryPricingRule>) => void;
  onAddCategoryRule: (categoryId: number) => void;
  onRemoveCategoryRule: (categoryId: number) => void;
};

type RuleFieldsProps = {
  idPrefix: string;
  rule: DveriCategoryPricingRule;
  onChange: (patch: Partial<DveriCategoryPricingRule>) => void;
  compact?: boolean;
};

function SignedIntegerInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    if (raw === "" || raw === "-") {
      onChange(0);
      setDraft("0");
      return;
    }
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    onChange(n);
    setDraft(String(n));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^-?\d*$/.test(raw)) return;
        setDraft(raw);
        if (raw === "" || raw === "-") return;
        const n = Math.round(Number(raw));
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => commit(draft)}
      className="border border-admin-input-border bg-admin-surface px-2.5 py-1.5 text-sm"
    />
  );
}

function RuleFields({ idPrefix, rule, onChange, compact }: RuleFieldsProps) {
  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3"}>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          Коэффициент (×)
        </span>
        <input
          id={`${idPrefix}-multiplier`}
          type="number"
          min={0.01}
          step={0.01}
          value={rule.multiplier}
          onChange={(e) => onChange({ multiplier: Number(e.target.value) })}
          className="border border-admin-input-border bg-admin-surface px-2.5 py-1.5 text-sm"
        />
        <span className="text-xs text-admin-text-muted">Опт × коэффициент</span>
      </label>

      <AdminSelectField
        id={`${idPrefix}-round`}
        label="Округление вверх"
        value={rule.roundUpTo != null ? String(rule.roundUpTo) : ""}
        onChange={(e) =>
          onChange({
            roundUpTo: e.target.value ? Number(e.target.value) : null,
          })
        }
      >
        {DVERI_ROUND_UP_OPTIONS.map((option) => (
          <option key={option.value || "none"} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelectField>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          Корректировка (±)
        </span>
        <SignedIntegerInput
          id={`${idPrefix}-adjustment`}
          value={rule.adjustment}
          onChange={(adjustment) => onChange({ adjustment })}
        />
        <span className="text-xs text-admin-text-muted">После округления, в ₽</span>
      </label>
    </div>
  );
}

export function AdminDveriCatalogPricingSettings({
  categories,
  rules,
  ready,
  onDefaultRuleChange,
  onCategoryRuleChange,
  onAddCategoryRule,
  onRemoveCategoryRule,
}: AdminDveriCatalogPricingSettingsProps) {
  const [expanded, setExpanded] = useState(true);
  const [addCategoryId, setAddCategoryId] = useState("");

  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories],
  );

  const configuredCategoryIds = useMemo(
    () =>
      Object.keys(rules.categoryRules)
        .map(Number)
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => {
          const pathA = categoryById.get(a)?.path ?? "";
          const pathB = categoryById.get(b)?.path ?? "";
          return pathA.localeCompare(pathB, "ru");
        }),
    [rules.categoryRules, categoryById],
  );

  const availableCategories = useMemo(
    () =>
      categories.filter((cat) => !rules.categoryRules[String(cat.id)]).sort((a, b) =>
        a.path.localeCompare(b.path, "ru"),
      ),
    [categories, rules.categoryRules],
  );

  const handleAddCategory = () => {
    const id = Number(addCategoryId);
    if (!Number.isFinite(id) || id <= 0) return;
    onAddCategoryRule(id);
    setAddCategoryId("");
  };

  return (
    <section className="border border-admin-border bg-admin-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-expanded={expanded}
        >
          <span
            className="mt-0.5 shrink-0 text-xs text-admin-text-muted transition-transform"
            aria-hidden="true"
            style={{ transform: expanded ? "rotate(90deg)" : undefined }}
          >
            ▶
          </span>
          <span className="min-w-0">
            <span className="text-sm font-semibold text-admin-text">Настройки цены</span>
            {!expanded ? (
              <span className="mt-0.5 block text-xs text-admin-text-muted">
                По умолчанию: {describePricingRule(rules.defaultRule)}
                {configuredCategoryIds.length > 0
                  ? ` · правил по категориям: ${configuredCategoryIds.length}`
                  : ""}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {expanded ? (
        <div className="space-y-6 border-t border-admin-border-subtle px-4 pb-4 pt-4">
          {!ready ? (
            <p className="text-sm text-admin-text-muted">Загрузка сохранённых правил…</p>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-admin-text">Правило по умолчанию</h3>
            <p className="text-xs text-admin-text-muted">
              Для товаров, у которых нет своего правила в цепочке категорий. Формула: опт × коэффициент →
              округление вверх → ± корректировка.
            </p>
            <RuleFields
              idPrefix="dveri-default"
              rule={rules.defaultRule}
              onChange={onDefaultRuleChange}
            />
            <p className="text-xs text-admin-text-secondary">
              Пример: ×1,5 → ↑1&nbsp;000 → −10&nbsp;₽
            </p>
          </div>

          <div className="space-y-3 border-t border-admin-border-subtle pt-4">
            <h3 className="text-sm font-medium text-admin-text">Правила по категориям</h3>
            <p className="text-xs text-admin-text-muted">
              Переопределяют правило по умолчанию для товаров в этой категории и её подкатегориях (если у
              подкатегории нет своего правила).
            </p>

            {configuredCategoryIds.length === 0 ? (
              <p className="text-sm text-admin-text-muted">Пока нет правил по категориям.</p>
            ) : (
              <div className="space-y-4">
                {configuredCategoryIds.map((categoryId) => {
                  const category = categoryById.get(categoryId);
                  const rule = rules.categoryRules[String(categoryId)];
                  if (!rule) return null;

                  return (
                    <div
                      key={categoryId}
                      className="space-y-3 border border-admin-border-subtle bg-admin-surface-muted p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-admin-text">
                            {category?.path ?? `Категория #${categoryId}`}
                          </p>
                          <p className="text-xs text-admin-text-muted">{describePricingRule(rule)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveCategoryRule(categoryId)}
                        >
                          Удалить
                        </Button>
                      </div>
                      <RuleFields
                        idPrefix={`dveri-cat-${categoryId}`}
                        rule={rule}
                        onChange={(patch) => onCategoryRuleChange(categoryId, patch)}
                        compact
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 border-t border-admin-border-subtle pt-4">
              <div className="min-w-[240px] flex-1">
                <AdminSelectField
                  id="dveri-add-category-rule"
                  label="Добавить категорию"
                  value={addCategoryId}
                  onChange={(e) => setAddCategoryId(e.target.value)}
                >
                  <option value="">Выберите категорию</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.path}
                    </option>
                  ))}
                </AdminSelectField>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!addCategoryId}
                onClick={handleAddCategory}
              >
                Добавить правило
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

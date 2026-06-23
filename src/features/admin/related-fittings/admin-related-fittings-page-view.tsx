import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminPage } from "@/features/admin/ui/admin-page";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/features/admin/ui/admin-table";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import type { RelatedFittingsAdminSnapshot } from "@/lib/server/related-fittings-admin-snapshot";

const SOURCE_LABELS: Record<
  RelatedFittingsAdminSnapshot["resolvedAttributes"][number]["source"],
  string
> = {
  database: "Справочник атрибутов",
  fallback: "Код по умолчанию",
  missing: "Не найден",
};

function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">
            {item.label}
          </dt>
          <dd className="break-words text-sm text-admin-text">{item.value}</dd>
          {item.hint ? <dd className="text-xs text-admin-text-muted">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export function AdminRelatedFittingsPageView({
  snapshot,
}: {
  snapshot: RelatedFittingsAdminSnapshot;
}) {
  const { trigger, slots, resolvedAttributes, selection, stats, sourceFile } = snapshot;

  return (
    <AdminPage
      title="Сопутствующая фурнитура"
      description="Просмотр правил подбора блока на карточке ручки. Редактирование — только в коде."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link
            href={catalogPagePath(CATALOG_PAGE_SLUG.fittings)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Фурнитура в каталоге
          </Link>
        </Button>
      }
    >
      <AdminCard
        title="Источник правил"
        description="Актуальная конфигурация читается из доменного модуля при каждом запросе."
      >
        <KeyValueList
          items={[
            { label: "Файл", value: sourceFile },
            {
              label: "Документация",
              value: "docs/related-fittings-handles.md",
            },
            {
              label: "Аудит подбора",
              value: "node scripts/audit-related-fittings-handles.js",
              hint: "CSV по всем ручкам в каталоге",
            },
          ]}
        />
      </AdminCard>

      <AdminCard title="Когда показывается блок" description="Условия на карточке товара.">
        <KeyValueList
          items={[
            {
              label: "Категория",
              value: `${trigger.categorySlug} → ${trigger.subcategorySlug}`,
            },
            {
              label: "Обязательные поля ручки",
              value: trigger.requiredFields.join(", "),
            },
            {
              label: "Видимость блока",
              value: trigger.blockVisibleWhen,
            },
          ]}
        />
      </AdminCard>

      <AdminCard
        title="Слоты выдачи"
        description="Фиксированный порядок. Пустой слот пропускается."
      >
        <AdminTable className="border-0">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header className="w-12">
                #
              </AdminTableCell>
              <AdminTableCell header>Слот</AdminTableCell>
              <AdminTableCell header>Подкатегория</AdminTableCell>
              <AdminTableCell header>Совпадение с ручкой</AdminTableCell>
              <AdminTableCell header>Критерии на товаре</AdminTableCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {slots.map((slot) => (
              <AdminTableRow key={slot.group}>
                <AdminTableCell className="align-top text-sm text-admin-text-muted">
                  {slot.order}
                </AdminTableCell>
                <AdminTableCell className="align-top">
                  <p className="font-medium text-admin-text">{slot.label}</p>
                  <p className="text-xs text-admin-text-muted">{slot.group}</p>
                </AdminTableCell>
                <AdminTableCell className="align-top text-sm">{slot.subcategorySlug}</AdminTableCell>
                <AdminTableCell className="align-top text-sm">
                  <ul className="list-inside list-disc space-y-0.5">
                    {slot.matchWithHandle.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </AdminTableCell>
                <AdminTableCell className="align-top text-sm">
                  <ul className="list-inside list-disc space-y-0.5">
                    {slot.productCriteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-admin-text-muted">{slot.selectionNote}</p>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>

      <AdminCard
        title="Коды атрибутов"
        description="Как имена полей из справочника мапятся на ключи в products.attrs."
      >
        <AdminTable className="border-0">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableCell header>Поле</AdminTableCell>
              <AdminTableCell header>Код в attrs</AdminTableCell>
              <AdminTableCell header>Источник</AdminTableCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {resolvedAttributes.map((row) => (
              <AdminTableRow key={row.field}>
                <AdminTableCell className="text-sm">{row.label}</AdminTableCell>
                <AdminTableCell className="font-mono text-sm">{row.code}</AdminTableCell>
                <AdminTableCell className="text-sm">{SOURCE_LABELS[row.source]}</AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>

      <AdminCard title="Правила выбора" description="Общие для всех слотов.">
        <KeyValueList
          items={[
            { label: "Сортировка", value: selection.ordering },
            {
              label: "Требования витрины",
              value: selection.storefrontRequirements.join("; "),
            },
            { label: "Дедупликация", value: selection.deduplication },
          ]}
        />
      </AdminCard>

      <AdminCard title="Сводка по каталогу" description="Активные товары на момент загрузки страницы.">
        <KeyValueList
          items={[
            { label: "Активных ручек", value: String(stats.activeHandles) },
            {
              label: "Ручек с производителем в attrs",
              value: String(stats.handlesWithManufacturer),
            },
            { label: "Ручек с фото на витрине", value: String(stats.listedHandles) },
          ]}
        />
        <div className="mt-4">
          <AdminTable className="border-0">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableCell header>Подкатегория (слот)</AdminTableCell>
                <AdminTableCell header>slug</AdminTableCell>
                <AdminTableCell header className="w-[140px]">
                  На витрине
                </AdminTableCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {stats.subcategoryCounts.map((row) => (
                <AdminTableRow key={row.subcategorySlug}>
                  <AdminTableCell className="text-sm">{row.label}</AdminTableCell>
                  <AdminTableCell className="font-mono text-sm">{row.subcategorySlug}</AdminTableCell>
                  <AdminTableCell className="text-sm">{row.activeListed}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </div>
      </AdminCard>
    </AdminPage>
  );
}

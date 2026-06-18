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
import type { SeoAdminSnapshot, SeoPageRow } from "@/lib/server/seo-admin-snapshot";

const SOURCE_LABELS: Record<SeoPageRow["titleSource"], string> = {
  code: "Код",
  override: "Переопределение",
  mixed: "Код + переопределение",
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

function SeoPagesTable({ rows }: { rows: SeoPageRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-admin-text-muted">Нет данных.</p>;
  }

  return (
    <AdminTable className="border-0">
      <AdminTableHead>
        <AdminTableRow>
          <AdminTableCell header>Страница</AdminTableCell>
          <AdminTableCell header>Title</AdminTableCell>
          <AdminTableCell header>Description</AdminTableCell>
          <AdminTableCell header className="w-[120px]">
            Источник
          </AdminTableCell>
          <AdminTableCell header className="w-[100px]">
            Sitemap
          </AdminTableCell>
        </AdminTableRow>
      </AdminTableHead>
      <AdminTableBody>
        {rows.map((row) => (
          <AdminTableRow key={row.key}>
            <AdminTableCell className="align-top">
              <div className="space-y-1">
                <p className="font-medium text-admin-text">{row.label}</p>
                <Link
                  href={row.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  {row.path}
                </Link>
                {row.robotsNote ? (
                  <p className="text-xs text-amber-700">{row.robotsNote}</p>
                ) : null}
                {row.editHint ? (
                  <p className="text-xs text-admin-text-muted">Редактирование: {row.editHint}</p>
                ) : null}
              </div>
            </AdminTableCell>
            <AdminTableCell className="max-w-xs align-top text-xs leading-relaxed">
              {row.title}
              <p className="mt-1 text-admin-text-muted">{row.title.length} симв.</p>
            </AdminTableCell>
            <AdminTableCell className="max-w-md align-top text-xs leading-relaxed">
              {row.description}
              <p className="mt-1 text-admin-text-muted">{row.description.length} симв.</p>
            </AdminTableCell>
            <AdminTableCell className="align-top text-xs">
              <p>{SOURCE_LABELS[row.titleSource]}</p>
              <p className="text-admin-text-muted">{SOURCE_LABELS[row.descriptionSource]}</p>
            </AdminTableCell>
            <AdminTableCell className="align-top text-xs">
              {row.inSitemap ? "Да" : "Нет"}
            </AdminTableCell>
          </AdminTableRow>
        ))}
      </AdminTableBody>
    </AdminTable>
  );
}

export function AdminSeoPageView({ snapshot }: { snapshot: SeoAdminSnapshot }) {
  const { global, staticPages, catalogPages, products, technical } = snapshot;

  return (
    <AdminPage
      title="SEO"
      description="Просмотр текущих SEO-настроек сайта. Редактирование — в коде, витринах каталога и карточках товаров."
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={technical.sitemapUrl} target="_blank" rel="noopener noreferrer">
              Sitemap
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              Открыть сайт
            </a>
          </Button>
        </>
      }
    >
      <AdminCard
        title="Глобальные настройки"
        description="Базовые константы и переменные окружения."
      >
        <KeyValueList
          items={[
            { label: "Название сайта", value: global.siteName },
            { label: "Заголовок по умолчанию", value: global.siteTitle },
            { label: "Description по умолчанию", value: global.defaultDescription },
            {
              label: "Базовый URL",
              value: global.siteUrl,
              hint: `Источник: ${global.siteUrlSource}`,
            },
            { label: "metadataBase", value: global.metadataBase },
            {
              label: "OG-изображение",
              value: global.ogImagePath,
              hint: global.ogImageUrl,
            },
          ]}
        />
      </AdminCard>

      <AdminCard
        title="Техническое SEO"
        description="robots.txt и sitemap генерируются автоматически."
      >
        <KeyValueList
          items={[
            { label: "Sitemap", value: technical.sitemapUrl },
            { label: "Host (robots)", value: technical.robotsHost },
            {
              label: "Disallow",
              value: technical.robotsDisallow.join(", "),
            },
            {
              label: "Админка в индексе",
              value: technical.adminIndexed ? "Да" : "Нет (noindex)",
            },
          ]}
        />
      </AdminCard>

      <AdminCard title="Статические страницы" description="Тексты из src/lib/seo-copy.ts.">
        <SeoPagesTable rows={staticPages} />
      </AdminCard>

      <AdminCard
        title="Витрины каталога"
        description="Итоговый title/description с учётом переопределений в админке."
      >
        <div className="mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/catalog-pages">Редактировать витрины</Link>
          </Button>
        </div>
        <SeoPagesTable rows={catalogPages} />
      </AdminCard>

      <AdminCard
        title="Товары"
        description="Шаблон генерируется автоматически; переопределения — в таблице товаров."
      >
        <KeyValueList
          items={[
            { label: "Активных товаров", value: String(products.activeTotal) },
            {
              label: "С переопределённым title",
              value: String(products.withTitleOverride),
            },
            {
              label: "С переопределённым description",
              value: String(products.withDescriptionOverride),
            },
            {
              label: "Погонаж (noindex)",
              value: String(products.pogonazhNoindex),
              hint: "Категория погонажа не индексируется",
            },
          ]}
        />
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/products">К таблице товаров</Link>
          </Button>
        </div>
      </AdminCard>
    </AdminPage>
  );
}

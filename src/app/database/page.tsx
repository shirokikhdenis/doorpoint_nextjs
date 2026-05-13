"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CARD_W = 300;
const HEADER_H = 60;
const ROW_H = 28;
const CARD_PAD_B = 12;

type Group = "catalog" | "taxonomy" | "attributes" | "products";

type Field = {
  name: string;
  type: string;
  pk?: boolean;
  fk?: { table: string };
  unique?: boolean;
  self?: boolean;
  badge?: string;
};

type TableDef = {
  name: string;
  title: string;
  group: Group;
  description?: string;
  x: number;
  y: number;
  fields: Field[];
};

const groupMeta: Record<
  Group,
  {
    label: string;
    bar: string;
    headerBg: string;
    headerText: string;
    chip: string;
    stroke: string;
  }
> = {
  catalog: {
    label: "Витрины",
    bar: "bg-amber-500",
    headerBg: "bg-amber-50",
    headerText: "text-amber-900",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    stroke: "#f59e0b",
  },
  taxonomy: {
    label: "Таксономия",
    bar: "bg-sky-500",
    headerBg: "bg-sky-50",
    headerText: "text-sky-900",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
    stroke: "#0ea5e9",
  },
  attributes: {
    label: "Атрибуты",
    bar: "bg-violet-500",
    headerBg: "bg-violet-50",
    headerText: "text-violet-900",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
    stroke: "#8b5cf6",
  },
  products: {
    label: "Товары",
    bar: "bg-emerald-500",
    headerBg: "bg-emerald-50",
    headerText: "text-emerald-900",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    stroke: "#10b981",
  },
};

const tables: TableDef[] = [
  {
    name: "catalog_pages",
    title: "Витрины каталога",
    group: "catalog",
    description: "Самодостаточная таблица: scope-категории и фильтры — это массивы (text[]).",
    x: 40,
    y: 60,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "slug", type: "text", unique: true },
      { name: "name", type: "text" },
      { name: "category_slugs", type: "text[]", badge: "GIN" },
      { name: "filter_codes", type: "text[]" },
      { name: "sort_order", type: "int" },
    ],
  },
  {
    name: "categories",
    title: "Категории (единое дерево)",
    group: "taxonomy",
    description: "parent_id NULL — корень; parent_id → корень — «подкатегория».",
    x: 420,
    y: 60,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "parent_id", type: "bigint", fk: { table: "categories" }, self: true },
      { name: "name", type: "text" },
      { name: "slug", type: "text", unique: true },
      { name: "sort_order", type: "int" },
    ],
  },
  {
    name: "attribute_definitions",
    title: "Атрибуты",
    group: "attributes",
    description: "options — JSONB-массив. scope ∈ (product|variant) заменил 4 булевых флага.",
    x: 420,
    y: 320,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "code", type: "text", unique: true },
      { name: "name", type: "text" },
      { name: "type", type: "text", badge: "CHECK" },
      { name: "unit", type: "text" },
      { name: "options", type: "jsonb" },
      { name: "scope", type: "text", badge: "CHECK" },
      { name: "is_filterable", type: "bool" },
      { name: "is_visible_on_product", type: "bool" },
      { name: "sort_order", type: "int" },
    ],
  },
  {
    name: "products",
    title: "Товары",
    group: "products",
    description: "attrs JSONB заменил две EAV-таблицы. model_key группирует цветовые варианты.",
    x: 820,
    y: 60,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "category_id", type: "bigint", fk: { table: "categories" } },
      { name: "sku", type: "text", unique: true },
      { name: "name", type: "text" },
      { name: "model_key", type: "text" },
      { name: "price", type: "int" },
      { name: "attrs", type: "jsonb", badge: "GIN" },
      { name: "is_active", type: "bool" },
      { name: "created_at", type: "timestamptz" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
  {
    name: "product_images",
    title: "Изображения",
    group: "products",
    description: "Единственный источник изображений (products.image_url больше нет).",
    x: 1220,
    y: 60,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "product_id", type: "bigint", fk: { table: "products" } },
      { name: "image_url", type: "text" },
      { name: "sort_order", type: "int" },
    ],
  },
  {
    name: "product_variants",
    title: "Варианты",
    group: "products",
    description: "Размер/открывание/цена-переопределение. attrs JSONB.",
    x: 1220,
    y: 250,
    fields: [
      { name: "id", type: "bigserial", pk: true },
      { name: "product_id", type: "bigint", fk: { table: "products" } },
      { name: "sku", type: "text", unique: true },
      { name: "price", type: "int" },
      { name: "image_url", type: "text" },
      { name: "attrs", type: "jsonb", badge: "GIN" },
      { name: "sort_order", type: "int" },
      { name: "is_active", type: "bool" },
      { name: "updated_at", type: "timestamptz" },
    ],
  },
];

const tableByName = new Map(tables.map((table) => [table.name, table]));

const cardHeight = (table: TableDef) => HEADER_H + table.fields.length * ROW_H + CARD_PAD_B;

const fieldY = (table: TableDef, fieldIndex: number) =>
  table.y + HEADER_H + fieldIndex * ROW_H + ROW_H / 2;

type Edge = {
  id: string;
  source: string;
  target: string;
  path: string;
  stroke: string;
};

const buildEdges = (): Edge[] => {
  const edges: Edge[] = [];
  for (const source of tables) {
    source.fields.forEach((field, fieldIndex) => {
      if (!field.fk) return;
      const target = tableByName.get(field.fk.table);
      if (!target) return;

      const sCenter = source.x + CARD_W / 2;
      const tCenter = target.x + CARD_W / 2;
      const selfLink = source.name === target.name;

      const sourceSide: "left" | "right" = selfLink
        ? "right"
        : sCenter > tCenter
          ? "left"
          : "right";
      const targetSide: "left" | "right" = selfLink
        ? "right"
        : sCenter > tCenter
          ? "right"
          : "left";

      const x1 = sourceSide === "left" ? source.x : source.x + CARD_W;
      const x2 = targetSide === "left" ? target.x : target.x + CARD_W;
      const y1 = fieldY(source, fieldIndex);
      const y2 = fieldY(target, 0);

      let path: string;
      if (selfLink) {
        const loop = CARD_W * 0.55;
        path = `M ${x1} ${y1} C ${x1 + loop} ${y1} ${x1 + loop} ${y2} ${x2} ${y2}`;
      } else {
        const handle = Math.max(80, Math.abs(x2 - x1) * 0.45);
        const c1x = sourceSide === "left" ? x1 - handle : x1 + handle;
        const c2x = targetSide === "left" ? x2 - handle : x2 + handle;
        path = `M ${x1} ${y1} C ${c1x} ${y1} ${c2x} ${y2} ${x2} ${y2}`;
      }

      edges.push({
        id: `${source.name}.${field.name}->${target.name}`,
        source: source.name,
        target: target.name,
        path,
        stroke: groupMeta[source.group].stroke,
      });
    });
  }
  return edges;
};

const edges = buildEdges();

const diagramWidth =
  tables.reduce((max, table) => Math.max(max, table.x + CARD_W), 0) + 60;
const diagramHeight =
  tables.reduce((max, table) => Math.max(max, table.y + cardHeight(table)), 0) + 80;

type Stats = {
  categories: number;
  subcategories: number;
  attributes: number;
  options: number;
  products: number;
  catalogPages: number;
};

const emptyStats: Stats = {
  categories: 0,
  subcategories: 0,
  attributes: 0,
  options: 0,
  products: 0,
  catalogPages: 0,
};

const FieldRow = ({
  field,
  highlight,
}: {
  field: Field;
  highlight: boolean;
}) => (
  <div
    className={`flex items-center gap-2 px-3 text-[12.5px] leading-none ${
      highlight ? "bg-amber-100/70 font-medium" : ""
    }`}
    style={{ height: ROW_H }}
  >
    <span className="inline-flex w-4 shrink-0 justify-center">
      {field.pk ? (
        <span title="Primary key" className="text-amber-500">◆</span>
      ) : field.fk ? (
        <span title={`FK → ${field.fk.table}`} className="text-sky-500">↗</span>
      ) : field.unique ? (
        <span title="Unique" className="text-zinc-400">∘</span>
      ) : (
        <span className="text-zinc-300">·</span>
      )}
    </span>
    <span
      className={`flex-1 truncate font-mono ${
        field.pk ? "font-semibold text-zinc-900" : "text-zinc-700"
      }`}
    >
      {field.name}
    </span>
    {field.badge ? (
      <span className="rounded bg-zinc-100 px-1 font-mono text-[10px] text-zinc-500">{field.badge}</span>
    ) : null}
    <span className="font-mono text-[11px] text-zinc-400">{field.type}</span>
  </div>
);

export default function DatabasePage() {
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/admin/bootstrap");
        if (!res.ok) throw new Error("bootstrap unavailable");
        const data = await res.json();
        const attributes = Array.isArray(data?.attributes) ? data.attributes : [];
        const options = attributes.reduce(
          (total: number, attr: { options?: unknown[] }) =>
            total + (Array.isArray(attr.options) ? attr.options.length : 0),
          0,
        );
        setStats({
          categories: Array.isArray(data?.categories) ? data.categories.length : 0,
          subcategories: Array.isArray(data?.subcategories) ? data.subcategories.length : 0,
          attributes: attributes.length,
          options,
          products: Array.isArray(data?.products) ? data.products.length : 0,
          catalogPages: Array.isArray(data?.catalogPages) ? data.catalogPages.length : 0,
        });
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : "stats error");
      } finally {
        setStatsLoading(false);
      }
    };
    run();
  }, []);

  const focused = hoveredTable ?? activeTable;

  const { relatedTables, relatedEdgeIds } = useMemo(() => {
    if (!focused) {
      return { relatedTables: new Set<string>(), relatedEdgeIds: new Set<string>() };
    }
    const relTables = new Set<string>([focused]);
    const relEdges = new Set<string>();
    for (const edge of edges) {
      if (edge.source === focused || edge.target === focused) {
        relEdges.add(edge.id);
        relTables.add(edge.source);
        relTables.add(edge.target);
      }
    }
    return { relatedTables: relTables, relatedEdgeIds: relEdges };
  }, [focused]);

  const focusTable = (name: string) => {
    setActiveTable((current) => (current === name ? null : name));
    const table = tableByName.get(name);
    if (!table || !viewportRef.current) return;
    const viewport = viewportRef.current;
    const targetCenterX = table.x + CARD_W / 2;
    const targetCenterY = table.y + cardHeight(table) / 2;
    viewport.scrollTo({
      left: Math.max(0, targetCenterX - viewport.clientWidth / 2),
      top: Math.max(0, targetCenterY - viewport.clientHeight / 2),
      behavior: "smooth",
    });
  };

  const fkCount = edges.length;

  const statCards: Array<{ label: string; value: number | string; tone: string }> = [
    { label: "Таблиц", value: tables.length, tone: "bg-zinc-100 text-zinc-900" },
    { label: "FK-связей", value: fkCount, tone: "bg-zinc-100 text-zinc-900" },
    { label: "Категорий", value: stats.categories, tone: "bg-sky-50 text-sky-900" },
    { label: "Подкатегорий", value: stats.subcategories, tone: "bg-sky-50 text-sky-900" },
    { label: "Атрибутов", value: stats.attributes, tone: "bg-violet-50 text-violet-900" },
    { label: "Опций", value: stats.options, tone: "bg-violet-50 text-violet-900" },
    { label: "Товаров", value: stats.products, tone: "bg-emerald-50 text-emerald-900" },
    { label: "Витрин", value: stats.catalogPages, tone: "bg-amber-50 text-amber-900" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">База данных</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Чистая схема под двери (вход/межком) + варианты. 6 таблиц вместо 14 — EAV свёрнут в
            JSONB, audit и три M2M-таблицы удалены.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(groupMeta).map(([key, meta]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${meta.chip}`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.bar}`} />
              {meta.label}
            </span>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-lg px-3 py-2 ${card.tone}`}>
            <div className="text-[11px] uppercase tracking-wide opacity-70">{card.label}</div>
            <div className="text-xl font-semibold tabular-nums">
              {statsLoading && card.label !== "Таблиц" && card.label !== "FK-связей"
                ? "…"
                : card.value}
            </div>
          </div>
        ))}
      </section>
      {statsError ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Не удалось получить актуальные счётчики ({statsError}); схема отображается из локальной модели.
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {tables.map((table) => {
          const meta = groupMeta[table.group];
          const isActive = activeTable === table.name;
          return (
            <button
              key={table.name}
              onClick={() => focusTable(table.name)}
              onMouseEnter={() => setHoveredTable(table.name)}
              onMouseLeave={() => setHoveredTable(null)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                isActive ? "border-zinc-900 bg-zinc-900 text-white" : `${meta.chip} hover:brightness-95`
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.bar}`} />
              <span className="font-mono">{table.name}</span>
            </button>
          );
        })}
      </section>

      <div
        ref={viewportRef}
        className="relative overflow-auto rounded-xl border bg-[radial-gradient(circle_at_1px_1px,_#e5e7eb_1px,_transparent_0)] [background-size:24px_24px]"
        style={{ maxHeight: "70vh" }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActiveTable(null);
        }}
      >
        <div
          className="relative"
          style={{ width: diagramWidth, height: diagramHeight }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveTable(null);
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={diagramWidth}
            height={diagramHeight}
          >
            <defs>
              {Object.entries(groupMeta).map(([key, meta]) => (
                <marker
                  key={key}
                  id={`arrow-${key}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={meta.stroke} />
                </marker>
              ))}
            </defs>
            {edges.map((edge) => {
              const sourceTable = tableByName.get(edge.source);
              const isRelated = focused ? relatedEdgeIds.has(edge.id) : true;
              const opacity = focused && !isRelated ? 0.08 : 0.85;
              const strokeWidth = focused && isRelated ? 2.4 : 1.6;
              const markerKey: Group = sourceTable?.group ?? "products";
              return (
                <g key={edge.id} style={{ opacity }}>
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={edge.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd={`url(#arrow-${markerKey})`}
                  />
                </g>
              );
            })}
          </svg>

          {tables.map((table) => {
            const meta = groupMeta[table.group];
            const isFocused = focused === table.name;
            const isRelated = focused ? relatedTables.has(table.name) : true;
            const dim = focused && !isRelated;
            return (
              <div
                key={table.name}
                className={`absolute select-none rounded-xl border bg-white shadow-sm transition ${
                  isFocused ? "ring-2 ring-zinc-900 shadow-lg" : ""
                } ${dim ? "opacity-25" : "opacity-100"}`}
                style={{
                  left: table.x,
                  top: table.y,
                  width: CARD_W,
                  height: cardHeight(table),
                }}
                onMouseEnter={() => setHoveredTable(table.name)}
                onMouseLeave={() => setHoveredTable(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  focusTable(table.name);
                }}
              >
                <div className="flex h-full flex-col">
                  <div
                    className={`rounded-t-xl border-l-4 px-3 py-2 ${meta.headerBg} ${meta.headerText}`}
                    style={{ borderLeftColor: meta.stroke }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold leading-tight">
                          {table.title}
                        </div>
                        <div className="truncate font-mono text-[11px] opacity-70">{table.name}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
                      >
                        {table.fields.length}
                      </span>
                    </div>
                    {table.description ? (
                      <div className="mt-1 text-[10.5px] leading-tight opacity-75">
                        {table.description}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1 py-1">
                    {table.fields.map((field) => {
                      const highlightFk =
                        focused != null &&
                        field.fk?.table === focused &&
                        table.name !== focused;
                      const highlightPk = Boolean(
                        focused != null && field.pk && table.name === focused,
                      );
                      return (
                        <FieldRow
                          key={field.name}
                          field={field}
                          highlight={highlightFk || highlightPk}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-sm leading-6 text-zinc-700">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Как читать схему</h3>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="text-amber-500">◆</span> — первичный ключ (PK)
            </li>
            <li>
              <span className="text-sky-500">↗</span> — внешний ключ (FK), стрелка указывает на родителя
            </li>
            <li>
              <span className="text-zinc-400">∘</span> — уникальное поле (UNIQUE)
            </li>
            <li>
              Бейдж <code className="rounded bg-zinc-100 px-1">GIN</code> — на поле есть GIN-индекс (jsonb_path_ops).
            </li>
            <li>
              Бейдж <code className="rounded bg-zinc-100 px-1">CHECK</code> — ограничение значений уровнем БД.
            </li>
            <li>Цвет рамки карточки соответствует функциональной группе.</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm leading-6 text-zinc-700 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Чем эта схема отличается от старой</h3>
          <ul className="space-y-1 text-xs">
            <li>
              <strong>−9 таблиц:</strong> <code className="rounded bg-zinc-100 px-1">audit_log</code>,{" "}
              <code className="rounded bg-zinc-100 px-1">subcategories</code>,{" "}
              <code className="rounded bg-zinc-100 px-1">attribute_options</code>,{" "}
              <code className="rounded bg-zinc-100 px-1">product_attribute_values</code>,{" "}
              <code className="rounded bg-zinc-100 px-1">product_variant_attribute_values</code> и три M2M-таблицы{" "}
              <code className="rounded bg-zinc-100 px-1">catalog_page_*</code> удалены.
            </li>
            <li>
              «Подкатегория» теперь — это строка в той же{" "}
              <code className="rounded bg-zinc-100 px-1">categories</code> с{" "}
              <code className="rounded bg-zinc-100 px-1">parent_id</code> на корень.
            </li>
            <li>
              EAV-значения свёрнуты в <code className="rounded bg-zinc-100 px-1">products.attrs</code> и{" "}
              <code className="rounded bg-zinc-100 px-1">product_variants.attrs</code> (JSONB + GIN).
            </li>
            <li>
              Цветовые варианты одной модели группируются через{" "}
              <code className="rounded bg-zinc-100 px-1">products.model_key</code> вместо скрытого атрибута{" "}
              «<code className="rounded bg-zinc-100 px-1">path</code>».
            </li>
            <li>
              Изображения хранятся только в <code className="rounded bg-zinc-100 px-1">product_images</code>;{" "}
              дубль <code className="rounded bg-zinc-100 px-1">products.image_url</code> убран.
            </li>
            <li>
              Витрины — это <code className="rounded bg-zinc-100 px-1">catalog_pages</code> с{" "}
              <code className="rounded bg-zinc-100 px-1">category_slugs</code> и{" "}
              <code className="rounded bg-zinc-100 px-1">filter_codes</code> как массивы (без M2M).
            </li>
            <li>
              4 булевых флага атрибута заменил один{" "}
              <code className="rounded bg-zinc-100 px-1">scope</code> ∈ (product | variant).
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

# Сворачиваемые секции фильтров в каталоге

Документ для быстрого отката функции «свернуть/развернуть блок фильтра» на странице `/catalog`.

**Затронутый файл:** `src/app/catalog/page.tsx` (только он).

**Дата добавления:** 2026-06-09

---

## Что делает функция

- У секций **Категории**, **Подкатегории**, **Цена** и каждого **атрибутного фильтра** заголовок — кнопка с `▾` / `▸`.
- Клик сворачивает или разворачивает содержимое секции.
- По умолчанию все секции развёрнуты.
- **Поиск** и **сортировка** не сворачиваются (остаются всегда видимыми).

---

## Как убрать функцию (чеклист)

### 1. Удалить state и хелперы в `CatalogPageContent`

Удалить блок после `isMobileFiltersOpen` (примерно строки 94–107):

```tsx
const [collapsedFilterSections, setCollapsedFilterSections] = useState<Set<string>>(
  () => new Set(),
);

const isFilterSectionCollapsed = (sectionId: string) => collapsedFilterSections.has(sectionId);

const toggleFilterSection = (sectionId: string) => {
  setCollapsedFilterSections((prev) => {
    const next = new Set(prev);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    return next;
  });
};
```

### 2. Вернуть разметку сайдбара без `CollapsibleFilterSection`

Заменить обёртки `CollapsibleFilterSection` на простые `<div>` с `<h3>`.

**Категории:**

```tsx
{meta.categories.length > 0 ? (
  <div>
    <h3 className="mb-2 text-sm font-medium">Категории</h3>
    <div className="space-y-1 text-sm">
      {meta.categories.map((category) => (
        <label key={category.slug} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={categories.includes(category.slug)}
            onChange={() => toggle(category.slug, categories, setCategories)}
          />
          {category.name}
        </label>
      ))}
    </div>
  </div>
) : null}
```

**Подкатегории** — аналогично, заголовок `Подкатегории`.

**Цена:**

```tsx
{meta.price.max > meta.price.min ? (
  <div>
    <h3 className="mb-2 text-sm font-medium">Цена, ₽</h3>
    <div className="flex gap-2">
      {/* два input type="number" — без изменений */}
    </div>
  </div>
) : null}
```

**Атрибуты** — убрать пропсы `collapsed` и `onToggleCollapse` из вызова:

```tsx
{meta.attributeFilters.map((filter) => (
  <AttributeFilterBlock
    key={filter.code}
    filter={filter}
    selected={attrSelections[filter.code] || []}
    range={attrRanges[filter.code] || { min: "", max: "" }}
    onToggleValue={(value) => toggleAttrValue(filter.code, value)}
    onChangeRange={(side, value) => setAttrRange(filter.code, side, value)}
  />
))}
```

### 3. Удалить компонент `CollapsibleFilterSection`

Удалить целиком:

- тип `CollapsibleFilterSectionProps`
- функцию `CollapsibleFilterSection` (примерно строки 698–732)

### 4. Вернуть `AttributeFilterBlock` к прежнему виду

**Пропсы** — только:

```tsx
type AttributeFilterBlockProps = {
  filter: CatalogAttributeFilter;
  selected: string[];
  range: NumericRange;
  onToggleValue: (value: string) => void;
  onChangeRange: (side: keyof NumericRange, value: string) => void;
};
```

**Числовой фильтр:**

```tsx
return (
  <div>
    <h3 className="mb-2 text-sm font-medium">
      {filter.name}
      {filter.unit ? <span className="ml-1 text-xs text-zinc-500">({filter.unit})</span> : null}
    </h3>
    <div className="flex gap-2">{/* inputs */}</div>
  </div>
);
```

**Checkbox-фильтр:**

```tsx
return (
  <div>
    <h3 className="mb-2 text-sm font-medium">{filter.name}</h3>
    <div className="space-y-1 text-sm">{/* labels */}</div>
  </div>
);
```

Убрать из `AttributeFilterBlock`: `sectionId`, `title`, `collapsed`, `onToggleCollapse`, все обёртки `CollapsibleFilterSection`.

### 5. Проверка

```bash
npm run lint
```

Открыть `/catalog` — все секции фильтров всегда видны, заголовки не кликабельны.

---

## Быстрый откат через git (если изменения ещё не смешаны с другими)

```bash
git checkout HEAD -- src/app/catalog/page.tsx
```

Или выборочно откатить только коммит с этой функцией, если он отдельный.

---

## ID секций (для справки)

| sectionId        | Блок            |
|------------------|-----------------|
| `categories`     | Категории       |
| `subcategories`  | Подкатегории    |
| `price`          | Цена            |
| `attr-{code}`    | Атрибут по коду |

Состояние хранится только в React state (`useState`), **не** в `sessionStorage` / `localStorage`.

---

## Связанные изменения в этой сессии (другие файлы)

Этот документ описывает **только сворачиваемые фильтры**. Отдельно в той же сессии менялись:

| Файл | Изменение |
|------|-----------|
| `src/app/catalog/page.tsx` | убран режим «две картинки», убран выбор стекла в карточке |
| `src/app/product/[id]/page.tsx` | убрана тень и режим «две картинки» |
| `src/lib/client/normalizers.ts` | удалены `isEntryDoorCatalogItem`, `ENTRY_DOORS_CATEGORY_SLUG` |

На откат collapsible-фильтров эти правки не влияют.

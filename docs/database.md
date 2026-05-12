# База данных — схема и принципы работы

Каталог дверей (входные / межкомнатные / фурнитура) на PostgreSQL. Шесть таблиц, JSONB-атрибуты, единое дерево категорий. Доступ — только через репозитории; сервисы и API-роуты не знают деталей схемы.

## Файлы

| Слой | Где живёт |
|---|---|
| Подключение к БД | `src/lib/server/db/postgres.js` (`pg` Pool, `query`, `withTransaction`) |
| Инициализация / сидинг | `src/lib/server/db/initSchema.js` |
| Репозитории | `src/lib/server/repositories/*` |
| Сервисы (бизнес-логика) | `src/lib/server/services/*` |
| HTTP-обёртки | `src/lib/server/http/handlers.js`, `src/app/api/**/route.js` |
| Семантика атрибутов | `src/lib/server/domain/attributeSemantics.js` |

Запуск миграции: `npm run db:init` (читает `DATABASE_URL` из `.env`, делает `DROP … CASCADE` старых таблиц и поднимает новую схему с демо-данными).

---

## Таблицы (6)

### 1. `categories` — единое дерево
Корень и «подкатегория» живут в одной таблице. `parent_id IS NULL` ⇒ корень; `parent_id → id` ⇒ дочерний узел.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `parent_id` | `bigint` | FK `categories(id)` ON DELETE CASCADE, self-ref |
| `name` | `text` | Display name |
| `slug` | `text` | UNIQUE |
| `sort_order` | `int` | |

Уникальность `(parent_id, name)`. Удаление родителя каскадом сносит детей и (через FK ниже) их товары.

### 2. `catalog_pages` — витрины
Самодостаточная таблица. Связь с категориями и фильтрами — через массивы.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `slug` | `text` | UNIQUE; `'all'` — дефолтная витрина |
| `name` | `text` | |
| `category_slugs` | `text[]` | Slug категорий и/или подкатегорий, входящих в витрину. GIN-индекс. |
| `filter_codes` | `text[]` | Коды атрибутов, которые показываются как фильтры на странице |
| `sort_order` | `int` | |

Раньше это делали три M2M-таблицы — сейчас одно поле каждого типа.

### 3. `attribute_definitions` — словарь характеристик
Хранит **метаданные**, а не значения. Значения лежат прямо в товарах/вариантах в JSONB.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `code` | `text` | UNIQUE. Ключ в JSONB-атрибутах (`color`, `width`, `size` …) |
| `name` | `text` | Display name для UI |
| `type` | `text` | CHECK ∈ (`text`, `number`, `option`, `boolean`) |
| `unit` | `text` | мм / шт / null |
| `options` | `jsonb` | Inline-массив строк для select-атрибутов |
| `scope` | `text` | CHECK ∈ (`product`, `variant`) — где живёт значение |
| `is_filterable` | `bool` | Показывать ли в фильтре каталога |
| `sort_order` | `int` | |

`scope` заменил четыре прежних булевых флага (`is_variant_axis`, `is_visible_on_product`, `is_required`, плюс хардкод «осей» в коде).

### 4. `products` — карточка модели
Один товар = «модель в конкретном цвете». Размер/открывание/прочие оси — в `product_variants`.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `category_id` | `bigint` | FK `categories(id)`. Может ссылаться на корень или на лист (подкатегорию) |
| `sku` | `text` | UNIQUE |
| `name` | `text` | |
| `model_key` | `text` | Группирует цветовые варианты одной модели (replacement скрытого «path») |
| `price` | `int` | Базовая цена |
| `attrs` | `jsonb` | `{ color: "Белый", thickness: 80, manufacturer: "Браво" … }`. GIN-индекс `jsonb_path_ops` |
| `is_active` | `bool` | Soft-hide в каталоге |
| `created_at` / `updated_at` | `timestamptz` | |

### 5. `product_images` — единственный источник изображений
Раньше URL лежал и здесь, и в `products.image_url`. Теперь только тут.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `product_id` | `bigint` | FK `products(id)` ON DELETE CASCADE |
| `image_url` | `text` | |
| `sort_order` | `int` | Первая по `sort_order` — обложка; вторая — hover-картинка |

UNIQUE `(product_id, image_url)`.

### 6. `product_variants` — оси варианта
Размер, открывание, при необходимости — переопределение цены/картинки.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | `bigserial` | PK |
| `product_id` | `bigint` | FK `products(id)` ON DELETE CASCADE |
| `sku` | `text` | UNIQUE |
| `price` | `int` | NULL ⇒ наследуется от `products.price` |
| `image_url` | `text` | NULL ⇒ берётся первая из `product_images` |
| `attrs` | `jsonb` | `{ size: "800x2000", opening: "Левое" }`. GIN-индекс. |
| `sort_order` | `int` | |
| `is_active` | `bool` | |
| `updated_at` | `timestamptz` | |

---

## Связи

```
catalog_pages.category_slugs[]   ───▶  categories.slug              (логическая, без FK)
catalog_pages.filter_codes[]     ───▶  attribute_definitions.code   (логическая, без FK)

categories.parent_id             ───▶  categories.id                (self FK, CASCADE)

products.category_id             ───▶  categories.id
product_images.product_id        ───▶  products.id                  (CASCADE)
product_variants.product_id      ───▶  products.id                  (CASCADE)
```

Всего **5 «жёстких» FK** (`categories.parent_id`, `products.category_id`, `product_images.product_id`, `product_variants.product_id` + автоматически создаваемые UNIQUE-индексы). Связи витрин с категориями/фильтрами — через slug/code в массивах: гибче, проще конфигурировать, нет таблиц-связок.

---

## Соглашения по JSONB

Все `attrs` — это **плоский объект `code → value`**, где `code` — `attribute_definitions.code`. Значение совпадает с тем, что увидит пользователь:

```json
{
  "color": "Чёрный",
  "fill": "Минеральная плита",
  "thickness": 80,
  "width": 860,
  "manufacturer": "Браво",
  "glazing": "Нет"
}
```

Правила:
- Числовые атрибуты сохраняются как числа, не строки (`thickness: 80`, не `"80"`).
- Строковые/опционные — как обычная строка из `attribute_definitions.options`.
- Booleans хранятся как локализованные строки `"Да"`/`"Нет"` (для прямого вывода в UI и в фильтре).
- Пустые/`null` значения не пишутся — отсутствие ключа = атрибут не задан.
- `product_variants.attrs` следует тому же формату, но включает только variant-scope коды (`size`, `opening` и т.п.).

Индексы:
- `idx_products_attrs` и `idx_product_variants_attrs` — GIN `jsonb_path_ops`. Дают быстрый `attrs @> '{"color":"Белый"}'::jsonb`.
- Для текстового равенства через `attrs->>'code' = $value` индекс используется частично (через `attrs @>`), но при необходимости горячие атрибуты можно ускорить expression-индексами (`CREATE INDEX … ON products ((attrs->>'thickness'))`). Сейчас этого нет — каталог небольшой.

---

## Сидинг

`initSchema.js` поднимает следующее за одну транзакцию:

1. **3 корневых категории**: «Входные двери», «Межкомнатные двери», «Фурнитура».
2. **5 подкатегорий**: «Премиум»/«Стандарт», «Classic»/«Modern», «Ручки».
3. **9 атрибутов**: `thickness`, `width`, `height` (number, product), `color`, `fill` (option, product), `glazing` (boolean, product), `manufacturer` (text, product), `size`, `opening` (option, variant).
4. **5 витрин**: `all`, `entry-doors`, `thermal-break-doors`, `interior-doors`, `fittings`; у каждой свой набор `category_slugs` и `filter_codes`.
5. **6 демо-товаров** с вариантами, в т.ч. две карточки `BRAVO-CLASSIC-01-*` с одинаковым `model_key` — чтобы показать цветовые варианты.

Сид идемпотентен через `DROP … CASCADE` в начале: повторный запуск очищает БД.

---

## Read-path (как фронт читает данные)

### `/catalog` → `GET /api/products?…`
1. `catalogService.getProducts(query)` парсит фильтры через `buildCatalogFilters`.
2. Если `catalogPage` указан — резолвится через `catalogPageRepository.findCatalogPageBySlug`, и `category_slugs` витрины становятся `filters.scope*`. Атрибутные фильтры обрезаются по `filter_codes` витрины.
3. `productRepository.listProducts(filters)`:
   - Один SQL с JOIN на `categories` дважды (себя + parent). Через `COALESCE(parent.slug, c.slug)` категория продукта приводится к корневому slug.
   - Атрибутные фильтры применяются как `p.attrs->>code = ANY($values)`. Числовые диапазоны — `(p.attrs->>code)::numeric ⋚ $value`.
   - Variant-scope коды отрабатывают через `EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.attrs->>code = ANY(...))`.
   - Обложка и hover-картинка — два коррелированных подзапроса в `product_images`.

### `/product/[id]` → `GET /api/products/:id`
`productRepository.getProductById(id)` собирает:
- метаданные товара + изображения;
- product-scope атрибуты — итерируем все строки `attribute_definitions` со `scope='product'`, берём из `p.attrs[code]`, рендерим с unit;
- варианты — все `product_variants`, у каждого свой `attrs`;
- `variantSelectors` — пробегаем `attrs` всех вариантов, собираем уникальные значения по каждому variant-scope коду;
- `colorVariants` — если у товара выставлен `model_key`, запрос `WHERE model_key = ? AND name = ?` достаёт «соседей»-цветов.

### `/catalog` сайдбар → `GET /api/products/meta?catalogPage=…`
`productRepository.listFilterMeta(constraints)` отдаёт фильтр-UI: список категорий/подкатегорий в скоупе, диапазон цены, и атрибут-фильтры:
- число → `MIN/MAX` по `(attrs->>code)::numeric` (с regex-фильтром `^-?[0-9]+(\.[0-9]+)?$`);
- текст/option/boolean → `GROUP BY` distinct значений из JSONB либо inline-options.
- Если страница задала `filter_codes`, `catalogService.getFilterMeta` передаёт их id в `allowedAttributeIds` — meta вернёт только разрешённые.

### `/admin` → `GET /api/admin/bootstrap`
`adminService.listBootstrap()` отдаёт `{ categories, subcategories, attributes (+options), products (краткий список), catalogPages }`. Это и питает `/database` (живые счётчики).

---

## Write-path (CRUD)

### Категории / подкатегории
- POST `/api/admin/categories` → `categoryRepository.createCategory` (`parent_id NULL`).
- POST `/api/admin/subcategories` → `subcategoryRepository.createSubcategory` — пишет в ту же `categories` с `parent_id = categoryId`.
- Удаление каскадно сносит детей и товары (через FK).

### Атрибуты
- POST `/api/admin/attributes` — `createAttribute`: `isVariantAxis` транслируется в `scope = 'variant'`.
- POST `/api/admin/attribute-options` — `createAttributeOption`: добавляет строку в `attribute_definitions.options` JSONB-массиве (с `?`-проверкой на дубль, конкатенация через `||`).

### Товары
`adminService.createProduct` / `updateProduct` принимает легаси-форму payload:
```json
{
  "sku": "...", "name": "...", "price": 12345,
  "categoryId": <root id>, "subcategoryId": <leaf id | null>,
  "imageUrl": "...",
  "attributes": [
    { "attributeId": 7, "valueText": "Чёрный" },
    { "attributeId": 3, "valueNumber": 80 }
  ],
  "variants": [
    { "sku": "...", "price": null, "attributes": [...] }
  ]
}
```

Репозиторий:
1. Грузит словарь атрибутов в `attrDefById`.
2. `partitionAttributesByScope` делит входной список на product/variant.
3. `productAttrsFromPayload` сворачивает в JSONB-объект (`{code: value}`) через `attributeRepository.resolveAttributeValue` (учитывает `valueOptionId` для совместимости).
4. Конечный `category_id` = `subcategoryId ?? categoryId` (приоритет у листа).
5. `INSERT` товара, `writeProductImages`, `writeVariants`.

### CSV-импорт (`/api/admin/import/csv`)
`csvImportService.importRows` ходит через `productRepository.upsertProductBySku(payload)`. Этот метод:
- Делит `payload.attributes` на product/variant по `scope` и автоматически перекладывает variant-scope в `incomingVariantAttrs` (даже если они пришли в общем списке).
- Делает `UPDATE` или `INSERT` товара. При `UPDATE` JSONB-`attrs` сливается (incoming перетирает существующие ключи).
- При `applyVariantPatch` делает `INSERT … ON CONFLICT (sku) DO UPDATE` варианта с `attrs = product_variants.attrs || EXCLUDED.attrs` (merge JSONB).

### Витрины каталога
`catalogPageRepository.createCatalogPage` / `updateCatalogPage` принимает `categoryIds[]`, `subcategoryIds[]`, `filterAttributeIds[]` (из старой формы), резолвит их в slugs/codes и пишет в массивы `catalog_pages.category_slugs` / `filter_codes`.

---

## Semantics-слой

`src/lib/server/domain/attributeSemantics.js` оставлен короткий:
- `isVariantAxisRow(row)` — true, если `row.scope === 'variant'` или legacy-флаг `isVariantAxis === true`.
- `normalizeAttributeLabel`, `normalizeAttrNameKey` — для CSV-импорта (поиск атрибута по имени без учёта пробелов / ё/е / регистра).

Никаких хардкод-списков кодов и распознавания по имени — всё через `scope` из БД.

---

## Что было удалено по сравнению со старой схемой

- `audit_log` + функция `log_row_change()` + 9 триггеров `trg_audit_*` + канал `pg_notify('audit_log_channel')`.
- `subcategories` (слита в `categories.parent_id`).
- `attribute_options` (inline в `attribute_definitions.options`).
- `product_attribute_values` и `product_variant_attribute_values` (обе EAV-таблицы свёрнуты в JSONB).
- `catalog_page_categories`, `catalog_page_subcategories`, `catalog_page_filter_attributes` (заменены массивами в `catalog_pages`).
- Скрытый служебный атрибут «`path`» (заменён колонкой `products.model_key`).
- `products.image_url` (дубль `product_images`).
- 4 булевых флага атрибута (`is_variant_axis`, `is_visible_on_product`, `is_required`, плюс `is_filterable` оставлен), и `catalog_pages.is_active` / `is_default`.

Итого: **−9 таблиц**, минус функция и 9 триггеров, плюс куча однострочных миграционных хелперов (`ensureManufacturerAttribute`, `ensureInteriorDoorAttributes`, `ensureProductImages`, `cleanupVariantAxisProductAttributeRows`, `ensureAuditTriggers`) — все они умерли вместе с `initSchema.js`.

---

## Куда смотреть, когда нужно изменить схему

| Хочется | Идти в |
|---|---|
| Новая характеристика товара | `attribute_definitions` через `/api/admin/attributes` или сид `initSchema.js` → `seedAttributes` |
| Новая категория / подкатегория | `/api/admin/categories` или `/api/admin/subcategories` |
| Новая витрина | `/api/admin/catalog-pages` или сид `seedCatalogPages` |
| Изменить SQL чтения | `src/lib/server/repositories/productRepository.js` (`listProducts`, `listFilterMeta`, `getProductById`) |
| Поменять форму API | сервис в `src/lib/server/services/*` — репозитории трогать не обязательно |
| Поменять JSONB-формат | соглашения выше + `productAttrsFromPayload` и read-mapping в `getProductById` |

---

## Шпаргалка по SQL

```sql
-- товары витрины «Межкомнатные»
SELECT p.id, p.name, p.attrs->>'color' AS color, p.price
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN categories root ON root.id = c.parent_id
WHERE p.is_active
  AND COALESCE(root.slug, c.slug) = 'interior-doors';

-- цветовые соседи одного товара
SELECT id, attrs->>'color' AS color
FROM products
WHERE model_key = (SELECT model_key FROM products WHERE id = $1)
  AND model_key IS NOT NULL;

-- товары с конкретной толщиной (использует GIN)
SELECT id FROM products WHERE attrs @> '{"thickness": 80}';

-- активные варианты товара
SELECT * FROM product_variants
WHERE product_id = $1 AND is_active
ORDER BY sort_order, id;
```

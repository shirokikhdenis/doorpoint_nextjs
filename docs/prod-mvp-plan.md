# План прод-MVP витрины (без переписывания всего)

Цель: запустить публичную витрину в продакшен **без онлайн-оплаты** — каталог, карточка товара, корзина, заявки (замер / расчёт), базовое SEO и стабильность.

Принцип: **инкрементальные PR**, client-архитектура каталога сохраняется; сервер добавляется точечно (initial data, metadata, API заявок). Админка (`/admin/*`) вне scope.

---

## Текущее состояние (baseline)

| Область | Сейчас |
|---------|--------|
| Каталог `/catalog` | Полностью `"use client"`, 3× `fetch` после hydrate |
| Товар `/product/[id]` | Server `generateMetadata`, контент — client `fetch` |
| Корзина | `localStorage` + `useSyncExternalStore` — ок для MVP |
| Форма замера | Демо, `preventDefault`, без API |
| SEO | Базовые `title`/`description` в layout; нет `metadataBase`, OG, sitemap, JSON-LD |
| Фильтры в URL | Частично: `catalogPage`, `catalogLabel`; остальное — state / sessionStorage |
| CI / E2E | Нет |
| Изображения | `toPublicImageSrc`, fallback фото с вариантов в `productRepository` |

---

## Приоритеты

### P0 — блокеры запуска

Без этого витрину в прод открывать рискованно.

| # | Задача | Зачем | Объём |
|---|--------|-------|-------|
| P0.1 | **API заявок** — замер + заявка из корзины | Единственный канал конверсии без оплаты | 1 PR |
| P0.2 | **Валидация форм + UX** — success/error, disabled submit, honeypot/rate-limit | Защита от спама, доверие пользователя | в том же PR |
| P0.3 | **`not-found.tsx` + global `error.tsx`** | Нормальные 404/500 вместо белого экрана | 1 маленький PR |
| P0.4 | **Редиректы дублей** (`/uslugi` ↔ `/delivery-and-installation`, `/our-works` → `/portfolio` если нужно) | Один канонический URL | 1 маленький PR |

### P1 — SEO и первое впечатление (быстрые победы)

Не требуют переписывания каталога на RSC.

| # | Задача | Файлы / идея |
|---|--------|----------------|
| P1.1 | `metadataBase` в root `layout.tsx` (env `NEXT_PUBLIC_SITE_URL`) | Canonical, OG absolute URLs |
| P1.2 | OG + Twitter для `/product/[id]` | Расширить `buildProductMetadata`: `openGraph.images` из первого валидного фото |
| P1.3 | `sitemap.ts` | Статические страницы + `/api/products` с пагинацией или отдельный `GET /api/products/ids` |
| P1.4 | `robots.ts` | `allow: /`, `disallow: /admin`, sitemap URL |
| P1.5 | JSON-LD `Product` на карточке | Server wrapper или client `<script type="application/ld+json">` из уже загруженных данных |
| P1.6 | Скелетон на `/product/[id]` | Переиспользовать паттерн из `catalog/loading.tsx` |

### P2 — стабильность и UX (client остаётся client)

| # | Задача | Детали |
|---|--------|--------|
| P2.1 | **Единый `fetchJson` / `ApiError`** | Доработать `src/lib/client/apiClient.ts`; мигрировать `use-catalog-products`, `use-product-page` |
| P2.2 | **Синхронизация фильтров с URL** | `search`, `sort`, категории, цена, атрибуты → `URLSearchParams`; приоритет: sessionStorage (scroll-restore) > URL > defaults |
| P2.3 | **Плейсхолдеры изображений** | В `CatalogProductCard` / `ProductGallery` — fallback UI при пустом `src` (уже частично есть) |
| P2.4 | **Retry на ошибку каталога** | Кнопка «Повторить» в `CatalogProductGrid` вместо только текста ошибки |
| P2.5 | **a11y** | `aria-live` для корзины/ошибок; focus trap в lightbox; keyboard для галереи |

### P3 — SSR initial data (гибрид, без «большого взрыва»)

Один PR на каталог, один на товар. Client-хуки не удаляем — принимают `initialData` и пропускают первый fetch.

```
catalog/page.tsx (Server)
  └─ await getCatalogShell(searchParams)   // products page 1 + meta + catalogPages
  └─ <CatalogPageClient initial={...} />

product/[id]/page.tsx (Server)
  └─ await getProductById(id)
  └─ <ProductPageClient initialProduct={...} params={params} />
```

| Шаг | Что меняется |
|-----|----------------|
| 3.1 | Вынести `catalogService.getProducts` / `getMeta` в shared server helper (уже есть в `lib/server`) |
| 3.2 | `useCatalogProducts({ initialProducts, initialMeta, initialTotal })` — если `query` совпадает с initial, не fetch page 1 |
| 3.3 | `useProductPage({ initialProduct })` — не показывать «Загрузка...» при наличии данных |
| 3.4 | Проверить scroll-restore и «Показать ещё» — не сломаны |

**Не делаем в P3:** полный RSC каталога с streaming фильтров, Server Actions для фильтров.

### P4 — качество и регрессии

| # | Задача |
|---|--------|
| P4.1 | GitHub Actions: `npm run build`, `npm test`, `npm run lint` (lint можно `continue-on-error` на первом этапе) |
| P4.2 | Playwright smoke (5–7 сценариев): открыть каталог, фильтр/ярлык, карточка, корзина, форма замера (mock API), 404 |
| P4.3 | Env checklist: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, секреты для email/webhook заявок |

---

## Порядок PR (рекомендуемый)

```
PR-1  P0.3 + P0.4          404, error boundary, редиректы
PR-2  P0.1 + P0.2          API заявок + формы
PR-3  P1.1–P1.4            metadataBase, OG, sitemap, robots
PR-4  P1.5 + P1.6          JSON-LD + product skeleton
PR-5  P2.1                 apiClient
PR-6  P2.2                 URL ↔ фильтры
PR-7  P2.3–P2.5            error UX, a11y (можно разбить)
PR-8  P3                   SSR initial catalog + product
PR-9  P4                   CI + Playwright
```

Каждый PR — ревью отдельно, деплой после PR-2 уже возможен (с оговорками по SEO).

---

## Вне scope MVP

- Онлайн-оплата, личный кабинет, сравнение товаров
- Рефакторинг админки
- Полная миграция каталога на Server Components
- Удаление `apiClient` dead code без миграции хуков
- i18n, тёмная тема
- Очистка lint `react-hooks/set-state-in-effect` (отдельный tech-debt PR)

---

## P0.1 — API заявок (эскиз)

### Endpoints

```
POST /api/leads/measure
  { name, phone, comment? }

POST /api/leads/cart
  { name, phone, email?, comment?, items: CartItem[] }
```

### Сервер

- Валидация (zod или ручная): телефон RU, длина полей
- Rate limit по IP (in-memory или middleware)
- Доставка: email (`nodemailer` / Resend) или webhook в Telegram — через env
- Лог в БД опционально (`leads` table) — для MVP достаточно email

### Клиент

- `MeasureLeadForm` → controlled submit, loading, success toast/блок
- Корзина: кнопка «Отправить заявку» → тот же паттерн

---

## P2.2 — URL фильтров (эскиз)

Читать при mount (после sessionStorage restore):

| Param | Пример |
|-------|--------|
| `catalogPage` | `all` |
| `catalogLabel` | `12` |
| `q` | поиск |
| `sort` | `price-asc` |
| `cat` | slug через запятую |
| `sub` | slug через запятую |
| `priceMin`, `priceMax` | числа |
| `attr.<code>` | значения через запятую |

Запись: debounced `replaceState` (как сейчас для `catalogPage`), не `pushState` на каждый чих слайдера.

---

## P3 — SSR shell (эскиз)

```ts
// src/lib/server/catalog-shell.ts
export async function getCatalogShell(searchParams: Record<string, string | string[] | undefined>) {
  const filters = buildCatalogFiltersFromSearchParams(searchParams);
  const [pages, meta, products] = await Promise.all([
    catalogService.getCatalogPages(),
    catalogService.getMeta(filters.catalogPage),
    catalogService.getProducts({ ...filters, page: 1, limit: CATALOG_PAGE_LIMIT }),
  ]);
  return { pages, meta, products, filters };
}
```

Server `page.tsx` передаёт в client; хуки сравнивают `query` с initial — при совпадении не дублируют запрос.

---

## Критерии готовности к прод

- [ ] Заявка с формы замера и из корзины доходит до менеджера
- [ ] `/catalog` и `/product/:id` открываются без console errors на типовом товаре
- [ ] Google Rich Results Test видит Product на карточке (после P1.5)
- [ ] `sitemap.xml` отдаёт товары и статические страницы
- [ ] 404 на несуществующий товар/URL
- [ ] Lighthouse Performance ≥ 70 на каталоге (после P3 заметно легче)
- [ ] Smoke E2E зелёный в CI

---

## Оценка по времени (ориентир)

| Фаза | PR | Дни (1 dev) |
|------|-----|-------------|
| P0 | 2 | 2–3 |
| P1 | 2 | 2 |
| P2 | 3 | 3–4 |
| P3 | 1 | 2–3 |
| P4 | 1 | 2 |
| **Итого** | **9** | **~11–14** |

---

## Связь с уже сделанным рефакторингом

Использовать как есть:

- `src/features/catalog/*` — UI и хуки
- `src/features/product/*`
- `src/lib/client/normalizers.ts`, `image-src.ts`
- `src/lib/server/services/catalogService` + `productRepository`
- `catalog/loading.tsx`, `error.tsx`
- Тесты `test/*.test.js` — расширять под URL-парсинг и `toPublicImageSrc`

Не откатывать client-каталог ради «правильного Next.js» — P3 добавляет серверный первый экран поверх текущей структуры.

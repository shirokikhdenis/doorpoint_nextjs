# Руководство разработчика

Документ описывает инфраструктуру, архитектуру и точки расширения проекта **doorpoint** — интернет-магазин дверей на Next.js с админ-панелью и PostgreSQL.

---

## Содержание

1. [Стек и особенности Next.js 16](#стек-и-особенности-nextjs-16)
2. [Локальный запуск](#локальный-запуск)
3. [Переменные окружения](#переменные-окружения)
4. [Структура репозитория](#структура-репозитория)
5. [Архитектура слоёв](#архитектура-слоёв)
6. [Маршрутизация: витрина и админка](#маршрутизация-витрина-и-админка)
7. [Авторизация админки (proxy)](#авторизация-админки-proxy)
8. [База данных](#база-данных)
9. [Кэш витрины](#кэш-витрины)
10. [Каталог: поток данных](#каталог-поток-данных)
11. [Публичное API](#публичное-api)
12. [Админское API](#админское-api)
13. [Заявки и корзина](#заявки-и-корзина)
14. [Загрузка файлов](#загрузка-файлов)
15. [Тестирование](#тестирование)
16. [CI и деплой](#ci-и-деплой)
17. [Чеклисты: куда лезть](#чеклисты-куда-лезть)
18. [Конвенции](#конвенции)

---

## Стек и особенности Next.js 16

| Компонент | Версия / инструмент |
|-----------|---------------------|
| Framework | Next.js **16.2.6**, App Router |
| UI | React 19, Tailwind CSS 4 |
| Язык | TypeScript (витрина, UI) + JavaScript (серверные сервисы, часть API) |
| БД | PostgreSQL (`pg`) |
| E2E | Playwright |
| Unit | Node.js built-in test runner (`node --test`) |

**Важно:** это не «классический» Next.js из учебников. Перед изменениями API и конвенций читайте актуальную документацию в `node_modules/next/dist/docs/` (см. `AGENTS.md` в корне).

Ключевые отличия, используемые в проекте:

- **`src/proxy.js`** вместо `middleware.js` — проверка сессии админки до обработки запроса.
- **`experimental.appNewScrollHandler`** — поведение прокрутки при client navigation.
- **`experimental.proxyClientMaxBodySize: "25mb"`** — лимит тела запроса для multipart-загрузок (согласован с nginx).

---

## Локальный запуск

### Требования

- Node.js 20+
- PostgreSQL 16 (локально или Docker)
- `.env` на основе `.env.example`

### Первичная настройка

```bash
cp .env.example .env
# Отредактируйте DATABASE_URL

npm install
npm run db:init          # создаёт схему + seed-данные
npm run dev              # http://localhost:3000, слушает 0.0.0.0
```

`db:init` и `db:seed` — одна и та же команда (`src/scripts/dbInit.js`): дропает legacy-таблицы, создаёт схему, наполняет демо-каталогом.

### Полезные npm-скрипты

| Скрипт | Назначение |
|--------|------------|
| `npm run dev` | Dev-сервер |
| `npm run build` / `start` | Production-сборка и запуск |
| `npm run lint` | ESLint |
| `npm test` | Unit-тесты (`test/`) |
| `npm run test:e2e` | Playwright (`e2e/`) |
| `npm run db:init` | Инициализация БД |
| `npm run db:seed:e2e` | Данные для e2e-каталога |
| `npm run db:cleanup:e2e` | Очистка e2e-данных |
| `npm run admin:hash-password` | Хеш пароля для `ADMIN_PASSWORD_HASH` |
| `npm run db:backup` / `db:restore` | Бэкап/восстановление (bash, на Windows — `pg_restore` напрямую) |
| `npm run deploy` | Деплой на VPS через `scripts/deploy.ps1` |

### Восстановление БД из дампа (Windows)

```powershell
pg_restore -d "postgresql://postgres:PASSWORD@localhost:5432/DB_NAME" --clean --if-exists backups\db_YYYY-MM-DD_HH-MM-SS.dump
```

---

## Переменные окружения

См. `.env.example`. Краткая карта:

| Переменная | Обязательна | Назначение |
|------------|-------------|------------|
| `DATABASE_URL` | **да** | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | рекомендуется | Канонический URL сайта (SEO, OAuth redirect, sitemap) |
| `SESSION_SECRET` | для админки | Подпись cookie `admin_session` |
| `ADMIN_SESSION_TTL_SECONDS` | нет | TTL сессии (по умолчанию 12 ч) |
| `YANDEX_OAUTH_*`, `ADMIN_EMAIL` | для OAuth | Вход в админку через Яндекс ID |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH` | запасной вход | Парольный fallback |
| `SMTP_*`, `LEADS_NOTIFY_EMAIL` | для заявок | Email-уведомления о замере |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | нет | Аналитика |
| `STORE_IMAGES_LOCALLY` | нет | Локальное хранение картинок при импорте CSV |
| `ALLOWED_DEV_ORIGINS` | нет | Доп. origins для dev (LAN) |

Загрузка env: `src/lib/server/env.js` (`dotenv` из `.env` в корне).

---

## Структура репозитория

```
test_nextjs/
├── src/
│   ├── app/              # App Router: страницы и API routes
│   │   ├── admin/        # UI админки
│   │   ├── api/          # REST endpoints
│   │   ├── catalog/      # Витрины каталога
│   │   ├── product/      # Карточка товара
│   │   └── ...           # Статические страницы (contact, cart, portfolio…)
│   ├── features/         # Доменные UI-модули (каталог, продукт, админка, навигация)
│   ├── lib/
│   │   ├── client/       # Клиентские утилиты, normalizers, cart-store
│   │   └── server/       # Сервисы, репозитории, auth, cache, db
│   ├── fonts/            # Локальные шрифты
│   ├── proxy.js          # Proxy (auth gate для /admin)
│   └── scripts/          # dbInit.js
├── scripts/              # Деплой, SQL-миграции, e2e seed, утилиты
├── test/                 # Unit-тесты
├── e2e/                  # Playwright
├── public/uploads/       # Загруженные изображения (не в git)
├── backups/              # Дампы БД
└── docs/                 # Документация
```

### Разделение витрины и админки

- **Витрина** — маршруты вне `/admin`. Обёртка: `StorefrontLayoutGate` (навигация, top bar, footer).
- **Админка** — `/admin/*`, свой layout (`AdminLayoutChrome`), без публичной навигации.

---

## Архитектура слоёв

```
┌─────────────────────────────────────────────────────────────┐
│  app/ (pages + route handlers)                              │
│  Server Components, generateMetadata, force-dynamic/revalidate│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  features/ (React UI, hooks, client state)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────┐               ┌─────────────────────────┐
│ lib/client/     │               │ lib/server/             │
│ normalizers,    │               │ services → repositories │
│ cart-store,     │               │ domain, cache, auth, db │
│ apiClient       │               └───────────┬─────────────┘
└─────────────────┘                           ▼
                                    PostgreSQL
```

**Паттерн серверной части:**

1. **Route handler** (`src/app/api/...`) — тонкий слой: парсинг запроса, вызов service, JSON-ответ.
2. **Service** (`src/lib/server/services/*.js`) — бизнес-логика, оркестрация.
3. **Repository** (`src/lib/server/repositories/*.js`) — SQL-запросы.
4. **Domain** (`src/lib/server/domain/*.js`) — чистые функции (валидация, ценообразование, slug).

TypeScript используется преимущественно на границе UI и в новых модулях каталога; legacy-слой сервера — CommonJS `.js` с `createRequire` в route handlers.

---

## Маршрутизация: витрина и админка

### Публичные страницы (основные)

| Путь | Файл | Описание |
|------|------|----------|
| `/` | `app/page.tsx` | Главная (хиты, акции, плитки категорий) |
| `/catalog` | `app/catalog/page.tsx` | Редирект на витрину `all` |
| `/catalog/[slug]` | `app/catalog/[slug]/page.tsx` | Витрина каталога |
| `/product/[slug]` | `app/product/[slug]/page.tsx` | Карточка товара |
| `/cart` | `app/cart/page.tsx` | Корзина |
| `/portfolio`, `/uslugi`, `/contact`… | соответствующие `page.tsx` | Контентные страницы |

### Админка

Навигация задаётся в `src/features/admin/admin-nav.ts`:

- **Работа:** заявки
- **Каталог:** товары, импорт CSV
- **Витрина:** catalog-pages, ярлыки, акции
- **Контент:** портфолио, услуги
- **Структура:** категории, атрибуты
- **Система:** SEO, настройки

---

## Авторизация админки (proxy)

Файл: `src/proxy.js` (Next.js 16 Proxy).

**Защищённые зоны:**

- UI: `/admin/*` (кроме `/admin/login` для неавторизованных)
- API: `/api/admin/*` (кроме публичных: session, OAuth)

**Механизм:**

- Cookie `admin_session` (HMAC, `SESSION_SECRET`)
- OAuth Яндекс: `/api/admin/oauth/yandex` → callback
- Fallback: `ADMIN_LOGIN` + `ADMIN_PASSWORD_HASH`

**Важно для загрузок:** multipart-запросы к `/api/admin/*` **исключены** из proxy matcher — иначе тело обрезается. См. `config.matcher` в `proxy.js`.

Дублирующая проверка сессии есть в `api/admin/[...path]/route.js` и отдельных admin routes.

---

## База данных

### Схема (ядро каталога)

Описание в заголовке `src/lib/server/db/initSchema.js`:

| Таблица | Назначение |
|---------|------------|
| `categories` | Дерево категорий (parent_id), единая таблица вместо categories + subcategories |
| `catalog_pages` | Витрины: `category_slugs[]`, `filter_codes[]` |
| `catalog_page_labels` | Ярлыки-фильтры на витрине (presets) |
| `attribute_definitions` | Словарь характеристик (JSONB options, scope product/variant) |
| `products` | Карточка модели, `attrs` JSONB, `model_key` для группировки вариантов |
| `product_images` | Единственный источник картинок товара |
| `product_variants` | Размеры/открывание, `attrs` JSONB |
| `promotion_banners` | Баннеры акций на главной |
| `portfolio_*`, `service_*` | Портфолио и прайс услуг |
| `leads`, `lead_items` | Заявки (корзина, замер, заказ из админки) — через `schemaPatches.js` |

### Инициализация и миграции

- **Полный reset + seed:** `npm run db:init` — пересоздаёт схему (дроп legacy) и заливает демо-данные.
- **Инкрементальные патчи:** `src/lib/server/db/schemaPatches.js` — `ALTER TABLE`, `CREATE TABLE IF NOT EXISTS` при первом обращении сервисов.
- **SQL-скрипты:** `scripts/*.sql` + `scripts/run-sql-file.js` для ручных миграций.

### Подключение

`src/lib/server/db/postgres.js` — пул `pg` по `DATABASE_URL`.

---

## Кэш витрины

Файл: `src/lib/server/cache/storefront-cache.ts`

Использует `unstable_cache` Next.js с тегами:

| Тег | Данные | revalidate |
|-----|--------|----------|
| `catalog-pages` | Список витрин | 300 с |
| `catalog-meta` | Фильтры/мета витрины | 180 с |
| `catalog-products` | Списки товаров | 60–120 с |
| `home-hits` | Хиты на главной | 120 с |
| `promotions` | Активные акции | 180 с |

**Инвалидация:** `src/lib/server/cache/invalidate-storefront.ts` — вызывается из admin API после мутаций (товары, категории, витрины, акции).

Публичные API routes отдают `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`.

---

## Каталог: поток данных

### Server → Client (первый рендер)

```
catalog/[slug]/page.tsx
    └── getCatalogShell()          # lib/server/catalog-shell.ts
            ├── getCachedFilterMeta
            ├── getCachedProducts (page=1)
            └── getCachedCatalogPages
    └── <CatalogPageView initial={...} />
            └── <CatalogPageClient />   # client component
```

`getCatalogShell` парсит `searchParams`, применяет ярлык (`catalogLabel`), собирает `filterState` и первую страницу товаров.

### Client state

| Модуль | Роль |
|--------|------|
| `use-catalog-filters.ts` | Фильтры, сортировка, URL sync, active filter chips |
| `use-catalog-products.ts` | Обёртка над session |
| `session/use-catalog-session.ts` | Пагинация, load more, restore после возврата с карточки |
| `session/catalog-return-storage.ts` | `sessionStorage`: scroll, loaded pages, return href |
| `catalog-filter-utils.ts` | Парсинг/сборка query, chips, label matching |

### Возврат с карточки товара

При клике на товар сохраняется payload в `sessionStorage` (`catalogReturn`). При возврате session восстанавливает страницы и scroll. Legacy-ключ `catalogScroll` поддерживается для совместимости.

### URL каталога

- Путь: `/catalog/[slug]` где slug — витрина (`all`, `vhodnye-dveri`, …)
- Query: `search`, `categories`, `subcategories`, `minPrice`, `maxPrice`, `onSale`, `attr_*`, `catalogLabel`, `sort`
- Утилиты: `lib/catalog-url.ts`, `lib/catalog-page-slugs.ts`

### UI-компоненты каталога

```
catalog-page-client.tsx
├── CatalogFilterSidebar
├── CatalogActiveFilterChips      # плашки активных фильтров
└── CatalogProductGrid
        └── CatalogProductCard → CatalogProductLink
```

---

## Публичное API

| Endpoint | Файл | Описание |
|----------|------|----------|
| `GET /api/products` | `api/products/route.js` | Список товаров (кэш) |
| `GET /api/products/meta` | `api/products/meta/route.js` | Мета фильтров витрины |
| `GET /api/products/catalog-pages` | `api/products/catalog-pages/route.js` | Список витрин |
| `GET /api/products/[slug]` | `api/products/[slug]/route.js` | Один товар |
| `GET /api/promotions` | `api/promotions/route.js` | Активные акции |
| `GET /api/home/product-hits` | `api/home/product-hits/route.js` | Хиты для главной |
| `GET /api/portfolio` | `api/portfolio/route.js` | Портфолио |
| `GET /api/services` | `api/services/route.js` | Услуги |
| `POST /api/leads/cart` | `api/leads/cart/route.js` | Заявка из корзины |
| `POST /api/leads/measure` | `api/leads/measure/route.js` | Заявка на замер |
| `GET /api/health` | `api/health/route.js` | Health check |

Клиентский fetch: `lib/client/apiClient.ts` (`fetchJson`).

Нормализация ответов API → типы UI: `lib/client/normalizers.ts`.

---

## Админское API

### Catch-all роутер

`src/app/api/admin/[...path]/route.js` — основной REST для админки:

- `bootstrap`, `attributes`
- `catalog-pages`, `catalog-page-labels`
- `categories`, `subcategories`
- `products` (CRUD, bulk)
- `promotions`, `sale-settings`
- и др.

После мутаций вызывается `invalidateStorefrontCache(scope)`.

### Отдельные routes (не в catch-all)

- `api/admin/session` — проверка/создание сессии
- `api/admin/oauth/yandex/*` — OAuth
- `api/admin/products/export` — экспорт CSV
- `api/admin/portfolio/*`, `api/admin/services/*` — с upload/reorder
- `api/admin/leads/[id]/contract` — генерация договора (docxtemplater)

Админские страницы — client components с fetch к этим endpoints (`use-admin-session.ts` для статуса сессии).

---

## Заявки и корзина

### Корзина (клиент)

- Состояние: `lib/client/cart-store.ts` + `use-cart.ts`
- Хранение: `localStorage`
- UI: `app/cart/page.tsx`, `features/store/cart-lead-form.tsx`

### Заявки (сервер)

- Типы: `admin_order`, `cart`, `measure` — `lib/server/domain/leadValidation.js`
- Сервис: `leadService.js`, репозиторий `leadRepository.js`
- Email замера: `measureLeadService.js` (nodemailer + SMTP)
- Rate limit: `lib/server/leads/rateLimit.js`

---

## Загрузка файлов

- Корень: `public/uploads/` (`lib/server/uploadsPath.js`)
- На VPS нужны права записи для процесса Node (часто `www-data`)
- `next.config.ts`: `proxyClientMaxBodySize: "25mb"`, nginx — `client_max_body_size` (см. `scripts/doorpoint29.nginx.conf`)
- `images.remotePatterns` — unsplash, picsum (для dev/seed)

---

## Тестирование

### Unit (`test/`)

Запуск: `npm test` (Node test runner).

Покрывают: catalog filters, session reducer, normalizers, cart, leads, CSV import/export, OAuth helpers и др.

### E2E (`e2e/`)

```bash
npm run db:init
node scripts/seed-e2e-catalog.js
npx playwright install chromium
npm run test:e2e
```

Конфиг: `playwright.config.ts`. В CI: `PLAYWRIGHT_WEB_SERVER=npm run start` (без двойного build).

Сценарии каталога: `e2e/catalog-navigation.spec.ts` (load more, return, filters, vitrine switch).

Подробнее: `e2e/README.md`.

---

## CI и деплой

### GitHub Actions

`.github/workflows/ci.yml`:

1. PostgreSQL 16 service
2. `npm ci`
3. Playwright chromium
4. `db:init` + `seed-e2e-catalog`
5. `npm test`
6. `npm run build`
7. `npm run test:e2e`

### Деплой на VPS

`scripts/deploy.ps1`:

1. Git commit + push (опционально)
2. SSH на сервер → `git pull`, `npm ci`, `build`, `pm2 restart`

Конфиг: скопировать `scripts/deploy.config.ps1.example` → `deploy.config.ps1` (gitignored).

Типичный remote path: `/var/www/doorpoint/doorpoint_nextjs`, PM2: `doorpoint_nextjs`.

---

## Чеклисты: куда лезть

### Добавить фильтр в каталог

1. `attribute_definitions` — флаг `is_filterable` (админка или БД)
2. `catalogService.getFilterMeta` / `productRepository` — если нужна особая логика SQL
3. `catalog-filter-utils.ts` — парсинг query, chips
4. `catalog-filter-sidebar.tsx` / `catalog-attribute-filter.tsx` — UI
5. `use-catalog-filters.ts` — состояние и URL
6. Тест: `test/catalog-filter-utils.test.js`

### Добавить новую витрину

1. Запись в `catalog_pages` (админка `/admin/catalog-pages`)
2. Slug → `lib/catalog-page-slugs.ts` (если нужен alias/константа)
3. Навигация: `features/navigation/app-catalog-nav.tsx`
4. SEO: `lib/server/catalog-metadata.ts`, `lib/seo-copy.ts`

### Добавить поле товара

1. Колонка в `products` / `attrs` JSONB — зависит от типа
2. `productRepository.js` — SELECT/INSERT/UPDATE
3. `adminService.js` — валидация
4. `normalizers.ts` — клиентский тип
5. UI админки: `features/admin/products/`
6. Карточка: `features/product/`
7. `invalidateStorefrontCache('products')` в admin route

### Добавить публичную страницу

1. `src/app/<route>/page.tsx`
2. При необходимости — `layout.tsx`, `loading.tsx`, `error.tsx`
3. UI в `src/features/` (не в `app/`)
4. SEO: metadata в page или `lib/site-seo.ts`

### Добавить admin CRUD

1. Repository method
2. Service method
3. Route в `api/admin/[...path]/route.js` или отдельный `route.js`
4. Страница в `app/admin/`
5. UI в `features/admin/`
6. Инвалидация кэша при изменении витрины

### Изменить кэш / свежесть данных

1. `storefront-cache.ts` — TTL и теги
2. `invalidate-storefront.ts` — какие теги сбрасывать
3. Admin routes — вызов `invalidateStorefrontCache` после мутаций

---

## Конвенции

### Именование и расположение

- **Страницы** — тонкие, логика в `features/` и `lib/`
- **Server Components** по умолчанию; `"use client"` только где нужен state/effects
- **Импорты** — alias `@/` → `src/`

### Смешение TS и JS

Новый UI-код — TypeScript. Серверные services/repositories historically JS. При касании server route можно использовать `createRequire(import.meta.url)` для require CJS-модулей.

### Стили

Tailwind 4, `globals.css`. Шрифт Geometria (`fonts/`), CSS-переменная `--storefront-sticky-offset` для sticky sidebar.

### SEO

- `lib/site-seo.ts`, `lib/seo-copy.ts`
- `app/sitemap.ts`, `app/robots.ts`
- JSON-LD: `features/product/product-json-ld.tsx`, `features/store/local-business-json-ld.tsx`
- Админский снимок SEO: `lib/server/seo-admin-snapshot.ts`

### Git

- Коммиты — только по запросу
- `public/uploads/`, `.env`, `deploy.config.ps1` — не коммитить
- Дампы БД — `backups/` (проверьте .gitignore перед push)

---

## Диаграмма: запрос каталога

```mermaid
sequenceDiagram
  participant Browser
  participant Page as catalog/[slug]/page
  participant Shell as getCatalogShell
  participant Cache as storefront-cache
  participant Service as catalogService
  participant DB as PostgreSQL
  participant Client as CatalogPageClient

  Browser->>Page: GET /catalog/vhodnye-dveri?attr_color=white
  Page->>Shell: searchParams
  Shell->>Cache: getCachedFilterMeta + getCachedProducts
  Cache->>Service: cache miss
  Service->>DB: SQL
  DB-->>Service: rows
  Service-->>Cache: data
  Cache-->>Shell: meta + products
  Shell-->>Page: CatalogShellInitial
  Page-->>Browser: HTML + hydration
  Browser->>Client: hydrate
  Client->>Browser: load more via /api/products
```

---

*Последнее обновление: июнь 2026. При расхождении с кодом ориентируйтесь на исходники и `AGENTS.md`.*

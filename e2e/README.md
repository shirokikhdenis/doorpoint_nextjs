# E2E tests (Playwright)

## Prerequisites

- PostgreSQL with `DATABASE_URL` in `.env`
- Node.js 20+

## Setup

```bash
npm run db:init
node scripts/seed-e2e-catalog.js
npm install
npx playwright install chromium
```

## Run

```bash
# Production build + start (default webServer)
npm run test:e2e

# UI mode (debug)
npm run test:e2e:ui

# Against running dev server
PLAYWRIGHT_WEB_SERVER="npm run dev" npm run test:e2e
```

## Catalog scenarios

See `e2e/catalog-navigation.spec.ts` — load more + return, filter after return, vitrine switch, nav memory, filter race, deep link vs stale storage.

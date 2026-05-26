# Route surface map: public vs admin

## Public client surface

Public UI routes:
- `/`
- `/catalog`
- `/product/[id]`
- `/cart`
- `/about`
- `/contact`
- `/door-quiz`

Public API routes:
- `/api/health`
- `/api/products/*`

## Admin surface

Admin UI routes:
- `/admin`
- `/admin/attributes`
- `/admin/catalog-pages`
- `/admin/catalog-labels`
- `/admin/products`
- `/admin/import`
- `/admin/login`

Admin API routes:
- `/api/admin/[...path]`
- `/api/admin/session`

## Access policy

- `/admin/*` and `/api/admin/*` are protected by Nginx BasicAuth.
- `/admin/*` and `/api/admin/*` require valid app admin session cookie.
- `/admin/login` stays reachable after BasicAuth to create app session.

# VPS deployment: public storefront + protected admin

This project is split into:
- public storefront routes (client-facing)
- admin routes under `/admin/*` and `/api/admin/*`

Admin access is protected by two layers:
1. Nginx BasicAuth (outer perimeter, good for dynamic IP)
2. App session auth (inner perimeter, required for admin actions)

## 1) Prepare environment variables

Create server-side env file, e.g. `/etc/test_nextjs.env`:

```dotenv
DATABASE_URL=postgresql://...
PORT=3000
ADMIN_LOGIN=your_login
ADMIN_PASSWORD_HASH=sha256:...
SESSION_SECRET=long_random_value
ADMIN_SESSION_TTL_SECONDS=43200
```

Generate hash locally:

```bash
npm run admin:hash-password -- "your-plain-password"
```

Do not commit secrets or server env files to git.

## 2) Build and run the app service

1. Install dependencies and build:

```bash
npm ci
npm run build
```

2. Ensure upload directories are writable by the app user (`www-data`):

```bash
sudo mkdir -p /var/www/test_nextjs/public/uploads/portfolio
sudo chown -R www-data:www-data /var/www/test_nextjs/public/uploads
```

3. Copy service template:
- source: `deploy/systemd/test_nextjs.service.example`
- destination: `/etc/systemd/system/test_nextjs.service`

4. Start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable test_nextjs
sudo systemctl restart test_nextjs
sudo systemctl status test_nextjs
```

## 3) Configure BasicAuth for admin only

Install htpasswd helper and create credentials:

```bash
sudo apt-get update
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_admin your_basic_auth_user
```

## 4) Configure Nginx

1. Copy template:
- source: `deploy/nginx/test_nextjs.conf.example`
- destination: `/etc/nginx/sites-available/test_nextjs.conf`

2. Replace:
- `example.com` with your domain
- certificate paths if needed

3. Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/test_nextjs.conf /etc/nginx/sites-enabled/test_nextjs.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5) TLS certificate

Use certbot (or existing ACME flow), then verify HTTP->HTTPS redirect.

## 6) Smoke/security checks

1. Open `/admin` in browser:
- without BasicAuth credentials -> blocked by Nginx
- with BasicAuth but no app login -> redirected to `/admin/login`
- with both checks passed -> admin pages open

2. Call `/api/admin/bootstrap`:
- without BasicAuth -> blocked by Nginx
- with BasicAuth but no app session -> `401`
- with both checks passed -> `200`

3. Verify public routes (`/`, `/catalog`) remain accessible without BasicAuth.

## 7) Rotation policy

- Rotate BasicAuth password regularly (`htpasswd` update)
- Rotate `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` regularly
- Restart app service after secret rotation

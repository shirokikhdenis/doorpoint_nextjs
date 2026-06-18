# Деплой на VPS одной командой

Скрипт `scripts/deploy.ps1`:

1. `git add` → `git commit` → `git push`
2. SSH на VPS → `git pull` → `npm ci` → `npm run build` → `pm2 restart`

## Предварительно (один раз)

### SSH-ключ без пароля

```powershell
# ключ уже есть — не перезаписывать, только скопировать на VPS:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@194.67.121.174 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

ssh root@194.67.121.174
```

### Конфиг (опционально)

```powershell
copy scripts\deploy.config.ps1.example scripts\deploy.config.ps1
notepad scripts\deploy.config.ps1
```

Проверьте имя процесса pm2 на VPS:

```bash
pm2 list
```

Если имя не `doorpoint_nextjs` — поправьте `Pm2Name` в конфиге.

## Запуск

```powershell
cd G:\dev\cursor\test_nextjs

# с сообщением коммита
.\scripts\deploy.ps1 -Message "обновил портфолио"

# или через npm
npm run deploy -- -Message "обновил портфолио"

# только VPS (без commit/push)
.\scripts\deploy.ps1 -RemoteOnly
```

## Cursor / VS Code

**Terminal → Run Task → Deploy to VPS**

Или назначить горячую клавишу в Keyboard Shortcuts → `Tasks: Run Task`.

## Что не делает скрипт

- не коммитит `.env` (в gitignore)
- не запускает `npm run db:init` на проде
- не копирует `public/uploads/` (только код из git)

## Бэкап перед деплоем

В `scripts/deploy.config.ps1`:

```powershell
RunBackup = $true
```

На VPS должен быть `scripts/backup-db.sh` и `postgresql-client`.

## Простой сайта

На `pm2 restart` обычно **5–30 секунд**. `npm run build` идёт пока старая версия ещё работает.

## Ручной деплой на VPS

```bash
cd /var/www/doorpoint/doorpoint_nextjs
git pull
npm ci
npm run build
pm2 restart doorpoint_nextjs
```

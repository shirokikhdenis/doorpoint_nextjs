# Бэкап и восстановление PostgreSQL на VPS

Скрипты в `scripts/backup-db.sh` и `scripts/restore-db.sh` читают `DATABASE_URL` из `.env` в корне проекта.

Файлы бэкапов сохраняются в `backups/` (папка в `.gitignore`, в git не попадает).

## Требования на VPS

```bash
sudo apt update
sudo apt install -y postgresql-client
```

Проверка:

```bash
pg_dump --version
pg_restore --version
```

---

## Создать бэкап

```bash
cd /var/www/doorpoint/doorpoint_nextjs

# сделать скрипт исполняемым (один раз)
chmod +x scripts/backup-db.sh scripts/restore-db.sh

# бэкап
./scripts/backup-db.sh
```

Результат:

```text
backups/db_2026-06-16_15-30-00.dump
```

### Полезные опции

```bash
# хранить последние 14 файлов
./scripts/backup-db.sh --keep 14

# другая папка (например, вне проекта)
BACKUP_DIR=/var/backups/doorpoint ./scripts/backup-db.sh

# через npm
npm run db:backup
```

### Автобэкап по cron (раз в день в 03:00)

```bash
crontab -e
```

Добавить строку:

```cron
0 3 * * * cd /var/www/doorpoint/doorpoint_nextjs && ./scripts/backup-db.sh --keep 14 >> /var/log/doorpoint-backup.log 2>&1
```

Рекомендуется периодически скачивать `.dump` на локальный ПК или в облако.

---

## Восстановить бэкап на VPS

### 1. Остановить приложение (рекомендуется)

```bash
pm2 stop all
```

### 2. Посмотреть доступные бэкапы

```bash
ls -lh /var/www/doorpoint/doorpoint_nextjs/backups/
```

### 3. Пробный запуск (ничего не меняет)

```bash
cd /var/www/doorpoint/doorpoint_nextjs
./scripts/restore-db.sh backups/db_2026-06-16_15-30-00.dump
```

### 4. Реальное восстановление

```bash
./scripts/restore-db.sh backups/db_2026-06-16_15-30-00.dump --yes
```

Скрипт попросит ввести `RESTORE` для подтверждения.

Или через npm:

```bash
npm run db:restore -- backups/db_2026-06-16_15-30-00.dump --yes
```

### 5. Запустить приложение

```bash
pm2 start all
# или
pm2 restart all
```

### 6. Проверка

```bash
curl -I https://doorpoint29.ru
curl -I https://doorpoint29.ru/catalog
```

В админке: количество товаров, категории, заявки.

---

## Восстановление с локального ПК на VPS

### На Windows (создать бэкап)

```powershell
cd G:\dev\cursor\test_nextjs
$env:PGDUMP = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
& $env:PGDUMP -Fc --no-owner --no-acl $env:DATABASE_URL -f backup.dump
```

Скопировать на VPS:

```bash
scp backup.dump root@194.67.121.174:/var/www/doorpoint/doorpoint_nextjs/backups/
```

На VPS:

```bash
cd /var/www/doorpoint/doorpoint_nextjs
pm2 stop all
./scripts/restore-db.sh backups/backup.dump --yes
pm2 start all
```

---

## Картинки товаров

Бэкап БД **не включает** файлы из `public/uploads/`.

Для полного восстановления сайта нужны оба архива:

```bash
# бэкап uploads
tar -czf uploads_$(date +%F).tar.gz -C public uploads

# восстановление uploads
tar -xzf uploads_2026-06-16.tar.gz -C public
```

---

## Частые ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `pg_dump: command not found` | Нет клиента PostgreSQL | `sudo apt install postgresql-client` |
| `DATABASE_URL is missing` | Нет `.env` или пустая переменная | Проверить `/var/www/doorpoint/doorpoint_nextjs/.env` |
| `role "postgres" does not exist` при restore | Дамп с другого сервера | Скрипт уже использует `--no-owner --no-acl` |
| DROP errors на пустой БД | Старый способ с `-c` | Использовать `restore-db.sh` (`--clean --if-exists`) |
| Сайт пустой после restore | Не тот дамп или не те uploads | Проверить дату файла + восстановить `public/uploads/` |

---

## Чего не делать на проде

- **Не запускать** `npm run db:init` — пересоздаёт схему и затирает данные демо-сидом.
- **Не восстанавливать** без бэкапа текущей БД, если не уверены в дампе.
- **Не хранить** `.dump` только на том же VPS — при падении сервера потеряете и сайт, и бэкап.

---

## Быстрая шпаргалка

```bash
# бэкап
./scripts/backup-db.sh

# восстановить
pm2 stop all
./scripts/restore-db.sh backups/db_YYYY-MM-DD_HH-MM-SS.dump --yes
pm2 start all
```

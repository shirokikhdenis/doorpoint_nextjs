# Google Search Console

Чеклист после деплоя SEO-правок на [doorpoint29.ru](https://doorpoint29.ru).

## 1. Подключение

- [ ] Открыть [Google Search Console](https://search.google.com/search-console)
- [ ] Добавить ресурс `https://doorpoint29.ru`
- [ ] Подтвердить права (DNS, HTML-файл или meta-тег)
- [ ] Отправить sitemap: `https://doorpoint29.ru/sitemap.xml`

## 2. Проверка сниппетов

1. Откройте любую страницу товара (не погонаж) → «Просмотр кода».
2. Найдите `<meta name="description" content="...">` — должен быть продающий текст с ценой и гео.
3. Убедитесь, что `<footer data-nosnippet` присутствует в HTML.
4. Проверьте товар погонажа (`/product/karniz-*`) — в HTML должен быть `noindex`.

Инструменты:

- [Rich Results Test](https://search.google.com/test/rich-results) — Product только на дверях
- Search Console → **Проверка URL** — запросить индексацию главной и витрин после деплоя

## 3. Удаление лишнего из индекса

Уже проиндексированный погонаж:

1. Search Console → **Удаления** → «Временно удалить URL»
2. Добавить префиксы `/product/karniz-`, `/product/dobor-` или конкретные URL
3. После деплоя с `noindex` Google уберёт страницы при следующем обходе

## 4. Мониторинг (1–2 недели после деплоя)

- **Эффективность** → сравнить CTR до/после смены description
- **Страницы** → нет ли роста «Исключено» с ошибками
- **Файлы Sitemap** → статус «Успешно», без резкого падения числа URL

## 5. Прод-окружение

На сервере обязательно:

```env
NEXT_PUBLIC_SITE_URL=https://doorpoint29.ru
```

После смены — `npm run build` и перезапуск приложения. Иначе canonical, sitemap и OG будут указывать на неверный домен.

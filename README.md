# LOOKSÒR

Статический сайт женской одежды для **GitHub Pages** + **Supabase**.  
Дизайн витрины сохранён. PHP, SQLite, MySQL и `.htaccess` больше не используются.

Онлайн-оплаты нет. Заказ уходит менеджеру в Telegram: [@APEX348](https://t.me/APEX348).

## 1. Что сделать вручную

### Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. SQL Editor → вставьте весь файл `supabase/schema.sql` → Run.
3. Authentication → Users → Add user (email + пароль). Это вход в админку.
4. Table Editor → `profiles` → у этого пользователя поставьте `is_admin = true`.
5. Project Settings → API:
   - URL → вставьте в `js/supabase.js` как `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
6. Не публикуйте `service_role` key.

### GitHub Pages

1. Залейте репозиторий на GitHub.
2. Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. Сайт: `https://USERNAME.github.io/REPO/`.

## Локальная проверка

Не открывайте HTML через `file://` — ES-модули и Supabase не заработают.

```bash
python -m http.server 8765
```

Откройте http://127.0.0.1:8765/index.html

Админка: http://127.0.0.1:8765/admin/login.html


## 2. Админка

`/admin/login.html` — вход через **Supabase Auth** (email и пароль пользователя из пункта 3).  
Пароль не хранится в JavaScript.

## 3. Telegram без Bot Token

Заказ открывает deep link `https://t.me/APEX348?text=...`.  
Токен бота в браузер не кладётся.

Автоотправка без клиента Telegram возможна позже через **Supabase Edge Function** (секрет бота только на сервере функции). Сейчас фронтенд работает без неё.

## 4. Storage

Бакеты: `products`, `categories`, `site` (создаются схемой).  
Новые фото товаров — в Storage. Сиды указывают на `assets/images/products/…` в репозитории как запасные кадры.

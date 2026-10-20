# cse-contests-web

Новогодние конкурсы КСЭ: подача работ, голосование, модерация и результаты.
Статический SPA на Vite + React. Данные хранятся в Supabase, файлы лежат в VK Cloud Object Storage, вход через VK ID. Хостинг — GitHub Pages, адрес https://contests.cse-hr.ru.

## Локальный запуск

```bash
cp .env.example .env   # заполнить
npm install
npm run dev            # https://localhost (порт 443, самоподписанный сертификат)
```

Порт 443 выбран потому, что в кабинете VK ID не сохраняется Redirect URL с портом. На macOS 443 доступен без root только при `host: true`, это уже прописано в `vite.config.ts`.

## Переменные окружения

| Переменная | Обязательна | Что |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | да | Supabase |
| `VITE_VK_APP_ID` | да | ID приложения в кабинете VK ID |
| `VITE_VK_REDIRECT_URL` | да | посимвольно как «Доверенный Redirect URL» в кабинете (`https://localhost/auth/vk` локально, `https://contests.cse-hr.ru/auth/vk` в проде) |
| `VITE_ADMIN_ONLY` | нет | `true` — сайт открыт только пользователям из таблицы `admins` (кроме `/results`) |
| `VITE_UPLOAD_API_URL` | нет | бэкенд загрузки файлов. Пусто — формы сообщат, что загрузка временно недоступна |
| `VITE_SUBMISSION_DEADLINE` | нет | окончание приёма работ, например `2026-12-15T15:00:00+03:00`. Пусто — приём открыт |

## Деплой на GitHub Pages

Сборку и публикацию при пуше в `main` выполняет `.github/workflows/deploy.yml`.

1. Settings → Pages → Source: **GitHub Actions**, Custom domain: `contests.cse-hr.ru`, Enforce HTTPS.
2. Settings → Secrets and variables → Actions:
   - **Secrets:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VK_APP_ID`;
   - **Variables** (по мере готовности): `VITE_UPLOAD_API_URL`, `VITE_SUBMISSION_DEADLINE`.
3. DNS: `CNAME contests → slim21211.github.io`. Файл `public/CNAME` уже в проекте.
4. Кабинет VK ID: базовый домен `contests.cse-hr.ru`, Redirect URL `https://contests.cse-hr.ru/auth/vk`.

`VITE_VK_REDIRECT_URL` и `VITE_ADMIN_ONLY=true` прописаны прямо в workflow. Чтобы открыть сайт всем, убери `VITE_ADMIN_ONLY` из workflow.

## Маршруты

| Путь | Доступ |
|---|---|
| `/` | главная: подача работ и голосование |
| `/child-form`, `/team-form`, `/individual-form` | подача работ |
| `/vote/child`, `/vote/team`, `/vote/individual` | голосование (нужен вход) |
| `/admin` | модерация (вход + запись в `admins`) |
| `/results` | открыто всем, всегда |
| `/auth/vk` | адрес возврата VK ID |

Пока `VITE_ADMIN_ONLY=true`, все маршруты, кроме `/results` и `/auth/vk`, доступны только админам.

## Структура

```
src/auth/         вход: vk.ts (SDK VK ID), VkLoginButton, session (localStorage),
                  useCurrentUser + logout, useIsAdmin, AdminGate, AuthRequired
src/config.ts     адрес загрузки и срок приёма работ (из env)
src/pages/        forms/, voting/, admin/, results/
src/utils/uploadUtils.ts  загрузка больших файлов чанками по 8 МБ с прогрессом и ретраями
supabase/         SQL-миграция Telegram → VK (уже применена)
```

## База данных

Пользователь идентифицируется по VK ID (число) в колонках `vk_user_id` во всех таблицах: `*_contest`, `*_votes`, `admins`, `upload_diagnostics`. В прошлогодних строках там остались Telegram ID.

## Известные ограничения

- **Загрузка файлов** работает только после того, как восстановлен бэкенд (`/upload-start`, `/upload-part`, `/upload-complete`) и задан `VITE_UPLOAD_API_URL`.
- **Голоса** пишутся из браузера по anon-ключу, поэтому при открытом RLS голос можно подделать. Перед открытием голосования его нужно перенести в серверную функцию, которая проверяет токен VK.

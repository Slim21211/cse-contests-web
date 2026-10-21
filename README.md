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

| Переменная                                    | Обязательна | Что                                                                                                                                       |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | да          | Supabase                                                                                                                                  |
| `VITE_VK_APP_ID`                              | да          | ID приложения в кабинете VK ID                                                                                                            |
| `VITE_VK_REDIRECT_URL`                        | да          | посимвольно как «Доверенный Redirect URL» в кабинете (`https://localhost/auth/vk` локально, `https://contests.cse-hr.ru/auth/vk` в проде) |
| `VITE_ADMIN_ONLY`                             | нет         | `true` — сайт открыт только пользователям из таблицы `admins` (кроме `/results`)                                                          |
| `VITE_UPLOAD_API_URL`                         | нет         | адрес функций загрузки. По умолчанию `<VITE_SUPABASE_URL>/functions/v1`, то есть Edge Function `uploads` из репозитория cse-contests-api  |
| `VITE_SUBMISSION_DEADLINE`                    | нет         | окончание приёма работ, например `2026-12-15T15:00:00+03:00`. Пусто — приём открыт                                                        |

## Деплой на GitHub Pages

Сборку и публикацию при пуше в `main` выполняет `.github/workflows/deploy.yml`.

1. Settings → Pages → Source: **GitHub Actions**, Custom domain: `contests.cse-hr.ru`, Enforce HTTPS.
2. Settings → Secrets and variables → Actions:
   - **Secrets:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VK_APP_ID`;
   - **Variables** (необязательно): `VITE_SUBMISSION_DEADLINE`, `VITE_UPLOAD_API_URL`.
3. DNS: `CNAME contests → slim21211.github.io`. Файл `public/CNAME` уже в проекте.
4. Кабинет VK ID: базовый домен `contests.cse-hr.ru`, Redirect URL `https://contests.cse-hr.ru/auth/vk`.

`VITE_VK_REDIRECT_URL` и `VITE_ADMIN_ONLY=true` прописаны прямо в workflow. Чтобы открыть сайт всем, убери `VITE_ADMIN_ONLY` из workflow.

## Маршруты

| Путь                                            | Доступ                               |
| ----------------------------------------------- | ------------------------------------ |
| `/`                                             | главная: подача работ и голосование  |
| `/child-form`, `/team-form`, `/individual-form` | подача работ (нужен вход)            |
| `/vote/child`, `/vote/team`, `/vote/individual` | голосование (нужен вход)             |
| `/admin`                                        | модерация (вход + запись в `admins`) |
| `/results`                                      | открыто всем, всегда                 |
| `/auth/vk`                                      | адрес возврата VK ID                 |

Пока `VITE_ADMIN_ONLY=true`, все маршруты, кроме `/results` и `/auth/vk`, доступны только админам.

## Структура

```
src/auth/         вход: vk.ts (SDK VK ID), VkLoginButton, session (localStorage),
                  useCurrentUser + logout, useIsAdmin, AdminGate, AuthRequired
src/config.ts     адрес загрузки и срок приёма работ (из env)
src/pages/        forms/, voting/, admin/, results/
src/utils/uploadUtils.ts  загрузка: части по 8 МБ уходят напрямую в VK Cloud (3 параллельно),
                          с прогрессом, ретраями и отменой; Edge Function `uploads` только подписывает ссылки
supabase/         SQL-миграция Telegram → VK (уже применена)
```

## База данных

Пользователь идентифицируется по VK ID (число) в колонках `vk_user_id` во всех таблицах: `*_contest`, `*_votes`, `admins`, `upload_diagnostics`. В прошлогодних строках там остались Telegram ID.

## Обложки видео

При отправке видео сайт делает кадр из начала ролика и сохраняет его в `poster_url`. В голосовании и админке сначала показывается обложка, а видео загружается только по клику. Для этого один раз выполните `supabase/migration-poster-url.sql`. Пока миграция не применена, работы сохраняются без обложек, приём не ломается.

## Логотип

Страница входа берёт логотип из `public/logo.png`. Пока файла нет, вместо него показывается текстовый знак «КСЭ».

## Известные ограничения

- **Загрузка файлов** работает, когда задеплоена Edge Function `uploads` и у бакета настроен CORS. Оба шага описаны в README cse-contests-api.
- **Голоса** пишутся из браузера по anon-ключу, поэтому при открытом RLS голос можно подделать. Перед открытием голосования его нужно перенести в серверную функцию, которая проверяет токен VK.

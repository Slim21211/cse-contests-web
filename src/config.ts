// Настройки сборки, задаются через переменные окружения.
// Сроки конкурса и публикация итогов — в админке (таблица site_settings, см. src/settings/siteSettings.ts).

/**
 * Адрес функций загрузки (Supabase Edge Function «uploads», репозиторий cse-contests-api).
 * По умолчанию — функции того же проекта Supabase: <VITE_SUPABASE_URL>/functions/v1.
 */
export const UPLOAD_API_URL = (
  import.meta.env.VITE_UPLOAD_API_URL ||
  (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : '')
).replace(/\/$/, '');

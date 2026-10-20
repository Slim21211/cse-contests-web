// Настройки конкурса, задаются через переменные окружения при сборке.

/**
 * Адрес функций загрузки (Supabase Edge Function «uploads», репозиторий cse-contests-api).
 * По умолчанию — функции того же проекта Supabase: <VITE_SUPABASE_URL>/functions/v1.
 */
export const UPLOAD_API_URL = (
  import.meta.env.VITE_UPLOAD_API_URL ||
  (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : '')
).replace(/\/$/, '');

/** Окончание приёма работ, ISO-строка с часовым поясом: 2026-12-15T15:00:00+03:00. Пусто — приём открыт. */
const deadlineRaw = import.meta.env.VITE_SUBMISSION_DEADLINE;
export const SUBMISSION_DEADLINE = deadlineRaw ? new Date(deadlineRaw) : null;

export const isSubmissionClosed = () =>
  SUBMISSION_DEADLINE !== null && new Date() >= SUBMISSION_DEADLINE;

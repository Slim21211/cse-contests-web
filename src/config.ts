// Настройки конкурса, задаются через переменные окружения при сборке.

/** Адрес бэкенда загрузки файлов (multipart в VK Cloud). Пусто — загрузка недоступна. */
export const UPLOAD_API_URL = (import.meta.env.VITE_UPLOAD_API_URL ?? '').replace(/\/$/, '');

/** Окончание приёма работ, ISO-строка с часовым поясом: 2026-12-15T15:00:00+03:00. Пусто — приём открыт. */
const deadlineRaw = import.meta.env.VITE_SUBMISSION_DEADLINE;
export const SUBMISSION_DEADLINE = deadlineRaw ? new Date(deadlineRaw) : null;

export const isSubmissionClosed = () =>
  SUBMISSION_DEADLINE !== null && new Date() >= SUBMISSION_DEADLINE;

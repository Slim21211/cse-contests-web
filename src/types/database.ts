// Строки работ. Голосующие читают их из view <конкурс>_works: без department и vk_user_id,
// зато с is_mine. Админ читает таблицы <конкурс>_contest целиком.

interface SubmissionBase {
  id: string;
  /** Сезон — год, который встречали (конкурс декабря 2026 → 2027). */
  season: number;
  city: string;
  file_url: string;
  /** Обложка видео (кадр из начала ролика). Нет у прошлогодних работ и не-видео. */
  poster_url?: string | null;
  rotation?: number;
  created_at: string;
  media_type?: 'audio' | null;

  /** Только в view для голосующих: работа текущего пользователя. */
  is_mine?: boolean;

  /** Только у админа (таблица целиком). */
  department?: string;
  vk_user_id?: number;
  is_active?: boolean;
  moderated_at?: string;
  moderated_by?: number;
}

export interface ChildContestSubmission extends SubmissionBase {
  full_name: string;
  child_name: string;
  child_age: number;
  title: string;
}

export interface TeamContestSubmission extends SubmissionBase {
  team_name: string;
  participants: string;
}

export interface IndividualContestSubmission extends SubmissionBase {
  full_name: string;
  title: string;
}

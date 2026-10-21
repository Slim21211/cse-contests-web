export interface ChildContestSubmission {
  id: string;
  full_name: string;
  department: string;
  city: string;
  child_name: string;
  child_age: number;
  title: string;
  vk_user_id?: number;
  file_url: string;
  /** Обложка видео (кадр из начала ролика). Нет у прошлогодних работ и не-видео. */
  poster_url?: string | null;
  rotation?: number; // 🆕
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
  media_type?: 'audio' | null; // Поле для принудительного рендеринга аудио
}

export interface TeamContestSubmission {
  id: string;
  team_name: string;
  department: string;
  city: string;
  participants: string;
  vk_user_id?: number;
  file_url: string;
  /** Обложка видео (кадр из начала ролика). Нет у прошлогодних работ и не-видео. */
  poster_url?: string | null;
  rotation?: number; // 🆕
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
  media_type?: 'audio' | null; // Поле для принудительного рендеринга аудио
}

export interface IndividualContestSubmission {
  id: string;
  full_name: string;
  department: string;
  city: string;
  title: string;
  vk_user_id?: number;
  file_url: string;
  /** Обложка видео (кадр из начала ролика). Нет у прошлогодних работ и не-видео. */
  poster_url?: string | null;
  rotation?: number; // 🆕
  is_active: boolean;
  moderated_at?: string;
  moderated_by?: number;
  created_at: string;
  media_type?: 'audio' | null; // Поле для принудительного рендеринга аудио
}

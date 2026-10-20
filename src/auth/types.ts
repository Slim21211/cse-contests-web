export type AuthProvider = 'vk';

export interface AppUser {
  /** VK ID пользователя. Пишется в колонки vk_user_id. */
  id: number;
  first_name: string;
  last_name?: string;
  /** Есть, только если запрошен scope phone. */
  phone?: string;
  provider: AuthProvider;
  /** Токен VK: им бэкенд проверяет, кто загружает файл. Живёт ~1 час. */
  accessToken?: string;
  /** Для продления accessToken без повторного входа. */
  refreshToken?: string;
  deviceId?: string;
  /** Когда истекает accessToken (мс, Date.now()). */
  expiresAt?: number;
}

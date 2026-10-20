export type AuthProvider = 'vk';

export interface AppUser {
  /** VK ID пользователя. Пишется в колонки vk_user_id. */
  id: number;
  first_name: string;
  last_name?: string;
  /** Есть, только если запрошен scope phone. */
  phone?: string;
  provider: AuthProvider;
  /** Токен VK — нужен для выхода и будущей серверной проверки голоса. */
  accessToken?: string;
}

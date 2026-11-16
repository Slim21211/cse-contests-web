import { UPLOAD_API_URL } from '../config';
import { getSessionUser, setSessionUser, subscribeSession } from './session';
import { getFreshAccessToken, VkSessionExpiredError } from './vk';

// JWT для базы Supabase. Его выдаёт Edge Function (POST /uploads/session) в обмен на VK-токен.
// По claim vk_user_id RLS-политики понимают, кто делает запрос. Без входа — null,
// и supabase-клиент ходит с anon-ключом (такому запросу база ничего не показывает).

const RENEW_BEFORE_MS = 2 * 60 * 1000;

let cached: { userId: number; token: string; expiresAt: number } | null = null;
let pending: Promise<string | null> | null = null;

// Выход или смена пользователя — старый токен больше не годится.
subscribeSession(() => {
  if (cached && getSessionUser()?.id !== cached.userId) cached = null;
});

const fetchDbToken = async (userId: number): Promise<string | null> => {
  let vkToken: string;
  try {
    vkToken = await getFreshAccessToken();
  } catch (err) {
    if (err instanceof VkSessionExpiredError) setSessionUser(null);
    throw err;
  }

  const res = await fetch(`${UPLOAD_API_URL}/uploads/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vkToken}` },
    body: '{}',
  });
  if (res.status === 401) {
    setSessionUser(null);
    return null;
  }
  if (!res.ok) throw new Error(`session: HTTP ${res.status}`);

  const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: number };
  // Пока шёл запрос, человек мог выйти.
  if (getSessionUser()?.id !== userId) return null;
  cached = { userId, token, expiresAt };
  return token;
};

/** Действующий JWT текущего пользователя или null, если он не вошёл. */
export const getDbToken = async (): Promise<string | null> => {
  const user = getSessionUser();
  if (!user) return null;
  if (cached && cached.userId === user.id && cached.expiresAt - Date.now() > RENEW_BEFORE_MS) {
    return cached.token;
  }
  // Параллельные запросы к базе ждут одно и то же получение токена.
  pending ??= fetchDbToken(user.id).finally(() => {
    pending = null;
  });
  return pending;
};

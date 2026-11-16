import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppUser } from './types';

// Ответ «админ или нет» общий для всех компонентов: проверяем один раз на пользователя.
// Ошибки (нет сети) не кэшируем — при следующем монтировании спросим снова.
const known = new Map<number, boolean>();
const inflight = new Map<number, Promise<boolean>>();

const checkAdmin = (userId: number) => {
  let p = inflight.get(userId);
  if (!p) {
    p = Promise.resolve(
      supabase.from('admins').select('id').eq('vk_user_id', userId).maybeSingle(),
    )
      .then(({ data, error }) => {
        if (error) {
          console.error('Не удалось проверить права администратора:', error.message);
          return false;
        }
        known.set(userId, !!data);
        return !!data;
      })
      .finally(() => inflight.delete(userId));
    inflight.set(userId, p);
  }
  return p;
};

/** null — ещё проверяем, true/false — результат проверки по таблице admins. */
export const useIsAdmin = (user: AppUser | null): boolean | null => {
  const userId = user?.id;
  // Ответ привязан к userId: при смене пользователя старый ответ не используется.
  const [checked, setChecked] = useState<{ userId: number; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!userId || known.has(userId)) return;
    let cancelled = false;
    void checkAdmin(userId).then((isAdmin) => {
      if (!cancelled) setChecked({ userId, isAdmin });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return false;
  if (known.has(userId)) return known.get(userId)!;
  return checked?.userId === userId ? checked.isAdmin : null;
};

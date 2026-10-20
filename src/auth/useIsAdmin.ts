import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppUser } from './types';

/** null — ещё проверяем, true/false — результат проверки по таблице admins. */
export const useIsAdmin = (user: AppUser | null) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    setIsAdmin(null);
    supabase
      .from('admins')
      .select('id')
      .eq('vk_user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
};

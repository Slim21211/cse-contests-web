import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppUser } from './types';

/** null — ещё проверяем, true/false — результат проверки по таблице admins. */
export const useIsAdmin = (user: AppUser | null) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    setIsAdmin(null);
    supabase
      .from('admins')
      .select('id')
      .eq('vk_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
};

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type ContestType = 'child' | 'team' | 'individual';
export const CONTESTS: ContestType[] = ['child', 'team', 'individual'];

export interface ContestStats {
  /** Активных работ в конкурсе. */
  total: number;
  /** Из них подал этот пользователь. */
  mine: number;
  /** Сколько работ пользователь оценил (оценка выше стартовой 1). */
  rated: number;
  /** Флаг голосования из contest_settings (по умолчанию включено, как на страницах голосования). */
  votingEnabled: boolean;
}

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

/** Счётчики для карточек главной: только количества, без загрузки самих работ. */
export const useHomeStats = (userId: number | undefined) => {
  const [stats, setStats] = useState<Record<ContestType, ContestStats> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data: settings } = await supabase
        .from('contest_settings')
        .select('contest_type, voting_enabled');
      const enabled = new Map((settings ?? []).map((s) => [s.contest_type, s.voting_enabled]));

      const entries = await Promise.all(
        CONTESTS.map(async (c) => {
          const head = { count: 'exact' as const, head: true };
          const [total, mine, rated] = await Promise.all([
            count(supabase.from(`${c}_contest`).select('id', head).eq('is_active', true)),
            count(
              supabase
                .from(`${c}_contest`)
                .select('id', head)
                .eq('is_active', true)
                .eq('vk_user_id', userId),
            ),
            count(
              supabase
                .from(`${c}_votes`)
                .select('submission_id', head)
                .eq('vk_user_id', userId)
                .gt('rating', 1),
            ),
          ]);
          return [
            c,
            {
              total,
              mine,
              rated: Math.min(rated, total),
              votingEnabled: enabled.get(c) ?? true,
            },
          ] as const;
        }),
      );

      if (!cancelled) setStats(Object.fromEntries(entries) as Record<ContestType, ContestStats>);
    })().catch((err) => console.error('Счётчики главной:', err));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return stats;
};

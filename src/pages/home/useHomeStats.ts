import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type ContestType = 'child' | 'team' | 'individual';
export const CONTESTS: ContestType[] = ['child', 'team', 'individual'];

export interface ContestStats {
  /** Активных работ в конкурсе. */
  total: number;
  /** Из них подал этот пользователь. */
  mine: number;
  /** Сколько лайков поставил пользователь (строки в <contest>_votes). */
  likes: number;
  /** Флаг голосования из contest_settings (по умолчанию включено, как на страницах голосования). */
  votingEnabled: boolean;
}

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

type Stats = Record<ContestType, ContestStats>;

// Последние счётчики храним в браузере — при возврате на главную карточки сразу с цифрами,
// а свежие подтягиваются в фоне.
const STORAGE_KEY = 'cse-home-stats';

const readCache = (): { userId: number; stats: Stats } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (value: { userId: number; stats: Stats }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* приватный режим и т. п. — просто не кэшируем */
  }
};

/** Счётчики для карточек главной: только количества, без загрузки самих работ. */
export const useHomeStats = (userId: number | undefined) => {
  const [stats, setStats] = useState<Stats | null>(() => {
    const cached = readCache();
    return cached && cached.userId === userId ? cached.stats : null;
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      // Все запросы параллельно: флаги голосования и счётчики по трём конкурсам.
      const settingsRequest = supabase
        .from('contest_settings')
        .select('contest_type, voting_enabled');
      const entriesRequest = Promise.all(
        CONTESTS.map(async (c) => {
          const head = { count: 'exact' as const, head: true };
          const [total, mine, likes] = await Promise.all([
            count(supabase.from(`${c}_contest`).select('id', head).eq('is_active', true)),
            count(
              supabase
                .from(`${c}_contest`)
                .select('id', head)
                .eq('is_active', true)
                .eq('vk_user_id', userId),
            ),
            count(
              supabase.from(`${c}_votes`).select('submission_id', head).eq('vk_user_id', userId),
            ),
          ]);
          return [
            c,
            {
              total,
              mine,
              likes,
            },
          ] as const;
        }),
      );

      const [{ data: settings }, entries] = await Promise.all([settingsRequest, entriesRequest]);
      const enabled = new Map((settings ?? []).map((s) => [s.contest_type, s.voting_enabled]));
      const next = Object.fromEntries(
        entries.map(([c, st]) => [c, { ...st, votingEnabled: enabled.get(c) ?? true }]),
      ) as Stats;
      writeCache({ userId, stats: next });
      if (!cancelled) setStats(next);
    })().catch((err) => console.error('Счётчики главной:', err));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return stats;
};

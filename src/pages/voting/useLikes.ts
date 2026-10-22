import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContestType } from '../home/useHomeStats';

// Лайк = строка в таблице <contest>_votes (submission_id + vk_user_id).
// Снять лайк = удалить строку. Колонка rating сохранена ради совместимости (всегда 1).

export const useLikes = (contest: ContestType, userId: number | undefined, canVote: boolean) => {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Работы, по которым запрос ещё идёт: повторные нажатия в это время игнорируем.
  const pending = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from(`${contest}_votes`)
      .select('submission_id')
      .eq('vk_user_id', userId)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) console.error('Лайки не загрузились:', err);
        setLiked(new Set((data ?? []).map((r) => r.submission_id as string)));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [contest, userId]);

  const apply = (id: string, on: boolean) =>
    setLiked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Поставить (on = true) или снять лайк. Интерфейс меняется сразу, при ошибке — откат. */
  const setLike = useCallback(
    async (id: string, on: boolean) => {
      if (!userId || !canVote || pending.current.has(id)) return;
      pending.current.add(id);
      setError(null);
      apply(id, on);

      try {
        if (on) {
          const { error: err } = await supabase
            .from(`${contest}_votes`)
            .upsert(
              {
                submission_id: id,
                vk_user_id: userId,
                rating: 1,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'submission_id,vk_user_id' },
            );
          if (err) throw err;
        } else {
          const { data, error: err } = await supabase
            .from(`${contest}_votes`)
            .delete()
            .eq('submission_id', id)
            .eq('vk_user_id', userId)
            .select('submission_id');
          if (err) throw err;
          // Без строки в ответе база молча не дала удалить (нет политики на delete).
          if (!data?.length) throw new Error('delete returned no rows');
        }
      } catch (err) {
        console.error('Лайк не сохранился:', err);
        apply(id, !on);
        setError('Не удалось сохранить лайк. Проверьте интернет и попробуйте ещё раз.');
      } finally {
        pending.current.delete(id);
      }
    },
    [contest, userId, canVote],
  );

  return { liked, loaded, error, setLike };
};

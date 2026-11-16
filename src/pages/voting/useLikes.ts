import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContestType } from '../home/useHomeStats';

// Лайк = строка в таблице <contest>_votes (submission_id + vk_user_id).
// Снять лайк = удалить строку. Колонка rating сохранена ради совместимости (всегда 1).

const EMPTY = new Set<string>();

export const useLikes = (contest: ContestType, userId: number | undefined, canVote: boolean) => {
  // Лайки привязаны к паре конкурс + пользователь: после смены любого из них
  // старый набор не показываем, пока не загрузится новый.
  const key = `${contest}:${userId ?? ''}`;
  const [state, setState] = useState<{ key: string; liked: Set<string>; loaded: boolean }>({
    key: '',
    liked: EMPTY,
    loaded: false,
  });
  const [error, setError] = useState<string | null>(null);
  // Работы, по которым запрос ещё идёт: повторные нажатия в это время игнорируем.
  const pending = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from(`${contest}_votes`)
      .select('submission_id') // база отдаёт только свои лайки
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) console.error('Лайки не загрузились:', err);
        setState({
          key: `${contest}:${userId}`,
          liked: new Set((data ?? []).map((r) => r.submission_id as string)),
          loaded: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [contest, userId]);

  const current = state.key === key;
  const liked = current ? state.liked : EMPTY;
  const loaded = current && state.loaded;

  const apply = (id: string, on: boolean) =>
    setState((prev) => {
      if (prev.key !== key) return prev;
      const next = new Set(prev.liked);
      if (on) next.add(id);
      else next.delete(id);
      return { ...prev, liked: next };
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
          // vk_user_id база берёт из JWT; повторный лайк (другая вкладка) — не ошибка.
          const { error: err } = await supabase
            .from(`${contest}_votes`)
            .upsert(
              { submission_id: id, vk_user_id: userId },
              { onConflict: 'submission_id,vk_user_id', ignoreDuplicates: true },
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
          // Без строки в ответе база молча не дала удалить (голосование уже закрыто).
          if (!data?.length) throw new Error('delete returned no rows');
        }
      } catch (err) {
        console.error('Лайк не сохранился:', err);
        apply(id, !on);
        // 42501 — RLS не пустила: голосование закрыли, пока страница была открыта.
        const denied = (err as { code?: string })?.code === '42501';
        setError(
          denied
            ? 'Лайк не сохранился: голосование сейчас закрыто. Обновите страницу.'
            : 'Не удалось сохранить лайк. Проверьте интернет и попробуйте ещё раз.',
        );
      } finally {
        pending.current.delete(id);
      }
    },
    [contest, userId, canVote, key],
  );

  return { liked, loaded, error, setLike };
};

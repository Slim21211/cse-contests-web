import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { plural } from '../../utils/plural';
import type { ContestType } from '../../contests';
import a from './admin.module.scss';

interface Stats {
  works: number;
  /** С какого числа лайков голос весит полностью. */
  k: number;
  voters: number;
  likes: number;
  /** Сколько человек отметили likes работ (последняя корзина — k и больше). */
  buckets: { likes: number; voters: number }[];
}

interface Top {
  title: string;
  score: number;
  likes: number;
  place: number;
  placeByLikes: number;
}

const TOP = 10;

/** Статистика голосования конкурса: насколько активно лайкают и как вес меняет места. */
const VotingStats = ({ contest }: { contest: ContestType }) => {
  const [data, setData] = useState<{ contest: ContestType; stats: Stats | null; top: Top[] } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.rpc('voting_stats', { p_contest: contest }),
      supabase.rpc('get_results', { p_contest: contest }),
    ]).then(([statsRes, resultsRes]) => {
      if (cancelled) return;
      if (statsRes.error) console.error('Статистика не загрузилась:', statsRes.error);
      if (resultsRes.error) console.error('Итоги не загрузились:', resultsRes.error);
      const rows = (resultsRes.data ?? []) as {
        place: number;
        likes: number;
        score: number;
        work: { title?: string; team_name?: string };
      }[];
      // Место «как если бы считали просто лайки»: одинаковое число лайков — одинаковое место.
      const top = rows.slice(0, TOP).map((r) => ({
        title: r.work.title ?? r.work.team_name ?? '—',
        score: Number(r.score),
        likes: r.likes,
        place: r.place,
        placeByLikes: 1 + rows.filter((x) => x.likes > r.likes).length,
      }));
      setData({ contest, stats: (statsRes.data as Stats | null) ?? null, top });
    });
    return () => {
      cancelled = true;
    };
  }, [contest]);

  const current = data?.contest === contest ? data : null;
  const stats = current?.stats;
  const max = Math.max(1, ...(stats?.buckets.map((b) => b.voters) ?? []));
  const partial = stats?.buckets.filter((b) => b.likes < stats.k).reduce((s, b) => s + b.voters, 0) ?? 0;

  return (
    <details className={a.stats}>
      <summary className={a.statsSummary}>Статистика голосования</summary>
      {!current ? (
        <p className={a.statsNote}>Загрузка…</p>
      ) : !stats || stats.voters === 0 ? (
        <p className={a.statsNote}>Пока никто не голосовал.</p>
      ) : (
        <div className={a.statsBody}>
          <p className={a.statsNote}>
            Голосующих: <b>{stats.voters}</b> · лайков: <b>{stats.likes}</b> · работ: {stats.works}.
            Полный вес голоса — с <b>{stats.k}</b> {plural(stats.k, 'лайка', 'лайков', 'лайков')};
            {` меньше отметили ${partial} ${plural(partial, 'человек', 'человека', 'человек')}`}
            {` (${Math.round((partial / stats.voters) * 100)}%).`}
          </p>

          <div className={a.bars}>
            {stats.buckets.map((b) => (
              <div key={b.likes} className={a.bar}>
                <span className={a.barLabel}>
                  {b.likes >= stats.k ? `${stats.k}+` : b.likes}{' '}
                  {plural(b.likes, 'лайк', 'лайка', 'лайков')}
                </span>
                <span className={a.barTrack}>
                  <span
                    className={b.likes >= stats.k ? a.barFillFull : a.barFill}
                    style={{ width: `${(b.voters / max) * 100}%` }}
                  />
                </span>
                <span className={a.barValue}>{b.voters}</span>
              </div>
            ))}
          </div>

          {current.top.length > 0 && (
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Работа</th>
                    <th>Балл</th>
                    <th>Лайки</th>
                    <th>Место</th>
                    <th>По лайкам</th>
                  </tr>
                </thead>
                <tbody>
                  {current.top.map((t, i) => (
                    <tr key={i}>
                      <td>{t.title}</td>
                      <td>{t.score.toLocaleString('ru-RU')}</td>
                      <td>{t.likes}</td>
                      <td>{t.place}</td>
                      <td className={t.placeByLikes !== t.place ? a.changed : undefined}>
                        {t.placeByLikes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </details>
  );
};

export default VotingStats;

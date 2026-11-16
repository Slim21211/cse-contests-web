import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, useIsAdmin, AuthRequired } from '../../auth';
import { useSiteSettings } from '../../settings/siteSettings';
import PageLayout, { PageNotice } from '../../components/pageLayout/PageLayout';
import ContestTabs from '../../components/contestTabs/ContestTabs';
import WorkCard from '../voting/WorkCard';
import MediaViewer from '../voting/MediaViewer';
import { toWork, type Row } from '../voting/toWork';
import { festiveYear } from '../../utils/festiveYear';
import { plural } from '../../utils/plural';
import { cx } from '../../utils/cx';
import type { ContestType } from '../../contests';
import v from '../voting/voting.module.scss';
import s from './results.module.scss';

/** Строка get_results: место (одинаковое число лайков — одинаковое место), лайки или балл, работа. */
interface ResultRow {
  place: number;
  likes: number | null;
  /** Балл: сумма взвешенных лайков; в архиве 2026 — средняя оценка звёздами (лайков там нет). */
  score: number | null;
  work: Row;
}

/** Сколько мест показываем: в детском — топ-7, в остальных — все. */
const LIMITS: Record<ContestType, number | undefined> = { child: 7, team: undefined, individual: undefined };

/** Последнее призовое место. */
const PRIZE: Record<ContestType, number> = { child: 7, team: 4, individual: 4 };

const noop = () => {};

const Place = ({ place, contest }: { place: number; contest: ContestType }) => (
  <span
    className={cx(s.place, place === 1 && s.placeFirst, place <= PRIZE[contest] && s.placePrize)}
  >
    {place} место
  </span>
);

const Score = ({ row }: { row: ResultRow }) => {
  if (row.score !== null) {
    const score = Number(row.score);
    return (
      <span className={s.stat}>
        <span className={s.statValue}>
          {score.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
        </span>
        <span className={s.statLabel}>
          {/* «4,75 балла», но «5 баллов» */}
          {Number.isInteger(score) ? plural(score, 'балл', 'балла', 'баллов') : 'балла'}
          {row.likes !== null && ` · ${row.likes} ${plural(row.likes, 'лайк', 'лайка', 'лайков')}`}
        </span>
      </span>
    );
  }
  const likes = row.likes ?? 0;
  return (
    <span className={s.stat}>
      <span className={s.statValue}>{likes}</span>
      <span className={s.statLabel}>{plural(likes, 'лайк', 'лайка', 'лайков')}</span>
    </span>
  );
};

const Skeletons = () => (
  <div className={v.grid} aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className={`${v.card} ${v.cardSkeleton}`}>
        <div className={`${v.media} ${v.skeletonBlock}`} />
        <div className={v.caption}>
          <div className={v.captionText}>
            <span className={v.skeletonLine} style={{ width: '60%' }} />
            <span className={v.skeletonLine} style={{ width: '35%' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Прошлые сезоны, по которым есть итоги (новые сверху). */
const useSeasons = (userId: number | undefined) => {
  const [seasons, setSeasons] = useState<number[]>([]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.rpc('results_seasons').then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error('Список сезонов не загрузился:', error);
      else setSeasons((data ?? []) as number[]);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return seasons;
};

const Results = () => {
  const { year: yearParam } = useParams();
  const current = festiveYear();
  const year = yearParam ? Number(yearParam) : current;
  const archive = year !== current;

  const [contest, setContest] = useState<ContestType>('child');
  const [openId, setOpenId] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user);
  const { settings, loaded: settingsLoaded } = useSiteSettings();
  const seasons = useSeasons(user?.id);

  // Прошлые годы видны всем вошедшим; текущий — после публикации (админам — сразу, это же проверяет база).
  const canView = !!user && (archive || settings.resultsPublished || isAdmin === true);
  const checking = !archive && (!settingsLoaded || (!settings.resultsPublished && isAdmin === null));

  // Итоги вместе с конкурсом и годом, к которым относятся: при переключении старые не показываем.
  const key = `${year}:${contest}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: ResultRow[]; error: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    supabase
      .rpc('get_results', { p_contest: contest, p_season: year })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Итоги не загрузились:', error);
        const rows = (data ?? []) as ResultRow[];
        const limit = LIMITS[contest];
        setLoaded({
          key: `${year}:${contest}`,
          rows: limit ? rows.filter((r) => r.place <= limit) : rows,
          error: !!error,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [contest, year, canView]);

  const closeViewer = useCallback(() => setOpenId(null), []);

  if (yearParam && (!/^\d{4}$/.test(yearParam) || year > current)) {
    return <Navigate to="/results" replace />;
  }
  if (!user) {
    return <AuthRequired showBackLink message="Войдите, чтобы посмотреть итоги." />;
  }

  const rows = loaded?.key === key ? loaded.rows : null;
  const loadError = loaded?.key === key && loaded.error;
  const openRow = rows?.find((r) => r.work.id === openId);

  // «Незаметные» ссылки на итоги других лет.
  const otherYears = [
    ...(archive ? [current] : []),
    ...seasons.filter((y) => y !== year),
  ];
  const yearLinks = otherYears.length > 0 && (
    <nav className={s.years} aria-label="Итоги других лет">
      {otherYears.map((y) => (
        <Link key={y} to={y === current ? '/results' : `/results/${y}`} className={s.yearLink}>
          Результаты {y}
        </Link>
      ))}
    </nav>
  );

  let content;
  if (checking) {
    content = <Skeletons />;
  } else if (!canView) {
    content = (
      <PageNotice
        title="Итоги ещё не подведены"
        text="Результаты появятся здесь после окончания голосования."
        action={{ to: '/', label: 'На главную' }}
      />
    );
  } else {
    content = (
      <>
        <ContestTabs
          value={contest}
          onChange={(c) => {
            setContest(c);
            setOpenId(null);
          }}
        />
        {!rows ? (
          <Skeletons />
        ) : rows.length === 0 ? (
          <PageNotice
            title={loadError ? 'Не удалось загрузить итоги' : 'Пока нет результатов'}
            text={loadError ? 'Обновите страницу.' : undefined}
          />
        ) : (
          <div className={v.grid}>
            {rows.map((r) => (
              <WorkCard
                key={r.work.id}
                work={toWork(contest, r.work)}
                liked={false}
                canVote={false}
                onLike={noop}
                onOpen={() => setOpenId(r.work.id)}
                badge={<Place place={r.place} contest={contest} />}
                aside={<Score row={r} />}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <PageLayout
      title={archive ? `Итоги ${year}` : 'Итоги конкурсов'}
      subtitle={archive ? 'Новогодние конкурсы КСЭ' : 'Победители новогодних конкурсов'}
      year={year}
    >
      {content}
      {yearLinks}
      {openRow && (
        <MediaViewer
          work={toWork(contest, openRow.work)}
          liked={false}
          canVote={false}
          onLike={noop}
          onClose={closeViewer}
        />
      )}
    </PageLayout>
  );
};

export default Results;

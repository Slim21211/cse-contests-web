import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, AuthRequired } from '../../auth';
import BrandHeader from '../../components/brandHeader/brandHeader';
import Icon from '../../components/icon/Icon';
import { useSiteSettings, votingStatus, formatDay } from '../../settings/siteSettings';
import { formatAge } from '../../utils/age';
import type { ContestType } from '../home/useHomeStats';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';
import WorkCard from './WorkCard';
import MediaViewer from './MediaViewer';
import { useLikes } from './useLikes';
import { kindOf } from './workKind';
import type { Work } from './types';
import s from './voting.module.scss';

const TITLES: Record<ContestType, string> = {
  child: 'Детский конкурс',
  team: 'Командный конкурс',
  individual: 'Индивидуальный конкурс',
};

type Row = ChildContestSubmission | TeamContestSubmission | IndividualContestSubmission;

/** Подписи карточки для каждого конкурса. */
const toWork = (contest: ContestType, row: Row): Work => {
  const base = {
    id: row.id,
    url: row.file_url,
    posterUrl: row.poster_url,
    rotation: row.rotation ?? 0,
    kind: kindOf(row.file_url),
  };
  if (contest === 'child') {
    const r = row as ChildContestSubmission;
    return { ...base, title: r.title, subtitle: `${r.child_name}, ${formatAge(r.child_age)}` };
  }
  if (contest === 'team') {
    const r = row as TeamContestSubmission;
    return { ...base, title: r.team_name, subtitle: r.city };
  }
  const r = row as IndividualContestSubmission;
  return { ...base, title: r.title, subtitle: [r.full_name, r.city].filter(Boolean).join(' · ') };
};

/**
 * Порядок работ перемешан, но стабилен в пределах сессии: после возврата со страницы
 * работы стоят на тех же местах, а у разных людей — в разном порядке.
 */
const sessionSeed = () => {
  try {
    let seed = sessionStorage.getItem('cse-vote-seed');
    if (!seed) {
      seed = Math.random().toString(36).slice(2);
      sessionStorage.setItem('cse-vote-seed', seed);
    }
    return seed;
  } catch {
    return 'seed';
  }
};

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Каркас: шапка и белый лист — как у остальных страниц. */
const Layout = ({
  contest,
  subtitle,
  children,
}: {
  contest: ContestType;
  subtitle?: string;
  children: ReactNode;
}) => (
  <div className={s.page}>
    <BrandHeader
      title={TITLES[contest]}
      subtitle={subtitle}
      actions={
        <Link to="/?tab=vote" className={s.back}>
          <Icon name="chevron-left" size={18} className={s.backChevron} />
          На главную
        </Link>
      }
    />
    <main className={s.sheet}>{children}</main>
  </div>
);

const VotingPage = ({ contest }: { contest: ContestType }) => {
  const { user } = useCurrentUser();
  const { settings, loaded: settingsLoaded } = useSiteSettings();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const status = votingStatus(settings, enabled ?? true);
  const canVote = status === 'open';
  const likes = useLikes(contest, user?.id, canVote);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase
        .from('contest_settings')
        .select('voting_enabled')
        .eq('contest_type', contest)
        .maybeSingle(),
      supabase.from(`${contest}_contest`).select('*').eq('is_active', true),
    ]).then(([settingsRes, worksRes]) => {
      if (cancelled) return;
      setEnabled(settingsRes.data?.voting_enabled ?? true);
      if (worksRes.error) {
        console.error('Работы не загрузились:', worksRes.error);
        setLoadError(true);
      }
      setRows((worksRes.data as Row[] | null) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [contest]);

  // Одновременно играет только одно видео или аудио.
  useEffect(() => {
    const onPlay = (e: Event) => {
      document.querySelectorAll('audio, video').forEach((el) => {
        if (el !== e.target) (el as HTMLMediaElement).pause();
      });
    };
    document.addEventListener('play', onPlay, true);
    return () => document.removeEventListener('play', onPlay, true);
  }, []);

  const works = useMemo(() => {
    if (!rows) return null;
    const seed = sessionSeed();
    return rows
      .map((r) => toWork(contest, r))
      .sort((a, b) => hash(a.id + seed) - hash(b.id + seed));
  }, [rows, contest]);

  const openWork = works?.find((w) => w.id === openId) ?? null;
  const closeViewer = useCallback(() => setOpenId(null), []);

  const subtitle = settings.votingEnd
    ? status === 'closed'
      ? `Голосование завершено ${formatDay(settings.votingEnd)}`
      : `Голосование до ${formatDay(settings.votingEnd)}`
    : undefined;

  if (!user) {
    return <AuthRequired showBackLink message="Войдите, чтобы голосовать." />;
  }

  // Пока не знаем сроки и флаг конкурса — заглушки карточек.
  if (!settingsLoaded || enabled === null || !works) {
    return (
      <Layout contest={contest} subtitle={subtitle}>
        <div className={s.grid} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${s.card} ${s.cardSkeleton}`}>
              <div className={`${s.media} ${s.skeletonBlock}`} />
              <div className={s.caption}>
                <div className={s.captionText}>
                  <span className={s.skeletonLine} style={{ width: '60%' }} />
                  <span className={s.skeletonLine} style={{ width: '35%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  if (!canVote) {
    const notice =
      status === 'closed'
        ? {
            title: 'Голосование завершено',
            text: 'Спасибо за участие! Итоги появятся на главной, когда организаторы их опубликуют.',
          }
        : status === 'upcoming'
          ? {
              title: 'Голосование ещё не началось',
              text: settings.votingStart
                ? `Оно откроется ${formatDay(settings.votingStart)}.`
                : 'Оно откроется после окончания приёма работ.',
            }
          : { title: 'Голосование приостановлено', text: 'Скоро продолжим — загляните позже.' };
    return (
      <Layout contest={contest} subtitle={subtitle}>
        <div className={s.notice}>
          <h2 className={s.noticeTitle}>{notice.title}</h2>
          <p className={s.noticeText}>{notice.text}</p>
          <Link to="/?tab=vote" className={s.noticeButton}>
            На главную
          </Link>
        </div>
      </Layout>
    );
  }

  const myLikes = works.filter((w) => likes.liked.has(w.id)).length;

  return (
    <Layout contest={contest} subtitle={subtitle}>
      <div className={s.intro}>
        <span className={s.introText}>Отмечайте работы, которые понравились.</span>
        <span className={s.counter} aria-label={`Ваших лайков: ${myLikes}`}>
          <Icon name="heart-filled" size={16} />
          <span className={s.counterLong}>Ваших лайков:&nbsp;</span>
          {myLikes}
        </span>
      </div>

      {(likes.error || loadError) && (
        <div className={s.error} role="alert">
          {loadError ? 'Не удалось загрузить работы. Обновите страницу.' : likes.error}
        </div>
      )}

      {works.length === 0 ? (
        <div className={s.notice}>
          <h2 className={s.noticeTitle}>Пока нет работ</h2>
          <p className={s.noticeText}>Работы появятся здесь после проверки организаторами.</p>
        </div>
      ) : (
        <div className={s.grid}>
          {works.map((w) => (
            <WorkCard
              key={w.id}
              work={w}
              liked={likes.liked.has(w.id)}
              canVote={canVote}
              onLike={(on) => likes.setLike(w.id, on)}
              onOpen={() => setOpenId(w.id)}
            />
          ))}
        </div>
      )}

      {openWork && (
        <MediaViewer
          work={openWork}
          liked={likes.liked.has(openWork.id)}
          canVote={canVote}
          onLike={(on) => likes.setLike(openWork.id, on)}
          onClose={closeViewer}
        />
      )}
    </Layout>
  );
};

export default VotingPage;

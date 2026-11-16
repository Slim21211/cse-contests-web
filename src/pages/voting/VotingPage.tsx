import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, AuthRequired } from '../../auth';
import PageLayout, { PageNotice } from '../../components/pageLayout/PageLayout';
import Icon from '../../components/icon/Icon';
import { useSiteSettings, votingStatus, formatDay } from '../../settings/siteSettings';
import { CONTEST_TITLES as TITLES, type ContestType } from '../../contests';
import WorkCard from './WorkCard';
import MediaViewer from './MediaViewer';
import { useLikes } from './useLikes';
import { toWork, type Row } from './toWork';
import s from './voting.module.scss';

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

const Layout = ({
  contest,
  subtitle,
  children,
}: {
  contest: ContestType;
  subtitle?: string;
  children: ReactNode;
}) => (
  <PageLayout title={TITLES[contest]} subtitle={subtitle} backTo="/?tab=vote">
    {children}
  </PageLayout>
);

const HINT_KEY = 'cse-weight-hint-hidden';

/** Подсказка о взвешенных лайках. Закрыл — больше не показываем в этом браузере. */
const WeightHint = () => {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* не запомним — покажем ещё раз */
    }
  };
  return (
    <div className={s.hint} role="note">
      <p className={s.hintText}>
        <b>Чем больше работ вы отметите, тем весомее каждый ваш лайк.</b> Так голосование
        получается честнее: посмотрите всю ленту и отметьте всё, что понравилось.
      </p>
      <button type="button" className={s.hintClose} onClick={close} aria-label="Скрыть подсказку">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
};

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
      // View отдаёт только активные работы текущего сезона и без служебных полей.
      supabase.from(`${contest}_works`).select('*'),
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
        <PageNotice {...notice} action={{ to: '/?tab=vote', label: 'На главную' }} />
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

      <WeightHint />

      {(likes.error || loadError) && (
        <div className={s.error} role="alert">
          {loadError ? 'Не удалось загрузить работы. Обновите страницу.' : likes.error}
        </div>
      )}

      {works.length === 0 ? (
        <PageNotice
          title="Пока нет работ"
          text="Работы появятся здесь после проверки организаторами."
        />
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

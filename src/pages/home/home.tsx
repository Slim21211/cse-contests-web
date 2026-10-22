import { Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser, useIsAdmin, AuthRequired, logout } from '../../auth';
import BrandHeader from '../../components/brandHeader/brandHeader';
import Icon from '../../components/icon/Icon';
import {
  useSiteSettings,
  isSubmissionClosed,
  votingStatus,
  formatDay,
} from '../../settings/siteSettings';
import { plural } from '../../utils/plural';
import { useHomeStats, CONTESTS, type ContestType, type ContestStats } from './useHomeStats';
import styles from './home.module.scss';

const CONTEST_INFO: Record<ContestType, { num: string; title: string; about: string }> = {
  child: { num: '01', title: 'Детский', about: 'Работа вашего ребёнка' },
  team: {
    num: '02',
    title: 'Командный',
    about: 'Работа от отдела или команды',
  },
  individual: {
    num: '03',
    title: 'Индивидуальный',
    about: 'Ваша личная работа',
  },
};

const FORM_PATH: Record<ContestType, string> = {
  child: '/child-form',
  team: '/team-form',
  individual: '/individual-form',
};

type Tab = 'submit' | 'vote';

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const Arrow = ({ muted }: { muted?: boolean }) => (
  <span className={cx(styles.arrow, muted && styles.arrowMuted)} aria-hidden="true">
    <Icon name="arrow-right" />
  </span>
);

/** Серая полоска на месте текста, пока грузятся данные. Высота строки та же, что у текста. */
const Skeleton = ({ width }: { width: number }) => (
  <span className={styles.skeleton} style={{ width }} aria-hidden="true" />
);

const WorksMeta = ({ stats }: { stats?: ContestStats }) =>
  stats ? (
    <span className={styles.meta}>
      <span>Всего работ: {stats.total}</span>
      {stats.mine > 0 && (
        <span className={styles.mine}>
          {stats.mine} {plural(stats.mine, 'ваша', 'ваших', 'ваших')}
        </span>
      )}
    </span>
  ) : (
    <span className={styles.meta}>
      <Skeleton width={110} />
    </span>
  );

/** Голосование: сколько работ в конкурсе и сколько из них лайкнул сам человек. */
const Progress = ({ stats }: { stats?: ContestStats }) => {
  if (!stats) {
    return (
      <span className={styles.meta}>
        <Skeleton width={110} />
      </span>
    );
  }
  if (stats.total === 0) return <span className={styles.meta}>Пока нет работ</span>;
  const likes = stats.likes ?? 0;
  return (
    <span className={styles.meta}>
      <span>Всего работ: {stats.total}</span>
      {likes > 0 && (
        <span className={styles.likes} aria-label={`Ваших лайков: ${likes}`}>
          <Icon name="heart-filled" size={13} />
          {likes}
        </span>
      )}
    </span>
  );
};

const Home = () => {
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user) === true;
  const { settings, loaded } = useSiteSettings();
  const stats = useHomeStats(user?.id);
  const [params, setParams] = useSearchParams();

  if (!user) return <AuthRequired />;

  const submissionClosed = isSubmissionClosed(settings);
  // Фаза голосования по датам (кнопки конкурсов учитываются в карточках).
  const votingPhase = votingStatus(settings, true);
  const votingClosed = votingPhase === 'closed';
  const tabParam = params.get('tab');
  const tab: Tab =
    tabParam === 'vote' || tabParam === 'submit' ? tabParam : submissionClosed ? 'vote' : 'submit';
  const selectTab = (t: Tab) => setParams({ tab: t }, { replace: true });

  const submitLabel = submissionClosed ? 'Работы' : 'Подать работу';
  const voteLabel = votingClosed ? 'Голосование' : 'Голосовать';

  return (
    <div className={styles.page}>
      <BrandHeader
        greeting={`Привет, ${user.first_name}!`}
        title={
          <>
            Новогодние <span className={styles.nowrap}>конкурсы КСЭ</span>
          </>
        }
        actions={
          <>
            {isAdmin && (
              <Link to="/admin" className={cx(styles.headerLink, styles.desktopOnly)}>
                Админ-панель
              </Link>
            )}
            <button type="button" className={styles.logout} onClick={logout}>
              Выйти
            </button>
          </>
        }
      />

      <main className={styles.main}>
        {settings.resultsPublished && (
          <Link to="/results" className={styles.results}>
            <span className={styles.resultsText}>
              <span className={styles.resultsLabel}>Итоги</span>
              <span className={styles.resultsTitle}>Результаты голосования готовы</span>
              <span className={styles.resultsSub}>Победители всех трёх конкурсов</span>
            </span>
            <span className={styles.resultsButton}>
              Смотреть
              <span className={styles.desktopOnly}>&nbsp;результаты</span>
            </span>
          </Link>
        )}

        <div className={styles.tabs} role="tablist" aria-label="Разделы">
          <button
            type="button"
            role="tab"
            id="tab-submit"
            aria-controls="panel-submit"
            aria-selected={tab === 'submit'}
            className={cx(styles.tab, tab === 'submit' && styles.tabActive)}
            onClick={() => selectTab('submit')}
          >
            {submitLabel}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-vote"
            aria-controls="panel-vote"
            aria-selected={tab === 'vote'}
            className={cx(styles.tab, tab === 'vote' && styles.tabActive)}
            onClick={() => selectTab('vote')}
          >
            {voteLabel}
          </button>
        </div>

        <div className={styles.sections}>
          {/* ——— Подача работ ——— */}
          <section
            id="panel-submit"
            aria-labelledby="tab-submit"
            className={cx(styles.section, tab === 'submit' && styles.sectionActive)}
          >
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{submitLabel}</h2>
              {!loaded ? (
                <span className={styles.deadline}>
                  <span className={styles.deadlineLabel}>Приём работ</span>
                  <span className={styles.deadlineValue}>
                    <Skeleton width={110} />
                  </span>
                </span>
              ) : (
                settings.submissionDeadline && (
                  <span className={styles.deadline}>
                    <span className={styles.deadlineLabel}>Приём работ</span>
                    <span
                      className={cx(styles.deadlineValue, submissionClosed && styles.deadlineDone)}
                    >
                      {submissionClosed
                        ? `завершён ${formatDay(settings.submissionDeadline)}`
                        : `до ${formatDay(settings.submissionDeadline)}`}
                    </span>
                  </span>
                )
              )}
            </div>

            <div className={styles.cards}>
              {CONTESTS.map((c) => {
                const info = CONTEST_INFO[c];
                const body = (
                  <>
                    <span className={styles.num}>{info.num}</span>
                    <span className={styles.body}>
                      <span className={styles.cardTitle}>{info.title}</span>
                      {!submissionClosed && <span className={styles.about}>{info.about}</span>}
                      <WorksMeta stats={stats?.[c]} />
                    </span>
                  </>
                );
                return submissionClosed ? (
                  <div key={c} className={cx(styles.card, styles.cardClosed)}>
                    {body}
                    <span className={styles.badge}>Приём окончен</span>
                  </div>
                ) : (
                  <Link
                    key={c}
                    to={FORM_PATH[c]}
                    className={styles.card}
                    aria-label={`${info.title} конкурс — подать работу`}
                  >
                    {body}
                    <Arrow />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ——— Голосование ——— */}
          <section
            id="panel-vote"
            aria-labelledby="tab-vote"
            className={cx(styles.section, tab === 'vote' && styles.sectionActive)}
          >
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{voteLabel}</h2>
              {!loaded ? (
                <span className={styles.deadline}>
                  <span className={styles.deadlineLabel}>Голосование</span>
                  <span className={styles.deadlineValue}>
                    <Skeleton width={110} />
                  </span>
                </span>
              ) : votingPhase === 'upcoming' && settings.votingStart ? (
                <span className={styles.deadline}>
                  <span className={styles.deadlineLabel}>Голосование</span>
                  <span className={styles.deadlineValue}>с {formatDay(settings.votingStart)}</span>
                </span>
              ) : settings.votingEnd ? (
                <span className={styles.deadline}>
                  <span className={styles.deadlineLabel}>Голосование</span>
                  <span className={cx(styles.deadlineValue, votingClosed && styles.deadlineDone)}>
                    {votingClosed
                      ? `завершено ${formatDay(settings.votingEnd)}`
                      : `до ${formatDay(settings.votingEnd)}`}
                  </span>
                </span>
              ) : null}
            </div>

            <div className={styles.cards}>
              {CONTESTS.map((c) => {
                const info = CONTEST_INFO[c];
                const s = stats?.[c];
                const status = votingStatus(settings, s?.votingEnabled ?? true);

                // Пока не знаем сроки или флаг конкурса — заглушка того же размера, что и карточка.
                if (!loaded || (!s && status === 'open')) {
                  return (
                    <div key={c} className={styles.card} aria-busy="true">
                      <span className={styles.num}>{info.num}</span>
                      <span className={styles.body}>
                        <span className={styles.cardTitle}>{info.title}</span>
                        <Progress />
                      </span>
                      <span className={cx(styles.arrow, styles.arrowSkeleton)} aria-hidden="true" />
                    </div>
                  );
                }

                if (status === 'upcoming') {
                  return (
                    <div key={c} className={cx(styles.card, styles.cardPending)}>
                      <span className={styles.num}>{info.num}</span>
                      <span className={styles.body}>
                        <span className={styles.cardTitle}>{info.title}</span>
                        <span className={styles.meta}>
                          {settings.votingStart
                            ? `Голосование с ${formatDay(settings.votingStart)}`
                            : 'Голосование ещё не открыто'}
                        </span>
                      </span>
                    </div>
                  );
                }

                const body = (
                  <>
                    <span className={styles.num}>{info.num}</span>
                    <span className={styles.body}>
                      <span className={styles.cardTitle}>{info.title}</span>
                      <Progress stats={s} />
                    </span>
                  </>
                );

                return status !== 'open' ? (
                  <div key={c} className={cx(styles.card, styles.cardClosed)}>
                    {body}
                    <span className={styles.badge}>
                      {status === 'paused' ? 'Голосование приостановлено' : 'Голосование окончено'}
                    </span>
                  </div>
                ) : (
                  <Link
                    key={c}
                    to={`/vote/${c}`}
                    className={styles.card}
                    aria-label={`${info.title} конкурс — голосовать`}
                  >
                    {body}
                    <Arrow />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          {isAdmin && (
            <nav className={cx(styles.bottomNav, styles.mobileOnly)}>
              <Link to="/admin" className={styles.bottomLink}>
                Админ-панель <Icon name="arrow-right" size={18} />
              </Link>
            </nav>
          )}

          <p className={styles.userId}>VK ID {user.id}</p>
        </footer>
      </main>
    </div>
  );
};

export default Home;

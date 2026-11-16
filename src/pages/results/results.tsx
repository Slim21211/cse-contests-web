import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, useIsAdmin, AuthRequired } from '../../auth';
import { useSiteSettings } from '../../settings/siteSettings';
import { formatAge } from '../../utils/age';
import { plural } from '../../utils/plural';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';
import FileRenderer from '../../components/fileRenderer/fileRenderer';
import Loader from '../../components/loader/loader';
import ScrollToTopButton from '../../components/scrollToTopButton/scrollToTopButton';
import '../../styles/results.scss';

type ContestType = 'child' | 'team' | 'individual';

type Submission = ChildContestSubmission | TeamContestSubmission | IndividualContestSubmission;

/** Строка get_results: место (одинаковое число лайков — одинаковое место), лайки, работа. */
interface ResultRow {
  place: number;
  likes: number;
  work: Submission;
}

/** Сколько мест показываем: в детском — топ-7, в остальных — все. */
const LIMITS: Record<ContestType, number | undefined> = {
  child: 7,
  team: undefined,
  individual: undefined,
};

const TAB_LABELS: Record<ContestType, string> = {
  child: '🎄 Детский',
  team: '✨ Командный',
  individual: '⭐ Индивидуальный',
};

/** Медаль за первое место, подарок за призовые, иначе номер. */
const getPlaceBadge = (place: number, contest: ContestType): string => {
  if (place === 1) return '🥇';
  const lastPrize = contest === 'child' ? 7 : 4;
  return place <= lastPrize ? '🎁' : `#${place}`;
};

const SubmissionInfo = ({ contest, work }: { contest: ContestType; work: Submission }) => {
  if (contest === 'child') {
    const child = work as ChildContestSubmission;
    return (
      <>
        <h3>{child.title}</h3>
        <p>
          <strong>Автор:</strong> {child.child_name}, {formatAge(child.child_age)}
        </p>
        <p>
          <strong>Родитель:</strong> {child.full_name}
        </p>
        <p>
          <strong>Город:</strong> {child.city}
        </p>
      </>
    );
  }
  if (contest === 'team') {
    const team = work as TeamContestSubmission;
    return (
      <>
        <h3>{team.team_name}</h3>
        <p>
          <strong>Участники:</strong> {team.participants}
        </p>
        <p>
          <strong>Город:</strong> {team.city}
        </p>
      </>
    );
  }
  const individual = work as IndividualContestSubmission;
  return (
    <>
      <h3>{individual.title}</h3>
      <p>
        <strong>Автор:</strong> {individual.full_name}
      </p>
      <p>
        <strong>Город:</strong> {individual.city}
      </p>
    </>
  );
};

const Results = () => {
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user);
  const { settings, loaded: settingsLoaded } = useSiteSettings();
  // До публикации итогов страницу видят только админы (это же проверяет база).
  const canView = !!user && (settings.resultsPublished || isAdmin === true);
  const checking = !settingsLoaded || (!settings.resultsPublished && isAdmin === null);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setResults(null);
    setLoadError(false);
    supabase.rpc('get_results', { p_contest: activeTab }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error('Итоги не загрузились:', error);
        setLoadError(true);
        setResults([]);
        return;
      }
      const rows = (data ?? []) as ResultRow[];
      const limit = LIMITS[activeTab];
      setResults(limit ? rows.filter((r) => r.place <= limit) : rows);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, canView]);

  if (!user) {
    return <AuthRequired showBackLink message="Войдите, чтобы посмотреть итоги." />;
  }

  if (checking) {
    return (
      <div className="results-container">
        <Loader label="Загрузка…" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="results-container">
        <Link to="/" className="back-link">
          ← На главную
        </Link>
        <div className="voting-disabled">
          <h2>Итоги ещё не подведены</h2>
          <p>Результаты появятся здесь после окончания голосования.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <Link to="/" className="back-link">
        ← На главную
      </Link>
      <div className="results-header">
        <h1>🏆 Результаты голосования</h1>
        <p className="subtitle">Победители новогодних конкурсов</p>

        <div className="results-tabs">
          {(Object.keys(TAB_LABELS) as ContestType[]).map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {results === null ? (
        <Loader label="Загрузка результатов…" />
      ) : results.length === 0 ? (
        <div className="no-results">
          <p>
            {loadError
              ? 'Не удалось загрузить итоги. Обновите страницу.'
              : 'Пока нет результатов голосования'}
          </p>
        </div>
      ) : (
        <div className="results-grid">
          {results.map(({ place, likes, work }) => (
            <div key={work.id} className={`result-card ${place === 1 ? 'gold' : ''}`}>
              <div className="place-badge">{getPlaceBadge(place, activeTab)}</div>

              <div className="result-card-media">
                <FileRenderer
                  filePath={work.file_url}
                  rotation={work.rotation || 0}
                  posterUrl={work.poster_url}
                />
              </div>

              <div className="result-card-info">
                <SubmissionInfo contest={activeTab} work={work} />
              </div>

              <div className="result-card-stats">
                <div className="stat">
                  <span className="stat-label">Место</span>
                  <span className="stat-value">{place}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{plural(likes, 'Лайк', 'Лайка', 'Лайков')}</span>
                  <span className="stat-value">❤️ {likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
};

export default Results;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, useIsAdmin } from '../../auth';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';
import FileRenderer from '../../components/fileRenderer/fileRenderer';
import Loader from '../../components/loader/loader';
import SiteSettingsPanel from './SiteSettingsPanel';
import { formatAge } from '../../utils/age';
import { festiveYear } from '../../utils/festiveYear';
import '../../styles/admin.scss';
import ScrollToTopButton from '../../components/scrollToTopButton/scrollToTopButton';

type ContestType = 'child' | 'team' | 'individual';

// Union type для всех типов работ
type Submission =
  | ChildContestSubmission
  | TeamContestSubmission
  | IndividualContestSubmission;

const DEFAULT_ENABLED: Record<ContestType, boolean> = { child: true, team: true, individual: true };

const Admin = () => {
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user);
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  // Работы вместе с вкладкой, к которой они относятся: пока грузится новая вкладка,
  // старый список не показываем и не правим.
  const [loaded, setLoaded] = useState<{ tab: ContestType; works: Submission[] | null } | null>(
    null
  );
  const [votingEnabled, setVotingEnabled] = useState(DEFAULT_ENABLED);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: string | null;
  }>({
    show: false,
    id: null,
  });

  const submissions = loaded?.tab === activeTab ? loaded.works : undefined;
  const setSubmissions = (update: (prev: Submission[]) => Submission[]) =>
    setLoaded((prev) => (prev?.works ? { ...prev, works: update(prev.works) } : prev));

  // Настройки голосования — один раз.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from('contest_settings')
      .select('contest_type, voting_enabled')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Настройки голосования не загрузились:', error);
          return;
        }
        const enabled = { ...DEFAULT_ENABLED };
        data.forEach((s) => {
          enabled[s.contest_type as ContestType] = s.voting_enabled;
        });
        setVotingEnabled(enabled);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Работы текущей вкладки, только текущий сезон; прошлые остаются в базе.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from(`${activeTab}_contest`)
      .select('*')
      .eq('season', festiveYear())
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Работы не загрузились:', error);
        setLoaded({ tab: activeTab, works: error ? null : ((data ?? []) as Submission[]) });
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, activeTab]);

  /** Обновляет работу; база может молча не тронуть строку (RLS) — это тоже ошибка. */
  const updateWork = async (id: string, patch: Record<string, unknown>, what: string) => {
    const { data, error } = await supabase
      .from(`${activeTab}_contest`)
      .update(patch)
      .eq('id', id)
      .select('id');
    if (error || !data?.length) {
      console.error(`Ошибка: ${what}`, error);
      alert(`Не удалось ${what}. ${error?.message ?? 'Нет прав или работа не найдена.'}`);
      return false;
    }
    return true;
  };

  const toggleVoting = async () => {
    const contest = activeTab;
    const newValue = !votingEnabled[contest];

    const { data, error } = await supabase
      .from('contest_settings')
      .update({
        voting_enabled: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('contest_type', contest)
      .select('contest_type');

    if (error || !data?.length) {
      console.error('Ошибка переключения голосования:', error);
      alert(
        'Не удалось переключить голосование. ' +
          (error?.message ?? 'В contest_settings нет строки для этого конкурса.')
      );
      return;
    }
    setVotingEnabled((prev) => ({ ...prev, [contest]: newValue }));
  };

  const handleDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ show: false, id: null });
    if (!id || !user) return;

    const ok = await updateWork(
      id,
      { is_active: false, moderated_at: new Date().toISOString(), moderated_by: user.id },
      'скрыть работу'
    );
    if (ok) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: false } : s)));
    }
  };

  const handleRestore = async (id: string) => {
    if (await updateWork(id, { is_active: true }, 'восстановить работу')) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: true } : s)));
    }
  };

  const rotateImage = async (id: string, currentRotation: number = 0) => {
    const newRotation = (currentRotation + 90) % 360; // Поворачиваем на 90°
    if (await updateWork(id, { rotation: newRotation }, 'повернуть изображение')) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, rotation: newRotation } : s))
      );
    }
  };

  // Функция для рендера информации в зависимости от типа конкурса
  const renderSubmissionInfo = (submission: Submission) => {
    if (activeTab === 'child') {
      const child = submission as ChildContestSubmission;
      return (
        <>
          <h3>{child.title}</h3>
          <p>
            <strong>Ребёнок:</strong> {child.child_name}, {formatAge(child.child_age)}
          </p>
          <p>
            <strong>Родитель:</strong> {child.full_name}
          </p>
          <p>
            <strong>Подразделение:</strong> {child.department}
          </p>
          <p>
            <strong>Город:</strong> {child.city}
          </p>
        </>
      );
    }

    if (activeTab === 'team') {
      const team = submission as TeamContestSubmission;
      return (
        <>
          <h3>{team.team_name}</h3>
          <p>
            <strong>Участники:</strong> {team.participants}
          </p>
          <p>
            <strong>Подразделение:</strong> {team.department}
          </p>
          <p>
            <strong>Город:</strong> {team.city}
          </p>
        </>
      );
    }

    if (activeTab === 'individual') {
      const individual = submission as IndividualContestSubmission;
      return (
        <>
          <h3>{individual.title}</h3>
          <p>
            <strong>Автор:</strong> {individual.full_name}
          </p>
          <p>
            <strong>Подразделение:</strong> {individual.department}
          </p>
          <p>
            <strong>Город:</strong> {individual.city}
          </p>
        </>
      );
    }

    return null;
  };

  // Функция для проверки является ли файл изображением
  const isImage = (url: string): boolean => {
    const ext = (url.split('.').pop()?.split('?')[0] || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(
      ext
    );
  };

  if (user && isAdmin === null) {
    return (
      <div className="admin-container">
        <Loader label="Проверяем доступ…" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="admin-container">
        <Link to="/" className="back-link">
          ← На главную
        </Link>
        <div className="no-access">
          <div className="icon">🔐</div>
          <h2>Доступ запрещён</h2>
          <p>У вас нет прав администратора.</p>
        </div>
      </div>
    );
  }

  const tabLabels: Record<ContestType, string> = {
    child: '🎄 Детский',
    team: '✨ Командный',
    individual: '⭐ Индивидуальный',
  };

  return (
    <div className="admin-container">
      <Link to="/" className="back-link">
        ← На главную
      </Link>

      <div className="admin-header">
        <h1>🛠 Админ-панель</h1>

        <div className="admin-tabs">
          {(Object.keys(tabLabels) as ContestType[]).map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      <SiteSettingsPanel />

      <div className="admin-controls">
        <div className="voting-toggle">
          <span>Голосование:</span>
          <button
            className={`toggle-button ${
              votingEnabled[activeTab] ? 'enabled' : 'disabled'
            }`}
            onClick={toggleVoting}
          >
            {votingEnabled[activeTab] ? '✓ Включено' : '✗ Выключено'}
          </button>
        </div>
        {submissions && <span>Всего работ: {submissions.length}</span>}
      </div>

      {submissions === undefined ? (
        <Loader label="Загрузка работ…" />
      ) : submissions === null ? (
        <div className="no-access">
          <p>Не удалось загрузить работы. Обновите страницу.</p>
        </div>
      ) : (
        <div className="admin-grid">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="admin-card"
              style={{ opacity: submission.is_active ? 1 : 0.5 }}
            >
              <div className="admin-card-media">
                <FileRenderer
                  filePath={submission.file_url}
                  rotation={submission.rotation || 0}
                  posterUrl={submission.poster_url}
                />
              </div>

              <div className="admin-card-info">
                {renderSubmissionInfo(submission)}

                <div className="admin-card-stats">
                  <span>
                    📅{' '}
                    {new Date(submission.created_at).toLocaleDateString('ru')}
                  </span>
                  <span>{submission.is_active ? '✓ Активна' : '✗ Скрыта'}</span>
                </div>
              </div>

              <div className="admin-card-actions">
                {isImage(submission.file_url) && (
                  <button
                    className="rotate-button"
                    onClick={() =>
                      rotateImage(submission.id, submission.rotation || 0)
                    }
                    title="Повернуть на 90°"
                  >
                    ↻ Повернуть
                  </button>
                )}
                {submission.is_active ? (
                  <button
                    className="delete-button"
                    onClick={() =>
                      setDeleteModal({ show: true, id: submission.id })
                    }
                  >
                    🗑 Скрыть
                  </button>
                ) : (
                  <button
                    className="restore-button"
                    onClick={() => handleRestore(submission.id)}
                  >
                    ↩ Восстановить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ScrollToTopButton />

      {deleteModal.show && (
        <div className="confirm-modal">
          <div className="confirm-modal-content">
            <h3>Скрыть работу?</h3>
            <p>
              Работа будет скрыта из голосования. Вы сможете восстановить её
              позже.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="cancel-button"
                onClick={() => setDeleteModal({ show: false, id: null })}
              >
                Отмена
              </button>
              <button className="confirm-delete-button" onClick={handleDelete}>
                Скрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

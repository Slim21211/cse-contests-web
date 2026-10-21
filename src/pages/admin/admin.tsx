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
import '../../styles/admin.scss';
import ScrollToTopButton from '../../components/scrollToTopButton/scrollToTopButton';

type ContestType = 'child' | 'team' | 'individual';

// Union type для всех типов работ
type Submission =
  | ChildContestSubmission
  | TeamContestSubmission
  | IndividualContestSubmission;

const Admin = () => {
  const { user, isLoading: userLoading } = useCurrentUser();
  const isAdmin = useIsAdmin(user) === true;
  const [activeTab, setActiveTab] = useState<ContestType>('child');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingEnabled, setVotingEnabled] = useState<
    Record<ContestType, boolean>
  >({
    child: true,
    team: true,
    individual: true,
  });
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: string | null;
  }>({
    show: false,
    id: null,
  });

  // Загружаем данные
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setLoading(true);

      // Настройки голосования
      const { data: settings } = await supabase
        .from('contest_settings')
        .select('contest_type, voting_enabled');

      if (settings) {
        const enabled: Record<ContestType, boolean> = {
          child: true,
          team: true,
          individual: true,
        };
        settings.forEach((s) => {
          enabled[s.contest_type as ContestType] = s.voting_enabled;
        });
        setVotingEnabled(enabled);
      }

      // Работы
      const tableName = `${activeTab}_contest`;
      const { data: works } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      setSubmissions(works || []);
      setLoading(false);
    };

    fetchData();
  }, [isAdmin, activeTab]);

  const toggleVoting = async () => {
    const newValue = !votingEnabled[activeTab];

    const { error } = await supabase
      .from('contest_settings')
      .update({
        voting_enabled: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('contest_type', activeTab);

    if (!error) {
      setVotingEnabled((prev) => ({ ...prev, [activeTab]: newValue }));
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id || !user) return;

    const tableName = `${activeTab}_contest`;

    const { error } = await supabase
      .from(tableName)
      .update({
        is_active: false,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id,
      })
      .eq('id', deleteModal.id)
      .select();

    if (error) {
      console.error('Ошибка при скрытии:', error);
      alert('Ошибка: ' + error.message);
    } else {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === deleteModal.id ? { ...s, is_active: false } : s
        )
      );
    }

    setDeleteModal({ show: false, id: null });
  };

  const handleRestore = async (id: string) => {
    const tableName = `${activeTab}_contest`;

    const { error } = await supabase
      .from(tableName)
      .update({ is_active: true })
      .eq('id', id);

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: true } : s))
      );
    }
  };

  const rotateImage = async (id: string, currentRotation: number = 0) => {
    const tableName = `${activeTab}_contest`;
    const newRotation = (currentRotation + 90) % 360; // Поворачиваем на 90°

    const { error } = await supabase
      .from(tableName)
      .update({ rotation: newRotation })
      .eq('id', id);

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, rotation: newRotation } : s))
      );
    } else {
      console.error('Ошибка поворота:', error);
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
            <strong>Ребёнок:</strong> {child.child_name}, {child.child_age}{' '}
            {getAgeWord(child.child_age)}
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

  // Функция для склонения слова "год/года/лет"
  const getAgeWord = (age: number): string => {
    const lastDigit = age % 10;
    const lastTwoDigits = age % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'лет';
    }

    if (lastDigit === 1) {
      return 'год';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'года';
    }

    return 'лет';
  };

  // Функция для проверки является ли файл изображением
  const isImage = (url: string): boolean => {
    const ext = (url.split('.').pop()?.split('?')[0] || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(
      ext
    );
  };

  if (userLoading) {
    return (
      <div className="admin-container">
        <Loader label="Загрузка работ…" />
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
        <span>Всего работ: {submissions.length}</span>
      </div>

      {loading ? (
        <Loader label="Загрузка работ…" />
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

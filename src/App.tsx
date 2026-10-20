import { Link } from 'react-router-dom';
import { useCurrentUser, useIsAdmin, AuthRequired, logout } from './auth';
import { isSubmissionClosed } from './config';
import './App.css';

function App() {
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user) === true;
  const submissionOpen = !isSubmissionClosed();

  if (!user) {
    return (
      <div className="app">
        <AuthRequired
          containerClassName="container"
          innerClassName="auth-required"
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <h1>🎄 Новогодние конкурсы</h1>

        <p className="welcome">Привет, {user.first_name}!</p>

        {submissionOpen && (
          <>
            <p className="subtitle">Подай работу на конкурс:</p>

            <div className="contests-grid">
              <Link to="/child-form" className="contest-card">
                <span className="contest-icon">🎄</span>
                <h2>Детский конкурс</h2>
                <p>Подать работу</p>
              </Link>

              <Link to="/team-form" className="contest-card">
                <span className="contest-icon">✨</span>
                <h2>Командный конкурс</h2>
                <p>Подать работу</p>
              </Link>

              <Link to="/individual-form" className="contest-card">
                <span className="contest-icon">⭐</span>
                <h2>Индивидуальный конкурс</h2>
                <p>Подать работу</p>
              </Link>
            </div>
          </>
        )}

        <p className="subtitle">Голосование:</p>

        <div className="contests-grid">
          <Link to="/vote/child" className="contest-card">
            <span className="contest-icon">🎄</span>
            <h2>Детский конкурс</h2>
            <p>Голосуй за лучшие детские работы</p>
          </Link>

          <Link to="/vote/team" className="contest-card">
            <span className="contest-icon">✨</span>
            <h2>Командный конкурс</h2>
            <p>Поддержи свою команду</p>
          </Link>

          <Link to="/vote/individual" className="contest-card">
            <span className="contest-icon">⭐</span>
            <h2>Индивидуальный конкурс</h2>
            <p>Выбери лучшую работу</p>
          </Link>
        </div>

        {/* Админ-панель — только для админов */}
        {isAdmin && (
          <Link to="/admin" className="admin-link">
            🛠 Админ-панель
          </Link>
        )}

        <Link to="/results" className="admin-link results-link">
          🏆 Результаты голосования
        </Link>

        <p className="user-id">
          ID: {user.id} ·{' '}
          <button type="button" className="logout-link" onClick={logout}>
            Выйти
          </button>
        </p>
      </div>
    </div>
  );
}

export default App;

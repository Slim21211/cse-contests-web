import type { ReactNode } from 'react';
import { useCurrentUser, logout } from './useCurrentUser';
import { useIsAdmin } from './useIsAdmin';
import AuthRequired from './AuthRequired';

// Тестовый режим: при VITE_ADMIN_ONLY=true сайт открыт только пользователям из таблицы admins.
// Чтобы открыть сайт всем — убрать переменную (или поставить false) и пересобрать.
const ADMIN_ONLY = import.meta.env.VITE_ADMIN_ONLY === 'true';

const AdminGate = ({ children }: { children: ReactNode }) => {
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(ADMIN_ONLY ? user : null);

  if (!ADMIN_ONLY) return <>{children}</>;

  if (!user) {
    return (
      <div className="app">
        <AuthRequired
          containerClassName="container"
          innerClassName="auth-required"
          message="Сайт в тестовом режиме. Войдите, чтобы продолжить."
        />
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="app">
        <div className="loading-container">
          <p className="loading-text">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app">
        <div className="container">
          <div className="auth-required">
            <div className="icon">🚧</div>
            <h2>Сайт в тестовом режиме</h2>
            <p>Доступ пока открыт только организаторам.</p>
            <p className="user-id">
              ID: {user.id} ·{' '}
              <button type="button" className="logout-link" onClick={logout}>
                Выйти
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGate;

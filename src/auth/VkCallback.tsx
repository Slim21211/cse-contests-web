import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeVkRedirect, readVkRedirectParams, takeReturnTo } from './vk';
import { setSessionUser } from './session';
import Loader from '../components/loader/loader';

/**
 * Страница /auth/vk — адрес возврата VK ID (VITE_VK_REDIRECT_URL).
 * На телефоне после входа через приложение VK человек попадает сюда с кодом в адресе:
 * завершаем вход и возвращаем его туда, откуда он начинал.
 */
const VkCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = readVkRedirectParams(window.location);
    if (!params) {
      navigate(takeReturnTo(), { replace: true });
      return;
    }

    completeVkRedirect(params.code, params.deviceId)
      .then((user) => {
        setSessionUser(user);
        navigate(takeReturnTo(), { replace: true });
      })
      .catch((err) => {
        console.error('VK redirect login failed:', err);
        setError('Не удалось завершить вход через VK. Попробуйте войти ещё раз.');
      });
  }, [navigate]);

  if (!error) return <Loader fullScreen label="Завершаем вход через VK…" />;

  return (
    <div className="app">
      <div className="container">
        <div className="auth-required">
          <h2>Вход не завершён</h2>
          <p>{error}</p>
          <Link to="/" className="admin-link">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VkCallback;

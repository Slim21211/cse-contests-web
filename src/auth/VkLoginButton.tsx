import { useEffect, useRef, useState } from 'react';
import { renderVkOneTap, isVkConfigured } from './vk';
import { setSessionUser } from './session';

/** Кнопка «Войти через VK ID» (виджет One Tap). После входа страница обновится сама. */
const VkLoginButton = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current || !isVkConfigured()) return;
    return renderVkOneTap(ref.current, setSessionUser, setError);
  }, []);

  if (!isVkConfigured()) {
    return (
      <p style={{ color: '#c00' }}>
        Вход через VK не настроен: задайте VITE_VK_APP_ID и VITE_VK_REDIRECT_URL в .env.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 320, margin: '16px auto 0' }}>
      <div ref={ref} />
      {error && <p style={{ color: '#c00', marginTop: 8 }}>{error}</p>}
    </div>
  );
};

export default VkLoginButton;

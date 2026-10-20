import { useSyncExternalStore } from 'react';
import { getSessionUser, setSessionUser, subscribeSession } from './session';
import { vkLogout } from './vk';

// Единая точка получения текущего пользователя для всех страниц.
// После входа через VK ID пользователь сохраняется в сессии, и все страницы обновляются сами.

let cached = getSessionUser();
subscribeSession(() => {
  cached = getSessionUser();
});

export const useCurrentUser = () => {
  const user = useSyncExternalStore(subscribeSession, () => cached);
  return { user, isLoading: false };
};

export const logout = async () => {
  const user = getSessionUser();
  if (user?.provider === 'vk') await vkLogout(user.accessToken);
  setSessionUser(null);
};

import { useEffect } from 'react';
import { getFreshAccessToken, VkSessionExpiredError } from './vk';
import { setSessionUser } from './session';
import type { AppUser } from './types';

/**
 * Проверяет вход через VK при открытии страницы (форма подачи работы):
 * при необходимости продлевает токен, а если продлить нельзя — сразу
 * просит войти заново, пока человек ещё ничего не заполнил.
 * Сетевые ошибки не разлогинивают: проверим ещё раз при отправке.
 */
export const useEnsureVkSession = (user: AppUser | null) => {
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    getFreshAccessToken().catch((err) => {
      if (err instanceof VkSessionExpiredError) setSessionUser(null);
    });
  }, [userId]);
};

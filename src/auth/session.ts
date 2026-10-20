import type { AppUser } from './types';

// Сессия хранится в localStorage этого браузера.
// Это удобство, а не защита: подделать её может кто угодно (см. README → «Известное ограничение»).

const KEY = 'cse-auth-user';
const listeners = new Set<() => void>();

export const getSessionUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AppUser;
    // Сессии старого формата (id вида "vk:123") считаем недействительными — нужен повторный вход.
    return typeof user?.id === 'number' ? user : null;
  } catch {
    return null;
  }
};

export const setSessionUser = (user: AppUser | null) => {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* приватный режим и т.п. — сессия просто не сохранится */
  }
  listeners.forEach((fn) => fn());
};

export const subscribeSession = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

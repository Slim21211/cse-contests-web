import * as VKID from '@vkid/sdk';
import type { AppUser } from './types';
import { getSessionUser, setSessionUser } from './session';

// Вход через VK ID (OAuth 2.1 + PKCE) целиком в браузере, через официальный SDK.
// Настройки — в .env: VITE_VK_APP_ID, VITE_VK_REDIRECT_URL (должен совпадать
// посимвольно с «Доверенным Redirect URL» в кабинете VK ID).

const APP_ID = Number(import.meta.env.VITE_VK_APP_ID);
const REDIRECT_URL = import.meta.env.VITE_VK_REDIRECT_URL ?? '';
// Права: базовый профиль. Для номера телефона — 'vkid.personal_info phone' (и включить доступ в кабинете).
const SCOPE = 'vkid.personal_info';

export const isVkConfigured = () => Boolean(APP_ID && REDIRECT_URL);

let initialized = false;
const init = () => {
  if (initialized) return;
  VKID.Config.init({
    app: APP_ID,
    redirectUrl: REDIRECT_URL,
    responseMode: VKID.ConfigResponseMode.Callback,
    source: VKID.ConfigSource.LOWCODE,
    scope: SCOPE,
  });
  initialized = true;
};

/** Обменивает code из виджета на токен и достаёт профиль пользователя. */
const completeLogin = async (code: string, deviceId: string): Promise<AppUser> => {
  const tokens = await VKID.Auth.exchangeCode(code, deviceId);
  const { user } = await VKID.Auth.userInfo(tokens.access_token);
  return {
    id: Number(user.user_id ?? tokens.user_id),
    first_name: user.first_name ?? '',
    last_name: user.last_name,
    phone: user.phone || undefined,
    provider: 'vk',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    deviceId,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
};

/** Сессия VK закончилась — пользователю нужно войти заново. */
export class VkSessionExpiredError extends Error {
  constructor() {
    super('Сессия VK истекла');
  }
}

let refreshing: Promise<string> | null = null;

/**
 * Действующий access token текущего пользователя. За 2 минуты до истечения
 * продлевает его через refresh token, без повторного входа.
 */
export const getFreshAccessToken = async (): Promise<string> => {
  const user = getSessionUser();
  if (!user?.accessToken) throw new VkSessionExpiredError();

  const stillValid = !user.expiresAt || user.expiresAt - Date.now() > 2 * 60 * 1000;
  if (stillValid) return user.accessToken;
  if (!user.refreshToken || !user.deviceId) throw new VkSessionExpiredError();

  // Параллельные запросы ждут одно и то же продление.
  refreshing ??= (async () => {
    try {
      init();
      const tokens = await VKID.Auth.refreshToken(user.refreshToken!, user.deviceId!);
      setSessionUser({
        ...user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });
      return tokens.access_token;
    } catch (err) {
      console.error('VK token refresh failed:', err);
      throw new VkSessionExpiredError();
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};

/**
 * Рисует кнопку One Tap в container. Возвращает функцию очистки.
 * onLogin вызывается после успешного входа, onError — при любой ошибке.
 */
export const renderVkOneTap = (
  container: HTMLElement,
  onLogin: (user: AppUser) => void,
  onError: (message: string) => void
) => {
  init();
  const oneTap = new VKID.OneTap();

  oneTap
    .render({
      container,
      showAlternativeLogin: true,
      contentId: VKID.OneTapContentId.PARTICIPATE,
    })
    .on(VKID.WidgetEvents.ERROR, (err: unknown) => {
      console.error('VK ID error:', err);
      onError('Не удалось войти через VK ID. Попробуйте ещё раз.');
    })
    .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: { code: string; device_id: string }) => {
      completeLogin(payload.code, payload.device_id)
        .then(onLogin)
        .catch((err) => {
          console.error('VK ID exchange error:', err);
          onError('Вход прошёл, но не удалось получить данные профиля. Попробуйте ещё раз.');
        });
    });

  return () => oneTap.close();
};

export const vkLogout = async (accessToken?: string) => {
  if (!accessToken) return;
  try {
    init();
    await VKID.Auth.logout(accessToken);
  } catch {
    /* токен мог истечь — локальную сессию всё равно чистим */
  }
};

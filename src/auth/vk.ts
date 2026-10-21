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

// ---------- вход через приложение VK на телефоне ----------
// На телефоне VK открывает приложение, а затем возвращает человека в браузер на
// VITE_VK_REDIRECT_URL (/auth/vk) с одноразовым кодом в адресе. PKCE-верификатор
// SDK хранит в cookie нашего домена, поэтому обмен кода работает и в новой вкладке.

const RETURN_TO_KEY = 'vk-return-to';

/** Запоминает страницу, с которой начат вход, чтобы вернуть на неё после /auth/vk. */
export const rememberReturnTo = (path: string) => {
  try {
    localStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    /* без localStorage вернём на главную */
  }
};

export const takeReturnTo = () => {
  try {
    const path = localStorage.getItem(RETURN_TO_KEY);
    localStorage.removeItem(RETURN_TO_KEY);
    // Только пути нашего сайта, не внешние адреса.
    return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth/') ? path : '/';
  } catch {
    return '/';
  }
};

/** Достаёт code и device_id из адреса возврата (query, hash или JSON в payload). */
export const readVkRedirectParams = (location: Location) => {
  const params = new URLSearchParams(location.search);
  new URLSearchParams(location.hash.replace(/^#/, '')).forEach((v, k) => {
    if (!params.has(k)) params.set(k, v);
  });

  let code = params.get('code');
  let deviceId = params.get('device_id');
  const payload = params.get('payload');
  if ((!code || !deviceId) && payload) {
    try {
      const data = JSON.parse(payload);
      code ??= data.code;
      deviceId ??= data.device_id;
    } catch {
      /* payload не JSON — игнорируем */
    }
  }
  return code && deviceId ? { code, deviceId } : null;
};

const exchanging = new Map<string, Promise<AppUser>>();

/** Обменивает код из адреса возврата на сессию. Один код — один обмен (StrictMode вызывает эффект дважды). */
export const completeVkRedirect = (code: string, deviceId: string): Promise<AppUser> => {
  if (!exchanging.has(code)) {
    init();
    exchanging.set(code, completeLogin(code, deviceId));
  }
  return exchanging.get(code)!;
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
      // Нет сети — это не повод разлогинивать: пробросим как есть, проверим позже.
      if (err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) throw err;
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

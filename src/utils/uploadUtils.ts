import { supabase } from '../lib/supabase';
import { UPLOAD_API_URL } from '../config';
import { getFreshAccessToken, VkSessionExpiredError } from '../auth/vk';
import { setSessionUser } from '../auth/session';

// Загрузка файла в VK Cloud напрямую из браузера:
//   1. POST /uploads/start   — бэкенд создаёт multipart-загрузку и выдаёт подписанные ссылки на части;
//   2. PUT частей прямо в бакет (по 3 параллельно, с ретраями и прогрессом по байтам);
//   3. POST /uploads/complete — бэкенд собирает файл и возвращает публичную ссылку.
// Через бэкенд идут только маленькие JSON-запросы, сам файл — нет.

export type ContestType = 'child' | 'team' | 'individual';

const CONCURRENCY = 3;
const MAX_RETRIES = 10;
const PART_TIMEOUT_MS = 120_000;
const WARNING_PENDING_MS = 15_000;

export interface UploadDiagnostics {
  vk_user_id?: number;
  file_name: string;
  file_size: number;
  file_type: string;
  error_stage: 'upload-start' | 'upload-part' | 'upload-complete' | 'network' | 'supabase';
  error_message: string;
  failed_part?: number;
  total_parts?: number;
  retry_attempts?: number;
  time_elapsed_ms?: number;
  user_agent: string;
  connection_type?: string;
  connection_effective_type?: string;
}

/** Ошибка, понятная пользователю: user — текст для экрана, log — для разработчика. */
export interface UploadError {
  user: string;
  log: string;
}

export const logUploadError = async (diagnostics: UploadDiagnostics) => {
  try {
    await supabase.from('upload_diagnostics').insert({ ...diagnostics, created_at: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to log diagnostic:', err);
  }
};

export const getConnectionInfo = () => {
  const connection = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection;
  return {
    connection_type: connection?.type || 'unknown',
    connection_effective_type: connection?.effectiveType || 'unknown',
    user_agent: navigator.userAgent,
  };
};

interface UploadCallbacks {
  onProgress: (progress: number) => void;
  /** true — соединение тормозит или идут повторные попытки. */
  onRetrying: (isRetrying: boolean) => void;
  /** VK ID — для диагностики ошибок. */
  userId?: number;
}

interface PartUrl {
  partNumber: number;
  url: string;
}

interface StartResponse {
  key: string;
  uploadId: string;
  partSize: number;
  parts: PartUrl[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Запрос к бэкенду с VK-токеном. */
const api = async <T,>(path: string, body: unknown): Promise<T> => {
  let token: string;
  try {
    token = await getFreshAccessToken();
  } catch (err) {
    if (err instanceof VkSessionExpiredError) setSessionUser(null);
    throw {
      user: 'Сессия VK истекла. Войдите заново и отправьте форму ещё раз.',
      log: `VK token unavailable: ${err}`,
    } satisfies UploadError;
  }

  const res = await fetch(`${UPLOAD_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setSessionUser(null);
    throw {
      user: 'Сессия VK истекла. Войдите заново и отправьте форму ещё раз.',
      log: `${path}: 401 ${JSON.stringify(data)}`,
    } satisfies UploadError;
  }
  if (!res.ok) throw new HttpError(res.status, data?.message || `HTTP ${res.status}`);
  return data as T;
};

/** PUT одной части прямо в бакет через XHR — у fetch нет прогресса отправки. */
const putPart = (url: string, blob: Blob, onBytes: (loaded: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = PART_TIMEOUT_MS;
    xhr.upload.onprogress = (e) => onBytes(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag');
        if (!etag) {
          // Бакет не отдаёт ETag браузеру — в CORS бакета нет ExposeHeaders: ETag.
          reject(new HttpError(0, 'В ответе хранилища нет ETag (проверьте CORS бакета: ExposeHeaders ETag)'));
          return;
        }
        resolve(etag);
      } else {
        reject(new HttpError(xhr.status, `PUT part: HTTP ${xhr.status} ${xhr.responseText.slice(0, 300)}`));
      }
    };
    xhr.onerror = () => reject(new HttpError(0, 'PUT part: network error'));
    xhr.ontimeout = () => reject(new HttpError(0, `PUT part: timeout ${PART_TIMEOUT_MS / 1000}s`));
    xhr.send(blob);
  });

export const uploadFileMultipart = async (
  file: File,
  contest: ContestType,
  callbacks: UploadCallbacks
): Promise<string> => {
  const startTime = Date.now();
  const connectionInfo = getConnectionInfo();
  const diag = (d: Pick<UploadDiagnostics, 'error_stage' | 'error_message'> & Partial<UploadDiagnostics>) =>
    logUploadError({
      vk_user_id: callbacks.userId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      time_elapsed_ms: Date.now() - startTime,
      ...connectionInfo,
      ...d,
    });

  if (!UPLOAD_API_URL) {
    throw {
      user: 'Загрузка файлов временно недоступна. Попробуйте позже.',
      log: 'VITE_UPLOAD_API_URL не задан',
    } satisfies UploadError;
  }

  // Предупреждение «медленное соединение», если запрос висит дольше 15 с.
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let retryingParts = 0;
  const markPending = () => {
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => callbacks.onRetrying(true), WARNING_PENDING_MS);
  };
  const updateRetrying = () => {
    clearTimeout(slowTimer);
    callbacks.onRetrying(retryingParts > 0);
  };

  // 1. Старт
  let start: StartResponse;
  try {
    markPending();
    start = await api<StartResponse>('/uploads/start', {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      contest,
    });
    updateRetrying();
  } catch (err) {
    clearTimeout(slowTimer);
    if ((err as UploadError).user) throw err;
    const isHttp = err instanceof HttpError;
    await diag({ error_stage: isHttp ? 'upload-start' : 'network', error_message: String((err as Error).message ?? err) });
    throw {
      user: isHttp
        ? (err as HttpError).message // сообщение сервера уже по-русски: «Файл больше …», «Тип не поддерживается» и т. п.
        : 'Не удалось связаться с сервером загрузки. Проверьте интернет.',
      log: `upload-start: ${err}`,
    } satisfies UploadError;
  }

  const { key, uploadId, partSize } = start;
  const urls = new Map(start.parts.map((p) => [p.partNumber, p.url]));
  const totalParts = start.parts.length;
  const loadedByPart = new Map<number, number>();
  const etags = new Map<number, string>();

  const reportProgress = () => {
    const loaded = [...loadedByPart.values()].reduce((a, b) => a + b, 0);
    // 100% показываем только после «сборки» файла.
    callbacks.onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };
  callbacks.onProgress(1);

  const abort = () => api('/uploads/abort', { key, uploadId }).catch(() => undefined);

  const uploadPart = async (partNumber: number) => {
    const blob = file.slice((partNumber - 1) * partSize, Math.min(partNumber * partSize, file.size));

    for (let attempt = 1; ; attempt++) {
      try {
        markPending();
        const etag = await putPart(urls.get(partNumber)!, blob, (loaded) => {
          markPending();
          loadedByPart.set(partNumber, loaded);
          reportProgress();
        });
        etags.set(partNumber, etag);
        loadedByPart.set(partNumber, blob.size);
        reportProgress();
        if (attempt > 1) retryingParts--;
        updateRetrying();
        return;
      } catch (err) {
        loadedByPart.set(partNumber, 0);
        reportProgress();
        if (attempt === 1) retryingParts++;
        updateRetrying();
        callbacks.onRetrying(true);

        if (attempt >= MAX_RETRIES) {
          await diag({
            error_stage: 'upload-part',
            error_message: `Max retries exceeded: ${(err as Error).message}`,
            failed_part: partNumber,
            total_parts: totalParts,
            retry_attempts: attempt,
          });
          throw {
            user: 'Не удалось загрузить файл из-за проблем с соединением. Проверьте интернет и попробуйте ещё раз.',
            log: `part ${partNumber} failed after ${attempt} attempts: ${(err as Error).message}`,
          } satisfies UploadError;
        }

        // 403 от хранилища — обычно истекла подписанная ссылка. Берём новую.
        if (err instanceof HttpError && err.status === 403) {
          try {
            const { parts } = await api<{ parts: PartUrl[] }>('/uploads/sign-parts', {
              key,
              uploadId,
              partNumbers: [partNumber],
            });
            urls.set(partNumber, parts[0].url);
          } catch (signErr) {
            if ((signErr as UploadError).user) throw signErr;
          }
        }

        const delay = Math.min(2 ** attempt - 1, 30) * 1000;
        console.warn(`Part ${partNumber} attempt ${attempt} failed, retry in ${delay}ms:`, (err as Error).message);
        await sleep(delay);
      }
    }
  };

  // 2. Части — по CONCURRENCY одновременно
  try {
    const queue = start.parts.map((p) => p.partNumber);
    const worker = async () => {
      try {
        while (queue.length) await uploadPart(queue.shift()!);
      } catch (err) {
        queue.length = 0; // остальные потоки останавливаются после текущей части
        throw err;
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, totalParts) }, worker));
  } catch (err) {
    clearTimeout(slowTimer);
    void abort();
    throw err;
  }

  // 3. Сборка файла
  try {
    markPending();
    const { publicUrl } = await api<{ publicUrl: string }>('/uploads/complete', {
      key,
      uploadId,
      parts: [...etags.entries()].map(([partNumber, etag]) => ({ partNumber, etag })),
    });
    updateRetrying();
    callbacks.onRetrying(false);
    return publicUrl;
  } catch (err) {
    clearTimeout(slowTimer);
    if ((err as UploadError).user) throw err;
    await diag({ error_stage: 'upload-complete', error_message: String((err as Error).message ?? err) });
    void abort();
    throw {
      user: 'Файл загружен, но сервер не смог его сохранить. Попробуйте ещё раз.',
      log: `upload-complete: ${err}`,
    } satisfies UploadError;
  }
};

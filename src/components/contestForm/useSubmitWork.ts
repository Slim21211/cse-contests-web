import { useState } from 'react';
import {
  uploadSubmissionFile,
  logUploadError,
  getConnectionInfo,
  type ContestType,
} from '../../utils/uploadUtils';
import { insertSubmission } from '../../utils/submissions';

interface SubmitError {
  user: string;
  log: string;
}

/**
 * Отправка работы: загрузка файла (по частям, с повторами и обложкой для видео),
 * затем строка в таблицу <contest>_contest. Логика та же, что была в каждой форме.
 */
export const useSubmitWork = (contest: ContestType, userId: number | undefined) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (file: File, row: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);
    setRetrying(false);

    try {
      const { fileUrl, posterUrl } = await uploadSubmissionFile(file, contest, {
        userId,
        onProgress: setProgress,
        onRetrying: setRetrying,
      });
      setProgress(100);

      const insertError = await insertSubmission(`${contest}_contest`, {
        ...row,
        file_url: fileUrl,
        ...(posterUrl ? { poster_url: posterUrl } : {}),
        vk_user_id: userId,
        is_active: true,
      });

      if (insertError) {
        await logUploadError({
          vk_user_id: userId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          error_stage: 'supabase',
          error_message: insertError.message,
          ...getConnectionInfo(),
        });
        throw {
          user: 'Ошибка сохранения данных в базу. Возможно, неверный формат одного из полей.',
          log: `Supabase Insert Error: ${insertError.message}`,
        } satisfies SubmitError;
      }

      setSuccess(true);
    } catch (err) {
      const custom = err as Partial<SubmitError> & { name?: string; message?: string };
      if (custom.user && custom.log) {
        setError({ user: custom.user, log: custom.log });
        console.error('Техническая ошибка:', custom.log);
      } else if (err instanceof Error && err.name === 'TypeError') {
        setError({
          user: 'Не удалось установить соединение с сервером. Пожалуйста, проверьте интернет.',
          log: `Initial network error: ${err.name} - ${err.message}`,
        });
      } else {
        setError({
          user: 'Произошла непредвиденная ошибка.',
          log: err instanceof Error ? err.message : 'Unknown error type.',
        });
        console.error('Непредвиденная ошибка:', err);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  /** «Отправить ещё одну работу»: возвращаемся к форме. */
  const reset = () => {
    setProgress(0);
    setError(null);
    setSuccess(false);
  };

  return { submit, reset, loading, progress, retrying, error, success };
};

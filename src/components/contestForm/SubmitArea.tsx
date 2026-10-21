import { formatSize } from './FileDrop';
import s from './contestForm.module.scss';

interface Props {
  loading: boolean;
  progress: number;
  retrying: boolean;
  fileSize?: number;
  error?: string | null;
  /** Незаполненные поля — показываются только после попытки отправить. */
  missing: string[];
}

/** Низ формы: ход загрузки, ошибки, кнопка «Отправить работу» и что не заполнено. */
const SubmitArea = ({ loading, progress, retrying, fileSize, error, missing }: Props) => (
  <div className={s.submitArea}>
    {loading && (
      <div className={s.upload} role="status" aria-live="polite">
        <div className={s.uploadHead}>
          <span className={s.uploadTitle}>
            {progress === 0
              ? 'Готовим файл'
              : progress < 100
                ? 'Загружаем работу'
                : 'Сохраняем заявку'}
          </span>
          {progress > 0 && <span className={s.uploadPercent}>{progress}%</span>}
        </div>
        <div className={s.uploadBar}>
          <div
            className={progress === 0 ? s.uploadFillIdle : s.uploadFill}
            style={progress > 0 ? { width: `${progress}%` } : undefined}
          />
        </div>
        <div className={s.uploadNote}>
          {fileSize && progress > 0 && progress < 100
            ? `${formatSize((fileSize * progress) / 100)} из ${formatSize(fileSize)} · `
            : ''}
          не закрывайте страницу
        </div>
        {retrying && progress < 100 && (
          <div className={s.slow}>
            Слабое соединение — загрузка займёт больше времени, но продолжится сама.
          </div>
        )}
      </div>
    )}

    {error && (
      <div className={s.error} role="alert">
        {error}
      </div>
    )}

    <div className={s.submitRow}>
      <button type="submit" className={s.submit} disabled={loading}>
        {loading && <span className={s.spinner} aria-hidden="true" />}
        {loading ? 'Отправляем…' : 'Отправить работу'}
      </button>
      {missing.length > 0 && !loading && (
        <p className={s.missing} role="alert">
          Не заполнено: {missing.join(', ')}
        </p>
      )}
    </div>

    <p className={s.note}>Работа появится в голосовании после проверки организаторами</p>
  </div>
);

export default SubmitArea;

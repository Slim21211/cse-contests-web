import { useState, type FormEvent } from 'react';
import {
  useSiteSettings,
  saveSiteSettings,
  type SiteSettings,
  toMoscowInput,
  fromMoscowInput,
} from '../../settings/siteSettings';
import styles from './siteSettingsPanel.module.scss';

/**
 * Форма настроек. Черновик берётся из настроек один раз при появлении формы:
 * фоновое обновление настроек не затирает то, что админ сейчас вводит.
 */
const SettingsForm = ({ initial, loaded }: { initial: SiteSettings; loaded: boolean }) => {
  const [submissionStart, setSubmissionStart] = useState(() =>
    toMoscowInput(initial.submissionStart),
  );
  const [submission, setSubmission] = useState(() => toMoscowInput(initial.submissionDeadline));
  const [votingStart, setVotingStart] = useState(() => toMoscowInput(initial.votingStart));
  const [votingEnd, setVotingEnd] = useState(() => toMoscowInput(initial.votingEnd));
  const [published, setPublished] = useState(initial.resultsPublished);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const subStart = fromMoscowInput(submissionStart);
    const subEnd = fromMoscowInput(submission);
    const start = fromMoscowInput(votingStart);
    const end = fromMoscowInput(votingEnd);
    if (subStart && subEnd && subStart >= subEnd) {
      setStatus({ ok: false, text: 'Начало приёма должно быть раньше окончания' });
      return;
    }
    if (start && end && start >= end) {
      setStatus({ ok: false, text: 'Начало голосования должно быть раньше окончания' });
      return;
    }
    setSaving(true);
    setStatus(null);
    const error = await saveSiteSettings({
      submissionStart: subStart,
      submissionDeadline: subEnd,
      votingStart: start,
      votingEnd: end,
      resultsPublished: published,
    });
    setSaving(false);
    setStatus(
      error
        ? { ok: false, text: `Не сохранилось: ${error}. Выполнена ли миграция site_settings?` }
        : { ok: true, text: 'Сохранено' },
    );
  };

  return (
    <form className={styles.panel} onSubmit={onSubmit}>
      <h2 className={styles.title}>Сроки и итоги</h2>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Приём работ с</span>
          <input
            type="datetime-local"
            value={submissionStart}
            onChange={(e) => setSubmissionStart(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Приём работ до</span>
          <input
            type="datetime-local"
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Голосование с</span>
          <input
            type="datetime-local"
            value={votingStart}
            onChange={(e) => setVotingStart(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Голосование до</span>
          <input
            type="datetime-local"
            value={votingEnd}
            onChange={(e) => setVotingEnd(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span>
            Опубликовать результаты
            <small>Плашка на главной и страница результатов для всех</small>
          </span>
        </label>
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>
          Время московское, пустое поле — без ограничения. Вне сроков приёма подавать работы могут
          только админы. Голосование между датами идёт, если оно включено для конкурса
          переключателем ниже; иначе — «приостановлено».
        </span>
        {status && (
          <span className={status.ok ? styles.ok : styles.error} role="status">
            {status.text}
          </span>
        )}
        <button type="submit" className={styles.save} disabled={saving || !loaded}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
};

/** Сроки приёма работ и голосования, публикация итогов. Время — московское. */
const SiteSettingsPanel = () => {
  const { settings, loaded } = useSiteSettings();
  // До загрузки форма заблокирована; после — создаётся заново уже с настоящими значениями.
  return <SettingsForm key={String(loaded)} initial={settings} loaded={loaded} />;
};

export default SiteSettingsPanel;

import { useEffect, useState, type FormEvent } from 'react';
import {
  useSiteSettings,
  saveSiteSettings,
  toMoscowInput,
  fromMoscowInput,
} from '../../settings/siteSettings';
import styles from './siteSettingsPanel.module.scss';

/** Сроки приёма работ и голосования, публикация итогов. Время — московское. */
const SiteSettingsPanel = () => {
  const { settings, loaded } = useSiteSettings();
  const [submission, setSubmission] = useState('');
  const [votingStart, setVotingStart] = useState('');
  const [votingEnd, setVotingEnd] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!loaded) return;
    setSubmission(toMoscowInput(settings.submissionDeadline));
    setVotingStart(toMoscowInput(settings.votingStart));
    setVotingEnd(toMoscowInput(settings.votingEnd));
    setPublished(settings.resultsPublished);
  }, [loaded, settings]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const start = fromMoscowInput(votingStart);
    const end = fromMoscowInput(votingEnd);
    if (start && end && start >= end) {
      setStatus({ ok: false, text: 'Начало голосования должно быть раньше окончания' });
      return;
    }
    setSaving(true);
    setStatus(null);
    const error = await saveSiteSettings({
      submissionDeadline: fromMoscowInput(submission),
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
          Время московское, пустое поле — без ограничения. Между датами голосование идёт, если оно
          включено для конкурса переключателем ниже; иначе — «приостановлено».
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

export default SiteSettingsPanel;

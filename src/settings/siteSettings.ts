import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';

// Сроки конкурса и публикация итогов — одна строка таблицы site_settings (id = 1),
// меняется в админке. Пока строки нет или в ней пусто, срок приёма берётся
// из VITE_SUBMISSION_DEADLINE, как раньше.

export interface SiteSettings {
  submissionDeadline: Date | null;
  votingStart: Date | null;
  votingEnd: Date | null;
  resultsPublished: boolean;
}

interface Row {
  submission_deadline: string | null;
  voting_start: string | null;
  voting_deadline: string | null;
  results_published: boolean | null;
}

const envDeadline = import.meta.env.VITE_SUBMISSION_DEADLINE
  ? new Date(import.meta.env.VITE_SUBMISSION_DEADLINE)
  : null;

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

let state: { settings: SiteSettings; loaded: boolean } = {
  settings: {
    submissionDeadline: envDeadline,
    votingStart: null,
    votingEnd: null,
    resultsPublished: false,
  },
  loaded: false,
};
const listeners = new Set<() => void>();
let request: Promise<SiteSettings> | null = null;

const emit = (settings: SiteSettings) => {
  state = { settings, loaded: true };
  listeners.forEach((l) => l());
};

const fromRow = (row: Row | null): SiteSettings => ({
  submissionDeadline: toDate(row?.submission_deadline) ?? envDeadline,
  votingStart: toDate(row?.voting_start),
  votingEnd: toDate(row?.voting_deadline),
  resultsPublished: row?.results_published === true,
});

/** Загружает настройки один раз на всё приложение и возвращает их. */
export const loadSiteSettings = () => {
  request ??= (async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('submission_deadline, voting_start, voting_deadline, results_published')
      .eq('id', 1)
      .maybeSingle();
    if (error) console.warn('site_settings недоступна (нужна миграция?):', error.message);
    emit(fromRow((data as Row | null) ?? null));
    return state.settings;
  })();
  return request;
};

/** Настройки сайта; до загрузки — значения по умолчанию (loaded = false). */
export const useSiteSettings = () => {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  useEffect(() => {
    void loadSiteSettings();
  }, []);
  return snapshot;
};

/** Сохранение из админки. Возвращает текст ошибки или null. */
export const saveSiteSettings = async (next: SiteSettings): Promise<string | null> => {
  const { error } = await supabase.from('site_settings').upsert({
    id: 1,
    submission_deadline: next.submissionDeadline?.toISOString() ?? null,
    voting_start: next.votingStart?.toISOString() ?? null,
    voting_deadline: next.votingEnd?.toISOString() ?? null,
    results_published: next.resultsPublished,
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;
  const saved = { ...next, submissionDeadline: next.submissionDeadline ?? envDeadline };
  request = Promise.resolve(saved);
  emit(saved);
  return null;
};

export const isSubmissionClosed = (s: SiteSettings, now = new Date()) =>
  s.submissionDeadline !== null && now >= s.submissionDeadline;

/**
 * Состояние голосования по конкурсу:
 *  upcoming — ещё не наступила дата начала (кнопка в админке не важна);
 *  closed   — дата окончания прошла (кнопка не важна);
 *  paused   — между датами, но голосование выключено кнопкой в админке;
 *  open     — между датами и включено.
 */
export type VotingStatus = 'upcoming' | 'open' | 'paused' | 'closed';

export const votingStatus = (s: SiteSettings, enabled: boolean, now = new Date()): VotingStatus => {
  if (s.votingStart && now < s.votingStart) return 'upcoming';
  if (s.votingEnd && now >= s.votingEnd) return 'closed';
  return enabled ? 'open' : 'paused';
};

/** «15 декабря» по московскому времени. */
export const formatDay = (d: Date) =>
  d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  });

/** Date → значение для <input type="datetime-local"> в московском времени. */
export const toMoscowInput = (d: Date | null) =>
  d ? d.toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(' ', 'T').slice(0, 16) : '';

/** Значение <input type="datetime-local"> (московское время) → Date. */
export const fromMoscowInput = (v: string) => (v ? new Date(`${v}:00+03:00`) : null);

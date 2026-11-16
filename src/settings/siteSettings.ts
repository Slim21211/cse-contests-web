import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';

// Сроки конкурса и публикация итогов — одна строка таблицы site_settings (id = 1),
// меняется в админке. Пока строки нет или в ней пусто, срок приёма берётся
// из VITE_SUBMISSION_DEADLINE, как раньше.

export interface SiteSettings {
  submissionStart: Date | null;
  submissionDeadline: Date | null;
  votingStart: Date | null;
  votingEnd: Date | null;
  resultsPublished: boolean;
}

interface Row {
  submission_start: string | null;
  submission_deadline: string | null;
  voting_start: string | null;
  voting_deadline: string | null;
  results_published: boolean | null;
}

const envDeadline = import.meta.env.VITE_SUBMISSION_DEADLINE
  ? new Date(import.meta.env.VITE_SUBMISSION_DEADLINE)
  : null;

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

// Последние полученные настройки храним в браузере: при повторном заходе страница
// сразу рисуется с ними (без скачков), а свежие подтягиваются в фоне.
const STORAGE_KEY = 'cse-site-settings';

const readStored = (): SiteSettings | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return {
      submissionStart: toDate(v.submissionStart),
      submissionDeadline: toDate(v.submissionDeadline) ?? envDeadline,
      votingStart: toDate(v.votingStart),
      votingEnd: toDate(v.votingEnd),
      resultsPublished: v.resultsPublished === true,
    };
  } catch {
    return null;
  }
};

const store = (settings: SiteSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* приватный режим и т. п. — просто не кэшируем */
  }
};

const stored = readStored();

let state: { settings: SiteSettings; loaded: boolean } = {
  settings: stored ?? {
    submissionStart: null,
    submissionDeadline: envDeadline,
    votingStart: null,
    votingEnd: null,
    resultsPublished: false,
  },
  // loaded = есть настройки, которым можно верить (из кэша или с сервера).
  loaded: stored !== null,
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const emit = (settings: SiteSettings) => {
  store(settings);
  state = { settings, loaded: true };
  notify();
};

const fromRow = (row: Row | null): SiteSettings => ({
  submissionStart: toDate(row?.submission_start),
  submissionDeadline: toDate(row?.submission_deadline) ?? envDeadline,
  votingStart: toDate(row?.voting_start),
  votingEnd: toDate(row?.voting_deadline),
  resultsPublished: row?.results_published === true,
});

// Настройки перечитываем, если с прошлой загрузки прошло больше REFRESH_MS
// (при открытии страницы и при возвращении на вкладку): админ мог что-то поменять.
const REFRESH_MS = 5 * 60 * 1000;
let request: Promise<SiteSettings> | null = null;
let fetchedAt = 0;

/** Загружает настройки (не чаще раза в REFRESH_MS) и возвращает их. */
const loadSiteSettings = (force = false) => {
  if (request && !force && Date.now() - fetchedAt < REFRESH_MS) return request;
  fetchedAt = Date.now();
  request = (async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('submission_start, submission_deadline, voting_start, voting_deadline, results_published')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      // Сеть или база недоступны: оставляем то, что есть (кэш), и попробуем при следующем обращении.
      console.warn('site_settings не загрузились:', error.message);
      fetchedAt = 0;
      if (!state.loaded) {
        state = { ...state, loaded: true };
        notify();
      }
      return state.settings;
    }
    emit(fromRow((data as Row | null) ?? null));
    return state.settings;
  })();
  return request;
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && listeners.size) void loadSiteSettings();
  });
}

/** Ближайший из сроков (приём, начало и конец голосования), который ещё не наступил. */
const nextBoundary = (s: SiteSettings, now: number) =>
  [s.submissionStart, s.submissionDeadline, s.votingStart, s.votingEnd]
    .map((d) => d?.getTime() ?? NaN)
    .filter((t) => t > now)
    .reduce((a, b) => Math.min(a, b), Infinity);

/**
 * Настройки сайта; до загрузки — значения по умолчанию (loaded = false).
 * Когда наступает один из сроков, компонент перерисовывается сам: форма закрывается,
 * голосование открывается и т. д. без перезагрузки страницы.
 */
export const useSiteSettings = () => {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    void loadSiteSettings();
  }, []);

  useEffect(() => {
    const at = nextBoundary(snapshot.settings, Date.now());
    if (!Number.isFinite(at)) return;
    // setTimeout не умеет ждать дольше ~24 дней; раз в сутки просто проверяем снова.
    const delay = Math.min(at - Date.now() + 1000, 24 * 3600 * 1000);
    const timer = setTimeout(() => setTick((n) => n + 1), delay);
    return () => clearTimeout(timer);
  });

  return snapshot;
};

/** Сохранение из админки. Возвращает текст ошибки или null. */
export const saveSiteSettings = async (next: SiteSettings): Promise<string | null> => {
  const { error } = await supabase.from('site_settings').upsert({
    id: 1,
    submission_start: next.submissionStart?.toISOString() ?? null,
    submission_deadline: next.submissionDeadline?.toISOString() ?? null,
    voting_start: next.votingStart?.toISOString() ?? null,
    voting_deadline: next.votingEnd?.toISOString() ?? null,
    results_published: next.resultsPublished,
    updated_at: new Date().toISOString(),
  });
  if (error) return error.message;
  const saved = { ...next, submissionDeadline: next.submissionDeadline ?? envDeadline };
  request = Promise.resolve(saved);
  fetchedAt = Date.now();
  emit(saved);
  return null;
};

/**
 * Состояние приёма работ:
 *  upcoming — ещё не наступила дата начала;
 *  open     — приём идёт;
 *  closed   — срок прошёл.
 */
export type SubmissionStatus = 'upcoming' | 'open' | 'closed';

export const submissionStatus = (s: SiteSettings, now = new Date()): SubmissionStatus => {
  if (s.submissionStart && now < s.submissionStart) return 'upcoming';
  if (s.submissionDeadline && now >= s.submissionDeadline) return 'closed';
  return 'open';
};

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

/**
 * Срок приёма одной строкой после «Приём работ»: «с 1 декабря», «до 15 декабря»,
 * «завершён 15 декабря». null — сроков нет.
 */
export const submissionDates = (s: SiteSettings, now = new Date()) => {
  const status = submissionStatus(s, now);
  if (status === 'upcoming' && s.submissionStart) {
    return {
      status,
      text: s.submissionDeadline
        ? `с ${formatDay(s.submissionStart)} до ${formatDay(s.submissionDeadline)}`
        : `с ${formatDay(s.submissionStart)}`,
    };
  }
  if (!s.submissionDeadline) return null;
  return {
    status,
    text:
      status === 'closed'
        ? `завершён ${formatDay(s.submissionDeadline)}`
        : `до ${formatDay(s.submissionDeadline)}`,
  };
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

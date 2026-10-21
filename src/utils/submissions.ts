import { supabase } from '../lib/supabase';

/**
 * Сохраняет заявку. Если в таблице ещё нет колонки poster_url
 * (миграция supabase/migration-poster-url.sql не применена) — повторяет без обложки,
 * чтобы приём работ не ломался.
 */
export const insertSubmission = async (table: string, row: Record<string, unknown>) => {
  const { error } = await supabase.from(table).insert(row);
  if (error && 'poster_url' in row && /poster_url/i.test(error.message)) {
    console.warn('Колонки poster_url нет — сохраняю без обложки. Примените migration-poster-url.sql.');
    const { poster_url: _ignored, ...rest } = row;
    return (await supabase.from(table).insert(rest)).error;
  }
  return error;
};

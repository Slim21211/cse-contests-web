import { createClient } from '@supabase/supabase-js';
import { getDbToken } from '../auth/dbToken';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase Auth не используется: вход через VK, а JWT для базы выдаёт наша Edge Function.
// null (гость) — клиент сам подставит anon-ключ.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: getDbToken,
});

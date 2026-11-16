-- Сезоны и доступ по VK ID, шаг 2 из 2: ЗАКРЫВАЕТ всё лишнее.
-- Запускать только после шага 1 и выкатки сайта, который ходит в базу с JWT от /uploads/session.
-- После этого старая версия сайта перестанет работать: она ходит с anon-ключом.
-- Повторный запуск безопасен.

begin;

-- ---------- старые политики «всем всё» ----------

drop policy if exists "Anyone can view admins" on public.admins;

drop policy if exists "Allow update child_contest" on public.child_contest;
drop policy if exists "Anyone can insert" on public.child_contest;
drop policy if exists "Anyone can view" on public.child_contest;
drop policy if exists "Allow update team_contest" on public.team_contest;
drop policy if exists "Anyone can insert" on public.team_contest;
drop policy if exists "Anyone can view" on public.team_contest;
drop policy if exists "Allow update individual_contest" on public.individual_contest;
drop policy if exists "Anyone can insert" on public.individual_contest;
drop policy if exists "Anyone can view" on public.individual_contest;

drop policy if exists "Anyone can view votes" on public.child_votes;
drop policy if exists "likes delete" on public.child_votes;
drop policy if exists "Anyone can insert votes" on public.team_votes;
drop policy if exists "Anyone can update own votes" on public.team_votes;
drop policy if exists "Anyone can view votes" on public.team_votes;
drop policy if exists "likes delete" on public.team_votes;
drop policy if exists "Anyone can insert votes" on public.individual_votes;
drop policy if exists "Anyone can update own votes" on public.individual_votes;
drop policy if exists "Anyone can view votes" on public.individual_votes;
drop policy if exists "likes delete" on public.individual_votes;

drop policy if exists "Anyone can update settings" on public.contest_settings;
drop policy if exists "Anyone can view settings" on public.contest_settings;

drop policy if exists "site_settings insert" on public.site_settings;
drop policy if exists "site_settings read" on public.site_settings;
drop policy if exists "site_settings write" on public.site_settings;

drop policy if exists "Anyone can insert diagnostics" on public.upload_diagnostics;
drop policy if exists "Only admins can read diagnostics" on public.upload_diagnostics;

drop policy if exists "winners_archive read" on public.winners_archive;

-- ---------- RLS на всех таблицах ----------

alter table public.admins           enable row level security;
alter table public.child_votes      enable row level security;
alter table public.team_votes       enable row level security;
alter table public.individual_votes enable row level security;
alter table public.contest_settings enable row level security;

-- ---------- anon: только сроки ----------
-- RLS не действует на TRUNCATE/REFERENCES/TRIGGER — поэтому отбираем сами права, а не только политики.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.site_settings to anon;

-- Новые таблицы больше не открываются anon автоматически.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- ---------- лишнее ----------

drop function if exists public.get_weighted_results(text);
drop table if exists public.users;  -- пустая, от Telegram-версии

commit;

-- Сезоны и доступ по VK ID, шаг 1 из 2: только ДОБАВЛЯЕТ. Старый сайт продолжает работать.
-- Шаг 2 (migration-rls-2-lockdown.sql) — после выкатки нового сайта и функции /session.
--
-- Кто есть кто:
--   anon           — без входа. Видит только сроки (site_settings). Остальное закрывает шаг 2.
--   authenticated  — вошёл через VK: JWT от Edge Function с claim vk_user_id.
--   админ          — authenticated, чей vk_user_id есть в admins.
--
-- Сезон — год, который встречаем: конкурс декабря 2026 → сезон 2027. Все работы до этой
-- миграции (прошлый конкурс и осенние тесты) — сезон 2026. Голосование, счётчики и итоги
-- показывают только текущий сезон, старые работы остаются в базе.
--
-- Повторный запуск безопасен.

begin;

-- ---------- функции ----------

/** VK ID из JWT; null — без входа (anon-ключ). */
create or replace function public.current_vk_id() returns bigint
language sql stable set search_path = '' as $$
  select nullif(auth.jwt() ->> 'vk_user_id', '')::bigint
$$;

/** security definer — чтобы не упираться в RLS самой таблицы admins. */
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where vk_user_id = public.current_vk_id())
$$;

/** Год, который встречаем (по Москве): с июля — следующий. Так же считают сайт и функция загрузки. */
create or replace function public.current_season() returns int
language sql stable set search_path = '' as $$
  select extract(year from now() at time zone 'Europe/Moscow')::int
       + case when extract(month from now() at time zone 'Europe/Moscow') >= 7 then 1 else 0 end
$$;

create or replace function public.submission_open() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select submission_deadline is null or now() < submission_deadline from public.site_settings where id = 1),
    true)
$$;

/** Как votingStatus() на сайте: между датами site_settings и включено в contest_settings. */
create or replace function public.voting_open(p_contest text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
           (select (voting_start is null or now() >= voting_start)
               and (voting_deadline is null or now() < voting_deadline)
              from public.site_settings where id = 1),
           true)
     and coalesce((select voting_enabled from public.contest_settings where contest_type = p_contest), true)
$$;

/** Папка автора в бакете: файлы новой заявки обязаны лежать в ней (их туда кладёт функция uploads). */
create or replace function public.upload_prefix(p_contest text) returns text
language sql stable set search_path = '' as $$
  select 'https://cse-contests.hb.ru-msk.vkcloud-storage.ru/'
         || public.current_season() || '/' || p_contest || '/' || public.current_vk_id() || '/'
$$;

/** Можно ли лайкнуть: голосование открыто, работа активна, этого сезона и не своя. */
create or replace function public.can_like(p_contest text, p_submission uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  ok boolean;
begin
  if p_contest not in ('child', 'team', 'individual') or not public.voting_open(p_contest) then
    return false;
  end if;
  execute format(
    'select exists (select 1 from public.%I where id = $1 and is_active
       and season = public.current_season() and vk_user_id is distinct from public.current_vk_id())',
    p_contest || '_contest')
  into ok using p_submission;
  return ok;
end $$;

-- ---------- сезоны и значения по умолчанию ----------

do $$
declare
  c text;
begin
  foreach c in array array['child', 'team', 'individual'] loop
    -- Существующие строки получают 2026, новые — текущий сезон.
    execute format('alter table public.%I add column if not exists season int not null default 2026', c || '_contest');
    execute format('alter table public.%I alter column season set default public.current_season()', c || '_contest');
    execute format('alter table public.%I alter column vk_user_id set default public.current_vk_id()', c || '_contest');
    execute format('create index if not exists %I on public.%I (season, is_active)', c || '_contest_season_idx', c || '_contest');

    execute format('alter table public.%I alter column vk_user_id set default public.current_vk_id()', c || '_votes');
    execute format('alter table public.%I alter column rating set default 1', c || '_votes');
  end loop;
end $$;

alter table public.upload_diagnostics alter column vk_user_id set default public.current_vk_id();

-- ---------- работы для голосующих: без подразделения и VK ID ----------
-- View выполняется с правами владельца (postgres) и обходит RLS таблиц, поэтому фильтры
-- здесь: только вошедшим, только активные работы текущего сезона.

create or replace view public.child_works with (security_barrier) as
select id, season, title, child_name, child_age, full_name, city,
       file_url, poster_url, rotation, media_type, created_at,
       coalesce(vk_user_id = public.current_vk_id(), false) as is_mine
  from public.child_contest
 where is_active and season = public.current_season() and public.current_vk_id() is not null;

create or replace view public.team_works with (security_barrier) as
select id, season, team_name, participants, city,
       file_url, poster_url, rotation, media_type, created_at,
       coalesce(vk_user_id = public.current_vk_id(), false) as is_mine
  from public.team_contest
 where is_active and season = public.current_season() and public.current_vk_id() is not null;

create or replace view public.individual_works with (security_barrier) as
select id, season, title, full_name, city,
       file_url, poster_url, rotation, media_type, created_at,
       coalesce(vk_user_id = public.current_vk_id(), false) as is_mine
  from public.individual_contest
 where is_active and season = public.current_season() and public.current_vk_id() is not null;

revoke all on public.child_works, public.team_works, public.individual_works from anon, authenticated;
grant select on public.child_works, public.team_works, public.individual_works to authenticated;

-- ---------- итоги ----------
-- Место = число лайков (одинаковое число — одинаковое место). Видят вошедшие, когда итоги
-- опубликованы; админы — всегда. Кто за что голосовал, наружу не отдаётся.

create or replace function public.get_results(p_contest text)
returns table (place int, likes int, work jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_contest not in ('child', 'team', 'individual') then
    raise exception 'Неизвестный конкурс: %', p_contest;
  end if;
  if public.current_vk_id() is null then
    return;
  end if;
  if not public.is_admin()
     and not coalesce((select results_published from public.site_settings where id = 1), false) then
    return;
  end if;

  return query execute format($q$
    select rank() over (order by l.n desc)::int,
           l.n,
           to_jsonb(w) - 'vk_user_id' - 'department' - 'moderated_by' - 'moderated_at'
      from public.%1$I w
      cross join lateral (select count(*)::int as n from public.%2$I v where v.submission_id = w.id) l
     where w.is_active and w.season = public.current_season()
     order by l.n desc, w.created_at
  $q$, p_contest || '_contest', p_contest || '_votes');
end $$;

revoke all on function public.get_results(text) from public, anon;
grant execute on function public.get_results(text) to authenticated;

-- ---------- права и политики для authenticated ----------
-- Права на уровне колонок: заявку нельзя создать сразу скрытой/повёрнутой/чужого сезона,
-- а админ меняет только поля модерации (не file_url и не тексты).

do $$
declare
  c text;
begin
  foreach c in array array['child', 'team', 'individual'] loop
    -- работы
    execute format('revoke all on public.%I from authenticated', c || '_contest');
    execute format('grant select, update (is_active, moderated_at, moderated_by, rotation) on public.%I to authenticated', c || '_contest');
    execute format('grant insert (%s) on public.%I to authenticated',
      case c
        when 'child' then 'full_name, department, city, child_name, child_age, title, file_url, poster_url, vk_user_id'
        when 'team' then 'team_name, department, city, participants, file_url, poster_url, vk_user_id'
        else 'full_name, department, city, title, file_url, poster_url, vk_user_id'
      end,
      c || '_contest');

    execute format('drop policy if exists "v2 admin read" on public.%I', c || '_contest');
    execute format('create policy "v2 admin read" on public.%I for select to authenticated using (public.is_admin())', c || '_contest');

    execute format('drop policy if exists "v2 admin update" on public.%I', c || '_contest');
    execute format('create policy "v2 admin update" on public.%I for update to authenticated
                      using (public.is_admin()) with check (public.is_admin())', c || '_contest');

    execute format('drop policy if exists "v2 submit" on public.%I', c || '_contest');
    execute format($p$create policy "v2 submit" on public.%I for insert to authenticated with check (
        vk_user_id = public.current_vk_id()
        and public.submission_open()
        and file_url like public.upload_prefix(%L) || '%%'
        and (poster_url is null or poster_url like public.upload_prefix(%L) || '%%'))$p$,
      c || '_contest', c, c);

    -- лайки: только свои, только пока открыто голосование
    execute format('revoke all on public.%I from authenticated', c || '_votes');
    execute format('grant select, delete, insert (submission_id, vk_user_id) on public.%I to authenticated', c || '_votes');

    execute format('drop policy if exists "v2 own read" on public.%I', c || '_votes');
    execute format('create policy "v2 own read" on public.%I for select to authenticated
                      using (vk_user_id = public.current_vk_id())', c || '_votes');

    execute format('drop policy if exists "v2 like" on public.%I', c || '_votes');
    execute format('create policy "v2 like" on public.%I for insert to authenticated with check (
                      vk_user_id = public.current_vk_id() and rating = 1 and public.can_like(%L, submission_id))',
      c || '_votes', c);

    execute format('drop policy if exists "v2 unlike" on public.%I', c || '_votes');
    execute format('create policy "v2 unlike" on public.%I for delete to authenticated
                      using (vk_user_id = public.current_vk_id() and public.voting_open(%L))',
      c || '_votes', c);
  end loop;
end $$;

-- contest_settings: читают вошедшие, переключают админы
revoke all on public.contest_settings from authenticated;
grant select, update (voting_enabled, updated_at) on public.contest_settings to authenticated;
drop policy if exists "v2 read" on public.contest_settings;
create policy "v2 read" on public.contest_settings for select to authenticated using (true);
drop policy if exists "v2 admin update" on public.contest_settings;
create policy "v2 admin update" on public.contest_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- site_settings: читают все (сроки видны на странице входа), меняют админы
revoke all on public.site_settings from authenticated;
grant select, insert, update on public.site_settings to authenticated;
drop policy if exists "v2 read" on public.site_settings;
create policy "v2 read" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "v2 admin insert" on public.site_settings;
create policy "v2 admin insert" on public.site_settings for insert to authenticated
  with check (public.is_admin() and id = 1);
drop policy if exists "v2 admin update" on public.site_settings;
create policy "v2 admin update" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin() and id = 1);

-- admins: человек видит только свою строку (так сайт узнаёт, админ ли он); менять — только в SQL Editor
revoke all on public.admins from authenticated;
grant select on public.admins to authenticated;
drop policy if exists "v2 own row" on public.admins;
create policy "v2 own row" on public.admins for select to authenticated
  using (vk_user_id = public.current_vk_id());

-- upload_diagnostics: пишут вошедшие (от своего имени), читают админы
revoke all on public.upload_diagnostics from authenticated;
grant select, insert on public.upload_diagnostics to authenticated;
drop policy if exists "v2 insert own" on public.upload_diagnostics;
create policy "v2 insert own" on public.upload_diagnostics for insert to authenticated
  with check (vk_user_id is not distinct from public.current_vk_id());
drop policy if exists "v2 admin read" on public.upload_diagnostics;
create policy "v2 admin read" on public.upload_diagnostics for select to authenticated
  using (public.is_admin());

-- winners_archive: читают вошедшие, менять — только в SQL Editor
revoke all on public.winners_archive from authenticated;
grant select on public.winners_archive to authenticated;
drop policy if exists "v2 read" on public.winners_archive;
create policy "v2 read" on public.winners_archive for select to authenticated using (true);

commit;

-- 1. Начало приёма работ (site_settings.submission_start), как у голосования.
-- 2. Итоги по годам: get_results(конкурс, сезон) и results_seasons().
-- 3. Архив победителей больше не читается напрямую: в data лежат подразделение и VK ID авторов.
-- Повторный запуск безопасен.

begin;

-- ——— 1. Начало приёма ———

alter table public.site_settings add column if not exists submission_start timestamptz;
grant insert (submission_start), update (submission_start) on public.site_settings to authenticated;

create or replace function public.submission_open() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select (submission_start is null or now() >= submission_start)
        and (submission_deadline is null or now() < submission_deadline)
       from public.site_settings where id = 1),
    true)
$$;

-- Админы могут подать работу и вне сроков (проверка перед открытием, поздние заявки).
do $$
declare c text;
begin
  foreach c in array array['child', 'team', 'individual'] loop
    execute format('drop policy if exists "v2 submit" on public.%I', c || '_contest');
    execute format($p$
      create policy "v2 submit" on public.%1$I for insert to authenticated
      with check (
        vk_user_id = public.current_vk_id()
        and (public.submission_open() or public.is_admin())
        and file_url like public.upload_prefix(%2$L) || '%%'
        and (poster_url is null or poster_url like public.upload_prefix(%2$L) || '%%')
      )$p$, c || '_contest', c);
  end loop;
end $$;

-- ——— 2. Итоги по годам ———

drop function if exists public.get_results(text);

-- Строки: место, лайки (для сезонов с лайками), балл (архив 2026 — звёзды), работа без служебных полей.
-- Текущий сезон: только после публикации итогов (админам — всегда).
-- Прошлые сезоны: всем вошедшим; если сезон есть в winners_archive — из архива.
create or replace function public.get_results(p_contest text, p_season int default null)
  returns table (place int, likes int, score numeric, work jsonb)
  language plpgsql stable security definer set search_path = ''
as $$
declare
  v_season int := coalesce(p_season, public.current_season());
begin
  if p_contest not in ('child', 'team', 'individual') then
    raise exception 'Неизвестный конкурс: %', p_contest;
  end if;
  if public.current_vk_id() is null or v_season > public.current_season() then
    return;
  end if;
  if v_season = public.current_season()
     and not public.is_admin()
     and not coalesce((select results_published from public.site_settings where id = 1), false) then
    return;
  end if;

  if exists (select 1 from public.winners_archive a where a.year = v_season and a.contest_type = p_contest) then
    return query
      select a.place, a.votes, a.score,
             a.data - 'vk_user_id' - 'department' - 'moderated_by' - 'moderated_at'
        from public.winners_archive a
       where a.year = v_season and a.contest_type = p_contest
       order by a.place;
    return;
  end if;

  return query execute format($q$
    select rank() over (order by l.n desc)::int,
           l.n,
           null::numeric,
           to_jsonb(w) - 'vk_user_id' - 'department' - 'moderated_by' - 'moderated_at'
      from public.%1$I w
      cross join lateral (select count(*)::int as n from public.%2$I v where v.submission_id = w.id) l
     where w.is_active and w.season = $1
     order by l.n desc, w.created_at
  $q$, p_contest || '_contest', p_contest || '_votes') using v_season;
end $$;

-- Прошлые сезоны, по которым есть итоги (для ссылок «Результаты 2026» и т. д.), новые сверху.
create or replace function public.results_seasons() returns setof int
  language sql stable security definer set search_path = ''
as $$
  select s from (
    select year as s from public.winners_archive
    union select season from public.child_contest
    union select season from public.team_contest
    union select season from public.individual_contest
  ) x
  where public.current_vk_id() is not null and s < public.current_season()
  order by s desc
$$;

revoke all on function public.get_results(text, int) from public, anon;
revoke all on function public.results_seasons() from public, anon;
grant execute on function public.get_results(text, int) to authenticated;
grant execute on function public.results_seasons() to authenticated;

-- ——— 3. Архив только через get_results ———

drop policy if exists "v2 read" on public.winners_archive;
drop policy if exists "winners_archive read" on public.winners_archive;
revoke select on public.winners_archive from anon, authenticated;

commit;

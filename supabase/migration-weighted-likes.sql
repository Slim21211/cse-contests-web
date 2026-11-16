-- Взвешенные лайки (с сезона 2027).
-- Вес каждого лайка человека = min(1, сколько работ он отметил в конкурсе / K),
-- K = 10% активных работ конкурса, но не меньше 2 и не больше 10 (параметры — в site_settings).
-- Балл работы = сумма весов её лайков; при равном балле выше та, у которой больше лайков.
-- Повторный запуск безопасен.

begin;

-- Параметры порога. Меняются только через SQL (сайт их не пишет).
alter table public.site_settings
  add column if not exists like_threshold_percent numeric not null default 10,
  add column if not exists like_threshold_min int not null default 2,
  add column if not exists like_threshold_max int not null default 10;

-- K для конкурса с p_works активными работами.
create or replace function public.like_threshold(p_works int) returns int
  language sql stable security definer set search_path = ''
as $$
  select least(s.like_threshold_max,
               greatest(s.like_threshold_min, ceil(p_works * s.like_threshold_percent / 100.0)::int))
    from public.site_settings s where s.id = 1
$$;

drop function if exists public.get_results(text, int);

-- Строки: место, лайки, балл, работа без служебных полей.
-- Текущий сезон: только после публикации итогов (админам — всегда).
-- Прошлые сезоны: всем вошедшим; если сезон есть в winners_archive — из архива (там балл — звёзды, лайков нет).
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
      select a.place, null::int, a.score,
             a.data - 'vk_user_id' - 'department' - 'moderated_by' - 'moderated_at'
        from public.winners_archive a
       where a.year = v_season and a.contest_type = p_contest
       order by a.place;
    return;
  end if;

  return query execute format($q$
    with season_works as (
      select * from public.%1$I where season = $1
    ),
    k as (
      select public.like_threshold((select count(*)::int from season_works where is_active)) as k
    ),
    -- Активность голосующего: все его лайки в конкурсе этого сезона (и скрытым работам тоже).
    activity as (
      select v.vk_user_id, count(*) as m
        from public.%2$I v join season_works w on w.id = v.submission_id
       group by v.vk_user_id
    ),
    scored as (
      select w.id,
             count(v.vk_user_id)::int as likes,
             coalesce(sum(least(1.0, a.m::numeric / (select k from k))), 0) as score
        from season_works w
        left join public.%2$I v on v.submission_id = w.id
        left join activity a on a.vk_user_id = v.vk_user_id
       where w.is_active
       group by w.id
    )
    select rank() over (order by round(s.score, 2) desc, s.likes desc)::int,
           s.likes,
           round(s.score, 2),
           to_jsonb(w) - 'vk_user_id' - 'department' - 'moderated_by' - 'moderated_at'
      from scored s join season_works w on w.id = s.id
     order by round(s.score, 2) desc, s.likes desc, w.created_at
  $q$, p_contest || '_contest', p_contest || '_votes') using v_season;
end $$;

-- Статистика голосования для админки (текущий сезон): K, число голосующих
-- и сколько из них отметили 1, 2, … работ (последняя корзина — K и больше).
create or replace function public.voting_stats(p_contest text)
  returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_contest not in ('child', 'team', 'individual') then
    raise exception 'Неизвестный конкурс: %', p_contest;
  end if;
  if not public.is_admin() then
    return null;
  end if;

  execute format($q$
    with season_works as (
      select * from public.%1$I where season = public.current_season()
    ),
    k as (
      select public.like_threshold((select count(*)::int from season_works where is_active)) as k
    ),
    activity as (
      select v.vk_user_id, count(*)::int as m
        from public.%2$I v join season_works w on w.id = v.submission_id
       group by v.vk_user_id
    ),
    buckets as (
      select least(m, (select k from k)) as b, count(*)::int as n from activity group by 1
    )
    select jsonb_build_object(
      'works', (select count(*) from season_works where is_active),
      'k', (select k from k),
      'voters', (select count(*) from activity),
      'likes', (select coalesce(sum(m), 0) from activity),
      'buckets', coalesce((select jsonb_agg(jsonb_build_object('likes', b, 'voters', n) order by b) from buckets), '[]'::jsonb)
    )
  $q$, p_contest || '_contest', p_contest || '_votes') into v_result;
  return v_result;
end $$;

revoke all on function public.get_results(text, int) from public, anon;
revoke all on function public.voting_stats(text) from public, anon;
revoke all on function public.like_threshold(int) from public, anon;
grant execute on function public.get_results(text, int) to authenticated;
grant execute on function public.voting_stats(text) to authenticated;
grant execute on function public.like_threshold(int) to authenticated;

commit;

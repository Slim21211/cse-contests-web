-- Архив победителей по годам. ВЫПОЛНИТЬ ДО migration-likes.sql — та удаляет старые голоса.
-- Supabase → SQL Editor → Run. Повторный запуск безопасен: уже сохранённые места не перезаписываются.

create table if not exists winners_archive (
  id           bigserial primary key,
  year         int  not null,                 -- год, который встречали (конкурс декабря 2025 → 2026)
  contest_type text not null check (contest_type in ('child', 'team', 'individual')),
  place        int  not null,
  score        numeric,                       -- итоговый балл (для 2026 — взвешенные звёзды)
  votes        int,                           -- голосов «выше 1 звезды»
  voters       int,                           -- сколько человек открывали работу
  data         jsonb not null,                -- вся строка работы: названия, имена, file_url, poster_url, rotation…
  created_at   timestamptz not null default now(),
  unique (year, contest_type, place)
);

-- Читать архив могут все, менять — только через SQL Editor (политик на запись нет).
alter table winners_archive enable row level security;
drop policy if exists "winners_archive read" on winners_archive;
create policy "winners_archive read" on winners_archive for select using (true);

-- Победители 2026: та же формула, что считала прошлогодние итоги (get_weighted_results со звёздами),
-- но только по прошлогодним работам. Работы, загруженные при тестах этой осенью, не учитываются:
-- граница — cutoff ниже. Если прошлогодний приём шёл позже 1 марта 2026, поправьте дату.
do $$
declare
  c text;
  cutoff timestamptz := '2026-03-01T00:00:00+03:00';
begin
  foreach c in array array['child', 'team', 'individual'] loop
    execute format($q$
      insert into winners_archive (year, contest_type, place, score, votes, voters, data)
      with works as (
        select * from %1$I where is_active and created_at < $1
      ),
      half as (
        select (count(*) / 2)::int as h from works
      ),
      activity as (
        select vk_user_id, count(*) filter (where rating > 1) as m
        from %2$I
        group by vk_user_id
      ),
      weights as (
        select vk_user_id,
          case
            when m = 0 then 0.0
            when m between 1 and 3 then 0.3
            when m >= (select h from half) then 1.0
            else m::float / nullif((select h from half), 0) * 0.7 + 0.3
          end as w
        from activity
      ),
      scores as (
        select v.submission_id,
          sum((v.rating - 1) * weights.w) as s,
          sum(weights.w) as tw,
          count(*) as votes
        from %2$I v
        join weights using (vk_user_id)
        where v.rating > 1 and v.submission_id in (select id from works)
        group by v.submission_id
      ),
      viewers as (
        select submission_id, count(distinct vk_user_id) as voters
        from %2$I
        group by submission_id
      )
      select
        2026,
        %3$L,
        row_number() over (order by round((sc.s / sc.tw + 1)::numeric, 3) desc, sc.votes desc)::int,
        round((sc.s / sc.tw + 1)::numeric, 3),
        sc.votes::int,
        coalesce(vw.voters, 0)::int,
        to_jsonb(w)
      from scores sc
      join works w on w.id = sc.submission_id
      left join viewers vw on vw.submission_id = sc.submission_id
      where sc.tw > 0
      on conflict (year, contest_type, place) do nothing
    $q$, c || '_contest', c || '_votes', c)
    using cutoff;
  end loop;
end $$;

-- Проверка: первые места по каждому конкурсу. Сверьте с тем, что объявляли в прошлом году.
select contest_type, place, score, votes,
       coalesce(data->>'title', data->>'team_name') as work,
       coalesce(data->>'child_name', data->>'full_name', data->>'city') as author
from winners_archive
where year = 2026 and place <= 7
order by contest_type, place;

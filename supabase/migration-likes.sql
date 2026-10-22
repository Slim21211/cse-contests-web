-- Голосование лайками вместо звёзд.
-- Лайк = строка в <конкурс>_votes (submission_id + vk_user_id); снять лайк = удалить строку.
-- Выполнить один раз: Supabase → SQL Editor.

-- 1. Старые голоса звёздами (и автоматические «1» за просмотр) с лайками несовместимы —
--    иначе каждая открытая работа считалась бы лайкнутой. Тестовые данные удаляем.
--    Если голоса нужно сохранить, сначала сделайте копию: create table child_votes_stars as table child_votes; и т. п.
delete from child_votes;
delete from team_votes;
delete from individual_votes;

-- 2. Снятие лайка — это delete. Если на таблицах голосов включён RLS, разрешаем удаление
--    (как уже разрешены вставка и обновление). Если RLS выключен — ничего не меняется.
do $$
declare
  t text;
begin
  foreach t in array array['child_votes', 'team_votes', 'individual_votes'] loop
    if (select relrowsecurity from pg_class where oid = to_regclass('public.' || t)) then
      execute format('drop policy if exists "likes delete" on %I', t);
      execute format('create policy "likes delete" on %I for delete using (true)', t);
    end if;
  end loop;
end $$;

-- 3. Итоги: место = число лайков. Сигнатура функции прежняя, чтобы страница результатов
--    работала без изменений: weighted_score, votes и total_votes = число лайков.
create or replace function public.get_weighted_results(p_contest_type text)
returns table(
  submission_id uuid,
  weighted_score numeric,
  votes integer,
  effective_weight numeric,
  total_votes integer
)
language plpgsql
as $function$
begin
  if p_contest_type not in ('child', 'team', 'individual') then
    raise exception 'Неизвестный конкурс: %', p_contest_type;
  end if;

  return query execute format('
    select
      v.submission_id,
      count(*)::numeric  as weighted_score,
      count(*)::integer  as votes,
      count(*)::numeric  as effective_weight,
      count(*)::integer  as total_votes
    from %I v
    join %I c on c.id = v.submission_id and c.is_active
    group by v.submission_id
    order by count(*) desc
  ', p_contest_type || '_votes', p_contest_type || '_contest');
end;
$function$;

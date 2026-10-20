-- Переход с Telegram на VK: колонка telegram_user_id → vk_user_id во всех таблицах.
-- Тип не меняется (VK ID тоже число). Старые строки сохраняют прошлогодние Telegram ID —
-- это тестовые данные, с VK ID они не пересекутся по смыслу, но могут совпасть по числу.
-- Выполнить один раз: Supabase → SQL Editor.

alter table child_votes        rename column telegram_user_id to vk_user_id;
alter table team_votes         rename column telegram_user_id to vk_user_id;
alter table individual_votes   rename column telegram_user_id to vk_user_id;
alter table child_contest      rename column telegram_user_id to vk_user_id;
alter table team_contest       rename column telegram_user_id to vk_user_id;
alter table individual_contest rename column telegram_user_id to vk_user_id;
alter table admins             rename column telegram_user_id to vk_user_id;
alter table upload_diagnostics rename column telegram_user_id to vk_user_id;

-- Функция результатов: telegram_user_id → vk_user_id (логика взвешивания без изменений).
CREATE OR REPLACE FUNCTION public.get_weighted_results(p_contest_type text)
 RETURNS TABLE(submission_id uuid, weighted_score numeric, votes integer, effective_weight numeric, total_votes integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_works_count integer;
  votes_table_name text;
BEGIN
  votes_table_name := p_contest_type || '_votes';

  EXECUTE format('SELECT COUNT(*) FROM %I WHERE is_active = true', p_contest_type || '_contest')
  INTO total_works_count;

  RETURN QUERY EXECUTE format('
    WITH user_activity AS (
      SELECT
        vk_user_id,
        COUNT(CASE WHEN rating > 1 THEN 1 END) as manual_votes,
        CASE
          WHEN COUNT(CASE WHEN rating > 1 THEN 1 END) = 0 THEN 0.0
          WHEN COUNT(CASE WHEN rating > 1 THEN 1 END) BETWEEN 1 AND 3 THEN 0.3
          WHEN COUNT(CASE WHEN rating > 1 THEN 1 END) >= $1 / 2 THEN 1.0
          ELSE (COUNT(CASE WHEN rating > 1 THEN 1 END)::float / ($1 / 2)) * 0.7 + 0.3
        END as weight
      FROM %I
      GROUP BY vk_user_id
    ),
    weighted_scores AS (
      SELECT
        v.submission_id,
        SUM((v.rating - 1) * a.weight) as weighted_sum,
        SUM(a.weight) as total_weight,
        COUNT(CASE WHEN v.rating > 1 THEN 1 END) as manual_vote_count
      FROM %I v
      JOIN user_activity a ON v.vk_user_id = a.vk_user_id
      WHERE v.rating > 1
      GROUP BY v.submission_id
    ),
    total_votes_count AS (
      SELECT
        submission_id,
        COUNT(DISTINCT vk_user_id) as total_voters
      FROM %I
      GROUP BY submission_id
    )
    SELECT
      ws.submission_id,
      ROUND((ws.weighted_sum / NULLIF(ws.total_weight, 0) + 1)::numeric, 3) as weighted_score,
      ws.manual_vote_count::integer as votes,
      ROUND(ws.total_weight::numeric, 2) as effective_weight,
      COALESCE(tv.total_voters, 0)::integer as total_votes
    FROM weighted_scores ws
    LEFT JOIN total_votes_count tv ON ws.submission_id = tv.submission_id
    WHERE ws.total_weight > 0
    ORDER BY weighted_score DESC
  ', votes_table_name, votes_table_name, votes_table_name)
  USING total_works_count;
END;
$function$;

-- Админ.
insert into admins (vk_user_id) values (828307159);

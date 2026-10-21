-- Обложки видео: ссылка на кадр из начала ролика.
-- Выполнить один раз: Supabase → SQL Editor. Безопасно для существующих данных.

alter table child_contest      add column if not exists poster_url text;
alter table team_contest       add column if not exists poster_url text;
alter table individual_contest add column if not exists poster_url text;

-- Сроки конкурса и публикация итогов: одна строка с id = 1, меняется в админке.
-- Выполнить в Supabase → SQL Editor. Можно запускать повторно — ничего не сломается.

create table if not exists site_settings (
  id                  int primary key default 1 check (id = 1),
  submission_deadline timestamptz,
  voting_deadline     timestamptz,
  results_published   boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- Начало голосования (добавлено позже — для уже созданной таблицы).
alter table site_settings add column if not exists voting_start timestamptz;

insert into site_settings (id) values (1) on conflict (id) do nothing;

-- Читать могут все, менять — сайт (как contest_settings: админка ходит с anon-ключом).
alter table site_settings enable row level security;

drop policy if exists "site_settings read" on site_settings;
create policy "site_settings read" on site_settings for select using (true);

drop policy if exists "site_settings write" on site_settings;
create policy "site_settings write" on site_settings for update using (true) with check (id = 1);

drop policy if exists "site_settings insert" on site_settings;
create policy "site_settings insert" on site_settings for insert with check (id = 1);

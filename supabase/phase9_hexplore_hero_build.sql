alter table public.characters
  add column if not exists system_data jsonb not null default '{}'::jsonb;

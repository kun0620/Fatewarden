alter table public.sessions
  add column if not exists run_state jsonb default null;

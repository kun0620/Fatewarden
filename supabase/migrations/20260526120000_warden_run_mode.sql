alter table public.sessions
  drop constraint if exists sessions_mode_check;

alter table public.sessions
  add constraint sessions_mode_check
  check (mode in ('ai_dm', 'campaign', 'warden_run'));

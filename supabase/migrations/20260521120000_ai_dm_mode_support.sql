-- AI DM mode support
-- Adds preset, recap, autosave, and end-session metadata for spec_05.

alter table public.sessions
  add column if not exists dm_preset text not null default 'balanced'
    check (dm_preset in ('balanced', 'grim', 'heroic', 'mystery')),
  add column if not exists session_recap text not null default '',
  add column if not exists last_autosaved_at timestamptz,
  add column if not exists ended_at timestamptz;

create index if not exists idx_sessions_last_autosaved_at
  on public.sessions(last_autosaved_at desc);

create or replace function public.set_session_ai_state(
  target_session_id uuid,
  next_dm_preset text default null,
  next_session_recap text default null,
  mark_autosaved boolean default false,
  mark_ended boolean default false
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_session public.sessions;
begin
  if not exists (
    select 1
    from public.sessions
    where sessions.id = target_session_id
      and sessions.created_by = auth.uid()
  )
  and not exists (
    select 1
    from public.characters
    where characters.session_id = target_session_id
      and characters.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to update this session';
  end if;

  if next_dm_preset is not null
    and next_dm_preset not in ('balanced', 'grim', 'heroic', 'mystery') then
    raise exception 'Invalid AI DM preset';
  end if;

  update public.sessions
  set dm_preset = coalesce(next_dm_preset, dm_preset),
      session_recap = coalesce(next_session_recap, session_recap),
      last_autosaved_at = case when mark_autosaved then now() else last_autosaved_at end,
      status = case when mark_ended then 'ended' else status end,
      ended_at = case when mark_ended then now() else ended_at end,
      updated_at = now()
  where sessions.id = target_session_id
  returning * into updated_session;

  return updated_session;
end;
$$;

grant execute on function public.set_session_ai_state(uuid, text, text, boolean, boolean)
  to authenticated;

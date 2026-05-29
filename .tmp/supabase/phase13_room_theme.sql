alter table public.sessions
  add column if not exists theme_key text not null default 'dark_fantasy',
  add column if not exists theme_tone text not null default 'grim',
  add column if not exists theme_notes text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_theme_key_check'
  ) then
    alter table public.sessions
      add constraint sessions_theme_key_check
      check (theme_key in ('dark_fantasy', 'gothic_horror', 'mystery', 'wilderness', 'heroic_fantasy'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_theme_tone_check'
  ) then
    alter table public.sessions
      add constraint sessions_theme_tone_check
      check (theme_tone in ('grim', 'mysterious', 'cinematic', 'dangerous', 'light_adventure'));
  end if;
end $$;

drop function if exists public.join_session_by_code(text);

create or replace function public.join_session_by_code(code_to_join text)
returns table (
  id uuid,
  title text,
  join_code text,
  play_mode text,
  rules_version text,
  enabled_modules text[],
  house_rules text,
  game_phase text,
  combat_state jsonb,
  theme_key text,
  theme_tone text,
  theme_notes text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sessions.id,
    sessions.title,
    sessions.join_code,
    sessions.play_mode,
    sessions.rules_version,
    sessions.enabled_modules,
    sessions.house_rules,
    sessions.game_phase,
    sessions.combat_state,
    sessions.theme_key,
    sessions.theme_tone,
    sessions.theme_notes,
    sessions.created_at
  from public.sessions
  where sessions.join_code = upper(trim(code_to_join))
  limit 1;
$$;

revoke all on function public.join_session_by_code(text) from public;
grant execute on function public.join_session_by_code(text) to authenticated;

drop function if exists public.set_session_phase(uuid, text);

create or replace function public.set_session_phase(target_session_id uuid, next_phase text)
returns table (
  id uuid,
  title text,
  join_code text,
  play_mode text,
  rules_version text,
  enabled_modules text[],
  house_rules text,
  game_phase text,
  combat_state jsonb,
  theme_key text,
  theme_tone text,
  theme_notes text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if next_phase not in ('setup', 'exploration', 'combat', 'rest') then
    raise exception 'Invalid game phase: %', next_phase;
  end if;

  if not exists (
    select 1
    from public.sessions
    where sessions.id = target_session_id
      and sessions.created_by = auth.uid()
  ) and not exists (
    select 1
    from public.characters
    where characters.session_id = target_session_id
      and characters.user_id = auth.uid()
  ) then
    raise exception 'Not a session member';
  end if;

  update public.sessions
  set game_phase = next_phase
  where sessions.id = target_session_id;

  return query
  select
    sessions.id,
    sessions.title,
    sessions.join_code,
    sessions.play_mode,
    sessions.rules_version,
    sessions.enabled_modules,
    sessions.house_rules,
    sessions.game_phase,
    sessions.combat_state,
    sessions.theme_key,
    sessions.theme_tone,
    sessions.theme_notes,
    sessions.created_at
  from public.sessions
  where sessions.id = target_session_id;
end;
$$;

revoke all on function public.set_session_phase(uuid, text) from public;
grant execute on function public.set_session_phase(uuid, text) to authenticated;

drop function if exists public.set_session_combat_state(uuid, jsonb);

create or replace function public.set_session_combat_state(target_session_id uuid, next_combat_state jsonb)
returns table (
  id uuid,
  title text,
  join_code text,
  play_mode text,
  rules_version text,
  enabled_modules text[],
  house_rules text,
  game_phase text,
  combat_state jsonb,
  theme_key text,
  theme_tone text,
  theme_notes text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.sessions
    where sessions.id = target_session_id
      and sessions.created_by = auth.uid()
  ) and not exists (
    select 1
    from public.characters
    where characters.session_id = target_session_id
      and characters.user_id = auth.uid()
  ) then
    raise exception 'Not a session member';
  end if;

  update public.sessions
  set combat_state = next_combat_state
  where sessions.id = target_session_id;

  return query
  select
    sessions.id,
    sessions.title,
    sessions.join_code,
    sessions.play_mode,
    sessions.rules_version,
    sessions.enabled_modules,
    sessions.house_rules,
    sessions.game_phase,
    sessions.combat_state,
    sessions.theme_key,
    sessions.theme_tone,
    sessions.theme_notes,
    sessions.created_at
  from public.sessions
  where sessions.id = target_session_id;
end;
$$;

revoke all on function public.set_session_combat_state(uuid, jsonb) from public;
grant execute on function public.set_session_combat_state(uuid, jsonb) to authenticated;

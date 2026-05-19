-- Combat state source-of-truth for SRD 5.1 runtime.
-- Keeps sessions.combat_state updated as a legacy realtime bridge.

create table if not exists public.combat_states (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  state jsonb,
  phase text not null default 'setup'
    check (phase in ('setup', 'active', 'ended')),
  round integer not null default 1,
  active_combatant_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_combat_states_session_id
  on public.combat_states(session_id);

alter table public.combat_states enable row level security;

drop policy if exists "Combat states readable by session members" on public.combat_states;
drop policy if exists "Combat states writable by session members" on public.combat_states;

create policy "Combat states readable by session members"
  on public.combat_states for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = combat_states.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = combat_states.session_id
        and characters.user_id = auth.uid()
    )
  );

create policy "Combat states writable by session members"
  on public.combat_states for all
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = combat_states.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = combat_states.session_id
        and characters.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sessions
      where sessions.id = combat_states.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = combat_states.session_id
        and characters.user_id = auth.uid()
    )
  );

create or replace function public.touch_combat_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_combat_states_updated_at on public.combat_states;

create trigger touch_combat_states_updated_at
  before update on public.combat_states
  for each row
  execute function public.touch_combat_states_updated_at();

create or replace function public.set_combat_state(target_session_id uuid, next_combat_state jsonb)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_session public.sessions;
  next_phase text;
  next_round integer;
  next_active_id text;
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
    raise exception 'Not allowed to update this combat state.';
  end if;

  if next_combat_state is null then
    delete from public.combat_states
    where session_id = target_session_id;

    update public.sessions
    set combat_state = null,
        game_phase = 'exploration',
        updated_at = now()
    where id = target_session_id
    returning * into updated_session;

    return updated_session;
  end if;

  next_phase := coalesce(nullif(next_combat_state->>'phase', ''), 'active');
  next_round := greatest(1, coalesce((next_combat_state->>'round')::integer, 1));
  next_active_id := nullif(next_combat_state->>'activeCombatantId', '');

  insert into public.combat_states (session_id, state, phase, round, active_combatant_id)
  values (target_session_id, next_combat_state, next_phase, next_round, next_active_id)
  on conflict (session_id) do update
    set state = excluded.state,
        phase = excluded.phase,
        round = excluded.round,
        active_combatant_id = excluded.active_combatant_id,
        updated_at = now();

  update public.sessions
  set combat_state = next_combat_state,
      game_phase = case when next_phase = 'active' then 'combat' else game_phase end,
      updated_at = now()
  where id = target_session_id
  returning * into updated_session;

  return updated_session;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'combat_states'
  ) then
    alter publication supabase_realtime add table public.combat_states;
  end if;
end $$;

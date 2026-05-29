-- Phase C migration: scene runtime + party voting + companions tables
-- Purpose:
-- 1) Add scene_states for scene mode/objectives/threat clocks
-- 2) Add party_choices + party_votes for multiplayer decision flow
-- 3) Add companions for companion runtime state
-- 4) Apply RLS + indexes + realtime publication

create table if not exists public.scene_states (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  mode text not null default 'exploration'
    check (mode in ('exploration', 'combat', 'social', 'rest', 'horror', 'transition')),
  location text not null default '',
  description text not null default '',
  flags jsonb not null default '{"dangerLevel":"none","realityStability":"stable","isLit":true,"isSilent":false,"hasEscape":true}'::jsonb,
  objectives jsonb[] not null default '{}'::jsonb[],
  threat_clocks jsonb[] not null default '{}'::jsonb[],
  turn_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists public.party_choices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  source_message_id uuid references public.chat_messages(id) on delete set null,
  prompt text not null default '',
  options jsonb not null default '[]'::jsonb,
  resolution_policy text not null default 'majority'
    check (resolution_policy in ('majority', 'unanimous', 'host')),
  status text not null default 'pending'
    check (status in ('pending', 'voting', 'resolved', 'expired')),
  resolved_choice_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.party_votes (
  id uuid primary key default gen_random_uuid(),
  choice_id uuid not null references public.party_choices(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  character_name text not null default '',
  selected_option_id text not null,
  voted_at timestamptz not null default now()
);

create table if not exists public.companions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null
    check (type in ('npc', 'beast', 'summon', 'hireling')),
  character_snapshot jsonb not null default '{}'::jsonb,
  behavior text not null default 'defensive'
    check (behavior in ('aggressive', 'defensive', 'support', 'passive')),
  loyalty jsonb not null default '{"current":50,"tier":"neutral"}'::jsonb,
  resources jsonb[] not null default '{}'::jsonb[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_scene_states_session_id
  on public.scene_states(session_id);

create index if not exists idx_party_choices_session_id
  on public.party_choices(session_id);

create index if not exists idx_party_votes_session_id
  on public.party_votes(session_id);

create index if not exists idx_party_votes_choice_id
  on public.party_votes(choice_id);

create index if not exists idx_companions_session_id
  on public.companions(session_id);

alter table public.scene_states enable row level security;
alter table public.party_choices enable row level security;
alter table public.party_votes enable row level security;
alter table public.companions enable row level security;

drop policy if exists "Scene states readable by session members" on public.scene_states;
drop policy if exists "Scene states writable by session host" on public.scene_states;

create policy "Scene states readable by session members"
  on public.scene_states for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = scene_states.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = scene_states.session_id
        and characters.user_id = auth.uid()
    )
  );

create policy "Scene states writable by session host"
  on public.scene_states for all
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = scene_states.session_id
        and sessions.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sessions
      where sessions.id = scene_states.session_id
        and sessions.created_by = auth.uid()
    )
  );

drop policy if exists "Party choices readable by session members" on public.party_choices;
drop policy if exists "Party choices insert by session host" on public.party_choices;
drop policy if exists "Party choices update by session host" on public.party_choices;

create policy "Party choices readable by session members"
  on public.party_choices for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = party_choices.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = party_choices.session_id
        and characters.user_id = auth.uid()
    )
  );

create policy "Party choices insert by session host"
  on public.party_choices for insert
  with check (
    exists (
      select 1
      from public.sessions
      where sessions.id = party_choices.session_id
        and sessions.created_by = auth.uid()
    )
  );

create policy "Party choices update by session host"
  on public.party_choices for update
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = party_choices.session_id
        and sessions.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sessions
      where sessions.id = party_choices.session_id
        and sessions.created_by = auth.uid()
    )
  );

drop policy if exists "Party votes readable by session members" on public.party_votes;
drop policy if exists "Party votes insert self only" on public.party_votes;

create policy "Party votes readable by session members"
  on public.party_votes for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = party_votes.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = party_votes.session_id
        and characters.user_id = auth.uid()
    )
  );

create policy "Party votes insert self only"
  on public.party_votes for insert
  with check (
    player_id = auth.uid()
    and (
      exists (
        select 1
        from public.sessions
        where sessions.id = party_votes.session_id
          and sessions.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.characters
        where characters.session_id = party_votes.session_id
          and characters.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Companions readable by session members" on public.companions;
drop policy if exists "Companions writable by owner or session host" on public.companions;

create policy "Companions readable by session members"
  on public.companions for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = companions.session_id
        and sessions.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.characters
      where characters.session_id = companions.session_id
        and characters.user_id = auth.uid()
    )
  );

create policy "Companions writable by owner or session host"
  on public.companions for all
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.sessions
      where sessions.id = companions.session_id
        and sessions.created_by = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.sessions
      where sessions.id = companions.session_id
        and sessions.created_by = auth.uid()
    )
  );

create or replace function public.touch_scene_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_scene_states_updated_at on public.scene_states;

create trigger touch_scene_states_updated_at
  before update on public.scene_states
  for each row
  execute function public.touch_scene_states_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scene_states'
  ) then
    alter publication supabase_realtime add table public.scene_states;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'party_choices'
  ) then
    alter publication supabase_realtime add table public.party_choices;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'party_votes'
  ) then
    alter publication supabase_realtime add table public.party_votes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'companions'
  ) then
    alter publication supabase_realtime add table public.companions;
  end if;
end $$;

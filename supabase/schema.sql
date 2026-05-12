create extension if not exists "pgcrypto";

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  join_code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  rules_version text not null default 'srd_5_1',
  enabled_modules text[] not null default array['core','combat','conditions'],
  house_rules text not null default '',
  play_mode text not null default 'dnd' check (play_mode in ('dnd', 'hexplore')),
  game_phase text not null default 'setup' check (game_phase in ('setup', 'exploration', 'combat', 'rest')),
  combat_state jsonb,
  theme_key text not null default 'dark_fantasy' check (theme_key in ('dark_fantasy', 'gothic_horror', 'mystery', 'wilderness', 'heroic_fantasy')),
  theme_tone text not null default 'grim' check (theme_tone in ('grim', 'mysterious', 'cinematic', 'dangerous', 'light_adventure')),
  theme_notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  ancestry text not null default '',
  class_name text not null default '',
  level integer not null default 1 check (level between 1 and 20),
  background text not null default '',
  age text not null default '',
  alignment text not null default '',
  languages text[] not null default '{}',
  proficiencies text[] not null default '{}',
  armor_class integer not null default 10,
  hit_points integer not null default 1,
  max_hit_points integer not null default 1,
  speed integer not null default 30,
  darkvision integer not null default 0,
  inspiration boolean not null default false,
  abilities jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  skills text[] not null default '{}',
  equipment text[] not null default '{}',
  features text[] not null default '{}',
  spells text[] not null default '{}',
  backstory text not null default '',
  personality_traits text[] not null default '{}',
  portrait_url text not null default '',
  system_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.characters
  add constraint characters_session_user_unique unique (session_id, user_id);

create table public.character_vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ancestry text not null default '',
  class_name text not null default '',
  level integer not null default 1 check (level between 1 and 20),
  background text not null default '',
  age text not null default '',
  alignment text not null default '',
  languages text[] not null default '{}',
  proficiencies text[] not null default '{}',
  armor_class integer not null default 10,
  hit_points integer not null default 1,
  max_hit_points integer not null default 1,
  speed integer not null default 30,
  darkvision integer not null default 0,
  inspiration boolean not null default false,
  abilities jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  skills text[] not null default '{}',
  equipment text[] not null default '{}',
  features text[] not null default '{}',
  spells text[] not null default '{}',
  backstory text not null default '',
  personality_traits text[] not null default '{}',
  portrait_url text not null default '',
  system_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.message_speaker as enum ('dm', 'player', 'system');

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  speaker public.message_speaker not null,
  author text not null,
  body text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
alter table public.characters enable row level security;
alter table public.character_vaults enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can read joined sessions"
  on public.sessions for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.characters
      where characters.session_id = sessions.id
      and characters.user_id = auth.uid()
    )
  );

create policy "Users can create sessions"
  on public.sessions for insert
  with check (created_by = auth.uid());

create policy "Users can delete their sessions"
  on public.sessions for delete
  using (created_by = auth.uid());

create policy "Users can read session characters"
  on public.characters for select
  using (user_id = auth.uid());

create policy "Users can manage their character"
  on public.characters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage their vault characters"
  on public.character_vaults for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read session messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.characters
      where characters.session_id = chat_messages.session_id
      and characters.user_id = auth.uid()
    )
  );

create policy "Users can create session messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.characters
      where characters.session_id = chat_messages.session_id
      and characters.user_id = auth.uid()
    )
  );

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

create or replace function public.delete_owned_session(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sessions
  where sessions.id = target_session_id
    and sessions.created_by = auth.uid();

  if not found then
    raise exception 'Not allowed to delete this session';
  end if;
end;
$$;

revoke all on function public.delete_owned_session(uuid) from public;
grant execute on function public.delete_owned_session(uuid) to authenticated;

create or replace function public.touch_character_vault_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_character_vault_updated_at
  before update on public.character_vaults
  for each row
  execute function public.touch_character_vault_updated_at();

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.sessions;

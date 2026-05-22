-- Multiplayer room/session membership support
-- Adds 6-character room codes, session member presence, host actions, and realtime publication.

alter table public.sessions
  add column if not exists room_code text,
  add column if not exists mode text not null default 'ai_dm'
    check (mode in ('ai_dm', 'campaign')),
  add column if not exists preset text,
  add column if not exists campaign_id uuid,
  add column if not exists choice_mode text not null default 'vote'
    check (choice_mode in ('host', 'vote')),
  add column if not exists dice_roller_mode text not null default 'highest_stat'
    check (dice_roller_mode in ('host', 'highest_stat', 'all_best', 'all_worst')),
  add column if not exists host_id uuid references auth.users(id) on delete set null,
  add column if not exists max_players integer not null default 4
    check (max_players between 2 and 5),
  add column if not exists room_code_expires_at timestamptz;

update public.sessions
set room_code = coalesce(room_code, join_code),
    host_id = coalesce(host_id, created_by),
    preset = coalesce(preset, dm_preset),
    choice_mode = coalesce(choice_mode, 'vote'),
    dice_roller_mode = coalesce(dice_roller_mode, 'highest_stat'),
    max_players = least(5, greatest(2, coalesce(party_size, max_players, 4)))
where room_code is null
   or host_id is null
   or preset is null
   or choice_mode is null
   or dice_roller_mode is null
   or max_players is distinct from least(5, greatest(2, coalesce(party_size, max_players, 4)));

create unique index if not exists idx_sessions_room_code_unique
  on public.sessions(room_code)
  where room_code is not null;

create table if not exists public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  role text not null default 'player'
    check (role in ('host', 'player')),
  status text not null default 'online'
    check (status in ('online', 'offline', 'kicked')),
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create index if not exists idx_session_members_session_id
  on public.session_members(session_id);

create index if not exists idx_session_members_player_id
  on public.session_members(player_id);

create index if not exists idx_session_members_last_seen
  on public.session_members(session_id, last_seen desc);

alter table public.session_members enable row level security;

create or replace function public.is_session_host(target_session_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = target_session_id
      and coalesce(s.host_id, s.created_by) = target_user_id
  )
  or exists (
    select 1
    from public.session_members sm
    where sm.session_id = target_session_id
      and sm.player_id = target_user_id
      and sm.role = 'host'
      and sm.status <> 'kicked'
  );
$$;

create or replace function public.is_session_host(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_session_host(target_session_id, auth.uid());
$$;

create or replace function public.is_session_member(target_session_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_session_host(target_session_id, target_user_id)
  or exists (
    select 1
    from public.session_members sm
    where sm.session_id = target_session_id
      and sm.player_id = target_user_id
      and sm.status <> 'kicked'
  );
$$;

create or replace function public.is_session_member(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_session_member(target_session_id, auth.uid());
$$;

drop policy if exists "Session members readable by session members" on public.session_members;
drop policy if exists "Session members insert self" on public.session_members;
drop policy if exists "Session members update self or host" on public.session_members;
drop policy if exists "Session members delete self or host" on public.session_members;

create policy "Session members readable by session members"
  on public.session_members for select
  using (public.is_session_member(session_id, auth.uid()));

create policy "Session members insert self"
  on public.session_members for insert
  with check (player_id = auth.uid());

create policy "Session members update self or host"
  on public.session_members for update
  using (player_id = auth.uid() or public.is_session_host(session_id, auth.uid()))
  with check (player_id = auth.uid() or public.is_session_host(session_id, auth.uid()));

create policy "Session members delete self or host"
  on public.session_members for delete
  using (player_id = auth.uid() or public.is_session_host(session_id, auth.uid()));

create or replace function public.touch_session_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_session_members_updated_at on public.session_members;

create trigger touch_session_members_updated_at
  before update on public.session_members
  for each row
  execute function public.touch_session_members_updated_at();

create or replace function public.handle_new_session_host_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_user uuid;
begin
  host_user := coalesce(new.host_id, new.created_by);

  if host_user is not null then
    insert into public.session_members (session_id, player_id, role, status, last_seen)
    values (new.id, host_user, 'host', 'online', now())
    on conflict (session_id, player_id) do update
    set role = 'host',
        status = 'online',
        last_seen = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_session_created_create_host_member on public.sessions;

create trigger on_session_created_create_host_member
  after insert on public.sessions
  for each row
  execute function public.handle_new_session_host_member();

insert into public.session_members (session_id, player_id, role, status, last_seen)
select s.id, coalesce(s.host_id, s.created_by), 'host', 'offline', coalesce(s.updated_at, s.created_at, now())
from public.sessions s
where coalesce(s.host_id, s.created_by) is not null
on conflict (session_id, player_id) do nothing;

drop function if exists public.join_session_by_code(text);
drop function if exists public.ensure_session_member(uuid, uuid);
drop function if exists public.ensure_session_member(uuid);
drop function if exists public.set_session_member_presence(uuid, text, uuid);
drop function if exists public.set_session_member_presence(uuid, text);
drop function if exists public.kick_session_member(uuid, uuid);
drop function if exists public.start_multiplayer_session(uuid);
drop function if exists public.end_multiplayer_session(uuid, text);
drop function if exists public.end_multiplayer_session(uuid);

create or replace function public.join_session_by_code(code_to_join text)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions;
  member_count integer;
  next_role text;
begin
  select *
  into target_session
  from public.sessions s
  where upper(coalesce(s.room_code, s.join_code)) = upper(code_to_join)
    and coalesce(s.status, 'active') <> 'ended'
    and (s.room_code_expires_at is null or s.room_code_expires_at > now())
  limit 1;

  if target_session.id is null then
    raise exception 'No active room found for code %', code_to_join using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.session_members sm
    where sm.session_id = target_session.id
      and sm.player_id = auth.uid()
      and sm.status = 'kicked'
  ) then
    raise exception 'You were removed from this room.' using errcode = '42501';
  end if;

  select count(*)
  into member_count
  from public.session_members sm
  where sm.session_id = target_session.id
    and sm.status <> 'kicked';

  if not public.is_session_member(target_session.id, auth.uid()) and member_count >= coalesce(target_session.max_players, target_session.party_size, 4) then
    raise exception 'Room is full.' using errcode = 'P0001';
  end if;

  next_role := case
    when coalesce(target_session.host_id, target_session.created_by) = auth.uid() then 'host'
    else 'player'
  end;

  insert into public.session_members (session_id, player_id, role, status, last_seen)
  values (target_session.id, auth.uid(), next_role, 'online', now())
  on conflict (session_id, player_id) do update
  set status = 'online',
      role = case when session_members.role = 'host' then 'host' else excluded.role end,
      last_seen = now();

  return target_session;
end;
$$;

create or replace function public.ensure_session_member(target_session_id uuid, target_character_id uuid default null)
returns public.session_members
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions;
  member_count integer;
  next_member public.session_members;
  next_role text;
begin
  select *
  into target_session
  from public.sessions
  where id = target_session_id
    and coalesce(status, 'active') <> 'ended';

  if target_session.id is null then
    raise exception 'Session is not joinable.' using errcode = 'P0002';
  end if;

  select count(*)
  into member_count
  from public.session_members
  where session_id = target_session_id
    and status <> 'kicked';

  if not public.is_session_member(target_session_id, auth.uid()) and member_count >= coalesce(target_session.max_players, target_session.party_size, 4) then
    raise exception 'Room is full.' using errcode = 'P0001';
  end if;

  next_role := case
    when coalesce(target_session.host_id, target_session.created_by) = auth.uid() then 'host'
    else 'player'
  end;

  insert into public.session_members (session_id, player_id, character_id, role, status, last_seen)
  values (target_session_id, auth.uid(), target_character_id, next_role, 'online', now())
  on conflict (session_id, player_id) do update
  set character_id = coalesce(excluded.character_id, session_members.character_id),
      role = case when session_members.role = 'host' then 'host' else excluded.role end,
      status = 'online',
      last_seen = now()
  returning * into next_member;

  return next_member;
end;
$$;

create or replace function public.set_session_member_presence(
  target_session_id uuid,
  next_status text,
  next_character_id uuid default null
)
returns public.session_members
language plpgsql
security definer
set search_path = public
as $$
declare
  next_member public.session_members;
begin
  if next_status not in ('online', 'offline') then
    raise exception 'Invalid presence status.' using errcode = '22023';
  end if;

  insert into public.session_members (session_id, player_id, character_id, role, status, last_seen)
  values (
    target_session_id,
    auth.uid(),
    next_character_id,
    case when public.is_session_host(target_session_id, auth.uid()) then 'host' else 'player' end,
    next_status,
    now()
  )
  on conflict (session_id, player_id) do update
  set character_id = coalesce(excluded.character_id, session_members.character_id),
      status = excluded.status,
      last_seen = now()
  returning * into next_member;

  return next_member;
end;
$$;

create or replace function public.kick_session_member(target_session_id uuid, target_player_id uuid)
returns public.session_members
language plpgsql
security definer
set search_path = public
as $$
declare
  next_member public.session_members;
begin
  if not public.is_session_host(target_session_id, auth.uid()) then
    raise exception 'Only the host can remove players.' using errcode = '42501';
  end if;

  if target_player_id = auth.uid() then
    raise exception 'Host cannot kick themselves.' using errcode = '22023';
  end if;

  update public.session_members
  set status = 'kicked',
      last_seen = now()
  where session_id = target_session_id
    and player_id = target_player_id
  returning * into next_member;

  if next_member.id is null then
    raise exception 'Member not found.' using errcode = 'P0002';
  end if;

  return next_member;
end;
$$;

create or replace function public.start_multiplayer_session(target_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions;
begin
  if not public.is_session_host(target_session_id, auth.uid()) then
    raise exception 'Only the host can start the session.' using errcode = '42501';
  end if;

  update public.sessions
  set status = 'active',
      game_phase = coalesce(nullif(game_phase, 'setup'), 'exploration')
  where id = target_session_id
  returning * into target_session;

  return target_session;
end;
$$;

create or replace function public.end_multiplayer_session(target_session_id uuid, next_recap text default null)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions;
begin
  if not public.is_session_host(target_session_id, auth.uid()) then
    raise exception 'Only the host can end the session.' using errcode = '42501';
  end if;

  update public.sessions
  set status = 'ended',
      ended_at = now(),
      room_code_expires_at = now(),
      session_recap = coalesce(next_recap, session_recap, '')
  where id = target_session_id
  returning * into target_session;

  update public.session_members
  set status = 'offline',
      last_seen = now()
  where session_id = target_session_id
    and status <> 'kicked';

  return target_session;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_members'
  ) then
    alter publication supabase_realtime add table public.session_members;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'chat_messages')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    )
  then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'scene_states')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scene_states'
    )
  then
    alter publication supabase_realtime add table public.scene_states;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'combat_states')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'combat_states'
    )
  then
    alter publication supabase_realtime add table public.combat_states;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'characters')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'characters'
    )
  then
    alter publication supabase_realtime add table public.characters;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'party_choices')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'party_choices'
    )
  then
    alter publication supabase_realtime add table public.party_choices;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'party_votes')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'party_votes'
    )
  then
    alter publication supabase_realtime add table public.party_votes;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'companions')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'companions'
    )
  then
    alter publication supabase_realtime add table public.companions;
  end if;
end $$;

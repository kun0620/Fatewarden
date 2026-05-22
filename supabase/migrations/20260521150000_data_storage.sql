-- Spec 13: data storage, retention, exports, and storage accounting.

alter table public.sessions
  add column if not exists ended_at timestamptz;

create table if not exists public.campaign_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  current_node_id text,
  flags jsonb not null default '{}'::jsonb,
  progress_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  speaker text not null check (speaker in ('dm', 'player', 'system', 'ai')),
  author text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.storage_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null check (bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images')),
  object_path text not null,
  public_url text not null default '',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  mime_type text not null default '',
  owner_kind text not null default 'user',
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

alter table public.campaign_saves enable row level security;
alter table public.campaign_progress enable row level security;
alter table public.story_messages enable row level security;
alter table public.storage_files enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('portraits', 'portraits', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('thumbnails', 'thumbnails', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('campaign-images', 'campaign-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.touch_data_storage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_campaign_saves_updated_at on public.campaign_saves;
create trigger touch_campaign_saves_updated_at
  before update on public.campaign_saves
  for each row execute function public.touch_data_storage_updated_at();

drop trigger if exists touch_campaign_progress_updated_at on public.campaign_progress;
create trigger touch_campaign_progress_updated_at
  before update on public.campaign_progress
  for each row execute function public.touch_data_storage_updated_at();

drop trigger if exists touch_storage_files_updated_at on public.storage_files;
create trigger touch_storage_files_updated_at
  before update on public.storage_files
  for each row execute function public.touch_data_storage_updated_at();

create index if not exists campaign_saves_user_id_idx on public.campaign_saves(user_id);
create index if not exists campaign_saves_session_id_idx on public.campaign_saves(session_id);
create index if not exists campaign_saves_campaign_id_idx on public.campaign_saves(campaign_id);
create index if not exists campaign_progress_user_id_idx on public.campaign_progress(user_id);
create index if not exists campaign_progress_session_id_idx on public.campaign_progress(session_id);
create index if not exists campaign_progress_campaign_id_idx on public.campaign_progress(campaign_id);
create index if not exists story_messages_session_id_idx on public.story_messages(session_id, created_at);
create index if not exists storage_files_user_id_idx on public.storage_files(user_id);
create index if not exists storage_files_bucket_path_idx on public.storage_files(bucket_id, object_path);
create index if not exists sessions_created_by_idx on public.sessions(created_by);
create index if not exists sessions_ended_at_idx on public.sessions(ended_at);
create index if not exists characters_user_id_idx on public.characters(user_id);
create index if not exists characters_session_id_idx on public.characters(session_id);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_saves' and policyname = 'Users manage own campaign saves') then
    create policy "Users manage own campaign saves"
      on public.campaign_saves for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaign_progress' and policyname = 'Users manage own campaign progress') then
    create policy "Users manage own campaign progress"
      on public.campaign_progress for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'story_messages' and policyname = 'Session members read story messages') then
    create policy "Session members read story messages"
      on public.story_messages for select
      using (public.is_session_member(session_id) or public.is_session_host(session_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'story_messages' and policyname = 'Session members create story messages') then
    create policy "Session members create story messages"
      on public.story_messages for insert
      with check (public.is_session_member(session_id) or public.is_session_host(session_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'storage_files' and policyname = 'Users manage own storage files') then
    create policy "Users manage own storage files"
      on public.storage_files for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read Fatewarden images') then
    create policy "Public read Fatewarden images"
      on storage.objects for select
      using (bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users upload own Fatewarden images') then
    create policy "Users upload own Fatewarden images"
      on storage.objects for insert
      with check (
        bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images')
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users update own Fatewarden images') then
    create policy "Users update own Fatewarden images"
      on storage.objects for update
      using (
        bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images')
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images')
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users delete own Fatewarden images') then
    create policy "Users delete own Fatewarden images"
      on storage.objects for delete
      using (
        bucket_id in ('avatars', 'portraits', 'thumbnails', 'campaign-images')
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

create or replace function public.track_storage_file(
  target_bucket_id text,
  target_object_path text,
  target_public_url text,
  target_size_bytes bigint,
  target_mime_type text,
  target_owner_kind text default 'user',
  target_owner_id uuid default null
)
returns public.storage_files
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.storage_files;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if split_part(target_object_path, '/', 1) <> auth.uid()::text then
    raise exception 'Storage path must live inside the user folder';
  end if;

  insert into public.storage_files (
    user_id,
    bucket_id,
    object_path,
    public_url,
    size_bytes,
    mime_type,
    owner_kind,
    owner_id
  )
  values (
    auth.uid(),
    target_bucket_id,
    target_object_path,
    target_public_url,
    target_size_bytes,
    target_mime_type,
    target_owner_kind,
    target_owner_id
  )
  on conflict (bucket_id, object_path) do update
  set
    public_url = excluded.public_url,
    size_bytes = excluded.size_bytes,
    mime_type = excluded.mime_type,
    owner_kind = excluded.owner_kind,
    owner_id = excluded.owner_id,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

create or replace function public.user_storage_usage(target_user uuid default auth.uid())
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.storage_files
  where user_id = coalesce(target_user, auth.uid());
$$;

create or replace function public.delete_expired_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.story_messages
  using public.sessions
  where story_messages.session_id = sessions.id
    and sessions.ended_at is not null
    and sessions.ended_at < now() - interval '1 year';

  delete from public.sessions
  where ended_at is not null
    and ended_at < now() - interval '1 year';
end;
$$;

create or replace function public.hard_delete_expired_accounts()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users
  using public.profiles
  where users.id = profiles.id
    and profiles.delete_after is not null
    and profiles.delete_after <= now();
end;
$$;

update public.characters
set inventory = jsonb_build_object(
  'items',
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'templateId', lower(regexp_replace(item_name, '[^a-z0-9]+', '-', 'g')),
      'name', item_name,
      'description', '',
      'category', 'gear',
      'rarity', 'common',
      'weight', 0,
      'value', 0,
      'quantity', 1,
      'equipped', false,
      'attunement', false,
      'attuned', false,
      'effects', '[]'::jsonb
    )), '[]'::jsonb)
    from unnest(equipment) as item_name
    where trim(item_name) <> ''
  ),
  'maxCarryWeight', greatest(coalesce((abilities->>'str')::integer, 10), 1) * 15,
  'currency', jsonb_build_object('pp', 0, 'gp', 0, 'ep', 0, 'sp', 0, 'cp', 0)
)
where jsonb_array_length(coalesce(inventory->'items', '[]'::jsonb)) = 0
  and cardinality(equipment) > 0;

update public.character_vaults
set inventory = jsonb_build_object(
  'items',
  (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', gen_random_uuid()::text,
      'templateId', lower(regexp_replace(item_name, '[^a-z0-9]+', '-', 'g')),
      'name', item_name,
      'description', '',
      'category', 'gear',
      'rarity', 'common',
      'weight', 0,
      'value', 0,
      'quantity', 1,
      'equipped', false,
      'attunement', false,
      'attuned', false,
      'effects', '[]'::jsonb
    )), '[]'::jsonb)
    from unnest(equipment) as item_name
    where trim(item_name) <> ''
  ),
  'maxCarryWeight', greatest(coalesce((abilities->>'str')::integer, 10), 1) * 15,
  'currency', jsonb_build_object('pp', 0, 'gp', 0, 'ep', 0, 'sp', 0, 'cp', 0)
)
where jsonb_array_length(coalesce(inventory->'items', '[]'::jsonb)) = 0
  and cardinality(equipment) > 0;

comment on function public.delete_expired_data() is
  'Run daily from Supabase scheduled jobs: removes story/session data one year after session end.';

comment on function public.hard_delete_expired_accounts() is
  'Run daily with service privileges: permanently removes profiles/auth users after the 30-day soft-delete window.';

comment on table public.storage_files is
  'Tracks uploaded image files for user-side storage usage, export metadata, and the 100MB quota Edge Function.';

comment on schema public is
  'Enable Supabase PITR backups from the project dashboard for production recovery; this migration only adds application-side retention and quota metadata.';

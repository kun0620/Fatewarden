-- Auth + dashboard profile support
-- Adds user profiles, dashboard metadata columns, campaign shells, and avatar storage policies.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  username text not null unique,
  display_name text not null default '',
  avatar_url text,
  username_changed_at timestamptz,
  deleted_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (
      username ~ '^[a-z][a-z0-9_]{2,19}$'
      and char_length(username) between 3 and 20
    )
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_deleted_at on public.profiles(deleted_at);

alter table public.profiles enable row level security;

drop policy if exists "Profiles readable by owner" on public.profiles;
drop policy if exists "Profiles insert self" on public.profiles;
drop policy if exists "Profiles update self" on public.profiles;

create policy "Profiles readable by owner"
  on public.profiles for select
  using (id = auth.uid());

create policy "Profiles insert self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Profiles update self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace view public.profile_public as
select id, username, display_name, avatar_url
from public.profiles
where deleted_at is null;

grant select on public.profile_public to authenticated;

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;

create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_profiles_updated_at();

create or replace function public.normalize_profile_username(raw_email text, raw_username text)
returns text
language plpgsql
stable
as $$
declare
  base text;
begin
  base := lower(coalesce(nullif(raw_username, ''), split_part(coalesce(raw_email, 'warden'), '@', 1)));
  base := regexp_replace(base, '[^a-z0-9_]+', '_', 'g');
  base := regexp_replace(base, '^_+|_+$', '', 'g');

  if base !~ '^[a-z]' then
    base := 'w_' || base;
  end if;

  base := substring(base from 1 for 20);

  if char_length(base) < 3 then
    base := base || substring(md5(coalesce(raw_email, gen_random_uuid()::text)) from 1 for 3 - char_length(base));
  end if;

  return base;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := public.normalize_profile_username(
    new.email,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'handle')
  );
  candidate := base_username;

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := substring(base_username from 1 for greatest(3, 20 - char_length(suffix::text) - 1)) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, email, username, display_name, username_changed_at)
  values (
    new.id,
    coalesce(new.email, ''),
    candidate,
    coalesce(nullif(new.raw_user_meta_data->>'displayName', ''), nullif(new.raw_user_meta_data->>'name', ''), candidate),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

alter table public.sessions
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'active', 'ended'));

create or replace function public.touch_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_sessions_updated_at on public.sessions;

create trigger touch_sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.touch_sessions_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null default '',
  thumbnail_url text,
  acts_count integer not null default 1,
  level_min integer not null default 1,
  level_max integer not null default 5,
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_author_updated
  on public.campaigns(author_id, updated_at desc);

alter table public.campaigns enable row level security;

drop policy if exists "Campaigns readable by owner or public" on public.campaigns;
drop policy if exists "Campaigns writable by owner" on public.campaigns;

create policy "Campaigns readable by owner or public"
  on public.campaigns for select
  using (author_id = auth.uid() or visibility = 'public');

create policy "Campaigns writable by owner"
  on public.campaigns for all
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create or replace function public.touch_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_campaigns_updated_at on public.campaigns;

create trigger touch_campaigns_updated_at
  before update on public.campaigns
  for each row
  execute function public.touch_campaigns_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are public" on storage.objects;
drop policy if exists "Users upload own avatars" on storage.objects;
drop policy if exists "Users update own avatars" on storage.objects;
drop policy if exists "Users delete own avatars" on storage.objects;

create policy "Avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

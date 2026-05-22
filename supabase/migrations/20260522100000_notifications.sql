-- Spec 14: in-app notifications.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('session_invite', 'party_join', 'party_leave', 'vote_started', 'turn_reminder')),
  title text not null,
  body text not null,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications(user_id, read);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users read own notifications') then
    create policy "Users read own notifications"
      on public.notifications for select
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users update own notifications') then
    create policy "Users update own notifications"
      on public.notifications for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users delete own notifications') then
    create policy "Users delete own notifications"
      on public.notifications for delete
      using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_metadata jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.notifications;
begin
  if notification_type not in ('session_invite', 'party_join', 'party_leave', 'vote_started', 'turn_reminder') then
    raise exception 'Invalid notification type: %', notification_type;
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    target_user_id,
    notification_type,
    notification_title,
    notification_body,
    coalesce(notification_metadata, '{}'::jsonb)
  )
  returning * into row;

  return row;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read = true
  where user_id = auth.uid()
    and read = false;
$$;

create or replace function public.delete_old_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where created_at < now() - interval '7 days';
$$;

create or replace function public.notification_actor_label(actor_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(p.display_name, ''),
    nullif(p.username, ''),
    'A player'
  )
  from public.profiles p
  where p.id = actor_user_id
  limit 1;
$$;

create or replace function public.notify_party_choice_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row record;
  session_title text;
begin
  select title into session_title from public.sessions where id = new.session_id;

  for member_row in
    select player_id
    from public.session_members
    where session_id = new.session_id
      and status <> 'kicked'
  loop
    perform public.create_notification(
      member_row.player_id,
      'vote_started',
      'Vote started',
      'A vote has begun: ' || left(coalesce(new.prompt, 'Party decision'), 120),
      jsonb_build_object(
        'sessionId', new.session_id,
        'choiceId', new.id,
        'sessionTitle', coalesce(session_title, '')
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_party_choice_started on public.party_choices;
create trigger notify_party_choice_started
  after insert on public.party_choices
  for each row
  execute function public.notify_party_choice_started();

create or replace function public.notify_session_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row record;
  actor_label text;
  session_title text;
  target_session_id uuid;
  actor_user_id uuid;
  notification_type text;
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    target_session_id := new.session_id;
    actor_user_id := new.player_id;
    notification_type := 'party_join';
    notification_title := 'Party joined';
    actor_label := public.notification_actor_label(actor_user_id);
    notification_body := actor_label || ' joined the party';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('offline', 'kicked') then
    target_session_id := new.session_id;
    actor_user_id := new.player_id;
    notification_type := 'party_leave';
    notification_title := 'Party left';
    actor_label := public.notification_actor_label(actor_user_id);
    notification_body := actor_label || ' left the party';
  else
    return new;
  end if;

  select title into session_title from public.sessions where id = target_session_id;

  for member_row in
    select player_id
    from public.session_members
    where session_id = target_session_id
      and status <> 'kicked'
      and player_id <> actor_user_id
  loop
    perform public.create_notification(
      member_row.player_id,
      notification_type,
      notification_title,
      notification_body,
      jsonb_build_object(
        'sessionId', target_session_id,
        'fromUserId', actor_user_id,
        'sessionTitle', coalesce(session_title, '')
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_session_member_insert on public.session_members;
create trigger notify_session_member_insert
  after insert on public.session_members
  for each row
  execute function public.notify_session_member_change();

drop trigger if exists notify_session_member_status_update on public.session_members;
create trigger notify_session_member_status_update
  after update of status on public.session_members
  for each row
  execute function public.notify_session_member_change();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

comment on function public.delete_old_notifications() is
  'Run daily from Supabase scheduled jobs or pg_cron to keep notification history to 7 days.';

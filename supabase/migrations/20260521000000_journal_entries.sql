create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  character_id text not null,
  type text not null check (type in ('memory','clue','quest_update','recap')),
  title text not null,
  content text not null default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table journal_entries enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'journal_entries'
      and policyname = 'session members'
  ) then
    create policy "session members" on journal_entries for all using (
      session_id in (select id from sessions where created_by = auth.uid())
    );
  end if;
end $$;

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  character_id text not null,
  npc_id text not null,
  npc_name text not null,
  npc_role text,
  affinity integer not null default 0 check (affinity >= -100 and affinity <= 100),
  history jsonb default '[]',
  updated_at timestamptz default now(),
  unique(session_id, character_id, npc_id)
);
alter table relationships enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'relationships'
      and policyname = 'session members'
  ) then
    create policy "session members" on relationships for all using (
      session_id in (select id from sessions where created_by = auth.uid())
    );
  end if;
end $$;

-- Add is_ready flag to session_members for lobby ready-check sync
alter table public.session_members
  add column if not exists is_ready boolean not null default false;

-- Reset is_ready when a session ends
create or replace function public.reset_member_ready_on_session_end()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    update public.session_members
    set is_ready = false
    where session_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_ready_on_session_end on public.sessions;
create trigger trg_reset_ready_on_session_end
  after update on public.sessions
  for each row execute function public.reset_member_ready_on_session_end();

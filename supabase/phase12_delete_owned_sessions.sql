drop policy if exists "Users can delete their sessions" on public.sessions;

create policy "Users can delete their sessions"
  on public.sessions for delete
  using (created_by = auth.uid());

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

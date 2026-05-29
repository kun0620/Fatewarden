create or replace function public.is_session_member(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.characters
    where characters.session_id = target_session_id
      and characters.user_id = auth.uid()
  );
$$;

revoke all on function public.is_session_member(uuid) from public;
grant execute on function public.is_session_member(uuid) to authenticated;

drop policy if exists "Users can read session characters" on public.characters;

create policy "Users can read session characters"
  on public.characters for select
  using (
    user_id = auth.uid()
    or public.is_session_member(session_id)
  );

drop policy if exists "Users can read session characters" on public.characters;

create policy "Users can read session characters"
  on public.characters for select
  using (user_id = auth.uid());

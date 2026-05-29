alter table public.sessions
  add column if not exists rules_version text not null default 'srd_5_1',
  add column if not exists enabled_modules text[] not null default array['core','combat','conditions'],
  add column if not exists house_rules text not null default '';

drop function if exists public.join_session_by_code(text);

create or replace function public.join_session_by_code(code_to_join text)
returns table (
  id uuid,
  title text,
  join_code text,
  rules_version text,
  enabled_modules text[],
  house_rules text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    sessions.id,
    sessions.title,
    sessions.join_code,
    sessions.rules_version,
    sessions.enabled_modules,
    sessions.house_rules,
    sessions.created_at
  from public.sessions
  where sessions.join_code = upper(trim(code_to_join))
  limit 1;
$$;

revoke all on function public.join_session_by_code(text) from public;
grant execute on function public.join_session_by_code(text) to authenticated;

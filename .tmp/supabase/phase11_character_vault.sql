create table if not exists public.character_vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ancestry text not null default '',
  class_name text not null default '',
  level integer not null default 1 check (level between 1 and 20),
  background text not null default '',
  age text not null default '',
  alignment text not null default '',
  languages text[] not null default '{}',
  proficiencies text[] not null default '{}',
  armor_class integer not null default 10,
  hit_points integer not null default 1,
  max_hit_points integer not null default 1,
  speed integer not null default 30,
  darkvision integer not null default 0,
  inspiration boolean not null default false,
  abilities jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  skills text[] not null default '{}',
  equipment text[] not null default '{}',
  features text[] not null default '{}',
  spells text[] not null default '{}',
  backstory text not null default '',
  personality_traits text[] not null default '{}',
  portrait_url text not null default '',
  system_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_vaults enable row level security;

drop policy if exists "Users can manage their vault characters" on public.character_vaults;

create policy "Users can manage their vault characters"
  on public.character_vaults for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.touch_character_vault_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_character_vault_updated_at on public.character_vaults;

create trigger touch_character_vault_updated_at
  before update on public.character_vaults
  for each row
  execute function public.touch_character_vault_updated_at();

-- Character system additive fields
-- Adds SRD builder metadata, rich inventory snapshots, personality blocks, saves, spells, and updated_at support.

alter table public.characters
  add column if not exists subrace text not null default '',
  add column if not exists subclass text not null default '',
  add column if not exists inventory jsonb not null default '{"items":[],"maxCarryWeight":150,"currency":{"pp":0,"gp":0,"ep":0,"sp":0,"cp":0}}'::jsonb,
  add column if not exists personality jsonb not null default '{"traits":"","ideals":"","bonds":"","flaws":"","backstory":"","quote":""}'::jsonb,
  add column if not exists saving_throws text[] not null default '{}'::text[],
  add column if not exists spells_known text[] not null default '{}'::text[],
  add column if not exists updated_at timestamptz not null default now();

alter table public.character_vaults
  add column if not exists subrace text not null default '',
  add column if not exists subclass text not null default '',
  add column if not exists inventory jsonb not null default '{"items":[],"maxCarryWeight":150,"currency":{"pp":0,"gp":0,"ep":0,"sp":0,"cp":0}}'::jsonb,
  add column if not exists personality jsonb not null default '{"traits":"","ideals":"","bonds":"","flaws":"","backstory":"","quote":""}'::jsonb,
  add column if not exists saving_throws text[] not null default '{}'::text[],
  add column if not exists spells_known text[] not null default '{}'::text[],
  add column if not exists updated_at timestamptz not null default now();

update public.characters
set
  personality = jsonb_build_object(
    'traits', array_to_string(personality_traits, E'\n'),
    'ideals', '',
    'bonds', '',
    'flaws', '',
    'backstory', backstory,
    'quote', ''
  )
where personality = '{"traits":"","ideals":"","bonds":"","flaws":"","backstory":"","quote":""}'::jsonb
  and (array_length(personality_traits, 1) is not null or backstory <> '');

update public.character_vaults
set
  personality = jsonb_build_object(
    'traits', array_to_string(personality_traits, E'\n'),
    'ideals', '',
    'bonds', '',
    'flaws', '',
    'backstory', backstory,
    'quote', ''
  )
where personality = '{"traits":"","ideals":"","bonds":"","flaws":"","backstory":"","quote":""}'::jsonb
  and (array_length(personality_traits, 1) is not null or backstory <> '');

create or replace function public.touch_characters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_characters_updated_at on public.characters;

create trigger touch_characters_updated_at
  before update on public.characters
  for each row
  execute function public.touch_characters_updated_at();

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

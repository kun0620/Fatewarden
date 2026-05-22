-- Spec 15: user settings persistence.

alter table public.profiles
  add column if not exists settings jsonb not null default '{
    "language": "en",
    "theme": "vigil",
    "soundEnabled": true,
    "defaultDmPreset": "dark_fantasy",
    "hpCalculation": "average",
    "autoSave": true,
    "defaultDiceRoller": "manual",
    "combatAutomation": "semi_auto",
    "partyChoiceTimeout": 60
  }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_settings_shape;

alter table public.profiles
  add constraint profiles_settings_shape
  check (
    settings ? 'language'
    and settings ? 'theme'
    and settings ? 'soundEnabled'
    and settings ? 'defaultDmPreset'
    and settings ? 'hpCalculation'
    and settings ? 'autoSave'
    and settings ? 'defaultDiceRoller'
    and settings ? 'combatAutomation'
    and settings ? 'partyChoiceTimeout'
    and settings->>'language' in ('th', 'en')
    and settings->>'theme' in ('vigil', 'frost', 'ash')
    and settings->>'defaultDmPreset' in ('dark_fantasy', 'storyteller', 'horror', 'heroic')
    and settings->>'hpCalculation' in ('roll', 'average')
    and settings->>'defaultDiceRoller' in ('manual', 'auto')
    and settings->>'combatAutomation' in ('full_manual', 'semi_auto', 'full_auto')
    and case
      when settings->'partyChoiceTimeout' = 'null'::jsonb then true
      when jsonb_typeof(settings->'partyChoiceTimeout') = 'number' then (settings->>'partyChoiceTimeout')::integer in (30, 60, 120)
      else false
    end
  );

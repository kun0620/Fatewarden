import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { getDefaultRestState } from '../engine/character/rest';
import { createEmptyInventory, inventoryToNames } from '../lib/inventory';
import type {
  AbilityKey,
  Character,
  CharacterPersonality,
  CharacterSystemData,
  ExhaustionLevel,
  Inventory,
  Item,
  VaultCharacter,
} from '../types';
import { cloneCharacterForVault } from './characterImportExport';
import { normalizeHexHeroBuild } from './hexplore';
import { supabase } from './supabase';

type CharacterRow = {
  id: string;
  user_id?: string | null;
  name: string;
  ancestry: string;
  subrace?: string | null;
  class_name: string;
  subclass?: string | null;
  level: number;
  background?: string | null;
  age?: string | null;
  alignment?: string | null;
  languages?: string[] | null;
  proficiencies?: string[] | null;
  armor_class: number;
  hit_points: number;
  max_hit_points: number;
  speed?: number | null;
  darkvision?: number | null;
  inspiration?: boolean | null;
  abilities: Record<AbilityKey, number>;
  str?: number | null;
  skills: string[];
  inventory?: Inventory | null;
  equipment?: string[] | null;
  features?: string[] | null;
  spells?: string[] | null;
  spells_known?: string[] | null;
  backstory?: string | null;
  personality?: CharacterPersonality | null;
  personality_traits?: string[] | null;
  saving_throws?: AbilityKey[] | null;
  portrait_url?: string | null;
  system_data?: CharacterSystemData | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const characterSelect = [
  'id',
  'user_id',
  'name',
  'ancestry',
  'subrace',
  'class_name',
  'subclass',
  'level',
  'background',
  'age',
  'alignment',
  'languages',
  'proficiencies',
  'armor_class',
  'hit_points',
  'max_hit_points',
  'speed',
  'darkvision',
  'inspiration',
  'abilities',
  'skills',
  'inventory',
  'equipment',
  'features',
  'spells',
  'spells_known',
  'backstory',
  'personality',
  'personality_traits',
  'saving_throws',
  'portrait_url',
  'system_data',
  'created_at',
  'updated_at',
].join(',');

const legacyCharacterSelect = 'id,name,ancestry,class_name,level,armor_class,hit_points,max_hit_points,abilities,skills';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function isInventory(value: unknown): value is Inventory {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as Inventory).items);
}

function toPersonality(raw: CharacterRow): CharacterPersonality {
  if (raw.personality && typeof raw.personality === 'object') {
    return {
      traits: raw.personality.traits ?? '',
      ideals: raw.personality.ideals ?? '',
      bonds: raw.personality.bonds ?? '',
      flaws: raw.personality.flaws ?? '',
      backstory: raw.personality.backstory ?? raw.backstory ?? '',
      quote: raw.personality.quote ?? '',
    };
  }

  const traits = raw.personality_traits ?? [];
  return {
    traits: traits[0] ?? '',
    ideals: traits[1] ?? '',
    bonds: traits[2] ?? '',
    flaws: traits[3] ?? '',
    backstory: raw.backstory ?? '',
  };
}

function toMigratedInventory(raw: CharacterRow) {
  if (isInventory(raw.inventory)) {
    return {
      ...createEmptyInventory(raw.inventory.maxCarryWeight),
      ...raw.inventory,
      currency: {
        ...createEmptyInventory().currency,
        ...(raw.inventory.currency ?? {}),
      },
      items: raw.inventory.items ?? [],
    };
  }

  const strength = raw.str ?? raw.abilities?.str ?? 10;
  const maxCarryWeight = Math.max(1, strength) * 15;
  const legacyEquipment = Array.isArray(raw.equipment) ? raw.equipment : [];
  const items: Item[] = legacyEquipment
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: crypto.randomUUID(),
      templateId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: '',
      category: 'gear',
      rarity: 'common',
      weight: 0,
      value: 0,
      quantity: 1,
      equipped: false,
      attunement: false,
      attuned: false,
      effects: [],
    }));

  return {
    ...createEmptyInventory(maxCarryWeight),
    items,
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  };
}

export function migrateCharacter(raw: CharacterRow): Character {
  const row = raw;
  const systemData = row.system_data ?? {};
  const personality = toPersonality(row);
  const hexplore = systemData.hexplore ? normalizeHexHeroBuild(systemData.hexplore) : undefined;
  const activeConditions = Array.isArray((systemData as { activeConditions?: unknown }).activeConditions)
    ? ((systemData as { activeConditions?: unknown[] }).activeConditions ?? [])
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    : [];
  const exhaustionRaw = (systemData as { exhaustionLevel?: unknown }).exhaustionLevel;
  const exhaustionLevel =
    typeof exhaustionRaw === 'number' && Number.isFinite(exhaustionRaw)
      ? (Math.max(0, Math.min(6, Math.trunc(exhaustionRaw))) as ExhaustionLevel)
      : 0;
  const defaultRestState = getDefaultRestState(row.class_name, row.level);
  const hitDiceRaw = (systemData as { hitDice?: unknown }).hitDice;
  const maxHitDiceRaw = (systemData as { maxHitDice?: unknown }).maxHitDice;
  const hitDice =
    typeof hitDiceRaw === 'number' && Number.isFinite(hitDiceRaw)
      ? Math.max(0, Math.min(defaultRestState.maxHitDice, Math.trunc(hitDiceRaw)))
      : defaultRestState.hitDice;
  const maxHitDice =
    typeof maxHitDiceRaw === 'number' && Number.isFinite(maxHitDiceRaw)
      ? Math.max(1, Math.min(20, Math.trunc(maxHitDiceRaw)))
      : defaultRestState.maxHitDice;
  const spellSlotsRaw = (systemData as { spellSlots?: unknown }).spellSlots;
  const spellSlots =
    spellSlotsRaw && typeof spellSlotsRaw === 'object' && !Array.isArray(spellSlotsRaw)
      ? (spellSlotsRaw as Character['spellSlots'])
      : defaultRestState.spellSlots;

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    name: row.name,
    ancestry: row.ancestry,
    race: row.ancestry,
    subrace: row.subrace ?? '',
    className: row.class_name,
    subclass: row.subclass ?? '',
    level: row.level,
    background: row.background ?? '',
    age: row.age ?? '',
    alignment: row.alignment ?? '',
    languages: row.languages ?? [],
    proficiencies: row.proficiencies ?? [],
    armorClass: row.armor_class,
    hitPoints: row.hit_points,
    maxHitPoints: row.max_hit_points,
    speed: row.speed ?? 30,
    darkvision: row.darkvision ?? 0,
    inspiration: row.inspiration ?? false,
    abilities: row.abilities,
    skills: row.skills,
    inventory: toMigratedInventory(raw),
    features: row.features ?? [],
    spells: row.spells ?? [],
    spellsKnown: row.spells_known ?? row.spells ?? [],
    backstory: row.backstory ?? '',
    personality,
    personalityTraits: row.personality_traits ?? [],
    savingThrows: row.saving_throws ?? [],
    portraitUrl: row.portrait_url ?? '',
    activeConditions,
    exhaustionLevel,
    hitDice,
    maxHitDice,
    spellSlots,
    systemData: {
      ...systemData,
      ...(hexplore ? { hexplore } : {}),
    },
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapCharacter(row: CharacterRow): Character {
  return migrateCharacter(row);
}

function mapVaultCharacter(row: CharacterRow): VaultCharacter {
  return {
    ...mapCharacter(row),
    updatedAt: row.updated_at ?? undefined,
  };
}

function toPayload(character: Character, sessionId: string, userId: string) {
  const personality = character.personality ?? {
    traits: character.personalityTraits[0] ?? '',
    ideals: character.personalityTraits[1] ?? '',
    bonds: character.personalityTraits[2] ?? '',
    flaws: character.personalityTraits[3] ?? '',
    backstory: character.backstory,
  };

  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    session_id: sessionId,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    subrace: character.subrace?.trim() ?? '',
    class_name: character.className.trim(),
    subclass: character.subclass?.trim() ?? '',
    level: character.level,
    background: character.background.trim(),
    age: character.age.trim(),
    alignment: character.alignment.trim(),
    languages: character.languages,
    proficiencies: character.proficiencies,
    armor_class: character.armorClass,
    hit_points: character.hitPoints,
    max_hit_points: character.maxHitPoints,
    speed: character.speed,
    darkvision: character.darkvision,
    inspiration: character.inspiration,
    abilities: character.abilities,
    skills: character.skills,
    inventory: character.inventory,
    equipment: inventoryToNames(character.inventory),
    features: character.features,
    spells: character.spells,
    spells_known: character.spellsKnown ?? character.spells,
    backstory: character.backstory.trim(),
    personality,
    personality_traits: character.personalityTraits,
    saving_throws: character.savingThrows ?? [],
    portrait_url: character.portraitUrl.trim(),
    system_data: {
      ...character.systemData,
      activeConditions: character.activeConditions,
      exhaustionLevel: character.exhaustionLevel,
      hitDice: character.hitDice,
      maxHitDice: character.maxHitDice,
      spellSlots: character.spellSlots,
    },
  };
}

function toSessionSnapshotPayload(character: Character, sessionId: string, userId: string) {
  return {
    ...toPayload(character, sessionId, userId),
    id: undefined,
  };
}

function toVaultPayload(character: Character, userId: string) {
  const personality = character.personality ?? {
    traits: character.personalityTraits[0] ?? '',
    ideals: character.personalityTraits[1] ?? '',
    bonds: character.personalityTraits[2] ?? '',
    flaws: character.personalityTraits[3] ?? '',
    backstory: character.backstory,
  };

  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    subrace: character.subrace?.trim() ?? '',
    class_name: character.className.trim(),
    subclass: character.subclass?.trim() ?? '',
    level: character.level,
    background: character.background.trim(),
    age: character.age.trim(),
    alignment: character.alignment.trim(),
    languages: character.languages,
    proficiencies: character.proficiencies,
    armor_class: character.armorClass,
    hit_points: character.hitPoints,
    max_hit_points: character.maxHitPoints,
    speed: character.speed,
    darkvision: character.darkvision,
    inspiration: character.inspiration,
    abilities: character.abilities,
    skills: character.skills,
    inventory: character.inventory,
    equipment: inventoryToNames(character.inventory),
    features: character.features,
    spells: character.spells,
    spells_known: character.spellsKnown ?? character.spells,
    backstory: character.backstory.trim(),
    personality,
    personality_traits: character.personalityTraits,
    saving_throws: character.savingThrows ?? [],
    portrait_url: character.portraitUrl.trim(),
    system_data: {
      ...character.systemData,
      activeConditions: character.activeConditions,
      exhaustionLevel: character.exhaustionLevel,
      hitDice: character.hitDice,
      maxHitDice: character.maxHitDice,
      spellSlots: character.spellSlots,
    },
  };
}

function toLegacyPayload(character: Character, sessionId: string, userId: string) {
  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    session_id: sessionId,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    class_name: character.className.trim(),
    level: character.level,
    armor_class: character.armorClass,
    hit_points: character.hitPoints,
    max_hit_points: character.maxHitPoints,
    abilities: character.abilities,
    skills: character.skills,
  };
}

function toLegacyVaultPayload(character: Character, userId: string) {
  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    class_name: character.className.trim(),
    level: character.level,
    armor_class: character.armorClass,
    hit_points: character.hitPoints,
    max_hit_points: character.maxHitPoints,
    abilities: character.abilities,
    skills: character.skills,
  };
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '42703'
  );
}

export async function loadCharacter(sessionId: string, user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('characters')
    .select(characterSelect)
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('characters')
      .select(legacyCharacterSelect)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (legacyData) return mapCharacter(legacyData as unknown as CharacterRow);

    throw new Error('No character is attached to this table yet.');
  }
  if (data) return mapCharacter(data as unknown as CharacterRow);

  throw new Error('No character is attached to this table yet.');
}

export async function listSessionCharacters(sessionId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('characters')
    .select(characterSelect)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('characters')
      .select(legacyCharacterSelect)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (legacyError) throw legacyError;
    return (legacyData ?? []).map((row) => mapCharacter(row as unknown as CharacterRow));
  }

  return (data ?? []).map((row) => mapCharacter(row as unknown as CharacterRow));
}

export async function saveCharacter(character: Character, sessionId: string, user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('characters')
    .upsert(toPayload(character, sessionId, user.id), { onConflict: 'session_id,user_id' })
    .select(characterSelect)
    .single();

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('characters')
      .upsert(toLegacyPayload(character, sessionId, user.id), { onConflict: 'session_id,user_id' })
      .select(legacyCharacterSelect)
      .single();

    if (legacyError) throw legacyError;

    return mapCharacter(legacyData as unknown as CharacterRow);
  }

  return mapCharacter(data as unknown as CharacterRow);
}

export async function listVaultCharacters(user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('character_vaults')
    .select(characterSelect)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('character_vaults')
      .select(`${legacyCharacterSelect},updated_at`)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (legacyError) throw legacyError;
    return (legacyData ?? []).map((row) => mapVaultCharacter(row as unknown as CharacterRow));
  }

  return (data ?? []).map((row) => mapVaultCharacter(row as unknown as CharacterRow));
}

export async function saveVaultCharacter(character: Character, user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('character_vaults')
    .upsert(toVaultPayload(character, user.id))
    .select(characterSelect)
    .single();

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('character_vaults')
      .upsert(toLegacyVaultPayload(character, user.id))
      .select(`${legacyCharacterSelect},updated_at`)
      .single();

    if (legacyError) throw legacyError;
    return mapVaultCharacter(legacyData as unknown as CharacterRow);
  }

  return mapVaultCharacter(data as unknown as CharacterRow);
}

export async function duplicateVaultCharacter(character: Character, user: User) {
  return saveVaultCharacter(cloneCharacterForVault(character), user);
}

export async function deleteVaultCharacter(characterId: string, user: User) {
  const client = requireClient();
  const { error } = await client.from('character_vaults').delete().eq('id', characterId).eq('user_id', user.id);
  if (error) throw error;
}

export async function saveSessionCharacterToVault(character: Character, user: User) {
  return saveVaultCharacter(
    {
      ...character,
      id: crypto.randomUUID(),
    },
    user,
  );
}

export async function attachVaultCharacterToSession(vaultCharacterId: string, sessionId: string, user: User) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client
    .from('characters')
    .select(characterSelect)
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError && !isMissingColumnError(existingError)) throw existingError;
  if (existingError && isMissingColumnError(existingError)) {
    const { data: legacyExisting, error: legacyExistingError } = await client
      .from('characters')
      .select(legacyCharacterSelect)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (legacyExistingError) throw legacyExistingError;
    if (legacyExisting) return mapCharacter(legacyExisting as unknown as CharacterRow);
  }
  if (existing) return mapCharacter(existing as unknown as CharacterRow);

  let vaultCharacter: unknown;
  const { data: extendedVaultCharacter, error: vaultError } = await client
    .from('character_vaults')
    .select(characterSelect)
    .eq('id', vaultCharacterId)
    .eq('user_id', user.id)
    .single();

  if (vaultError && !isMissingColumnError(vaultError)) throw vaultError;
  if (vaultError && isMissingColumnError(vaultError)) {
    const { data: legacyVaultCharacter, error: legacyVaultError } = await client
      .from('character_vaults')
      .select(legacyCharacterSelect)
      .eq('id', vaultCharacterId)
      .eq('user_id', user.id)
      .single();

    if (legacyVaultError) throw legacyVaultError;
    vaultCharacter = legacyVaultCharacter;
  } else {
    vaultCharacter = extendedVaultCharacter;
  }

  const { data, error } = await client
    .from('characters')
    .insert(toSessionSnapshotPayload(mapCharacter(vaultCharacter as unknown as CharacterRow), sessionId, user.id))
    .select(characterSelect)
    .single();

  if (error && !isMissingColumnError(error)) throw error;
  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await client
      .from('characters')
      .insert(toLegacyPayload(mapCharacter(vaultCharacter as unknown as CharacterRow), sessionId, user.id))
      .select(legacyCharacterSelect)
      .single();

    if (legacyError) throw legacyError;
    return mapCharacter(legacyData as unknown as CharacterRow);
  }

  return mapCharacter(data as unknown as CharacterRow);
}

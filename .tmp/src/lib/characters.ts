import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { getDefaultRestState } from '../engine/character/rest';
import { createEmptyInventory, inventoryToNames } from '../lib/inventory';
import type { AbilityKey, Character, CharacterSystemData, ExhaustionLevel, Item, VaultCharacter } from '../types';
import { normalizeHexHeroBuild } from './hexplore';
import { supabase } from './supabase';

type CharacterRow = {
  id: string;
  name: string;
  ancestry: string;
  class_name: string;
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
  equipment?: string[] | null;
  features?: string[] | null;
  spells?: string[] | null;
  backstory?: string | null;
  personality_traits?: string[] | null;
  portrait_url?: string | null;
  system_data?: CharacterSystemData | null;
  updated_at?: string | null;
};

const characterSelect = [
  'id',
  'name',
  'ancestry',
  'class_name',
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
  'equipment',
  'features',
  'spells',
  'backstory',
  'personality_traits',
  'portrait_url',
  'system_data',
].join(',');

const legacyCharacterSelect = 'id,name,ancestry,class_name,level,armor_class,hit_points,max_hit_points,abilities,skills';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function toMigratedInventory(raw: CharacterRow) {
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
    name: row.name,
    ancestry: row.ancestry,
    className: row.class_name,
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
    backstory: row.backstory ?? '',
    personalityTraits: row.personality_traits ?? [],
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
  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    session_id: sessionId,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    class_name: character.className.trim(),
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
    equipment: inventoryToNames(character.inventory),
    features: character.features,
    spells: character.spells,
    backstory: character.backstory.trim(),
    personality_traits: character.personalityTraits,
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
  return {
    id: character.id.startsWith('char-demo') ? undefined : character.id,
    user_id: userId,
    name: character.name.trim() || demoCharacter.name,
    ancestry: character.ancestry.trim(),
    class_name: character.className.trim(),
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
    equipment: inventoryToNames(character.inventory),
    features: character.features,
    spells: character.spells,
    backstory: character.backstory.trim(),
    personality_traits: character.personalityTraits,
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
    .select(`${characterSelect},updated_at`)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapVaultCharacter(row as unknown as CharacterRow));
}

export async function saveVaultCharacter(character: Character, user: User) {
  const client = requireClient();
  const { data, error } = await client
    .from('character_vaults')
    .upsert(toVaultPayload(character, user.id))
    .select(`${characterSelect},updated_at`)
    .single();

  if (error) throw error;

  return mapVaultCharacter(data as unknown as CharacterRow);
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
  if (existing) return mapCharacter(existing as unknown as CharacterRow);

  const { data: vaultCharacter, error: vaultError } = await client
    .from('character_vaults')
    .select(characterSelect)
    .eq('id', vaultCharacterId)
    .eq('user_id', user.id)
    .single();

  if (vaultError) throw vaultError;

  const { data, error } = await client
    .from('characters')
    .insert(toSessionSnapshotPayload(mapCharacter(vaultCharacter as unknown as CharacterRow), sessionId, user.id))
    .select(characterSelect)
    .single();

  if (error) throw error;

  return mapCharacter(data as unknown as CharacterRow);
}

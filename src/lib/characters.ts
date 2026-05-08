import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import type { AbilityKey, Character } from '../types';
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
  skills: string[];
  equipment?: string[] | null;
  features?: string[] | null;
  spells?: string[] | null;
  backstory?: string | null;
  personality_traits?: string[] | null;
  portrait_url?: string | null;
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
].join(',');

const legacyCharacterSelect = 'id,name,ancestry,class_name,level,armor_class,hit_points,max_hit_points,abilities,skills';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function mapCharacter(row: CharacterRow): Character {
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
    equipment: row.equipment ?? [],
    features: row.features ?? [],
    spells: row.spells ?? [],
    backstory: row.backstory ?? '',
    personalityTraits: row.personality_traits ?? [],
    portraitUrl: row.portrait_url ?? '',
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
    equipment: character.equipment,
    features: character.features,
    spells: character.spells,
    backstory: character.backstory.trim(),
    personality_traits: character.personalityTraits,
    portrait_url: character.portraitUrl.trim(),
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

    return saveCharacter(demoCharacter, sessionId, user);
  }
  if (data) return mapCharacter(data as unknown as CharacterRow);

  return saveCharacter(demoCharacter, sessionId, user);
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

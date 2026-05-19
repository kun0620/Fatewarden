import { makeCharacterDraft, finalizeCharacter } from './characterBuilder';
import type { Character, VaultCharacter } from '../types';

const EXPORT_VERSION = 1;

type CharacterExportEnvelope = {
  kind: 'fatewarden.character';
  version: number;
  exportedAt: string;
  character: Character;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'string' && String(value[key]).trim().length > 0;
}

export function validateCharacterImport(value: unknown) {
  const errors: string[] = [];
  const payload = isObject(value) && value.kind === 'fatewarden.character' && isObject(value.character) ? value.character : value;

  if (!isObject(payload)) {
    return { ok: false, errors: ['The file does not contain a character object.'] };
  }

  if (!hasString(payload, 'name')) errors.push('Missing character name.');
  if (!hasString(payload, 'ancestry')) errors.push('Missing race/ancestry.');
  if (!hasString(payload, 'className')) errors.push('Missing class.');
  if (typeof payload.level !== 'number' || payload.level < 1 || payload.level > 20) errors.push('Level must be between 1 and 20.');
  if (!isObject(payload.abilities)) errors.push('Missing ability scores.');

  if (errors.length) return { ok: false, errors };

  const base = makeCharacterDraft();
  const imported = finalizeCharacter({
    ...base,
    ...(payload as Character),
    id: crypto.randomUUID(),
    level: Math.max(1, Math.min(20, Math.trunc(Number(payload.level) || 1))),
    skills: Array.isArray(payload.skills) ? payload.skills.map(String) : [],
    languages: Array.isArray(payload.languages) ? payload.languages.map(String) : [],
    proficiencies: Array.isArray(payload.proficiencies) ? payload.proficiencies.map(String) : [],
    features: Array.isArray(payload.features) ? payload.features.map(String) : [],
    spells: Array.isArray(payload.spells) ? payload.spells.map(String) : [],
    spellsKnown: Array.isArray(payload.spellsKnown) ? payload.spellsKnown.map(String) : undefined,
  });

  return { ok: true, character: imported, errors: [] };
}

export function parseCharacterImport(text: string) {
  try {
    return validateCharacterImport(JSON.parse(text));
  } catch {
    return { ok: false, errors: ['The selected file is not valid JSON.'] };
  }
}

export function characterToExportJson(character: Character) {
  const envelope: CharacterExportEnvelope = {
    kind: 'fatewarden.character',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    character,
  };
  return JSON.stringify(envelope, null, 2);
}

export function downloadCharacterJson(character: Character) {
  const blob = new Blob([characterToExportJson(character)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${character.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'character'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function cloneCharacterForVault(character: Character | VaultCharacter, suffix = 'Copy'): Character {
  return finalizeCharacter({
    ...character,
    id: crypto.randomUUID(),
    name: `${character.name} (${suffix})`,
    createdAt: undefined,
    updatedAt: undefined,
  });
}

export async function readImportedCharacterFile(file: File) {
  return parseCharacterImport(await file.text());
}

import { expendSpellSlot } from '../../../data/spellSlots';
import { getSpell } from '../../../data/spells';
import type { Character } from '../../../types';
import type { CastSpellEvent, ConcentrationEndEvent } from '../types';

export type SpellEventResult = {
  character: Character;
  sideEffects: unknown[];
};

export function processCastSpell(character: Character, event: CastSpellEvent): SpellEventResult {
  const spell = getSpell(event.spellId);
  if (!spell) return { character, sideEffects: [] };

  let updatedCharacter = { ...character };
  const sideEffects: unknown[] = [];

  if (event.slotLevel > 0) {
    const spellSlots = expendSpellSlot(updatedCharacter.spellSlots, event.slotLevel);
    if (!spellSlots) {
      return {
        character,
        sideEffects: [{ error: `No spell slot available at level ${event.slotLevel}` }],
      };
    }
    updatedCharacter = { ...updatedCharacter, spellSlots };
  }

  if (spell.concentration) {
    sideEffects.push({
      type: 'CONCENTRATION_START',
      spellId: event.spellId,
      characterId: event.characterId,
      duration: spell.duration,
    });
  }

  return { character: updatedCharacter, sideEffects };
}

export function processConcentrationEnd(character: Character, _event: ConcentrationEndEvent): Character {
  return {
    ...character,
    systemData: {
      ...character.systemData,
      activeConcentration: undefined,
    },
  };
}

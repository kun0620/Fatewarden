import { getFeat } from '../../data/feats';
import type { Character } from '../../types';

function addUniqueProficiencies(character: Character, proficiencies: string[]) {
  const existing = new Set((character.proficiencies ?? []).map((item) => item.toLowerCase()));
  const next = [...(character.proficiencies ?? [])];

  proficiencies.forEach((proficiency) => {
    if (existing.has(proficiency.toLowerCase())) return;
    existing.add(proficiency.toLowerCase());
    next.push(proficiency);
  });

  return next;
}

export function applyFeatBenefits(character: Character): Character {
  if (!character.feats?.length) return character;

  let char: Character = { ...character };

  for (const featId of character.feats) {
    const feat = getFeat(featId);
    if (!feat) continue;

    switch (featId) {
      case 'tough':
      case 'tough_5e2':
        char = {
          ...char,
          maxHitPoints: (char.maxHitPoints ?? 0) + char.level * 2,
        };
        break;

      case 'alert':
      case 'alert_5e2':
        char = {
          ...char,
          systemData: {
            ...char.systemData,
            featBonuses: {
              ...char.systemData?.featBonuses,
              initiative: (char.systemData?.featBonuses?.initiative ?? 0) + 5,
            },
          },
        };
        break;

      case 'mobile':
        char = {
          ...char,
          speed: (char.speed ?? 30) + 10,
        };
        break;

      case 'heavily_armored':
        char = {
          ...char,
          proficiencies: addUniqueProficiencies(char, ['heavy armor']),
        };
        break;

      case 'lightly_armored':
        char = {
          ...char,
          proficiencies: addUniqueProficiencies(char, ['light armor']),
        };
        break;

      case 'moderately_armored':
        char = {
          ...char,
          proficiencies: addUniqueProficiencies(char, ['medium armor', 'shields']),
        };
        break;

      case 'skilled':
      case 'skilled_5e2':
      case 'weapon_master':
      case 'ability_score_improvement':
      case 'great_weapon_master':
      case 'sharpshooter':
      case 'polearm_master':
      case 'crossbow_expert':
      case 'sentinel':
      case 'war_caster':
      case 'war_caster_5e2':
      case 'lucky':
      case 'lucky_5e2':
      case 'savage_attacker':
      case 'savage_attacker_5e2':
      case 'defensive_duelist':
      case 'shield_master':
      case 'mage_slayer':
      case 'spell_sniper':
      case 'mounted_combatant':
      case 'grappler':
        break;

      default:
        break;
    }
  }

  return char;
}

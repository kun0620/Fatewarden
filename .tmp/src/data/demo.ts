import { getDefaultRestState } from '../engine/character/rest';
import { inventoryFromNames } from '../lib/inventory';
import type { Character, StoryMessage } from '../types';

const defaultRest = getDefaultRestState('Ranger', 3);

export const demoCharacter: Character = {
  id: 'char-demo-1',
  name: 'Mira Thornwake',
  ancestry: 'Half-Elf',
  className: 'Ranger',
  level: 3,
  background: 'Cursed Survivor',
  age: '22',
  alignment: 'Neutral',
  languages: ['Common', 'Elvish', 'Thieves Cant'],
  proficiencies: ['Stealth', 'Survival', 'Tracking', 'Perception', 'Investigation'],
  armorClass: 15,
  hitPoints: 24,
  maxHitPoints: 28,
  speed: 30,
  darkvision: 60,
  inspiration: false,
  abilities: {
    str: 10,
    dex: 17,
    con: 14,
    int: 12,
    wis: 15,
    cha: 11,
  },
  skills: ['Perception', 'Survival', 'Stealth', 'Animal Handling'],
  inventory: inventoryFromNames(['Longbow', 'Twin daggers', 'Explorer pack', 'Black cloak']),
  features: ['Favored Enemy', 'Natural Explorer', 'Hunter Instinct', 'Cursed Resilience'],
  spells: ['Detect Magic', 'Hunter Mark'],
  backstory:
    'Mira survived the fall of a rain-soaked border shrine and now follows the marks left by the same violet curse that spared her.',
  personalityTraits: ['Quiet observer', 'Not easy to trust', 'Notices small details first'],
  portraitUrl: '',
  activeConditions: [],
  exhaustionLevel: 0,
  hitDice: defaultRest.hitDice,
  maxHitDice: defaultRest.maxHitDice,
  spellSlots: defaultRest.spellSlots,
  systemData: {},
};

export const demoMessages: StoryMessage[] = [
  {
    id: 'msg-1',
    speaker: 'dm',
    author: 'Dungeon Master',
    body: 'Rain taps against the ruin stones as blue witchlight gathers inside the old watchtower.',
    createdAt: '21:04',
  },
  {
    id: 'msg-2',
    speaker: 'player',
    author: 'Mira',
    body: 'I crouch near the broken arch and look for tracks before anyone steps inside.',
    createdAt: '21:05',
  },
  {
    id: 'msg-3',
    speaker: 'system',
    author: 'Table',
    body: 'Roll Wisdom (Perception). The storm gives disadvantage to hearing-based checks.',
    createdAt: '21:05',
  },
];

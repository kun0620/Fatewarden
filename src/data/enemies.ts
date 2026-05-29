import type { RunCondition, RunIntent } from '../engine/run/runTypes';

export type EnemyBehavior = 'aggressive' | 'defensive' | 'support' | 'caster' | 'skirmisher' | 'boss';

export interface EnemyAttack {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  type: 'melee' | 'ranged' | 'spell';
}

export interface RunEnemy {
  id: string;
  name: string;
  hp: number;
  hpMax?: number;
  ac: number;
  position: 1 | 2 | 3 | 4;
  behavior: EnemyBehavior;
  attacks: EnemyAttack[];
  conditions: string[];
  portrait?: string;
  color?: string;
  boss?: boolean;
  intent?: RunIntent;
  conds?: RunCondition[];
}

export const floor1Enemies: RunEnemy[] = [
  { id: 'ash_rat', name: 'Ash Rat', hp: 9, ac: 12, position: 1, behavior: 'skirmisher', attacks: [{ id: 'bite', name: 'Bite', bonus: 4, damage: '1d6+2 piercing', type: 'melee' }], conditions: [] },
  { id: 'rust_cultist', name: 'Rust Cultist', hp: 16, ac: 13, position: 2, behavior: 'aggressive', attacks: [{ id: 'sickle', name: 'Sickle', bonus: 4, damage: '1d6+2 slashing', type: 'melee' }], conditions: [] },
  { id: 'hollow_archer', name: 'Hollow Archer', hp: 12, ac: 13, position: 3, behavior: 'skirmisher', attacks: [{ id: 'shortbow', name: 'Shortbow', bonus: 4, damage: '1d6+2 piercing', type: 'ranged' }], conditions: [] },
  { id: 'grave_mote', name: 'Grave Mote', hp: 10, ac: 14, position: 4, behavior: 'caster', attacks: [{ id: 'chill', name: 'Chill Spark', bonus: 4, damage: '1d8 cold', type: 'spell' }], conditions: [] },
];

export const floor2Enemies: RunEnemy[] = [
  { id: 'brass_sentinel', name: 'Brass Sentinel', hp: 38, ac: 16, position: 1, behavior: 'defensive', attacks: [{ id: 'halberd', name: 'Halberd', bonus: 6, damage: '1d10+3 slashing', type: 'melee' }], conditions: [] },
  { id: 'veil_hexer', name: 'Veil Hexer', hp: 28, ac: 13, position: 4, behavior: 'caster', attacks: [{ id: 'hex_bolt', name: 'Hex Bolt', bonus: 6, damage: '2d8 necrotic', type: 'spell' }], conditions: [] },
  { id: 'blood_hound', name: 'Blood Hound', hp: 32, ac: 14, position: 2, behavior: 'aggressive', attacks: [{ id: 'maul', name: 'Maul', bonus: 6, damage: '2d6+3 piercing', type: 'melee' }], conditions: [] },
  { id: 'lantern_wraith', name: 'Lantern Wraith', hp: 30, ac: 15, position: 3, behavior: 'skirmisher', attacks: [{ id: 'lantern_ray', name: 'Lantern Ray', bonus: 6, damage: '2d6 radiant', type: 'ranged' }], conditions: [] },
];

export const floor3Enemies: RunEnemy[] = [
  { id: 'oathbreaker_knight', name: 'Oathbreaker Knight', hp: 64, ac: 18, position: 1, behavior: 'defensive', attacks: [{ id: 'black_blade', name: 'Black Blade', bonus: 8, damage: '2d8+4 slashing', type: 'melee' }], conditions: [] },
  { id: 'starved_mage', name: 'Starved Mage', hp: 48, ac: 15, position: 4, behavior: 'caster', attacks: [{ id: 'void_lance', name: 'Void Lance', bonus: 8, damage: '3d8 force', type: 'spell' }], conditions: [] },
  { id: 'iron_maw', name: 'Iron Maw', hp: 72, ac: 17, position: 2, behavior: 'aggressive', attacks: [{ id: 'crush', name: 'Crush', bonus: 8, damage: '2d10+4 bludgeoning', type: 'melee' }], conditions: [] },
  { id: 'choir_of_sparks', name: 'Choir of Sparks', hp: 54, ac: 16, position: 3, behavior: 'support', attacks: [{ id: 'spark_chorus', name: 'Spark Chorus', bonus: 7, damage: '3d6 lightning', type: 'spell' }], conditions: [] },
];

export const bossEnemies: RunEnemy[] = [
  { id: 'cinder_reeve', name: 'Cinder-Reeve', hp: 120, ac: 18, position: 2, behavior: 'boss', attacks: [{ id: 'censer_burst', name: 'Censer Burst', bonus: 9, damage: '4d8 fire', type: 'spell' }, { id: 'brass_claw', name: 'Brass Claw', bonus: 9, damage: '2d10+5 slashing', type: 'melee' }], conditions: [] },
  { id: 'warden_of_bones', name: 'Warden of Bones', hp: 138, ac: 19, position: 1, behavior: 'boss', attacks: [{ id: 'bone_scythe', name: 'Bone Scythe', bonus: 9, damage: '3d10+5 slashing', type: 'melee' }, { id: 'grave_command', name: 'Grave Command', bonus: 8, damage: '3d8 necrotic', type: 'spell' }], conditions: [] },
  { id: 'the_hollow_crown', name: 'The Hollow Crown', hp: 110, ac: 17, position: 4, behavior: 'boss', attacks: [{ id: 'royal_hex', name: 'Royal Hex', bonus: 9, damage: '4d6 psychic', type: 'spell' }, { id: 'edict', name: 'Edict', bonus: 8, damage: '3d8 thunder', type: 'ranged' }], conditions: [] },
];

export const wardenRunFoes: RunEnemy[] = [
  {
    id: 'imp',
    name: 'Pact-Imp',
    portrait: 'imp',
    color: '#C53456',
    hp: 12,
    hpMax: 24,
    ac: 13,
    position: 1,
    behavior: 'skirmisher',
    attacks: [
      { id: 'barbed_sting', name: 'Barbed Sting', bonus: 5, damage: '1d6+3 piercing', type: 'melee' },
    ],
    conditions: ['Hexed'],
    conds: [{ k: 'Hexed', kind: 'neutral', n: 2 }],
    intent: { kind: 'attack', val: '8-12', target: 'front' },
  },
  {
    id: 'wraith',
    name: 'Cinder-Wraith',
    portrait: 'wraith',
    color: '#5B2A8C',
    hp: 38,
    hpMax: 38,
    ac: 15,
    position: 2,
    behavior: 'caster',
    attacks: [
      { id: 'cinder_touch', name: 'Cinder Touch', bonus: 6, damage: '2d8 necrotic', type: 'spell' },
    ],
    conditions: [],
    conds: [],
    intent: { kind: 'debuff', val: 'Vulnerable', target: 'all' },
  },
  {
    id: 'knight',
    name: 'Brass Knight',
    portrait: 'knight',
    color: '#8B1538',
    hp: 56,
    hpMax: 72,
    ac: 17,
    position: 3,
    behavior: 'defensive',
    attacks: [
      { id: 'brass_halberd', name: 'Brass Halberd', bonus: 7, damage: '2d8+4 slashing', type: 'melee' },
    ],
    conditions: ['Block'],
    conds: [{ k: 'Block', kind: 'gold', n: 8 }],
    intent: { kind: 'buff', val: '+8 Block' },
  },
  {
    id: 'reeve',
    name: 'The Cinder-Reeve',
    portrait: 'boss',
    color: '#8B1538',
    hp: 88,
    hpMax: 120,
    ac: 18,
    position: 4,
    behavior: 'boss',
    attacks: [
      { id: 'inferno_channel', name: 'Inferno Channel', bonus: 9, damage: '4d8 fire', type: 'spell' },
      { id: 'cinder_cleaver', name: 'Cinder Cleaver', bonus: 9, damage: '2d10+5 slashing', type: 'melee' },
    ],
    conditions: ['Brass Aegis'],
    conds: [{ k: 'Brass Aegis', kind: 'gold', n: 1 }],
    boss: true,
    intent: { kind: 'channel', val: 'Inferno - 2 rounds', target: 'all' },
  },
];

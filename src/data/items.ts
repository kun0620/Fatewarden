import type { Item } from '../types';

export type ItemTemplate = Omit<Item, 'id' | 'quantity' | 'equipped' | 'attuned'> & {
  templateId: string;
};

const weapon = (
  templateId: string,
  name: string,
  damageDice: string,
  damageType: NonNullable<Item['weapon']>['damageType'],
  properties: NonNullable<Item['weapon']>['properties'],
  weight: number,
  value: number,
  range?: { normal: number; long?: number },
  versatileDice?: string,
): ItemTemplate => ({
  templateId,
  name,
  description: '',
  category: 'weapon',
  rarity: 'common',
  weight,
  value,
  attunement: false,
  weapon: {
    damageDice,
    damageType,
    properties,
    rangeNormal: range?.normal,
    rangeLong: range?.long,
    versatileDice,
  },
  effects: [],
});

const armor = (
  templateId: string,
  name: string,
  armorType: NonNullable<Item['armor']>['type'],
  baseArmorClass: number,
  weight: number,
  value: number,
  options: {
    maxDexBonus?: number;
    stealthDisadvantage?: boolean;
    strengthRequirement?: number;
  } = {},
): ItemTemplate => ({
  templateId,
  name,
  description: '',
  category: armorType === 'shield' ? 'shield' : 'armor',
  rarity: 'common',
  weight,
  value,
  attunement: false,
  armor: {
    type: armorType,
    baseAC: baseArmorClass,
    maxDexBonus: options.maxDexBonus,
    stealthDisadvantage: options.stealthDisadvantage ?? false,
    strengthRequirement: options.strengthRequirement,
  },
  effects: [],
});

const gear = (
  templateId: string,
  name: string,
  weight: number,
  value: number,
  category: ItemTemplate['category'] = 'misc',
): ItemTemplate => ({
  templateId,
  name,
  description: '',
  category,
  rarity: 'common',
  weight,
  value,
  attunement: false,
  effects: [],
});

export const itemTemplates: Record<string, ItemTemplate> = {
  // Simple weapons
  club: weapon('club', 'Club', '1d4', 'bludgeoning', ['light'], 2, 0.1),
  dagger: weapon('dagger', 'Dagger', '1d4', 'piercing', ['finesse', 'light', 'thrown'], 1, 2, { normal: 20, long: 60 }),
  greatclub: weapon('greatclub', 'Greatclub', '1d8', 'bludgeoning', ['two_handed'], 10, 0.2),
  handaxe: weapon('handaxe', 'Handaxe', '1d6', 'slashing', ['light', 'thrown'], 2, 5, { normal: 20, long: 60 }),
  javelin: weapon('javelin', 'Javelin', '1d6', 'piercing', ['thrown'], 2, 0.5, { normal: 30, long: 120 }),
  light_hammer: weapon('light_hammer', 'Light Hammer', '1d4', 'bludgeoning', ['light', 'thrown'], 2, 2, { normal: 20, long: 60 }),
  mace: weapon('mace', 'Mace', '1d6', 'bludgeoning', [], 4, 5),
  quarterstaff: weapon('quarterstaff', 'Quarterstaff', '1d6', 'bludgeoning', ['versatile'], 4, 0.2, undefined, '1d8'),
  sickle: weapon('sickle', 'Sickle', '1d4', 'slashing', ['light'], 2, 1),
  spear: weapon('spear', 'Spear', '1d6', 'piercing', ['thrown', 'versatile'], 3, 1, { normal: 20, long: 60 }, '1d8'),
  light_crossbow: weapon('light_crossbow', 'Light Crossbow', '1d8', 'piercing', ['ammunition', 'loading', 'two_handed'], 5, 25, {
    normal: 80,
    long: 320,
  }),
  dart: weapon('dart', 'Dart', '1d4', 'piercing', ['finesse', 'thrown'], 0.25, 0.05, { normal: 20, long: 60 }),
  shortbow: weapon('shortbow', 'Shortbow', '1d6', 'piercing', ['ammunition', 'two_handed'], 2, 25, { normal: 80, long: 320 }),
  sling: weapon('sling', 'Sling', '1d4', 'bludgeoning', ['ammunition'], 0, 0.1, { normal: 30, long: 120 }),

  // Martial weapons
  battleaxe: weapon('battleaxe', 'Battleaxe', '1d8', 'slashing', ['versatile'], 4, 10, undefined, '1d10'),
  flail: weapon('flail', 'Flail', '1d8', 'bludgeoning', [], 2, 10),
  glaive: weapon('glaive', 'Glaive', '1d10', 'slashing', ['heavy', 'reach', 'two_handed'], 6, 20),
  greataxe: weapon('greataxe', 'Greataxe', '1d12', 'slashing', ['heavy', 'two_handed'], 7, 30),
  greatsword: weapon('greatsword', 'Greatsword', '2d6', 'slashing', ['heavy', 'two_handed'], 6, 50),
  halberd: weapon('halberd', 'Halberd', '1d10', 'slashing', ['heavy', 'reach', 'two_handed'], 6, 20),
  lance: weapon('lance', 'Lance', '1d12', 'piercing', ['reach', 'special'], 6, 10),
  longsword: weapon('longsword', 'Longsword', '1d8', 'slashing', ['versatile'], 3, 15, undefined, '1d10'),
  maul: weapon('maul', 'Maul', '2d6', 'bludgeoning', ['heavy', 'two_handed'], 10, 10),
  morningstar: weapon('morningstar', 'Morningstar', '1d8', 'piercing', [], 4, 15),
  pike: weapon('pike', 'Pike', '1d10', 'piercing', ['heavy', 'reach', 'two_handed'], 18, 5),
  rapier: weapon('rapier', 'Rapier', '1d8', 'piercing', ['finesse'], 2, 25),
  scimitar: weapon('scimitar', 'Scimitar', '1d6', 'slashing', ['finesse', 'light'], 3, 25),
  shortsword: weapon('shortsword', 'Shortsword', '1d6', 'piercing', ['finesse', 'light'], 2, 10),
  trident: weapon('trident', 'Trident', '1d6', 'piercing', ['thrown', 'versatile'], 4, 5, { normal: 20, long: 60 }, '1d8'),
  war_pick: weapon('war_pick', 'War Pick', '1d8', 'piercing', [], 2, 5),
  warhammer: weapon('warhammer', 'Warhammer', '1d8', 'bludgeoning', ['versatile'], 2, 15, undefined, '1d10'),
  whip: weapon('whip', 'Whip', '1d4', 'slashing', ['finesse', 'reach'], 3, 2),
  hand_crossbow: weapon('hand_crossbow', 'Hand Crossbow', '1d6', 'piercing', ['ammunition', 'light', 'loading'], 3, 75, {
    normal: 30,
    long: 120,
  }),
  heavy_crossbow: weapon('heavy_crossbow', 'Heavy Crossbow', '1d10', 'piercing', ['ammunition', 'heavy', 'loading', 'two_handed'], 18, 50, {
    normal: 100,
    long: 400,
  }),
  longbow: weapon('longbow', 'Longbow', '1d8', 'piercing', ['ammunition', 'heavy', 'two_handed'], 2, 50, { normal: 150, long: 600 }),
  net: weapon('net', 'Net', '0', 'bludgeoning', ['special', 'thrown'], 3, 1, { normal: 5, long: 15 }),

  // Armor
  padded: armor('padded', 'Padded Armor', 'light', 11, 8, 5, { stealthDisadvantage: true }),
  leather: armor('leather', 'Leather Armor', 'light', 11, 10, 10),
  studded_leather: armor('studded_leather', 'Studded Leather Armor', 'light', 12, 13, 45),
  hide: armor('hide', 'Hide Armor', 'medium', 12, 12, 10, { maxDexBonus: 2 }),
  chain_shirt: armor('chain_shirt', 'Chain Shirt', 'medium', 13, 20, 50, { maxDexBonus: 2 }),
  scale_mail: armor('scale_mail', 'Scale Mail', 'medium', 14, 45, 50, { maxDexBonus: 2, stealthDisadvantage: true }),
  breastplate: armor('breastplate', 'Breastplate', 'medium', 14, 20, 400, { maxDexBonus: 2 }),
  half_plate: armor('half_plate', 'Half Plate', 'medium', 15, 40, 750, { maxDexBonus: 2, stealthDisadvantage: true }),
  ring_mail: armor('ring_mail', 'Ring Mail', 'heavy', 14, 40, 30, { stealthDisadvantage: true }),
  chain_mail: armor('chain_mail', 'Chain Mail', 'heavy', 16, 55, 75, { strengthRequirement: 13, stealthDisadvantage: true }),
  splint: armor('splint', 'Splint Armor', 'heavy', 17, 60, 200, { strengthRequirement: 15, stealthDisadvantage: true }),
  plate: armor('plate', 'Plate Armor', 'heavy', 18, 65, 1500, { strengthRequirement: 15, stealthDisadvantage: true }),
  shield: armor('shield', 'Shield', 'shield', 2, 6, 10),

  // Adventuring gear (20)
  rope_hempen_50ft: gear('rope_hempen_50ft', 'Hempen Rope (50 ft.)', 10, 1),
  torch: gear('torch', 'Torch', 1, 0.01, 'consumable'),
  rations_1day: gear('rations_1day', 'Rations (1 day)', 2, 0.5, 'consumable'),
  bedroll: gear('bedroll', 'Bedroll', 7, 1),
  tinderbox: gear('tinderbox', 'Tinderbox', 1, 0.5, 'tool'),
  hooded_lantern: gear('hooded_lantern', 'Hooded Lantern', 2, 5),
  oil_flask: gear('oil_flask', 'Oil (flask)', 1, 0.1, 'consumable'),
  healers_kit: gear('healers_kit', "Healer's Kit", 3, 5, 'tool'),
  thieves_tools: gear('thieves_tools', "Thieves' Tools", 1, 25, 'tool'),
  climbers_kit: gear('climbers_kit', "Climber's Kit", 12, 25, 'tool'),
  waterskin: gear('waterskin', 'Waterskin', 5, 0.2, 'consumable'),
  grappling_hook: gear('grappling_hook', 'Grappling Hook', 4, 2),
  crowbar: gear('crowbar', 'Crowbar', 5, 2, 'tool'),
  hammer: gear('hammer', 'Hammer', 3, 1, 'tool'),
  piton: gear('piton', 'Piton', 0.25, 0.05),
  backpack: gear('backpack', 'Backpack', 5, 2),
  mess_kit: gear('mess_kit', 'Mess Kit', 1, 0.2),
  blanket: gear('blanket', 'Blanket', 3, 0.5),
  holy_symbol: gear('holy_symbol', 'Holy Symbol', 1, 5),
  potion_of_healing: gear('potion_of_healing', 'Potion of Healing', 0.5, 50, 'potion'),

  // Adventuring gear — additional SRD items
  mirror_steel: gear('mirror_steel', 'Steel Mirror', 0.5, 5),
  candle: gear('candle', 'Candle', 0, 0.01, 'consumable'),
  chalk_1piece: gear('chalk_1piece', 'Chalk (1 piece)', 0, 0.01),
  ink_1oz: gear('ink_1oz', 'Ink (1-ounce bottle)', 0, 10),
  parchment_1sheet: gear('parchment_1sheet', 'Parchment (one sheet)', 0, 0.1),

  // Ammunition
  arrows_20: gear('arrows_20', 'Arrows (20)', 1, 1, 'ammunition'),
  crossbow_bolts_20: gear('crossbow_bolts_20', 'Crossbow Bolts (20)', 1.5, 1, 'ammunition'),
  sling_bullets_20: gear('sling_bullets_20', 'Sling Bullets (20)', 1.5, 0.04, 'ammunition'),
};

export function spawnItem(templateId: string, qty = 1): Item {
  const template = itemTemplates[templateId];
  if (!template) {
    throw new Error(`Unknown item template: ${templateId}`);
  }

  return {
    ...template,
    id: crypto.randomUUID(),
    quantity: Math.max(1, Math.trunc(qty) || 1),
    equipped: false,
    attuned: false,
    effects: template.effects ? [...template.effects] : [],
  };
}

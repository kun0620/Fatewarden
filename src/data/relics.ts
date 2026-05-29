import type { RunRelic } from '../engine/run/runTypes';

export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';

export interface Relic extends RunRelic {
  rarity: RelicRarity;
}

export const RELICS: Relic[] = [
  {
    id: 'cursed_coin',
    name: 'Cursed Coin',
    description: 'A blackened coin that always lands on the side that hurts.',
    effect: 'gain_gold_take_damage',
    rarity: 'cursed',
  },
  {
    id: 'wardens_eye',
    name: "Warden's Eye",
    description: 'A glass eye that reveals the safer path once per floor.',
    effect: 'reveal_node_type',
    rarity: 'rare',
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    description: 'Power answers pain; the pact drinks first.',
    effect: 'bonus_damage_on_low_hp',
    rarity: 'cursed',
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'A stamped charm worn smooth by stubborn survivors.',
    effect: 'resist_fear_once',
    rarity: 'uncommon',
  },
  {
    id: 'ancient_map',
    name: 'Ancient Map',
    description: 'Ink crawls toward hidden chambers when the party rests.',
    effect: 'extra_map_choice',
    rarity: 'rare',
  },
  {
    id: 'void_crystal',
    name: 'Void Crystal',
    description: 'A cold shard that hums when spells are spent.',
    effect: 'refund_spell_slot_chance',
    rarity: 'legendary',
  },
  {
    id: 'healers_badge',
    name: "Healer's Badge",
    description: 'A field badge from a forgotten order of battlefield medics.',
    effect: 'increase_healing',
    rarity: 'uncommon',
  },
  {
    id: 'ember_heart',
    name: 'Ember Heart',
    description: 'A coal that refuses to die, even under rain.',
    effect: 'fire_damage_bonus',
    rarity: 'uncommon',
  },
  {
    id: 'moonlit_needle',
    name: 'Moonlit Needle',
    description: 'A silver needle that stitches flesh and fate together.',
    effect: 'rest_restore_bonus',
    rarity: 'rare',
  },
  {
    id: 'bone_dice',
    name: 'Bone Dice',
    description: 'They clatter with the voice of someone who lost before you.',
    effect: 'reroll_low_damage',
    rarity: 'cursed',
  },
  {
    id: 'storm_lantern',
    name: 'Storm Lantern',
    description: 'Blue lightning flickers inside its cracked cage.',
    effect: 'initiative_bonus',
    rarity: 'uncommon',
  },
  {
    id: 'ashen_crown',
    name: 'Ashen Crown',
    description: 'A bent coronet that remembers every throne it outlived.',
    effect: 'elite_reward_bonus',
    rarity: 'legendary',
  },
  {
    id: 'silk_ward',
    name: 'Silk Ward',
    description: 'A prayer ribbon that tightens when blades draw near.',
    effect: 'first_hit_reduction',
    rarity: 'common',
  },
  {
    id: 'thieves_candle',
    name: "Thieves' Candle",
    description: 'Its flame leans toward unattended purses and secret locks.',
    effect: 'shop_discount',
    rarity: 'uncommon',
  },
  {
    id: 'hollow_bell',
    name: 'Hollow Bell',
    description: 'A silent bell that rings only for the dead.',
    effect: 'death_save_bonus',
    rarity: 'rare',
  },
  {
    id: 'gilded_splint',
    name: 'Gilded Splint',
    description: 'A golden brace that makes broken things fight longer.',
    effect: 'temporary_hp_after_combat',
    rarity: 'common',
  },
  {
    id: 'mirror_shard',
    name: 'Mirror Shard',
    description: 'Shows the blow you should not have survived.',
    effect: 'avoid_critical_once',
    rarity: 'rare',
  },
  {
    id: 'runic_whetstone',
    name: 'Runic Whetstone',
    description: 'Edges sharpened on it cut a little closer to truth.',
    effect: 'weapon_upgrade_bonus',
    rarity: 'uncommon',
  },
  {
    id: 'saints_thread',
    name: "Saint's Thread",
    description: 'A white thread that ties the party together in desperate hours.',
    effect: 'shared_healing_pool',
    rarity: 'legendary',
  },
  {
    id: 'black_salt',
    name: 'Black Salt',
    description: 'Sprinkled at the threshold, it buys one breath from the dark.',
    effect: 'prevent_ambush_once',
    rarity: 'common',
  },
];

export const WARDEN_RUN_RELICS: Relic[] = [
  {
    id: 'r1',
    name: 'Censer of Endings',
    description: '+2 dmg to Hexed foes. Each kill heals 4 HP.',
    effect: 'hexed_damage_kill_heal',
    icon: 'flame',
    rarity: 'rare',
  },
  {
    id: 'r2',
    name: 'Vow of the Vanguard',
    description: 'Front rank starts each combat with +4 Block.',
    effect: 'front_rank_start_block',
    icon: 'shield',
    rarity: 'uncommon',
  },
  {
    id: 'r3',
    name: 'Coin of the Forgotten',
    description: '+10% gold from all sources.',
    effect: 'gold_bonus_percent',
    icon: 'coin',
    rarity: 'uncommon',
  },
  {
    id: 'r4',
    name: 'Bone Reliquary',
    description: 'Once per run: revive a fallen ally at half HP.',
    effect: 'revive_once_per_run',
    icon: 'bones',
    rarity: 'legendary',
  },
  {
    id: 'r5',
    name: 'Mirror of Ash',
    description: 'Reflect 25% of a single attack.',
    effect: 'reflect_single_attack',
    icon: 'moon',
    rarity: 'common',
  },
];

export function getRelic(id: string) {
  return [...WARDEN_RUN_RELICS, ...RELICS].find((relic) => relic.id === id);
}

export type RunEventConsequenceType = 'gold' | 'damage' | 'heal' | 'relic' | 'item' | 'combat' | 'curse' | 'map';

export interface RunEventChoice {
  id: string;
  label: string;
  consequence: {
    type: RunEventConsequenceType;
    value: number | string;
    description: string;
  };
}

export interface RunEvent {
  id: string;
  title: string;
  description: string;
  choices: RunEventChoice[];
}

export const RUN_EVENTS: RunEvent[] = [
  {
    id: 'abandoned_shrine',
    title: 'Abandoned Shrine',
    description: 'A cracked shrine waits beneath cold candle smoke.',
    choices: [
      { id: 'pray', label: 'Offer a prayer', consequence: { type: 'heal', value: 8, description: 'The party recovers a small amount of HP.' } },
      { id: 'loot', label: 'Take the offerings', consequence: { type: 'gold', value: 25, description: 'Gain gold, but invite a minor curse.' } },
    ],
  },
  {
    id: 'merchants_corpse',
    title: "Merchant's Corpse",
    description: 'A pack lies beside a body with no visible wounds.',
    choices: [
      { id: 'search', label: 'Search the pack', consequence: { type: 'item', value: 'random_consumable', description: 'Find a useful consumable.' } },
      { id: 'bury', label: 'Bury the body', consequence: { type: 'relic', value: 'silk_ward', description: 'A grateful spirit leaves a ward behind.' } },
    ],
  },
  {
    id: 'wounded_knight',
    title: 'Wounded Knight',
    description: 'A knight in broken mail asks for water and a name.',
    choices: [
      { id: 'aid', label: 'Aid the knight', consequence: { type: 'map', value: 'reveal_elite', description: 'Reveal an elite node reward path.' } },
      { id: 'rob', label: 'Take the crest', consequence: { type: 'gold', value: 40, description: 'Gain gold at a moral cost.' } },
    ],
  },
  {
    id: 'dark_portal',
    title: 'Dark Portal',
    description: 'A ring of shadow turns slowly without touching the floor.',
    choices: [
      { id: 'enter', label: 'Step through', consequence: { type: 'combat', value: 'ambush', description: 'Fight an ambush for bonus rewards.' } },
      { id: 'seal', label: 'Seal it', consequence: { type: 'relic', value: 'black_salt', description: 'Gain a warding relic.' } },
    ],
  },
  {
    id: 'ancient_rune',
    title: 'Ancient Rune',
    description: 'A rune pulses in time with the party’s heartbeats.',
    choices: [
      { id: 'study', label: 'Study it', consequence: { type: 'map', value: 'reveal_boss', description: 'Learn something about the boss.' } },
      { id: 'break', label: 'Break it', consequence: { type: 'damage', value: 6, description: 'Take backlash damage and gain gold.' } },
    ],
  },
  {
    id: 'whispering_tome',
    title: 'Whispering Tome',
    description: 'A book murmurs tactics from battles not yet fought.',
    choices: [
      { id: 'read', label: 'Read a page', consequence: { type: 'relic', value: 'wardens_eye', description: 'Gain insight at a price.' } },
      { id: 'burn', label: 'Burn it', consequence: { type: 'heal', value: 5, description: 'Its smoke calms the party.' } },
    ],
  },
  {
    id: 'campfire',
    title: 'Campfire',
    description: 'A warm fire burns in a place with no fuel.',
    choices: [
      { id: 'rest', label: 'Rest briefly', consequence: { type: 'heal', value: 10, description: 'Recover HP.' } },
      { id: 'take_ember', label: 'Take an ember', consequence: { type: 'relic', value: 'ember_heart', description: 'Gain the Ember Heart.' } },
    ],
  },
  {
    id: 'sealed_vault',
    title: 'Sealed Vault',
    description: 'Three locks, two keys, one impatient mechanism.',
    choices: [
      { id: 'force', label: 'Force it open', consequence: { type: 'damage', value: 5, description: 'Take trap damage and gain loot.' } },
      { id: 'leave', label: 'Mark it on the map', consequence: { type: 'map', value: 'treasure', description: 'Reveal a treasure path.' } },
    ],
  },
  {
    id: 'mirror_pool',
    title: 'Mirror Pool',
    description: 'Still water reflects the party with one member missing.',
    choices: [
      { id: 'drink', label: 'Drink', consequence: { type: 'heal', value: 12, description: 'Heal, then suffer a strange omen.' } },
      { id: 'shatter', label: 'Shatter the reflection', consequence: { type: 'curse', value: 'marked', description: 'Gain a curse and a relic chance.' } },
    ],
  },
  {
    id: 'hanged_keys',
    title: 'Hanged Keys',
    description: 'Keys swing from a rope that descends into darkness.',
    choices: [
      { id: 'pull', label: 'Pull the rope', consequence: { type: 'combat', value: 'guardian', description: 'Wake a guardian.' } },
      { id: 'cut', label: 'Cut a key free', consequence: { type: 'item', value: 'vault_key', description: 'Gain a key item.' } },
    ],
  },
  {
    id: 'old_barricade',
    title: 'Old Barricade',
    description: 'Someone tried to keep something out. Or in.',
    choices: [
      { id: 'salvage', label: 'Salvage supplies', consequence: { type: 'gold', value: 15, description: 'Gain supplies and gold.' } },
      { id: 'reinforce', label: 'Reinforce it', consequence: { type: 'heal', value: 6, description: 'Catch your breath safely.' } },
    ],
  },
  {
    id: 'blind_oracle',
    title: 'Blind Oracle',
    description: 'An eyeless figure names the next wound before it lands.',
    choices: [
      { id: 'listen', label: 'Listen', consequence: { type: 'map', value: 'safe_path', description: 'Reveal a safer path.' } },
      { id: 'question', label: 'Demand answers', consequence: { type: 'curse', value: 'oracle_debt', description: 'Gain knowledge and a debt.' } },
    ],
  },
  {
    id: 'silver_tree',
    title: 'Silver Tree',
    description: 'Metallic leaves chime with every lie told nearby.',
    choices: [
      { id: 'harvest', label: 'Harvest leaves', consequence: { type: 'gold', value: 30, description: 'Gain valuable leaves.' } },
      { id: 'vow', label: 'Speak a vow', consequence: { type: 'relic', value: 'iron_will', description: 'Gain Iron Will.' } },
    ],
  },
  {
    id: 'bone_bridge',
    title: 'Bone Bridge',
    description: 'The bridge assembles itself from bones as you approach.',
    choices: [
      { id: 'cross', label: 'Cross quickly', consequence: { type: 'damage', value: 4, description: 'Take a little damage.' } },
      { id: 'pay', label: 'Pay the toll', consequence: { type: 'gold', value: -10, description: 'Spend gold to avoid harm.' } },
    ],
  },
  {
    id: 'lost_squire',
    title: 'Lost Squire',
    description: 'A young squire hides behind a shield too large for them.',
    choices: [
      { id: 'escort', label: 'Escort them', consequence: { type: 'heal', value: 7, description: 'Morale restores the party.' } },
      { id: 'arm', label: 'Give supplies', consequence: { type: 'relic', value: 'healers_badge', description: 'Receive a medic badge.' } },
    ],
  },
  {
    id: 'frozen_hourglass',
    title: 'Frozen Hourglass',
    description: 'Sand hangs motionless inside a frost-rimmed glass.',
    choices: [
      { id: 'turn', label: 'Turn it over', consequence: { type: 'map', value: 'reroll_node', description: 'Reroll one future node reward.' } },
      { id: 'break', label: 'Break it', consequence: { type: 'damage', value: 8, description: 'Time snaps back violently.' } },
    ],
  },
  {
    id: 'goblet_of_ashes',
    title: 'Goblet of Ashes',
    description: 'A silver cup is filled with warm grey ash.',
    choices: [
      { id: 'sip', label: 'Sip from it', consequence: { type: 'relic', value: 'ashen_crown', description: 'Gain a rare relic and a curse.' } },
      { id: 'scatter', label: 'Scatter the ashes', consequence: { type: 'heal', value: 9, description: 'Lay old grief to rest.' } },
    ],
  },
  {
    id: 'laughing_door',
    title: 'Laughing Door',
    description: 'A door laughs whenever someone reaches for the handle.',
    choices: [
      { id: 'joke', label: 'Tell it a joke', consequence: { type: 'gold', value: 20, description: 'It opens to a coin cache.' } },
      { id: 'kick', label: 'Kick it open', consequence: { type: 'combat', value: 'mimic_door', description: 'It was waiting for that.' } },
    ],
  },
  {
    id: 'quiet_anvil',
    title: 'Quiet Anvil',
    description: 'An anvil absorbs every sound around it.',
    choices: [
      { id: 'forge', label: 'Temper a weapon', consequence: { type: 'item', value: 'weapon_upgrade', description: 'Upgrade one weapon.' } },
      { id: 'listen', label: 'Listen to silence', consequence: { type: 'map', value: 'forge_path', description: 'Reveal a forge node.' } },
    ],
  },
  {
    id: 'starved_altar',
    title: 'Starved Altar',
    description: 'The altar is hungry, and it is polite enough to say so.',
    choices: [
      { id: 'feed_gold', label: 'Feed it gold', consequence: { type: 'relic', value: 'void_crystal', description: 'A void crystal forms.' } },
      { id: 'refuse', label: 'Refuse', consequence: { type: 'combat', value: 'altar_spawn', description: 'The altar calls collectors.' } },
    ],
  },
];

export function getRunEvent(id: string) {
  return RUN_EVENTS.find((event) => event.id === id);
}

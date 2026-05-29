/* global React */
/* ============================================================
   WARDEN'S RUN — Lobby + meta mock data
   ============================================================ */

/* ---------- Player presence (lobby) ---------- */
const WR_LOBBY = {
  roomName: "Cinder-Reeve Run",
  roomCode: "YSAV-9217",
  difficulty: "Warden",
  mode: "Warden's Run",
  visibility: "invite",
  hostId: "p1",
  seats: [
    { id: "p1", name: "Aedric",     handle: "@aedric_v",   presence: "online", ready: true,  host: true,  bound: "warlock",  initials: "AE", color: "#9B5DE5", you: true },
    { id: "p2", name: "Mara",       handle: "@maraplays",  presence: "online", ready: true,  bound: "fighter", initials: "MR", color: "#B8860B" },
    { id: "p3", name: "Linnea",     handle: "@linnea_t",   presence: "online", ready: false, bound: "druid",   initials: "LN", color: "#7BB662" },
    { id: "p4", name: null,         handle: null,          presence: "empty",  ready: false, bound: null,      initials: "—",  color: null },
  ],
};

/* ---------- Vault of bound characters (character binding) ---------- */
const WR_VAULT_CHARS = [
  { id: "vc1", name: "Aedric Vael",    cls: "Warlock",   portrait: "warlock", color: "#9B5DE5", lvl: 7, hp: 52, pact: "Cinder-Reeve",   tag: "favorite", bound: true },
  { id: "vc2", name: "Kessra Ironwake",cls: "Vanguard",  portrait: "fighter", color: "#B8860B", lvl: 7, hp: 70, pact: "Iron Vow",        tag: "veteran" },
  { id: "vc3", name: "Mirenna Thornhart",cls: "Druidwise",portrait: "druid",  color: "#7BB662", lvl: 7, hp: 56, pact: "Bramble Court",   tag: "veteran" },
  { id: "vc4", name: "Halric Dale",    cls: "Light-Cleric",portrait: "cleric",color: "#D4A028", lvl: 6, hp: 48, pact: "Lumen Order",     tag: "wounded" },
  { id: "vc5", name: "Rys",            cls: "Rogue",     portrait: "rogue",   color: "#C53456", lvl: 4, hp: 34, pact: "—",                tag: "new" },
  { id: "vc6", name: "Solenne",        cls: "Wizard",    portrait: "wizard",  color: "#9B5DE5", lvl: 5, hp: 38, pact: "Whisper Scholar", tag: "fresh" },
];

/* ---------- Recent runs (dashboard) ---------- */
const WR_RECENT_RUNS = [
  { n: 17, name: "Cinder-Reeve",      floors: "3/6", outcome: "ongoing", wp: 142, when: "now",       portraits: ["fighter","druid","warlock","cleric"] },
  { n: 16, name: "Blackvein Pits",     floors: "6/6", outcome: "victory", wp: 320, when: "2d ago",    portraits: ["fighter","druid","warlock","cleric"] },
  { n: 15, name: "Salt & Ash",         floors: "4/6", outcome: "defeat",  wp: 80,  when: "4d ago",    portraits: ["rogue","warlock","wizard"] },
  { n: 14, name: "The Hollow Crown",   floors: "5/6", outcome: "defeat",  wp: 120, when: "1w ago",    portraits: ["fighter","cleric","druid","warlock"] },
  { n: 13, name: "Wyrmreach",          floors: "6/6", outcome: "victory", wp: 410, when: "2w ago",    portraits: ["fighter","wizard","druid"] },
];

/* ---------- Friends online (dashboard) ---------- */
const WR_FRIENDS = [
  { name: "Mara",   handle: "@maraplays",  presence: "online", initials: "MR", color: "#B8860B", activity: "In lobby · Cinder-Reeve" },
  { name: "Linnea", handle: "@linnea_t",   presence: "online", initials: "LN", color: "#7BB662", activity: "Choosing warden" },
  { name: "Veka",   handle: "@vk_runner",  presence: "afk",    initials: "VK", color: "#9B5DE5", activity: "AFK · 12 min" },
  { name: "Theos",  handle: "@theos_grim", presence: "offline",initials: "TS", color: "#C53456", activity: "Offline · last 3h ago" },
];

/* ---------- Warden's Vault — unlocks ---------- */
const WR_WP = 1842;
const WR_VAULT_UNLOCKS = {
  classes: [
    { id: "u-anch", name: "The Anchorite",   desc: "A new playable class. Heals while still.",  cost: 600, icon: "bones",   state: "ready" },
    { id: "u-rune", name: "The Runescript",  desc: "Caster that pre-paints spells on the air.", cost: 800, icon: "rune",    state: "locked" },
    { id: "u-pit",  name: "The Pit-Born",    desc: "Trades HP for cinder damage.",              cost: 1400,icon: "skull",   state: "locked" },
    { id: "u-wid",  name: "The Widow",       desc: "Necromancer. Raises one foe per fight.",    cost: 1900,icon: "ghost",   state: "locked", req: "Beat boss on Warden+" },
  ],
  relics: [
    { id: "u-veil",  name: "Whisper-Veil",    desc: "+2 dodge while at full HP.",         cost: 200, icon: "feather", state: "owned" },
    { id: "u-vow",   name: "Vow Coin",        desc: "Once per combat, refund a spell.",   cost: 200, icon: "coin",    state: "ready" },
    { id: "u-cens",  name: "Black Censer",    desc: "Hex spells cost 1 less.",            cost: 350, icon: "flame",   state: "ready" },
    { id: "u-mirror",name: "Mirror of Ash",   desc: "Reflect 25% of one attack.",         cost: 150, icon: "moon",    state: "owned" },
    { id: "u-bone",  name: "Bone Reliquary",  desc: "Once per run: revive an ally.",      cost: 600, icon: "bones",   state: "locked" },
    { id: "u-coin",  name: "Coin of the Forgotten", desc: "+10% gold drops.",             cost: 150, icon: "coin",    state: "owned" },
  ],
  upgrades: [
    { id: "u-pool", name: "Wider Relic Pool",    desc: "+2 relics in shop stock.",          cost: 300, icon: "bag",     state: "owned" },
    { id: "u-floor",name: "Steady Footing",      desc: "+1 starting Block on floor 1.",     cost: 400, icon: "shield",  state: "ready" },
    { id: "u-gold", name: "Heavier Purse",       desc: "Start with 50g instead of 25g.",    cost: 250, icon: "coin",    state: "ready" },
    { id: "u-rest", name: "Long Watch",          desc: "Camp restores +5% more HP.",        cost: 200, icon: "campfire",state: "owned" },
    { id: "u-elite",name: "Knowledge of Elites", desc: "See elite intent one round early.", cost: 800, icon: "eye",     state: "locked" },
    { id: "u-rev",  name: "Death-Rebuke",        desc: "Revivify costs 1 less, once/run.",  cost: 700, icon: "heartPlus", state: "locked" },
  ],
  bestiary: [
    { id: "b-imp",   name: "Pact-Imp",        desc: "Lesser bound thing. Loves to chitter.",  cost: 0,   icon: "spider",  state: "owned" },
    { id: "b-wraith",name: "Cinder-Wraith",   desc: "Smoke given grievance.",                 cost: 0,   icon: "ghost",   state: "owned" },
    { id: "b-knight",name: "Brass Knight",    desc: "Sealed in armor it can't remove.",       cost: 0,   icon: "shield",  state: "owned" },
    { id: "b-reeve", name: "The Cinder-Reeve",desc: "Floor-1 boss. Once a priest. Now—",      cost: 0,   icon: "crownSkull", state: "owned" },
    { id: "b-mary",  name: "Salt-Marys",      desc: "??? — defeat them once to unlock lore.", cost: 0,   icon: "ghost",   state: "locked", req: "Defeat one to unlock" },
    { id: "b-thing", name: "The Thing in IX", desc: "??? — descend to floor 9 to encounter.", cost: 0,   icon: "skull",   state: "locked", req: "Reach floor 9" },
  ],
};

/* ---------- Difficulty options ---------- */
const WR_DIFFICULTIES = [
  { id: "apprentice", label: "Apprentice", desc: "Forgiving. Recommended for new wardens.",  mods: ["-25% foe HP", "+1 revive token", "Map shows all node intents"], color: "good" },
  { id: "warden",     label: "Warden",     desc: "The standard descent. Tuned for four.",     mods: ["Default tuning", "1 revive token", "Elites announce intent"],     color: "violet" },
  { id: "nightmare",  label: "Nightmare",  desc: "Brutal. Random curses each floor.",         mods: ["+30% foe HP", "0 revive tokens", "Hidden node intents"],         color: "blood" },
];

/* ---------- Run intro flavor (cinematic) ---------- */
const WR_INTRO = {
  stratum: "STRATUM I",
  title: "The Censer-Reeve's Chapel",
  lines: [
    "The doors close behind you with the sound of a slow exhale.",
    "Brass-smoke. A chant, then silence. The chapel was holding something — or someone — and the binding is failing.",
    "The Reeve waits below. Four floors of dark between you and the door it guards.",
  ],
};

/* ---------- Party assembly / starting relic ---------- */
const WR_START_RELIC = {
  name: "Pact-Iron Ring", icon: "rune", rarity: "uncommon",
  desc: "+2 max HP for warlocks each kill. Pact-bound — Aedric only.",
};
const WR_ACTIVE_UPGRADES = [
  { icon: "shield",   name: "Steady Footing",   desc: "+1 starting Block on floor 1." },
  { icon: "coin",     name: "Heavier Purse",    desc: "Start with 50g instead of 25g." },
  { icon: "campfire", name: "Long Watch",       desc: "Camp restores +5% more HP." },
];
const WR_POS_LABELS = [
  { n: 1, key: "vanguard", title: "Vanguard", desc: "Front. Takes the first hit. Wants high Block + HP." },
  { n: 2, key: "flanker",  title: "Flanker",  desc: "Mid-line. Reach foes 1–3. Wants mobility + damage." },
  { n: 3, key: "support",  title: "Support",  desc: "Buffs and healing. Wants resources + range." },
  { n: 4, key: "rear",     title: "Rear",     desc: "Back rank. Safe but exposed if line falls. Wants range." },
];

/* ---------- Forge ---------- */
const WR_FORGE_ITEMS = [
  { id: "f1", name: "Pact-Iron Ring",      tier: "+1", who: "Aedric",  icon: "rune",    desc: "+2 max HP per kill",   options: [
    { id: "dmg", label: "+1d4 necrotic on hits", color: "blood" },
    { id: "hp",  label: "+4 to max HP bonus",    color: "violet" },
    { id: "chg", label: "+1 use of pact ability",color: "gold" },
  ]},
  { id: "f2", name: "Vanguard's Spear",    tier: "+0", who: "Kessra",  icon: "sword",   desc: "1d10+3 piercing",      options: [
    { id: "dmg", label: "Damage die → 1d12", color: "blood" },
    { id: "blk", label: "+2 Block on Cleave",color: "gold" },
    { id: "rng", label: "Reach: hit pos 1+2",color: "violet" },
  ]},
  { id: "f3", name: "Bramble Crown",       tier: "+1", who: "Mirenna", icon: "sparkles",desc: "Regen +1 per round",   options: null },
];

/* ---------- Gamble ---------- */
const WR_GAMBLE = {
  flavor: "The altar bears two faces — one weeping, one laughing. The dice are bone, and warm.",
  stake: 50,
  outcomes: [
    { roll: "20",    weight: 1,  desc: "+150g + roll a relic (rare)",   tone: "good"   },
    { roll: "15–19", weight: 4,  desc: "+100g",                         tone: "good"   },
    { roll: "10–14", weight: 6,  desc: "+50g (you break even)",         tone: "neutral"},
    { roll: "5–9",   weight: 5,  desc: "Lose stake",                    tone: "warn"   },
    { roll: "2–4",   weight: 3,  desc: "Lose 20% HP across the party",  tone: "bad"    },
    { roll: "1",     weight: 1,  desc: "Curse a relic. Lose stake.",    tone: "bad"    },
  ],
};

/* ---------- Vote panel state (map overlay) ---------- */
const WR_VOTE = {
  remainingSec: 18,
  totalSec: 30,
  options: [
    { kind: "combat",   label: "Skirmish",   blurb: "A pack of cinder-imps in the antechamber.", votes: ["kessra", "mirenna"] },
    { kind: "rest",     label: "Camp",       blurb: "A guttering brazier. Heal or scour a curse.", votes: ["aedric"] },
    { kind: "treasure", label: "Treasure",   blurb: "An untouched reliquary. Three relics.",      votes: [] },
  ],
};

/* ---------- Toast feed ---------- */
const WR_TOASTS = [
  { id: "t1", kind: "warn",    icon: "question",text: "Linnea has lost connection. Pausing in 30s…" },
  { id: "t2", kind: "info",    icon: "eye",     text: "Mara cast their vote: Skirmish." },
  { id: "t3", kind: "success", icon: "check",   text: "Relic claimed: Whisper-Veil (Aedric)." },
];

/* ---------- Expose ---------- */
Object.assign(window, {
  WR_LOBBY, WR_VAULT_CHARS, WR_RECENT_RUNS, WR_FRIENDS,
  WR_WP, WR_VAULT_UNLOCKS, WR_DIFFICULTIES, WR_INTRO,
  WR_START_RELIC, WR_ACTIVE_UPGRADES, WR_POS_LABELS,
  WR_FORGE_ITEMS, WR_GAMBLE, WR_VOTE, WR_TOASTS,
});

export const MOCK = {
  user: { name: "Aedric", handle: "@aedric_v", initials: "AE" },
  party: [
    { id: 1, name: "Aedric Vael",     class: "Warlock",   lvl: 7, hp: 38, hpMax: 52, ac: 14, you: true, color: "#7C3AED", initials: "AE" },
    { id: 2, name: "Kessra Ironwake", class: "Fighter",   lvl: 7, hp: 64, hpMax: 70, ac: 19, color: "#D6A84F", initials: "KI" },
    { id: 3, name: "Mirenna Thornhart",class: "Druid",    lvl: 7, hp: 41, hpMax: 56, ac: 16, color: "#22C55E", initials: "MT" },
    { id: 4, name: "Halric Dale",     class: "Cleric",    lvl: 6, hp: 0,  hpMax: 48, ac: 18, down: true, color: "#A8A29E", initials: "HD" },
  ],
  campaigns: [
    { id: "cm1", title: "The Hollow Crown of Ysavir", subtitle: "Act III · The Gilded Tomb",
      sessions: 14, hours: 42, players: 4, status: "active", theme: "Dark Fantasy", lastPlayed: "2 days ago" },
    { id: "cm2", title: "Embers of the Black Cathedral", subtitle: "Side arc · Whisper-haunt",
      sessions: 6, hours: 18, players: 4, status: "paused", theme: "Horror", lastPlayed: "3 weeks ago" },
    { id: "cm3", title: "Salt & Ash", subtitle: "One-shot draft",
      sessions: 1, hours: 3, players: 3, status: "draft", theme: "Mystery", lastPlayed: "Never started" },
    { id: "cm4", title: "Wyrmreach Frontier", subtitle: "Hexplore campaign",
      sessions: 22, hours: 71, players: 5, status: "archived", theme: "High Fantasy", lastPlayed: "4 months ago" },
  ],
  recent: [
    { name: "The Hollow Crown of Ysavir", session: "Session 14", when: "2 days ago", note: "Negotiated with the Cinder-Reeve. Halric fell to the wraith." },
    { name: "Embers of the Black Cathedral", session: "Session 6", when: "3 weeks ago", note: "Recovered the bone-tablet. Door 3 still sealed." },
  ],
  activeRooms: [
    { id: "rm1", name: "Ysavir · Tuesday Game", host: "Marek (DM)", players: 4, max: 5, mode: "Classic D&D", code: "YSAV-9217", live: true },
    { id: "rm2", name: "Salt & Ash — One-shot", host: "You", players: 2, max: 4, mode: "AI DM Mode", code: "SALT-4421", live: false },
  ],
  story: [
    { id: 1, kind: "scene", from: "Dungeon Master",
      text: "Cinder-smoke curls along the chapel floor. The brazen censer above the altar gutters — a single coal still alive within. The chant has stopped. Whoever stood here moments ago is gone, but their shadow remains, stretched too long across the south wall." },
    { id: 2, kind: "action", from: "Kessra",
      text: "I keep my shield up and step toward the censer. Slow. I want a closer look at that shadow." },
    { id: 3, kind: "roll", from: "Kessra", roll: "Perception", die: "1d20+3", result: 17, outcome: "Success" },
    { id: 4, kind: "scene", from: "Dungeon Master",
      text: "You see the silhouette wears no helm — a circlet, perhaps. The shadow's hand grips empty air where a censer-chain should hang. It is mid-prayer, frozen." },
    { id: 5, kind: "action", from: "Mirenna",
      text: "I cast *Detect Magic* and look for residue around the altar." },
    { id: 6, kind: "roll", from: "Mirenna", roll: "Arcana", die: "1d20+5", result: 24, outcome: "Critical insight" },
    { id: 7, kind: "scene", from: "Dungeon Master",
      text: "The residue traces a binding — not an ordinary banishment. Whoever stood here is *held*, not gone. The shadow is the warding, and it is failing." },
  ],
  suggestions: [
    "Step inside the warding circle.",
    "Speak to the held shadow.",
    "Disrupt the binding deliberately.",
    "Search the chapel for the missing censer-chain.",
  ],
};

export const CLASSES = [
  { name: "Warlock",   icon: "flame",    blurb: "Pact-touched. Trades sanity for power." },
  { name: "Fighter",   icon: "sword",    blurb: "Martial backbone. Many strikes per round." },
  { name: "Cleric",    icon: "shield",   blurb: "Divine caster. Channels and heals." },
  { name: "Wizard",    icon: "book",     blurb: "Prepared caster. Ritual specialist." },
  { name: "Rogue",     icon: "eye",      blurb: "Sneak attack. Expertise in stealth." },
  { name: "Druid",     icon: "sparkles", blurb: "Shape-shifter. Nature magic." },
  { name: "Paladin",   icon: "crown",    blurb: "Oath-bound. Smites and auras." },
  { name: "Ranger",    icon: "compass",  blurb: "Hunter. Favored enemy, terrain." },
];

export const RACES = ["Human","Elf","Dwarf","Halfling","Tiefling","Half-Orc","Dragonborn","Gnome"];

export const BACKGROUNDS = [
  "Acolyte","Charlatan","Folk Hero","Noble","Outlander","Sage","Soldier","Hermit"
];

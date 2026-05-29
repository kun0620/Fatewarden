/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   SCREEN: BESTIARY / COMPENDIUM — searchable creature & rules library
   ============================================================ */

const BEASTS = [
  {
    id: "cinder-reeve",
    n: "Cinder-Reeve",
    cr: 7, xp: 2900,
    type: "Undead", subtype: "Patron",
    size: "Medium",
    align: "Lawful Evil",
    hp: 120, hpDie: "16d8 + 48",
    ac: 17, acSrc: "natural · brass plating",
    spd: "30 ft, fly 30 ft (hover)",
    env: ["Crypt", "Chapel", "Ysavir-Under"],
    source: "Volume Seven · Ch. 3",
    tags: ["Boss", "Fire", "Psychic"],
    stats: { STR: 16, DEX: 12, CON: 16, INT: 18, WIS: 17, CHA: 20 },
    saves: { CON: 7, WIS: 7, CHA: 9 },
    skills: { Insight: 7, Intimidation: 9, Perception: 7 },
    resist: ["Necrotic", "Fire", "Bludgeoning · non-magical"],
    immune: ["Poison", "Charmed", "Frightened", "Poisoned"],
    senses: "Darkvision 120 ft, Passive Perception 17",
    lang: "Infernal, Cinder-Cant, Telepathy 120 ft",
    traits: [
      { n: "Brass Aegis", t: "While the censer above the Reeve burns, all attacks against it suffer disadvantage." },
      { n: "Patient God", t: "If the Reeve has not moved for at least 1 round, its next attack scores a critical hit on 18-20." },
      { n: "Pact-Touched", t: "Knows the truenames of all Warlock pact-holders within 120 ft. May expend a pact slot to compel a save with disadvantage." },
    ],
    actions: [
      { n: "Multiattack", t: "The Reeve makes one Censer Slam attack and uses Brass Words, if available." },
      { n: "Censer Slam", t: "Melee Weapon Attack: +9 to hit, 5 ft. Hit: 2d10+5 fire + 2d6 necrotic. Ignites flammables." },
      { n: "Brass Words (recharge 5–6)", t: "Each creature in a 60-ft cone makes a DC 17 Wisdom save or takes 4d8 psychic and becomes Frightened until end of its next turn." },
      { n: "Bind Shadow (1/day)", t: "Pin one shadow within 30 ft to the floor for 1 minute. The shadow's owner is Restrained while pinned." },
    ],
    legendary: [
      { n: "Glide", t: "Move up to its speed without provoking opportunity attacks." },
      { n: "Speak in Past Tense", t: "Recite a true sentence from any creature's past. They make a DC 17 Wis save or take 4d6 psychic." },
      { n: "Censer Flicker (cost 2)", t: "Recharge Brass Words." },
    ],
    lore: "The Reeve has not moved since the Septine collapse. It does not have to. Its bargains run on a longer clock than your party. Where it appears, brass weeps oil and the air keeps memory longer than it should.",
    tactics: "Open with Brass Words at maximum cone. Use Patient God to hold position — every round it stays still tightens the trap. Bind Shadow on the heaviest hitter. Save Censer Slam for the moment a player crosses the chapel threshold."
  },
  { id: "brass-spear", n: "Brass Spear",    cr: 2,   xp: 450,  type: "Construct", subtype: "Minion", size: "Medium", env: ["Chapel", "Crypt"], tags: ["Bruiser"], source: "Volume Seven · Bestiary" },
  { id: "bound-shadow",n: "Bound Shadow",   cr: 1.5, xp: 700,  type: "Undead",    subtype: "Hazard", size: "Large",  env: ["Crypt"], tags: ["Hazard"], source: "Volume Seven · Bestiary" },
  { id: "censer-priest", n: "Censer-priest",cr: 4,   xp: 1100, type: "Humanoid",  subtype: "Caster", size: "Medium", env: ["Chapel"], tags: ["Caster","Cleric"], source: "Volume Seven · Bestiary" },
  { id: "soot-wretch", n: "Soot-Wretch",    cr: 0.5, xp: 100,  type: "Aberration",subtype: "Swarm",  size: "Medium", env: ["Crypt","Forest"], tags: ["Swarm"], source: "Volume Seven · Bestiary" },
  { id: "brass-mastiff", n: "Brass Mastiff",cr: 3,   xp: 700,  type: "Construct", subtype: "Bruiser",size: "Medium", env: ["Chapel"], tags: ["Fire"], source: "Volume Seven · Bestiary" },
  { id: "pale-septine", n: "Pale Septine",  cr: 5,   xp: 1800, type: "Humanoid",  subtype: "Solo",   size: "Medium", env: ["Chapel"], tags: ["Caster","Boss"], source: "Volume Seven · Ch. 2" },
  { id: "cinder-rat",  n: "Cinder-rat Swarm",cr:1,   xp: 200,  type: "Beast",     subtype: "Swarm",  size: "Medium", env: ["Crypt"], tags: ["Swarm"], source: "Core 5e · Adapted" },
  { id: "black-censer",n: "The Black Censer",cr:6,   xp: 2300, type: "Object",    subtype: "Hazard", size: "Large",  env: ["Chapel"], tags: ["Boss","Object"], source: "Volume Seven · Ch. 3" },
  { id: "septine-warden",n: "Septine Warden",cr:3,   xp: 700,  type: "Humanoid",  subtype: "Patrol", size: "Medium", env: ["Ysavir","Chapel"], tags: ["Faction"], source: "Volume Seven · Bestiary" },
  { id: "lira-vael",   n: "Lira Vael",      cr: "—", xp: 0,    type: "Humanoid",  subtype: "Civilian",size: "Medium", env: ["The Reach"], tags: ["NPC"], source: "Custom · Aedric's player" },
  { id: "halric-dale", n: "Halric Dale",    cr: 5,   xp: 0,    type: "Humanoid",  subtype: "Ally",   size: "Medium", env: ["—"], tags: ["NPC","PC"], source: "Custom · party" },
];

function BestiaryScreen({ go }) {
  const [tab, setTab] = React.useState("bestiary");
  const [selectedId, setSelectedId] = React.useState("cinder-reeve");
  const [query, setQuery] = React.useState("");
  const [crFilter, setCrFilter] = React.useState("All");
  const [typeFilter, setTypeFilter] = React.useState("All");

  const filtered = React.useMemo(() => BEASTS.filter(b => {
    if (query && !b.n.toLowerCase().includes(query.toLowerCase())) return false;
    if (crFilter === "0–2"  && !(b.cr !== "—" && b.cr <= 2)) return false;
    if (crFilter === "3–5"  && !(b.cr !== "—" && b.cr >= 3 && b.cr <= 5)) return false;
    if (crFilter === "6–10" && !(b.cr !== "—" && b.cr >= 6 && b.cr <= 10)) return false;
    if (crFilter === "11+"  && !(b.cr !== "—" && b.cr >= 11)) return false;
    if (typeFilter !== "All" && b.type !== typeFilter) return false;
    return true;
  }), [query, crFilter, typeFilter]);

  const selected = BEASTS.find(b => b.id === selectedId) || BEASTS[0];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 20 }}>
        {/* HEADER */}
        <div className="fw-page-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="fw-eyebrow">The Stacks</div>
            <h1>Bestiary &amp; Compendium</h1>
            <div className="sub">Creature lore, rules reference, hand-tagged for the Cinder-Reeve campaign.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("menu")}>{Icon("chevL", { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost">{Icon("plus", { size: 12 })} Homebrew</button>
            <button className="fw-btn fw-btn-gold">{Icon("sparkles", { size: 12 })} Generate creature</button>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="fw-tabs" style={{ marginBottom: 16 }}>
          {[
            { id: "bestiary",   label: "Bestiary",   icon: "skull",   count: 48 },
            { id: "spells",     label: "Spells",     icon: "flame",   count: 312 },
            { id: "items",      label: "Items",      icon: "bag",     count: 184 },
            { id: "rules",      label: "Rules",      icon: "book",    count: "—" },
            { id: "conditions", label: "Conditions", icon: "alert",   count: 14 },
          ].map(t => (
            <div key={t.id} className={"fw-tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {Icon(t.icon, { size: 11 })} {t.label}
              <span style={{ marginLeft: 4, fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--text-4)" }}>{t.count}</span>
            </div>
          ))}
          <span style={{ flex: 1, borderBottom: "1px solid var(--border-soft)" }} />
        </div>

        {tab === "bestiary" && (
          <div className="fw-bestiary-grid">
            {/* LEFT: filters */}
            <div className="fw-bestiary-col fw-bestiary-filters">
              <Card>
                <div style={{ padding: 12 }}>
                  <div className="fw-input-wrap" style={{ marginBottom: 12 }}>
                    <span className="fw-input-icon">{Icon("search", { size: 13 })}</span>
                    <input className="fw-input has-icon" placeholder="Search creatures…" value={query} onChange={e => setQuery(e.target.value)} />
                  </div>

                  <FilterGroup label="Challenge Rating">
                    {["All","0–2","3–5","6–10","11+"].map(v => (
                      <FilterChip key={v} value={v} active={crFilter === v} onClick={() => setCrFilter(v)} />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Type">
                    {["All","Humanoid","Construct","Undead","Aberration","Beast","Object"].map(v => (
                      <FilterChip key={v} value={v} active={typeFilter === v} onClick={() => setTypeFilter(v)} />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Environment">
                    {["Crypt", "Chapel", "Ysavir-Under", "Forest", "The Reach"].map(v => (
                      <FilterChip key={v} value={v} />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="Source">
                    {["Volume Seven", "Core 5e", "Custom"].map(v => (
                      <FilterChip key={v} value={v} />
                    ))}
                  </FilterGroup>

                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                    onClick={() => { setQuery(""); setCrFilter("All"); setTypeFilter("All"); }}>
                    {Icon("x", { size: 11 })} Reset filters
                  </button>
                </div>
              </Card>
            </div>

            {/* CENTER: list */}
            <div className="fw-bestiary-col">
              <Card style={{ display: "flex", flexDirection: "column" }}>
                <CardHead icon="skull" title={`Creatures · ${filtered.length}`} right={
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px" }}>{Icon("filter", { size: 10 })} Sort</button>
                  </div>
                } />
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4, maxHeight: 720, overflow: "auto" }}>
                  {filtered.map(b => (
                    <BeastRow key={b.id} beast={b} selected={b.id === selectedId} onClick={() => setSelectedId(b.id)} />
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ padding: 28, textAlign: "center", color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
                      The page is blank. Nothing in your library matches that.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT: detail */}
            <div className="fw-bestiary-col fw-bestiary-detail">
              <BeastDetail beast={selected} />
            </div>
          </div>
        )}

        {tab === "spells"     && <SpellsCompendium />}
        {tab === "items"      && <ItemsCompendium />}
        {tab === "rules"      && <RulesPanel />}
        {tab === "conditions" && <ConditionsPanel />}
      </div>
    </div>
  );
}

/* ---------------- FILTER PRIMS ---------------- */
function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{children}</div>
    </div>
  );
}
function FilterChip({ value, active, onClick }) {
  return (
    <button onClick={onClick} className={"fw-btn fw-btn-sm " + (active ? "" : "fw-btn-ghost")} style={{
      padding: "3px 9px", fontSize: 11, letterSpacing: 0,
      borderColor: active ? "var(--gold-deep)" : "var(--border-soft)",
      background: active ? "rgba(214,168,79,0.12)" : "transparent",
      color: active ? "var(--gold-bright)" : "var(--text-2)",
      textTransform: "none",
    }}>{value}</button>
  );
}

/* ---------------- LIST ROW ---------------- */
function BeastRow({ beast, selected, onClick }) {
  return (
    <div onClick={onClick} className={"fw-beast-row" + (selected ? " active" : "")}>
      <span className="fw-beast-thumb">
        {Icon(beast.type === "Undead" ? "skull" : beast.type === "Construct" ? "shield" : beast.type === "Beast" ? "compass" : beast.type === "Object" ? "hex" : beast.type === "Aberration" ? "sparkles" : "user", { size: 14 })}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          {beast.n}
          {beast.tags && beast.tags.includes("Boss") && <span className="fw-pill gold" style={{ fontSize: 8.5, padding: "0 5px" }}>Boss</span>}
          {beast.tags && beast.tags.includes("NPC") && <span className="fw-pill" style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.35)", color: "var(--arcane-bright)", fontSize: 8.5, padding: "0 5px" }}>NPC</span>}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
          {beast.size} {beast.type} · {beast.subtype}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--gold-bright)" }}>CR {beast.cr}</div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--text-4)" }}>{beast.xp ? beast.xp + " XP" : "—"}</div>
      </div>
    </div>
  );
}

/* ---------------- DETAIL PANE ---------------- */
function BeastDetail({ beast }) {
  if (!beast.stats) {
    return (
      <Card>
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
          <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", marginBottom: 8 }}>{beast.n}</div>
          <div style={{ marginBottom: 16 }}>{beast.size} {beast.type} · {beast.subtype} · CR {beast.cr}</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>Full stat block not yet drafted. This creature exists as a stub for the campaign.</div>
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ marginTop: 14 }}>{Icon("sparkles", { size: 11 })} Generate stat block</button>
        </div>
      </Card>
    );
  }
  return (
    <Card elev className="fw-orn" style={{ overflow: "hidden", position: "sticky", top: 16 }}>
      <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
      <div className="fw-beast-detail">
        {/* TOP */}
        <div className="fw-beast-detail-head">
          <div className="fw-beast-portrait">
            <div className="fw-beast-portrait-inner">
              {Icon(beast.type === "Undead" ? "skull" : beast.type === "Construct" ? "shield" : "sparkles", { size: 42 })}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {beast.tags && beast.tags.map(t => <span key={t} className="fw-pill" style={{ fontSize: 9 }}>{t}</span>)}
            </div>
            <h2 className="fw-display" style={{ fontSize: 22, color: "var(--text)", lineHeight: 1.1, marginBottom: 4 }}>{beast.n}</h2>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
              {beast.size} {beast.type} · {beast.align}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5 }}>{Icon("plus", { size: 10 })} Add to encounter</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5 }}>{Icon("dice", { size: 10 })} Roll initiative</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px" }}>{Icon("kebab", { size: 11 })}</button>
            </div>
          </div>
        </div>

        {/* STATBLOCK */}
        <div className="fw-statblock">
          <div className="fw-statblock-row">
            <StatField label="Armor Class" value={`${beast.ac} (${beast.acSrc})`} />
            <StatField label="Hit Points"  value={`${beast.hp} (${beast.hpDie})`} />
            <StatField label="Speed"        value={beast.spd} />
          </div>

          <div className="fw-statblock-abil">
            {Object.entries(beast.stats).map(([k, v]) => {
              const m = Math.floor((v - 10) / 2);
              return (
                <div key={k}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{k}</div>
                  <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--gold-bright)" }}>({m >= 0 ? "+" : ""}{m})</div>
                </div>
              );
            })}
          </div>

          {beast.saves && (
            <StatLine label="Saving Throws" text={Object.entries(beast.saves).map(([k,v]) => `${k} +${v}`).join(", ")} />
          )}
          {beast.skills && (
            <StatLine label="Skills" text={Object.entries(beast.skills).map(([k,v]) => `${k} +${v}`).join(", ")} />
          )}
          {beast.resist && <StatLine label="Resistances" text={beast.resist.join(", ")} />}
          {beast.immune && <StatLine label="Condition Immunities" text={beast.immune.join(", ")} />}
          <StatLine label="Senses" text={beast.senses} />
          <StatLine label="Languages" text={beast.lang} />
          <StatLine label="Challenge" text={`${beast.cr} (${beast.xp.toLocaleString()} XP)`} bold />

          <div className="fw-statblock-section">
            <div className="fw-display" style={{ fontSize: 14, color: "var(--gold-bright)", marginBottom: 8 }}>Traits</div>
            {beast.traits.map((t,i) => <Trait key={i} {...t} />)}
          </div>

          <div className="fw-statblock-section">
            <div className="fw-display" style={{ fontSize: 14, color: "var(--gold-bright)", marginBottom: 8 }}>Actions</div>
            {beast.actions.map((t,i) => <Trait key={i} {...t} />)}
          </div>

          {beast.legendary && (
            <div className="fw-statblock-section">
              <div className="fw-display" style={{ fontSize: 14, color: "var(--gold-bright)", marginBottom: 4 }}>Legendary Actions</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginBottom: 8 }}>3 actions / round. Only at the end of another creature's turn.</div>
              {beast.legendary.map((t,i) => <Trait key={i} {...t} />)}
            </div>
          )}
        </div>

        {/* LORE + TACTICS */}
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Lore</div>
            <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, fontStyle: "italic" }}>{beast.lore}</p>
          </div>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6, color: "var(--gold)" }}>{Icon("sword", { size: 10 })} Tactics (DM only)</div>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, padding: 10, background: "var(--bg-deep)", border: "1px dashed var(--border)", borderRadius: 6 }}>{beast.tactics}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px dashed var(--border-soft)", fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
            <span>Environment: {beast.env.join(" · ")}</span>
            <span>Source: {beast.source}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatField({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
function StatLine({ label, text, bold }) {
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px dashed var(--border-soft)", fontSize: 12.5 }}>
      <b style={{ color: "var(--gold)", marginRight: 6, fontFamily: "var(--f-display)", letterSpacing: "0.04em", fontWeight: 500 }}>{label}.</b>
      <span style={{ color: bold ? "var(--text)" : "var(--text-2)", fontFamily: "var(--f-serif)", fontWeight: bold ? 500 : 400 }}>{text}</span>
    </div>
  );
}
function Trait({ n, t }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.55 }}>
      <b style={{ color: "var(--text)", fontFamily: "var(--f-display)", letterSpacing: "0.02em", fontWeight: 500 }}>{n}.</b>{" "}
      <span style={{ color: "var(--text-2)", fontFamily: "var(--f-serif)" }}>{t}</span>
    </div>
  );
}

/* ============================================================
   SPELLS COMPENDIUM
   ============================================================ */
function SpellsCompendium() {
  const spells = [
    { n: "Eldritch Blast",    lvl: "Cantrip", school: "Evocation",    cast: "1A", range: "120 ft", comp: "V S",   conc: false, tags: ["Force"], desc: "A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack. On hit, target takes 1d10 force damage." },
    { n: "Hex",               lvl: "1",       school: "Enchantment",  cast: "1BA", range: "90 ft",  comp: "V S M", conc: true,  tags: ["Curse"], desc: "Place a curse on a creature. Whenever you hit it with an attack, it takes an extra 1d6 necrotic. Choose an ability — target has disadvantage on checks with that ability." },
    { n: "Armor of Agathys",  lvl: "1",       school: "Abjuration",   cast: "1A",  range: "Self",   comp: "V S M", conc: false, tags: ["Cold","Shield"], desc: "Magical force surrounds you. Gain 5 temporary HP. A creature that hits you with melee while you have these HP takes 5 cold damage." },
    { n: "Misty Step",        lvl: "2",       school: "Conjuration",  cast: "1BA", range: "Self",   comp: "V",     conc: false, tags: ["Teleport"], desc: "Briefly surrounded by silvery mist, teleport up to 30 feet to an unoccupied space you can see." },
    { n: "Hunger of Hadar",   lvl: "3",       school: "Conjuration",  cast: "1A",  range: "150 ft", comp: "V S M", conc: true,  tags: ["Cold","Acid"], desc: "Open a 20-foot-radius sphere of darkness. Creatures starting their turn there take 2d6 cold. Creatures ending their turn there take 2d6 acid." },
    { n: "Counterspell",      lvl: "3",       school: "Abjuration",   cast: "Reaction", range: "60 ft", comp: "S", conc: false, tags: ["Interrupt"], desc: "Attempt to interrupt a creature in the process of casting a spell. If they are casting a spell of 3rd level or lower, it automatically fails." },
    { n: "Circle of Death",   lvl: "6",       school: "Necromancy",   cast: "1A",  range: "150 ft", comp: "V S M", conc: false, tags: ["Necrotic"], desc: "Sphere of negative energy ripples out from a point. Each creature in a 60-foot-radius sphere must make a CON save, taking 8d6 necrotic on a fail, half on success." },
  ];
  return (
    <Card>
      <CardHead icon="flame" title="Spells · Pact / Arcane focus" right={
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{spells.length} of 312 shown</span>
      } />
      <div style={{ padding: 10 }}>
        <input className="fw-input" placeholder="Search spells, schools, components…" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {spells.map((s, i) => (
            <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 14, display: "flex", gap: 14 }}>
              <div style={{ width: 64, flexShrink: 0, textAlign: "center" }}>
                <div className="fw-display" style={{ fontSize: 22, color: "var(--arcane-bright)", lineHeight: 1 }}>{s.lvl === "Cantrip" ? "0" : s.lvl}</div>
                <div className="fw-eyebrow" style={{ fontSize: 8, marginTop: 2 }}>{s.lvl === "Cantrip" ? "Cantrip" : "Level"}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8, fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{s.school}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div className="fw-display" style={{ fontSize: 15, color: "var(--text)" }}>{s.n}</div>
                  {s.conc && <span className="fw-pill" style={{ fontSize: 9, background: "rgba(124,58,237,0.15)", borderColor: "var(--arcane)", color: "var(--arcane-bright)" }}>Concentration</span>}
                  {s.tags.map(t => <span key={t} className="fw-pill" style={{ fontSize: 9 }}>{t}</span>)}
                </div>
                <div style={{ display: "flex", gap: 14, marginBottom: 6, fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
                  <span><b style={{ color: "var(--text-2)" }}>Cast</b> {s.cast}</span>
                  <span><b style={{ color: "var(--text-2)" }}>Range</b> {s.range}</span>
                  <span><b style={{ color: "var(--text-2)" }}>Comp</b> {s.comp}</span>
                </div>
                <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5, fontStyle: "italic" }}>{s.desc}</p>
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ alignSelf: "flex-start" }}>{Icon("plus", { size: 11 })} Prep</button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   ITEMS COMPENDIUM
   ============================================================ */
function ItemsCompendium() {
  const items = [
    { n: "Staff of the Cinder-Reeve", rar: "Very Rare", attune: true, t: "Staff · Pact weapon · 1d8 fire", desc: "While attuned, you may channel pact magic through the staff. On a critical hit, ignite the target.", icon: "flame", special: true },
    { n: "Bone-Tablet Fragment ×2",   rar: "Quest", attune: false, t: "Trinket · Lore", desc: "A fragment of obsidian incised with brass. When held to the ear, it hums in a major third.", icon: "scroll", lore: true },
    { n: "Brass Censer-Key",          rar: "Uncommon", attune: false, t: "Trinket", desc: "Opens any door tied to a binding rite. Will not open ordinary locks. The censer it summons is empty.", icon: "sparkles", lore: true },
    { n: "Potion of Healing",         rar: "Common", attune: false, t: "Potion · 2d4+2 HP", desc: "Standard. Bitter aftertaste of iron.", icon: "potion" },
    { n: "Cloak of Many Hours",       rar: "Rare", attune: true, t: "Cloak · Wondrous", desc: "Once per long rest, take an extra short rest's worth of recovery in 10 minutes.", icon: "shield" },
    { n: "Hunting Trap",              rar: "Mundane", attune: false, t: "Adventuring gear · 25 gp", desc: "When triggered, immobilizes a Medium creature. STR DC 13 to escape.", icon: "bag" },
  ];
  return (
    <Card>
      <CardHead icon="bag" title="Items · 184 in library" />
      <div style={{ padding: 10 }}>
        <input className="fw-input" placeholder="Search items, rarity, attunement…" style={{ marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: "var(--surface-2)", border: "1px solid " + (it.special ? "var(--gold-deep)" : it.lore ? "rgba(124,58,237,0.3)" : "var(--border-soft)"), borderRadius: 8, padding: 14, display: "flex", gap: 12 }}>
              <span style={{
                width: 40, height: 40, borderRadius: 8,
                background: it.special ? "rgba(214,168,79,0.10)" : it.lore ? "rgba(124,58,237,0.10)" : "var(--bg-deep)",
                border: "1px solid " + (it.special ? "var(--gold-deep)" : it.lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)"),
                display: "grid", placeItems: "center", flexShrink: 0,
                color: it.special ? "var(--gold-bright)" : it.lore ? "var(--arcane-bright)" : "var(--text-2)",
              }}>{Icon(it.icon, { size: 18 })}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{it.n}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span className="fw-pill" style={{ fontSize: 9 }}>{it.rar}</span>
                  {it.attune && <span className="fw-pill gold" style={{ fontSize: 9 }}>Attune</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)", marginBottom: 6 }}>{it.t}</div>
                <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, fontStyle: "italic" }}>{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   RULES PANEL
   ============================================================ */
function RulesPanel() {
  const sections = [
    { n: "Combat · turn order",     icon: "sword",  items: ["Initiative", "Surprise", "Action types", "Bonus action", "Reaction", "Concentration"] },
    { n: "Combat · attacks",        icon: "zap",    items: ["Attack rolls", "Damage", "Critical hits", "Cover", "Advantage / Disadvantage", "Sneak attack"] },
    { n: "Spellcasting",            icon: "flame",  items: ["Spell slots", "Components", "Ritual casting", "Counterspell", "Dispel magic", "Concentration"] },
    { n: "Conditions",              icon: "alert",  items: ["See Conditions tab"] },
    { n: "Resting & recovery",      icon: "heart",  items: ["Short rest", "Long rest", "Hit dice", "Exhaustion"] },
    { n: "Exploration & downtime",  icon: "compass",items: ["Travel pace", "Foraging", "Tracking", "Downtime activities"] },
    { n: "Social & influence",      icon: "users",  items: ["Persuasion vs Deception", "Insight", "Influence framework", "Faction rep"] },
    { n: "Death & dying",           icon: "skull",  items: ["Death saves", "Stabilizing", "Instant death", "Resurrection costs"] },
  ];
  return (
    <Card>
      <CardHead icon="book" title="Rules · 5e SRD + Volume Seven house rules" />
      <div style={{ padding: 12 }}>
        <input className="fw-input" placeholder="Ask a question — 'how does grapple work?'" style={{ marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ color: "var(--gold)" }}>{Icon(s.icon, { size: 14 })}</span>
                <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{s.n}</div>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {s.items.map((it, j) => (
                  <li key={j} style={{ fontSize: 12.5, color: "var(--text-3)", padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: 50, background: "var(--gold-deep)" }} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   CONDITIONS PANEL
   ============================================================ */
function ConditionsPanel() {
  const conditions = [
    { n: "Blinded",         desc: "Cannot see. Auto-fail any check requiring sight. Attack rolls have advantage against, your attacks have disadvantage.", icon: "eyeOff" },
    { n: "Charmed",         desc: "Cannot attack the charmer or target them with harmful abilities. The charmer has advantage on social checks.", icon: "heart" },
    { n: "Concentration",   desc: "Lose on damage (DC = half damage, min 10). Lose on incapacitation, death, or casting another concentration spell.", icon: "sparkles" },
    { n: "Cursed (Hex)",    desc: "Aedric's hex: 1d6 necrotic on each hit. Disadvantage on chosen ability checks. Until rest or transferred.", icon: "skull", custom: true },
    { n: "Frightened",      desc: "Disadvantage on ability checks and attacks while source of fear is within line of sight. Cannot willingly move closer.", icon: "alert" },
    { n: "Grappled",        desc: "Speed becomes 0. Ends if grappler is incapacitated, or the creature is moved out of grappler's reach.", icon: "shield" },
    { n: "Incapacitated",   desc: "Cannot take actions or reactions.", icon: "x" },
    { n: "Invisible",       desc: "Heavily obscured. Attacks against have disadvantage, your attacks have advantage.", icon: "eyeOff" },
    { n: "Paralyzed",       desc: "Incapacitated, cannot move or speak. Auto-fail STR/DEX saves. Attacks have advantage. Crits within 5 ft.", icon: "lock" },
    { n: "Petrified",       desc: "Transformed to stone. Incapacitated. Resistant to all damage. Cannot age.", icon: "shield" },
    { n: "Poisoned",        desc: "Disadvantage on attack rolls and ability checks.", icon: "potion" },
    { n: "Prone",           desc: "Disadvantage on attacks. Melee attacks against have advantage. Ranged attacks against have disadvantage.", icon: "minus" },
    { n: "Restrained",      desc: "Speed becomes 0. Attacks against have advantage. Your attacks have disadvantage. Disadvantage on DEX saves.", icon: "lock" },
    { n: "Stunned",         desc: "Incapacitated. Cannot move. Speaks falteringly. Auto-fails STR/DEX saves. Attacks against have advantage.", icon: "zap" },
    { n: "Unconscious",     desc: "Incapacitated, prone, can't move/speak. Drops carried items. Auto-fails STR/DEX saves. Attacks against have advantage. Melee within 5 ft auto-crits.", icon: "skull" },
  ];
  return (
    <Card>
      <CardHead icon="alert" title="Conditions · 14 (incl. 1 custom)" />
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {conditions.map((c, i) => (
          <div key={i} style={{ background: c.custom ? "rgba(214,168,79,0.05)" : "var(--surface-2)", border: "1px solid " + (c.custom ? "var(--gold-deep)" : "var(--border-soft)"), borderRadius: 6, padding: 12, display: "flex", gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center", color: c.custom ? "var(--gold-bright)" : "var(--text-3)", flexShrink: 0 }}>{Icon(c.icon, { size: 13 })}</span>
            <div>
              <div className="fw-display" style={{ fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
                {c.n}
                {c.custom && <span className="fw-pill gold" style={{ marginLeft: 6, fontSize: 8.5, padding: "0 5px" }}>House rule</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

Object.assign(window, { BestiaryScreen });

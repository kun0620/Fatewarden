/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   SCREEN: GAME TABLE — 3-zone layout
   ============================================================ */
function GameTableScreen({ go }) {
  const [leftTab, setLeftTab] = React.useState("party");
  const [rightTab, setRightTab] = React.useState("dice");
  const [storyTab, setStoryTab] = React.useState("story");
  const [actionDraft, setActionDraft] = React.useState("");
  const [aiOn, setAiOn] = React.useState(true);
  const [aiTone, setAiTone] = React.useState("Balanced");
  const [aiStrict, setAiStrict] = React.useState("Standard");
  const [pendingChange, setPendingChange] = React.useState(null);
  const [diceResult, setDiceResult] = React.useState({ die: "1d20", value: 17, bonus: "+3", target: 15, kind: "success" });
  const [rolling, setRolling] = React.useState(false);
  const [combatMode, setCombatMode] = React.useState(false);
  const storyRef = React.useRef(null);

  const rollDie = () => {
    setRolling(true);
    setTimeout(() => {
      const v = 1 + Math.floor(Math.random() * 20);
      setDiceResult({ die: "1d20", value: v, bonus: "+3", target: 15, kind: v + 3 >= 15 ? (v === 20 ? "crit" : "success") : (v === 1 ? "fumble" : "failure") });
      setRolling(false);
    }, 450);
  };

  React.useEffect(() => {
    if (storyRef.current) storyRef.current.scrollTop = storyRef.current.scrollHeight;
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Session banner */}
      <SessionBanner go={go} combatMode={combatMode} setCombatMode={setCombatMode} />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", flex: 1, minHeight: 0, gap: 0, borderTop: "1px solid var(--border-soft)" }}>

        {/* ===== LEFT SIDEBAR ===== */}
        <aside style={{ borderRight: "1px solid var(--border-soft)", background: "linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {[
              { id: "party",  label: "Party",     icon: "users" },
              { id: "char",   label: "You",       icon: "user" },
              { id: "bag",    label: "Inventory", icon: "bag" },
              { id: "quests", label: "Quests",    icon: "scroll" },
            ].map(t => (
              <div key={t.id} className={"fw-tab " + (leftTab === t.id ? "active" : "")} onClick={() => setLeftTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 8px", flex: 1, justifyContent: "center" }}>
                {Icon(t.icon, { size: 11 })} {t.label}
              </div>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {leftTab === "party"  && <PartyPanel onAttack={(m) => setPendingChange(m)} />}
            {leftTab === "char"   && <CharacterPanel />}
            {leftTab === "bag"    && <InventoryPanel onUse={(m) => setPendingChange(m)} />}
            {leftTab === "quests" && <QuestsPanel />}
          </div>
        </aside>

        {/* ===== CENTER ===== */}
        <main style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "linear-gradient(180deg, rgba(20,17,29,0.2), rgba(11,10,16,0))" }}>
          {combatMode ? (
            <CombatModeView onExit={() => setCombatMode(false)} onChange={setPendingChange} />
          ) : (
            <>
              {/* Scene block */}
              <SceneHeader />

              {/* Story tabs */}
              <div className="fw-tabs" style={{ paddingInline: 18, marginTop: 4 }}>
                {[
                  { id: "story", label: "Story Log", icon: "scroll" },
                  { id: "chat",  label: "Table Chat", icon: "users" },
                  { id: "lore",  label: "Lore", icon: "book" },
                ].map(t => (
                  <div key={t.id} className={"fw-tab " + (storyTab === t.id ? "active" : "")} onClick={() => setStoryTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {Icon(t.icon, { size: 11 })} {t.label}
                  </div>
                ))}
                <span style={{ flex: 1, borderBottom: "1px solid var(--border-soft)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBlock: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>Session 15 · 1h 24m</span>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("search", { size: 12 })}</button>
                </div>
              </div>

              {/* Story scroll */}
              <div ref={storyRef} className="fw-scroll" style={{ flex: 1, padding: "18px 28px", minHeight: 0 }}>
                {MOCK.story.map(e => <StoryEntry key={e.id} entry={e} />)}
                {/* roll request */}
                <RollRequest dice={diceResult} onRoll={rollDie} rolling={rolling} />
              </div>

              {/* Input area */}
              <ActionInput
                value={actionDraft}
                setValue={setActionDraft}
                suggestions={MOCK.suggestions}
              />
            </>
          )}
        </main>

        {/* ===== RIGHT SIDEBAR ===== */}
        <aside style={{ borderLeft: "1px solid var(--border-soft)", background: "linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {[
              { id: "dice",    label: "Dice",     icon: "dice" },
              { id: "combat",  label: "Combat",   icon: "sword" },
              { id: "ai",      label: "AI Warden",icon: "wand" },
              { id: "tools",   label: "Tools",    icon: "cog" },
            ].map(t => (
              <div key={t.id} className={"fw-tab " + (rightTab === t.id ? "active" : "")} onClick={() => setRightTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 6px", flex: 1, justifyContent: "center", fontSize: 10 }}>
                {Icon(t.icon, { size: 11 })} {t.label}
              </div>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {rightTab === "dice"   && <DicePanel result={diceResult} onRoll={rollDie} rolling={rolling} />}
            {rightTab === "combat" && <CombatPanel onChange={setPendingChange} />}
            {rightTab === "ai"     && <AIDMPanel on={aiOn} setOn={setAiOn} tone={aiTone} setTone={setAiTone} strict={aiStrict} setStrict={setAiStrict} onChange={setPendingChange} />}
            {rightTab === "tools"  && <ToolsPanel />}
          </div>
        </aside>
      </div>

      {pendingChange && <ConfirmModal change={pendingChange} onClose={() => setPendingChange(null)} />}
    </div>
  );
}

/* ---------- SESSION BANNER ---------- */
function SessionBanner({ go, combatMode, setCombatMode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: combatMode ? "linear-gradient(180deg, rgba(153,27,27,0.10), transparent)" : "linear-gradient(180deg, rgba(124,58,237,0.05), transparent)", borderBottom: "1px solid var(--border-soft)", transition: "background 0.3s" }}>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go("menu")}>{Icon("chevL", { size: 11 })} Leave table</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {combatMode
          ? <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2s infinite" }}><span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor" }} /> Combat · Round 3</span>
          : <span className="fw-pill blood"><span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor" }} /> Live · Session 15</span>}
        <span className="fw-display" style={{ fontSize: 14, letterSpacing: "0.08em", color: "var(--text)" }}>The Hollow Crown of Ysavir</span>
        <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--text-3)", fontSize: 13 }}>· Act III — The Gilded Tomb</span>
      </div>
      <span style={{ flex: 1 }} />
      <button className={"fw-btn " + (combatMode ? "fw-btn-blood" : "fw-btn-ghost") + " fw-btn-sm"} onClick={() => setCombatMode(!combatMode)} title={combatMode ? "Exit combat" : "Run encounter — switch to battle map"}>
        {Icon(combatMode ? "scroll" : "sword", { size: 12 })} {combatMode ? "Resume story" : "Run encounter"}
      </button>
      <div style={{ display: "flex", marginRight: 4, marginLeft: 8 }}>
        {MOCK.party.slice(0,4).map((p,i) => (
          <div key={p.id} className={"fw-avatar sm " + (p.you ? "dm" : "")} style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.color}33, #15101f)`, position: "relative" }}>
            {p.initials}
            {!p.down && <span className="dot" style={{ background: p.you ? "var(--gold)" : "var(--success)" }} />}
            {p.down && <span className="dot" style={{ background: "var(--blood)" }} />}
          </div>
        ))}
        <div className="fw-avatar sm dm" style={{ marginLeft: -8, background: "linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)" }}>MK</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("mic", { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("volume", { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("kebab", { size: 14 })}</button>
      </div>
    </div>
  );
}

/* ---------- LEFT PANELS ---------- */
function PartyPanel({ onAttack }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Initiative · Round 3</div>
      {MOCK.party.map((p,i) => (
        <div key={p.id}
          style={{
            display: "flex", gap: 10, padding: 10,
            background: p.you ? "linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))" : "var(--surface)",
            border: "1px solid " + (p.you ? "rgba(214,168,79,0.4)" : p.down ? "rgba(153,27,27,0.4)" : "var(--border-soft)"),
            borderRadius: 8,
            position: "relative",
            opacity: p.down ? 0.85 : 1,
          }}>
          {i === 0 && <span style={{ position: "absolute", left: -1, top: 8, bottom: 8, width: 2, background: "var(--gold)", borderRadius: 2 }} />}
          <div className="fw-avatar" style={{ background: `linear-gradient(135deg, ${p.color}33, #15101f)`, borderColor: p.down ? "var(--blood)" : "var(--border)" }}>{p.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500 }}>{p.name}</div>
              {p.you && <span className="fw-pill gold" style={{ padding: "0 6px", fontSize: 9 }}>You</span>}
              {p.down && <span className="fw-pill blood" style={{ padding: "0 6px", fontSize: 9 }}>Down</span>}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{p.class} · Lv {p.lvl}</div>
            <div className="fw-stat-bar" style={{ marginTop: 6 }}>
              <span className="lbl">HP</span>
              <div className="fw-bar hp bar"><i style={{ width: `${(p.hp/p.hpMax)*100}%` }} /></div>
              <span className="num">{p.hp}/{p.hpMax}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
              <span>AC <b style={{ color: "var(--text)" }}>{p.ac}</b></span>
              {p.you && <><span>SLOTS <b style={{ color: "var(--text)" }}>1/2</b></span></>}
              {p.down && <span style={{ color: "var(--blood-bright)" }}>Death · 2 ✓ / 0 ✗</span>}
            </div>
          </div>
        </div>
      ))}
      <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }} onClick={() => onAttack({ kind: "damage", target: "Aedric", amount: 7, source: "Brass spear hit" })}>
        {Icon("alert", { size: 11 })} Simulate incoming damage
      </button>
    </div>
  );
}

function CharacterPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div className="fw-avatar lg" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)", borderColor: "var(--gold-deep)" }}>AE</div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 15, color: "var(--text)" }}>Aedric Vael</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>Tiefling Warlock · Lv 7</div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <span className="fw-cond">Bless</span>
            <span className="fw-cond bleed">Cursed</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <StatBox lbl="HP" val="38 / 52" tone="hp" />
        <StatBox lbl="AC" val="14" />
        <StatBox lbl="SPD" val="30 ft" />
        <StatBox lbl="INIT" val="+2" />
        <StatBox lbl="PROF" val="+3" />
        <StatBox lbl="PASSPERC" val="13" />
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Resources</div>
        <Resource label="Pact Slots" cur={1} max={2} color="arcane" />
        <Resource label="Hit Dice (d8)" cur={5} max={7} color="gold" />
        <Resource label="Inspiration" cur={1} max={1} color="gold" diamond />
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Ability Scores</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[["STR",9,-1],["DEX",14,2],["CON",12,1],["INT",13,1],["WIS",11,0],["CHA",18,4]].map(([k,v,m]) => (
            <div key={k} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{k}</div>
              <div className="fw-display" style={{ fontSize: 16, color: "var(--gold-bright)", lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--text-3)" }}>{m >= 0 ? "+" : ""}{m}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Spells · Pact Magic</div>
        {[
          { n: "Eldritch Blast", t: "Cantrip · 2 beams · 1d10 force each", on: true },
          { n: "Hex", t: "Lvl 1 · 1d6 necrotic per hit", on: true },
          { n: "Armor of Agathys", t: "Lvl 1 · 10 temp HP", on: false },
          { n: "Misty Step", t: "Lvl 2 · BA · teleport 30 ft", on: false },
        ].map((s,i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "6px 8px", marginBottom: 4, background: s.on ? "rgba(124,58,237,0.07)" : "var(--surface)", border: "1px solid " + (s.on ? "rgba(124,58,237,0.3)" : "var(--border-soft)"), borderRadius: 5 }}>
            <span style={{ color: s.on ? "var(--arcane-bright)" : "var(--text-4)" }}>{Icon("flame", { size: 12 })}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--text)" }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{s.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ lbl, val, tone }) {
  const c = tone === "hp" ? "var(--blood-bright)" : "var(--gold-bright)";
  return (
    <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 6, textAlign: "center" }}>
      <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{lbl}</div>
      <div className="fw-display" style={{ fontSize: 14, color: c, lineHeight: 1.1 }}>{val}</div>
    </div>
  );
}
function Resource({ label, cur, max, color, diamond }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-2)" }}>{cur} / {max}</span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 9,
            borderRadius: diamond ? 0 : 3,
            transform: diamond ? "skewX(-25deg)" : "none",
            background: i < cur
              ? (color === "arcane" ? "linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))" : "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))")
              : "var(--bg-deep)",
            border: "1px solid " + (i < cur
              ? (color === "arcane" ? "var(--arcane)" : "var(--gold-deep)")
              : "var(--border-soft)"),
            boxShadow: i < cur && color === "arcane" ? "0 0 4px rgba(124,58,237,0.5)" : i < cur ? "0 0 4px rgba(214,168,79,0.4)" : "none",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   INVENTORY — in-session manager
   ============================================================ */
const INV_FILTERS = [
  { id: "all",       label: "All",          icon: "bag" },
  { id: "weapons",   label: "Weapons",      icon: "sword" },
  { id: "armor",     label: "Armor",        icon: "shield" },
  { id: "consume",   label: "Consumables",  icon: "potion" },
  { id: "quest",     label: "Quest",        icon: "sparkles" },
];

function InventoryPanel({ onUse }) {
  const [subTab, setSubTab] = React.useState("bag");
  const [filter, setFilter] = React.useState("all");
  const [expandedId, setExpandedId] = React.useState(null);
  const [search, setSearch] = React.useState("");

  // Equipped items
  const [equipped, setEquipped] = React.useState([
    { id: "staff", n: "Staff of the Cinder-Reeve", tag: "Pact weapon · 1d8 fire", icon: "flame", cat: "weapons", special: true, attuned: true, charges: 5, chargesMax: 7, recover: "1d3 per long rest",
      lore: "Brass-bound rowan. The Reeve's collar made into a haft. It warms in your hand only when the bargain is honored." },
    { id: "armor", n: "Leather armor",             tag: "AC 11 + Dex",            icon: "shield", cat: "armor" },
    { id: "xbow",  n: "Light crossbow",            tag: "1d8 piercing · 80/320",  icon: "sword",  cat: "weapons", canSwap: "dagger" },
  ]);

  // Carried items
  const [carried, setCarried] = React.useState([
    { id: "potion-heal", n: "Healer's Potion",  tag: "2d4+2 HP · standard",  icon: "potion", cat: "consume", qty: 2, action: { cost: "1A", effect: "heal", amount: "2d4+2 HP" } },
    { id: "tablet",      n: "Bone-tablet fragment", tag: "Quest · Embers arc", icon: "scroll", cat: "quest", lore: true,
      details: "One of three obsidian fragments. Hums in a major third when held to the ear." },
    { id: "key",         n: "Brass censer-key", tag: "Trinket · binding-resonance", icon: "sparkles", cat: "quest", lore: true,
      action: { cost: "Free", effect: "examine" },
      details: "Opens any door tied to a binding rite. Will not open ordinary locks." },
    { id: "torch",       n: "Torch",            tag: "6 hr · bright 20 ft",   icon: "torch",  cat: "consume", qty: 3, action: { cost: "1A", effect: "light" } },
    { id: "rations",     n: "Rations",          tag: "5 days · 10 lbs",       icon: "bag",    cat: "consume", qty: 5 },
    { id: "rope",        n: "Rope, hempen",     tag: "50 ft · adventuring gear", icon: "bag", cat: "consume" },
  ]);

  // Quick-use slots (4 pinned)
  const [quickSlots, setQuickSlots] = React.useState(["potion-heal", "key", "torch", null]);

  // Loot pool — items DM has dropped to the scene, not yet claimed
  const [loot, setLoot] = React.useState([
    { id: "loot-glove", n: "Glove of Bound Soot",   tag: "Wondrous · uncommon · attune", icon: "shield",   special: true, src: "Dropped by Cinder-Reeve · session start",
      details: "Once per long rest, cast Mage Hand as a bonus action. The hand is sooty and slightly cold to the touch." },
    { id: "loot-shackle", n: "Brass shackle",       tag: "Trinket · lore",  icon: "sparkles", lore: true, src: "Brass-Spear A · floor",
      details: "Engraved with the same liturgy as Aedric's collar. Same maker?" },
    { id: "loot-coin",   n: "Loose coin",           tag: "47 GP · 12 SP",   icon: "bag", coin: { gp: 47, sp: 12 }, src: "Brass-Spear A · pouch" },
    { id: "loot-scroll", n: "Scroll · Hold Person", tag: "Lvl 2 · single use", icon: "scroll", action: { cost: "1A", effect: "cast" }, src: "Censer-priest pew" },
  ]);

  // Mock party
  const allies = (MOCK.party || []).filter(p => !p.you);

  // Weight calc (rough)
  const weight = 34, weightMax = 90;
  const weightPct = (weight / weightMax) * 100;
  const weightTone = weightPct < 60 ? "var(--success)" : weightPct < 85 ? "var(--warning)" : "var(--danger)";

  const handleUse = (item, sourceSection) => {
    if (item.action?.effect === "heal") {
      onUse({ kind: "use-item", item: item.n, amount: item.action.amount });
      if (sourceSection === "bag") {
        setCarried(c => c.map(x => x.id === item.id ? { ...x, qty: Math.max(0, (x.qty || 1) - 1) } : x).filter(x => x.qty !== 0));
      }
    } else {
      onUse({ kind: "use-item", item: item.n, amount: item.action?.effect || "examined" });
    }
  };
  const handleGive = (item, ally) => {
    onUse({ kind: "give-item", item: item.n, target: ally.name, from: "Aedric" });
  };
  const handlePickup = (item) => {
    onUse({ kind: "pickup", item: item.n, by: "Aedric" });
    setLoot(l => l.filter(x => x.id !== item.id));
  };

  const filteredCarried = carried.filter(it => {
    if (search && !it.n.toLowerCase().includes(search.toLowerCase()) && !it.tag.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && it.cat !== filter) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* QUICK-USE BAR */}
      <div className="fw-inv-quickbar">
        <div className="fw-eyebrow" style={{ fontSize: 9, color: "var(--gold)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          {Icon("zap", { size: 9 })} Quick-use · 1-2-3-4
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {quickSlots.map((id, i) => {
            const item = id && [...equipped, ...carried].find(x => x.id === id);
            if (!item) {
              return (
                <div key={i} className="fw-quickslot empty">
                  <span className="fw-quickslot-kbd">{i + 1}</span>
                  <span style={{ color: "var(--text-4)" }}>{Icon("plus", { size: 14 })}</span>
                  <span style={{ fontSize: 9, color: "var(--text-4)" }}>Pin</span>
                </div>
              );
            }
            const remaining = item.qty || item.charges;
            return (
              <button key={i} className="fw-quickslot" onClick={() => handleUse(item, "bag")} title={item.n}>
                <span className="fw-quickslot-kbd">{i + 1}</span>
                <span style={{ color: item.special ? "var(--gold-bright)" : item.lore ? "var(--arcane-bright)" : "var(--gold)" }}>{Icon(item.icon, { size: 16 })}</span>
                <span style={{ fontSize: 9.5, color: "var(--text-2)", textAlign: "center", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.n.split(" ").slice(0, 2).join(" ")}</span>
                {item.action?.cost && <span className="fw-quickslot-action">{item.action.cost}</span>}
                {remaining !== undefined && <span className="fw-quickslot-qty">{remaining}{item.chargesMax ? `/${item.chargesMax}` : ""}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="fw-inv-subtabs">
        <button className={"fw-inv-subtab " + (subTab === "bag" ? "active" : "")} onClick={() => setSubTab("bag")}>
          {Icon("bag", { size: 11 })} My Bag <span className="fw-inv-subtab-count">{carried.length + equipped.length}</span>
        </button>
        <button className={"fw-inv-subtab " + (subTab === "loot" ? "active" : "")} onClick={() => setSubTab("loot")}>
          {Icon("sparkles", { size: 11 })} Loot Pool
          {loot.length > 0 && <span className="fw-inv-subtab-count blood">{loot.length}</span>}
        </button>
      </div>

      {subTab === "bag" && (
        <>
          {/* WEIGHT + SEARCH */}
          <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "var(--gold)" }}>{Icon("bag", { size: 12 })}</span>
              <span style={{ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.08em" }}>CARRY</span>
              <span style={{ flex: 1, fontFamily: "var(--f-mono)", fontSize: 11, color: weightTone, textAlign: "right" }}>{weight} / {weightMax} lb</span>
            </div>
            <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 50, overflow: "hidden" }}>
              <div style={{ height: "100%", width: weightPct + "%", background: `linear-gradient(90deg, var(--gold-deep), ${weightTone})`, transition: "width 0.2s" }} />
            </div>
          </div>

          <input className="fw-input" placeholder="Search bag…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }} />

          {/* FILTER CHIPS */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {INV_FILTERS.map(f => (
              <button key={f.id} className={"fw-inv-chip " + (filter === f.id ? "active" : "")} onClick={() => setFilter(f.id)}>
                {Icon(f.icon, { size: 9 })} {f.label}
              </button>
            ))}
          </div>

          {/* EQUIPPED */}
          {filter === "all" || filter === "weapons" || filter === "armor" ? (
            <div>
              <div className="fw-eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>Equipped</span>
                <span style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
              </div>
              {equipped.filter(e => filter === "all" || e.cat === filter).map(it => (
                <InvItem key={it.id} item={it} section="equipped"
                  expanded={expandedId === it.id}
                  onToggleExpand={() => setExpandedId(expandedId === it.id ? null : it.id)}
                  onUnequip={() => {
                    setCarried(c => [...c, it]);
                    setEquipped(e => e.filter(x => x.id !== it.id));
                  }}
                  onUse={() => handleUse(it, "equipped")}
                  onPin={() => setQuickSlots(s => { const ns = [...s]; const empty = ns.indexOf(null); if (empty >= 0) ns[empty] = it.id; else ns[0] = it.id; return ns; })}
                  onGive={(ally) => handleGive(it, ally)}
                  allies={allies}
                  pinned={quickSlots.includes(it.id)}
                />
              ))}
            </div>
          ) : null}

          {/* CARRIED */}
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>Carried</span>
              <span style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
              <span style={{ fontSize: 10, color: "var(--text-4)" }}>{filteredCarried.length}</span>
            </div>
            {filteredCarried.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", fontSize: 12 }}>
                Nothing here matches.
              </div>
            ) : filteredCarried.map(it => (
              <InvItem key={it.id} item={it} section="carried"
                expanded={expandedId === it.id}
                onToggleExpand={() => setExpandedId(expandedId === it.id ? null : it.id)}
                onUse={() => handleUse(it, "bag")}
                onPin={() => setQuickSlots(s => { const ns = [...s]; const empty = ns.indexOf(null); if (empty >= 0) ns[empty] = it.id; else ns[0] = it.id; return ns; })}
                onUnpin={() => setQuickSlots(s => s.map(x => x === it.id ? null : x))}
                onGive={(ally) => handleGive(it, ally)}
                allies={allies}
                pinned={quickSlots.includes(it.id)}
              />
            ))}
          </div>

          {/* COIN */}
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Coin</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
              {[["GP",47,"#D6A84F"],["SP",12,"#A8A29E"],["CP",30,"#8C5A3C"],["EP",2,"#B8B0A4"]].map(([k,v,c],i) => (
                <div key={i} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 6, textAlign: "center" }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, color: c }}>{k}</div>
                  <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {subTab === "loot" && (
        <>
          <div style={{ padding: 10, background: "linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))", border: "1px solid rgba(214,168,79,0.3)", borderRadius: 6, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "var(--gold-bright)" }}>{Icon("sparkles", { size: 14 })}</span>
            <div style={{ flex: 1, fontSize: 11.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.4 }}>
              From <b style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>Chapel of the Gilded Censer</b>. Items left in the scene — anyone in the party may claim.
            </div>
          </div>

          {loot.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", fontSize: 13 }}>
              The chapel floor is bare. Move on.
            </div>
          ) : loot.map(it => (
            <LootItem key={it.id} item={it}
              expanded={expandedId === it.id}
              onToggleExpand={() => setExpandedId(expandedId === it.id ? null : it.id)}
              onPickup={() => handlePickup(it)}
              onPickupBy={(ally) => {
                onUse({ kind: "pickup", item: it.n, by: ally.name });
                setLoot(l => l.filter(x => x.id !== it.id));
              }}
              onPass={() => setLoot(l => l.filter(x => x.id !== it.id))}
              allies={allies}
            />
          ))}

          {loot.length > 0 && (
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>
              {Icon("dice", { size: 11 })} Random pick · /roll for the table
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- INV ITEM (carried + equipped) ---------------- */
function InvItem({ item, section, expanded, onToggleExpand, onUse, onPin, onUnpin, onGive, onUnequip, allies, pinned }) {
  const [giveOpen, setGiveOpen] = React.useState(false);
  const isEquipped = section === "equipped";
  return (
    <div className={"fw-inv-row" + (item.special ? " special" : "") + (item.lore ? " lore" : "")}>
      <div className="fw-inv-row-head" onClick={onToggleExpand}>
        <span className="fw-inv-icon" style={{
          background: item.special ? "rgba(214,168,79,0.10)" : item.lore ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.025)",
          borderColor: item.special ? "var(--gold-deep)" : item.lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)",
          color: item.special ? "var(--gold-bright)" : item.lore ? "var(--arcane-bright)" : "var(--text-3)",
        }}>{Icon(item.icon, { size: 12 })}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12.5, color: "var(--text)" }}>{item.n}</span>
            {item.attuned && <span className="fw-pill gold" style={{ fontSize: 8, padding: "0 5px", letterSpacing: 0 }}>★ Attuned</span>}
            {pinned && <span style={{ color: "var(--gold-bright)", fontSize: 9 }} title="Pinned to quick-use">{Icon("zap", { size: 9 })}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{item.tag}</div>
        </div>
        {item.charges !== undefined && (
          <span className="fw-inv-charges" title="Charges">
            <span style={{ color: "var(--gold-bright)" }}>{item.charges}</span>
            <span style={{ color: "var(--text-4)" }}>/{item.chargesMax}</span>
          </span>
        )}
        {item.qty && <span className="fw-inv-qty">×{item.qty}</span>}
        <span style={{ color: "var(--text-4)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>{Icon("chevD", { size: 11 })}</span>
      </div>

      {/* INLINE ACTIONS */}
      <div className="fw-inv-actions">
        {item.action && (
          <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={(e) => { e.stopPropagation(); onUse(); }} style={{ fontSize: 10.5, padding: "3px 8px" }}>
            {item.action.cost && <span className="fw-inv-cost">{item.action.cost}</span>}
            {item.action.effect === "heal" ? "Drink" : item.action.effect === "light" ? "Light" : item.action.effect === "cast" ? "Cast" : "Use"}
          </button>
        )}
        {isEquipped && item.canSwap && (
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={(e) => e.stopPropagation()} style={{ fontSize: 10.5, padding: "3px 8px" }}>
            {Icon("sword", { size: 10 })} Swap → {item.canSwap}
          </button>
        )}
        {isEquipped && onUnequip && (
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={(e) => { e.stopPropagation(); onUnequip(); }} style={{ fontSize: 10.5, padding: "3px 8px" }}>
            Unequip
          </button>
        )}
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={(e) => { e.stopPropagation(); pinned ? onUnpin?.() : onPin?.(); }} style={{ fontSize: 10.5, padding: "3px 8px", color: pinned ? "var(--gold-bright)" : "var(--text-3)" }} title={pinned ? "Unpin from quick-use" : "Pin to quick-use"}>
          {Icon("zap", { size: 10 })}
        </button>
        <div style={{ position: "relative" }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={(e) => { e.stopPropagation(); setGiveOpen(o => !o); }} style={{ fontSize: 10.5, padding: "3px 8px" }}>
            {Icon("users", { size: 10 })} Give {Icon("chevD", { size: 9 })}
          </button>
          {giveOpen && (
            <div className="fw-inv-give-menu" onClick={(e) => e.stopPropagation()}>
              {allies.map(a => (
                <button key={a.id} className="fw-inv-give-row" onClick={() => { onGive(a); setGiveOpen(false); }}>
                  <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${a.color}33, #15101f)`, fontSize: 9 }}>{a.initials}</span>
                  <span style={{ flex: 1, textAlign: "left", fontSize: 11 }}>{a.name}</span>
                  <span style={{ fontSize: 9, color: "var(--text-4)" }}>{a.class}</span>
                </button>
              ))}
              <button className="fw-inv-give-row" onClick={() => { onUse({ ...item, action: { effect: "drop" } }); setGiveOpen(false); }} style={{ borderTop: "1px dashed var(--border-soft)", color: "var(--blood-bright)" }}>
                {Icon("minus", { size: 10 })} <span style={{ flex: 1, textAlign: "left", fontSize: 11 }}>Drop on the ground</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* EXPANDED DETAIL */}
      {expanded && (item.lore || item.details) && (
        <div className="fw-inv-detail">
          {item.details && <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55, fontStyle: "italic", margin: 0 }}>"{item.details}"</p>}
          {item.recover && <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Recharge · {item.recover}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------------- LOOT ITEM ---------------- */
function LootItem({ item, expanded, onToggleExpand, onPickup, onPickupBy, onPass, allies }) {
  const [pickOpen, setPickOpen] = React.useState(false);
  return (
    <div className={"fw-inv-row loot" + (item.special ? " special" : "") + (item.lore ? " lore" : "")}>
      <div className="fw-inv-row-head" onClick={onToggleExpand}>
        <span className="fw-inv-icon" style={{
          background: item.special ? "rgba(214,168,79,0.10)" : item.lore ? "rgba(124,58,237,0.10)" : item.coin ? "rgba(214,168,79,0.06)" : "rgba(255,255,255,0.025)",
          borderColor: item.special ? "var(--gold-deep)" : item.lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)",
          color: item.special ? "var(--gold-bright)" : item.lore ? "var(--arcane-bright)" : item.coin ? "var(--gold)" : "var(--text-3)",
        }}>{Icon(item.icon, { size: 12 })}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: "var(--text)" }}>{item.n}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{item.tag}</div>
        </div>
        <span style={{ color: "var(--text-4)", transform: expanded ? "rotate(180deg)" : "none" }}>{Icon("chevD", { size: 11 })}</span>
      </div>
      <div className="fw-inv-actions">
        {item.coin ? (
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => onPickupBy(allies[0])}>
            {Icon("dice", { size: 10 })} Split · {Object.values(item.coin).reduce((a,b)=>a+b,0)} total
          </button>
        ) : (
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={onPickup}>
            {Icon("plus", { size: 10 })} Take
          </button>
        )}
        <div style={{ position: "relative" }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => setPickOpen(o => !o)}>
            {Icon("users", { size: 10 })} Give to {Icon("chevD", { size: 9 })}
          </button>
          {pickOpen && (
            <div className="fw-inv-give-menu">
              {allies.map(a => (
                <button key={a.id} className="fw-inv-give-row" onClick={() => { onPickupBy(a); setPickOpen(false); }}>
                  <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${a.color}33, #15101f)`, fontSize: 9 }}>{a.initials}</span>
                  <span style={{ flex: 1, textAlign: "left", fontSize: 11 }}>{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 10.5, padding: "3px 8px", color: "var(--text-4)" }} onClick={onPass}>
          Leave it
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{item.src}</span>
      </div>
      {expanded && item.details && (
        <div className="fw-inv-detail">
          <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.55, fontStyle: "italic", margin: 0 }}>"{item.details}"</p>
        </div>
      )}
    </div>
  );
}

function QuestsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Quest
        title="The Gilded Tomb"
        kind="Main"
        active
        steps={[
          { d: "Reach the chapel beneath Ysavir.", done: true },
          { d: "Confront the Cinder-Reeve.",       done: true },
          { d: "Decide the fate of the held shadow.", done: false, current: true },
          { d: "Recover the brass censer-chain.", done: false },
        ]}
      />
      <Quest
        title="The Bone-tablet"
        kind="Side"
        steps={[
          { d: "Reassemble three fragments.", done: false, progress: "2 / 3" },
          { d: "Find the tablet's reader.", done: false },
        ]}
      />
      <Quest
        title="A Letter to Lira"
        kind="Personal"
        steps={[
          { d: "Write a letter, then never send it.", done: false },
        ]}
      />
    </div>
  );
}
function Quest({ title, kind, steps, active }) {
  return (
    <div style={{ background: active ? "linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))" : "var(--surface)", border: "1px solid " + (active ? "rgba(214,168,79,0.3)" : "var(--border-soft)"), borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="fw-pill dim">{kind}</span>
        <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{title}</div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s,i) => (
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: s.done ? "var(--text-3)" : s.current ? "var(--gold-bright)" : "var(--text-2)", fontFamily: "var(--f-serif)", lineHeight: 1.4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 50, border: "1px solid " + (s.done ? "var(--gold-deep)" : s.current ? "var(--gold-bright)" : "var(--border)"), background: s.done ? "rgba(214,168,79,0.2)" : s.current ? "rgba(214,168,79,0.1)" : "transparent", display: "grid", placeItems: "center", color: "var(--gold-bright)", flexShrink: 0, marginTop: 2 }}>
              {s.done && Icon("check", { size: 9 })}
              {s.current && <span style={{ width: 5, height: 5, borderRadius: 50, background: "var(--gold-bright)", animation: "fw-glow-pulse 2s infinite" }} />}
            </span>
            <span style={{ flex: 1, fontStyle: s.current ? "italic" : "normal", textDecoration: s.done ? "line-through" : "none" }}>{s.d}</span>
            {s.progress && <span style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{s.progress}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- CENTER: SCENE ---------- */
function SceneHeader() {
  return (
    <div style={{ padding: "18px 28px 0", position: "relative" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        {/* Scene "thumbnail" */}
        <div style={{
          width: 200, height: 110, borderRadius: 8,
          background: "linear-gradient(135deg, #1d1828, #06050b)",
          border: "1px solid var(--border)",
          position: "relative", overflow: "hidden", flexShrink: 0
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 35% 30%, rgba(214,168,79,0.32), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.3), transparent 65%)" }} />
          <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="rgba(214,168,79,0.25)" strokeWidth="0.6">
              <path d="M0 88 L40 82 L70 76 L100 80 L140 70 L180 78 L200 75 V110 H0 Z" fill="rgba(0,0,0,0.4)" />
              <path d="M0 70 L30 62 L60 66 L90 55 L130 64 L170 58 L200 60 V70" />
              <circle cx="100" cy="40" r="14" fill="rgba(214,168,79,0.5)" stroke="rgba(214,168,79,0.6)" />
              <circle cx="100" cy="40" r="22" stroke="rgba(214,168,79,0.3)" strokeDasharray="2 2" />
            </g>
          </svg>
          <span style={{ position: "absolute", left: 8, top: 8, fontSize: 10, color: "var(--gold-bright)", fontFamily: "var(--f-mono)", textShadow: "0 0 6px rgba(0,0,0,0.8)" }}>SCENE · 14</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Scene</div>
          <div className="fw-display" style={{ fontSize: 22, color: "var(--text)", letterSpacing: "0.04em" }}>Chapel of the Gilded Censer</div>
          <p className="fw-serif" style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.55, marginTop: 6, fontStyle: "italic" }}>
            A low chapel built into the under-cathedral. The brazen censer above the altar still burns — barely. Smoke pools at knee height. Someone was here, mid-chant. The shadow they left has not moved.
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span className="fw-pill dim">Indoor</span>
            <span className="fw-pill dim">Dim light · 15 ft</span>
            <span className="fw-pill">{Icon("sparkles", { size: 10 })} Faint divination</span>
            <span className="fw-pill blood">Combat possible</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- STORY ENTRY ---------- */
function StoryEntry({ entry }) {
  if (entry.kind === "scene") {
    return (
      <div className="fw-fade" style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <div className="fw-avatar dm" style={{ background: "linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)" }}>MK</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="fw-display" style={{ fontSize: 11.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold-bright)" }}>{entry.from}</span>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>·</span>
            <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>just now</span>
          </div>
          <p className="fw-serif" style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.6 }}>{entry.text}</p>
        </div>
      </div>
    );
  }
  if (entry.kind === "ai") {
    return (
      <div className="fw-fade" style={{ display: "flex", gap: 12, marginBottom: 18, padding: 14, background: "linear-gradient(180deg, rgba(124,58,237,0.07), rgba(124,58,237,0.01))", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, marginInline: -8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 50, background: "rgba(124,58,237,0.15)", border: "1px solid var(--arcane)", display: "grid", placeItems: "center", color: "var(--arcane-bright)", flexShrink: 0 }}>
          {Icon("wand", { size: 16 })}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="fw-display" style={{ fontSize: 11.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--arcane-bright)" }}>{entry.from}</span>
            <span className="fw-pill" style={{ padding: "0 6px", fontSize: 9 }}>Suggestion</span>
          </div>
          <p className="fw-serif" style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.55, fontStyle: "italic" }}>{entry.text}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="fw-btn fw-btn-arcane fw-btn-sm">{Icon("check", { size: 11 })} Accept as canon</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} Re-suggest</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("x", { size: 11 })} Dismiss</button>
          </div>
        </div>
      </div>
    );
  }
  if (entry.kind === "roll") {
    const ok = entry.outcome.toLowerCase().includes("success") || entry.outcome.toLowerCase().includes("critical");
    return (
      <div className="fw-fade" style={{ display: "flex", gap: 12, marginBottom: 14, padding: 10, background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--bg-deep)", border: "1px solid " + (ok ? "rgba(34,197,94,0.4)" : "rgba(153,27,27,0.4)"), display: "grid", placeItems: "center", color: ok ? "var(--success)" : "var(--danger)", fontFamily: "var(--f-mono)", fontSize: 14, flexShrink: 0 }}>{entry.result}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, color: "var(--text)" }}><b>{entry.from}</b> rolled <span style={{ fontFamily: "var(--f-mono)", color: "var(--gold-bright)" }}>{entry.die}</span> for <b>{entry.roll}</b></div>
          <div style={{ fontSize: 11, color: ok ? "#86EFAC" : "#FCA5A5", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{entry.outcome}</div>
        </div>
      </div>
    );
  }
  // action
  return (
    <div className="fw-fade" style={{ display: "flex", gap: 12, marginBottom: 14 }}>
      <div className="fw-avatar sm" style={{ background: "linear-gradient(135deg, rgba(168,162,158,0.3), #15101f)" }}>{entry.from.slice(0,2).toUpperCase()}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}><b style={{ color: "var(--text-2)" }}>{entry.from}</b> · action</div>
        <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.55 }}>{entry.text}</p>
      </div>
    </div>
  );
}

/* ---------- ROLL REQUEST ---------- */
function RollRequest({ dice, onRoll, rolling }) {
  return (
    <div className="fw-fade" style={{ padding: 14, marginBottom: 18, background: "linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))", border: "1px solid rgba(214,168,79,0.4)", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--gold)" }}>{Icon("dice", { size: 16 })}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text)" }}><b style={{ color: "var(--gold-bright)" }}>DM requests:</b> Charisma (Persuasion) — to convince the held shadow it is free.</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>1d20 +3 · DC 15</div>
        </div>
        <button className="fw-btn fw-btn-gold" onClick={onRoll}>
          <svg className={"fw-d20 " + (rolling ? "rolling" : "")} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8.5 5v8L12 21 3.5 16V8z"/><path d="M12 3v18M3.5 8L20.5 16M20.5 8L3.5 16M12 3l-4.5 8h9zM12 21l-4.5-8h9z"/></svg>
          Roll d20+3
        </button>
        <button className="fw-btn fw-btn-ghost">Adv</button>
        <button className="fw-btn fw-btn-ghost">Dis</button>
      </div>
    </div>
  );
}

/* ---------- ACTION INPUT ---------- */
function ActionInput({ value, setValue, suggestions }) {
  const [mode, setMode] = React.useState("speak"); // speak / act / aside
  return (
    <div style={{ borderTop: "1px solid var(--border-soft)", padding: 16, background: "linear-gradient(180deg, rgba(11,10,16,0), rgba(11,10,16,0.5))" }}>
      {/* Suggestions */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span className="fw-eyebrow" style={{ alignSelf: "center", marginRight: 4, color: "var(--arcane-bright)" }}>
          {Icon("sparkles", { size: 10 })} Suggested
        </span>
        {suggestions.map((s, i) => (
          <button key={i} className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 11.5, padding: "4px 10px", borderColor: "rgba(124,58,237,0.3)", color: "var(--text-2)" }} onClick={() => setValue(s)}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {[
              { id: "speak", label: "Speak", icon: "users" },
              { id: "act",   label: "Act",   icon: "sword" },
              { id: "aside", label: "Aside (DM only)", icon: "eye" },
            ].map(t => (
              <button key={t.id} onClick={() => setMode(t.id)} className={"fw-btn fw-btn-ghost fw-btn-sm"} style={{ padding: "3px 8px", fontSize: 11, color: mode === t.id ? "var(--gold-bright)" : "var(--text-3)", borderColor: mode === t.id ? "var(--gold-deep)" : "transparent", background: mode === t.id ? "rgba(214,168,79,0.08)" : "transparent" }}>
                {Icon(t.icon, { size: 10 })} {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={mode === "speak" ? "Speak — in character to the table…" : mode === "act" ? "Describe your action. The Warden will request rolls." : "Whisper to the DM only…"}
            rows="2"
            style={{ width: "100%", background: "transparent", border: 0, outline: 0, resize: "none", color: "var(--text)", fontFamily: "var(--f-serif)", fontSize: 15, lineHeight: 1.5 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("dice", { size: 14 })}</button>
          <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("sparkles", { size: 14 })}</button>
        </div>
        <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ height: "100%" }}>
          {Icon("send", { size: 13 })} Commit
        </button>
      </div>
    </div>
  );
}

/* ---------- RIGHT: DICE PANEL ---------- */
function DicePanel({ result, onRoll, rolling }) {
  const dice = [
    { n: "d4", v: 4 }, { n: "d6", v: 6 }, { n: "d8", v: 8 },
    { n: "d10", v: 10 }, { n: "d12", v: 12 }, { n: "d20", v: 20, primary: true }, { n: "d100", v: 100 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "var(--bg-deep)", border: "1px solid " + (result.kind === "crit" ? "var(--gold)" : result.kind === "success" ? "var(--gold-deep)" : "var(--border)"), borderRadius: 10, padding: 18, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: result.kind === "crit" ? "0 0 30px -6px rgba(214,168,79,0.5)" : "none" }}>
        {result.kind === "crit" && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(214,168,79,0.18), transparent 70%)" }} />}
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Last Roll · {result.die}{result.bonus}</div>
        <div className={"fw-display " + (rolling ? "fw-die-shake" : "")} style={{ fontSize: 56, lineHeight: 1, color: result.kind === "crit" ? "var(--gold-bright)" : result.kind === "fumble" ? "var(--blood-bright)" : "var(--text)" }}>
          {result.value}
          <span style={{ fontSize: 22, color: "var(--text-3)" }}> {result.bonus}</span>
        </div>
        <div style={{ marginTop: 4, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>= {result.value + 3} vs DC {result.target}</div>
        <div style={{ marginTop: 6, fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 13, color: result.kind === "crit" ? "var(--gold-bright)" : result.kind === "success" ? "#86EFAC" : result.kind === "fumble" ? "#FCA5A5" : "var(--text-3)" }}>
          {result.kind === "crit" ? "Critical." : result.kind === "success" ? "Success." : result.kind === "fumble" ? "Fumble. The censer cracks." : "Failure. The shadow does not move."}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="fw-eyebrow">Quick Dice</span>
          <Seg value="Normal" onChange={() => {}} options={["Normal","Adv","Dis"]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {dice.map(d => (
            <button key={d.n} onClick={d.primary ? onRoll : undefined}
              className="fw-btn" style={{
                padding: "12px 0", justifyContent: "center", flexDirection: "column", gap: 0,
                background: d.primary ? "linear-gradient(180deg, #2A1F3D, #15101f)" : "var(--surface-2)",
                borderColor: d.primary ? "var(--gold-deep)" : "var(--border-soft)",
                color: d.primary ? "var(--gold-bright)" : "var(--text-2)",
                boxShadow: d.primary ? "0 0 16px -4px rgba(214,168,79,0.3)" : "none",
              }}>
              <span className="fw-display" style={{ fontSize: 16, letterSpacing: "0.06em" }}>{d.n}</span>
              <span style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>1–{d.v}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Saved Rolls</div>
        {[
          { n: "Eldritch Blast",  d: "2d10 + 4 · force",   icon: "flame" },
          { n: "Hex Damage",      d: "1d6 · necrotic",     icon: "skull" },
          { n: "Persuasion (CHA)",d: "1d20 + 6",           icon: "users" },
          { n: "Death Save",      d: "1d20",               icon: "skull",  blood: true },
        ].map((r,i) => (
          <button key={i} className="fw-btn fw-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: r.blood ? "var(--blood-bright)" : "var(--gold)" }}>{Icon(r.icon, { size: 12 })}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{r.n}</span>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>{r.d}</span>
          </button>
        ))}
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>{Icon("plus", { size: 11 })} Custom roll</button>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Recent</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column", gap: 5, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <div><span style={{ color: "var(--gold)" }}>You</span> · Perception 17 <span style={{ color: "var(--success)" }}>✓</span></div>
          <div><span style={{ color: "var(--arcane-bright)" }}>Mirenna</span> · Arcana 24 <span style={{ color: "var(--gold-bright)" }}>★</span></div>
          <div><span style={{ color: "#FCA5A5" }}>Halric</span> · Death 8 <span style={{ color: "var(--danger)" }}>✗</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- RIGHT: COMBAT TRACKER ---------- */
function CombatPanel({ onChange }) {
  const turn = [
    { n: "Kessra",        ini: 22, hp: "64/70", you: false, current: false, ally: true },
    { n: "Cinder-Reeve",  ini: 19, hp: "—",     foe: true,  current: true },
    { n: "Aedric (you)",  ini: 17, hp: "38/52", you: true,  current: false, ally: true },
    { n: "Brass Spear ×2",ini: 15, hp: "12/22", foe: true },
    { n: "Mirenna",       ini: 14, hp: "41/56", ally: true },
    { n: "Halric (down)", ini: 8,  hp: "0/48",  ally: true, down: true },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="fw-pill blood"><span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor" }} /> Round 3</span>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>Surprise: none</span>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("chevR", { size: 12 })}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {turn.map((t,i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            background: t.current ? "linear-gradient(90deg, rgba(153,27,27,0.18), transparent)" : "var(--surface)",
            border: "1px solid " + (t.current ? "var(--blood)" : "var(--border-soft)"),
            borderRadius: 6, opacity: t.down ? 0.6 : 1,
            position: "relative",
          }}>
            {t.current && <span style={{ position: "absolute", left: -1, top: 6, bottom: 6, width: 2, background: "var(--blood-bright)", borderRadius: 2 }} />}
            <span className="fw-mono" style={{ width: 24, fontSize: 13, color: "var(--gold-bright)", textAlign: "center" }}>{t.ini}</span>
            <span style={{ width: 8, height: 8, borderRadius: 50, background: t.ally ? "var(--success)" : "var(--blood-bright)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text)", flex: 1 }}>{t.n}</span>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>{t.hp}</span>
            {t.current && <span style={{ color: "var(--blood-bright)", fontSize: 10, marginLeft: 2 }}>NOW</span>}
          </div>
        ))}
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Active Conditions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <span className="fw-cond">Bless (Mirenna · 8 rd)</span>
          <span className="fw-cond bleed">Cursed (Aedric · until rest)</span>
          <span className="fw-cond bleed">Prone (Brass Spear)</span>
          <span className="fw-cond buff">Concentration (Hex)</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button className="fw-btn fw-btn-blood" style={{ justifyContent: "center" }} onClick={() => onChange({ kind: "damage", target: "Aedric", amount: 7, source: "Brass spear hit" })}>
          {Icon("minus", { size: 12 })} Damage
        </button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }} onClick={() => onChange({ kind: "heal", target: "Aedric", amount: 9, source: "Healer's potion" })}>
          {Icon("heart", { size: 12 })} Heal
        </button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }}>{Icon("sparkles", { size: 12 })} Condition</button>
        <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }}>{Icon("plus", { size: 12 })} NPC</button>
      </div>

      <button className="fw-btn fw-btn-gold" style={{ justifyContent: "center" }}>
        End Turn {Icon("chevR", { size: 12 })}
      </button>
    </div>
  );
}

/* ---------- RIGHT: AI DM PANEL ---------- */
function AIDMPanel({ on, setOn, tone, setTone, strict, setStrict, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02))", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 50, background: "rgba(124,58,237,0.18)", border: "1px solid var(--arcane)", display: "grid", placeItems: "center", color: "var(--arcane-bright)" }}>
          {Icon("wand", { size: 14 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 12.5, color: "var(--text)" }}>AI Warden</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{on ? "Assistant · awaits the DM." : "Off."}</div>
        </div>
        <Toggle on={on} onChange={setOn} />
      </div>

      <Field label="Tone">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 }}>
          {["Balanced","Grim","Heroic","Mystery"].map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={"fw-btn " + (tone === t ? "" : "fw-btn-ghost") + " fw-btn-sm"}
              style={{ justifyContent: "center", borderColor: tone === t ? "var(--gold-deep)" : undefined, color: tone === t ? "var(--gold-bright)" : undefined, background: tone === t ? "rgba(214,168,79,0.08)" : undefined }}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Rule Strictness">
        <Seg value={strict} onChange={setStrict} options={["Casual","Standard","Hardcore"]} />
      </Field>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Warden Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <AIAction icon="sparkles" name="Generate Scene"        desc="From recent log + chosen tone." />
          <AIAction icon="alert"    name="Suggest Consequence"   desc="Outcome of last action."     />
          <AIAction icon="book"     name="Ask Rules"             desc="RAW citation. No state change." />
          <AIAction icon="users"    name="Voice NPC"             desc="Speak as the Cinder-Reeve."  />
          <AIAction icon="map"      name="Roll Random Encounter" desc="By region · Ysavir under."   />
        </div>
      </div>

      <div style={{ padding: 12, background: "var(--bg-deep)", border: "1px solid rgba(214,168,79,0.4)", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ color: "var(--gold-bright)" }}>{Icon("alert", { size: 12 })}</span>
          <div className="fw-eyebrow">Pending Confirmation</div>
        </div>
        <div className="fw-serif" style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>
          The Warden proposes: <b style={{ color: "var(--text)" }}>Aedric takes 7 fire damage</b> from the brazen censer's burst.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => onChange({ kind: "damage", target: "Aedric", amount: 7, source: "Brass censer burst", aiProposed: true })}>
            {Icon("check", { size: 11 })} Confirm
          </button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("x", { size: 11 })} Reject</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", lineHeight: 1.5, paddingInline: 4 }}>
        The Warden suggests. It never commits damage, conditions, death, or inventory loss without your approval.
      </div>
    </div>
  );
}
function AIAction({ icon, name, desc }) {
  return (
    <button className="fw-btn fw-btn-ghost" style={{ width: "100%", padding: "8px 10px", justifyContent: "flex-start", textAlign: "left", borderColor: "rgba(124,58,237,0.25)" }}>
      <span style={{ color: "var(--arcane-bright)" }}>{Icon(icon, { size: 12 })}</span>
      <div style={{ flex: 1, lineHeight: 1.2 }}>
        <div style={{ fontSize: 12, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{desc}</div>
      </div>
    </button>
  );
}

/* ---------- RIGHT: TOOLS PANEL ---------- */
function ToolsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Session Tools</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <ToolBtn icon="pause" label="Pause" />
          <ToolBtn icon="scroll" label="Recap" />
          <ToolBtn icon="bell" label="Bell" />
          <ToolBtn icon="bag" label="Loot" />
          <ToolBtn icon="map" label="Map" />
          <ToolBtn icon="layers" label="Handouts" />
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Rules · Conditions</div>
        <input className="fw-input" placeholder="Search rules, spells, conditions…" />
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { n: "Prone", t: "Disadv on attack. Melee atks vs prone gain adv." },
            { n: "Cursed (Hex)", t: "1d6 necrotic on hit. Disadv on chosen ability." },
            { n: "Concentration", t: "DC 10 or half damage on hit." },
            { n: "Unconscious", t: "Drops what holds. Auto-fails STR / DEX saves." },
          ].map((r,i) => (
            <div key={i} style={{ padding: 8, background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
              <div style={{ fontSize: 12, color: "var(--text)" }}>{r.n}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{r.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Audio</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="fw-btn fw-btn-icon">{Icon("play", { size: 12 })}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: "var(--text)" }}>Cinder Chapel · ambient loop</div>
              <div className="fw-bar" style={{ marginTop: 4 }}><i style={{ width: "32%" }} /></div>
            </div>
          </div>
        </div>
      </div>

      <button className="fw-btn fw-btn-blood" style={{ justifyContent: "center" }}>
        {Icon("logout", { size: 12 })} End Session
      </button>
    </div>
  );
}
function ToolBtn({ icon, label }) {
  return (
    <button className="fw-btn fw-btn-ghost" style={{ flexDirection: "column", padding: "10px 6px", gap: 4 }}>
      <span style={{ color: "var(--gold)" }}>{Icon(icon, { size: 14 })}</span>
      <span style={{ fontSize: 11 }}>{label}</span>
    </button>
  );
}

/* ---------- CONFIRMATION MODAL (critical state change) ---------- */
function ConfirmModal({ change, onClose }) {
  const isDamage = change.kind === "damage";
  const isHeal = change.kind === "heal";
  const isUse = change.kind === "use-item";

  const titleMap = {
    damage:    "Confirm Damage",
    heal:      "Confirm Healing",
    "use-item":"Confirm Item Use",
  };
  const ringColor = isDamage ? "blood" : "gold";

  return (
    <div className="fw-overlay">
      <div className={"fw-modal " + (isDamage ? "" : "gold")}>
        <div className="fw-modal-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 50, background: isDamage ? "rgba(153,27,27,0.18)" : "rgba(214,168,79,0.15)", border: "1px solid " + (isDamage ? "var(--blood)" : "var(--gold-deep)"), display: "grid", placeItems: "center", color: isDamage ? "#FCA5A5" : "var(--gold-bright)" }}>
            {Icon(isDamage ? "alert" : isHeal ? "heart" : "potion", { size: 14 })}
          </span>
          <div className="fw-display" style={{ fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: isDamage ? "#FCA5A5" : "var(--gold-bright)" }}>{titleMap[change.kind]}</div>
          <span style={{ flex: 1 }} />
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose}>{Icon("x", { size: 12 })}</button>
        </div>
        <div className="fw-modal-body">
          <p className="fw-serif" style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.55, fontStyle: "italic" }}>
            {isDamage && <><b style={{ color: "var(--text)" }}>{change.target}</b> takes <b style={{ color: "#FCA5A5" }}>{change.amount}</b> damage. Source: <i>{change.source}</i>.</>}
            {isHeal && <><b style={{ color: "var(--text)" }}>{change.target}</b> recovers <b style={{ color: "var(--gold-bright)" }}>{change.amount}</b> HP from <i>{change.source}</i>.</>}
            {isUse && <>Consume <b style={{ color: "var(--text)" }}>{change.item}</b> ({change.amount}). This is permanent.</>}
          </p>
          {isDamage && change.amount >= 7 && (
            <div style={{ marginTop: 12, padding: 10, background: "rgba(153,27,27,0.10)", border: "1px solid rgba(153,27,27,0.4)", borderRadius: 6, fontSize: 12, color: "#FCA5A5", display: "flex", gap: 8 }}>
              <span>{Icon("alert", { size: 13 })}</span>
              <span>This will reduce Aedric to 31 HP. Concentration check on <b>Hex</b> required at DC 10.</span>
            </div>
          )}
          {change.aiProposed && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--arcane-bright)", fontFamily: "var(--f-serif)", fontStyle: "italic", display: "flex", gap: 6, alignItems: "center" }}>
              {Icon("wand", { size: 12 })} Proposed by the AI Warden — your approval finalizes it.
            </div>
          )}
        </div>
        <div className="fw-modal-foot">
          <button className="fw-btn fw-btn-ghost" onClick={onClose}>Reject</button>
          <button className="fw-btn fw-btn-ghost">Modify…</button>
          <button className={"fw-btn " + (isDamage ? "fw-btn-blood" : "fw-btn-gold")} onClick={onClose}>
            {Icon("check", { size: 12 })} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameTableScreen });

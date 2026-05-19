/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   NARRATIVE LAYER UI KIT — spec 10 handoff
   4 sections: Scene Mode · Journal · Companion · Relationship
   ============================================================ */

const SCENE_MODES = {
  exploration: { label: "Exploration", color: "#5EEAD4", glow: "rgba(94,234,212,0.4)",  tone: "curious, descriptive", icon: "compass" },
  combat:      { label: "Combat",      color: "#C72D2D", glow: "rgba(199,45,45,0.5)",   tone: "urgent, tactical",     icon: "sword"   },
  social:      { label: "Social",      color: "#F59E0B", glow: "rgba(245,158,11,0.4)",  tone: "warm, diplomatic",     icon: "users"   },
  rest:        { label: "Rest",        color: "#EAC074", glow: "rgba(234,192,116,0.4)", tone: "calm, reflective",     icon: "heart"   },
  horror:      { label: "Horror",      color: "#84CC16", glow: "rgba(132,204,22,0.4)",  tone: "oppressive, uncertain",icon: "skull"   },
  transition:  { label: "Transition",  color: "#A8A29E", glow: "rgba(168,162,158,0.3)", tone: "neutral",              icon: "chevR"   },
};

const AFFINITY_TIERS = [
  { range: [76, 100],   label: "Allied",      color: "#86EFAC" },
  { range: [26, 75],    label: "Friendly",    color: "#5EEAD4" },
  { range: [-25, 25],   label: "Neutral",     color: "#A8A29E" },
  { range: [-75, -26],  label: "Unfriendly",  color: "#F59E0B" },
  { range: [-100, -76], label: "Hostile",     color: "#C72D2D" },
];
const affinityTier = (v) => AFFINITY_TIERS.find(t => v >= t.range[0] && v <= t.range[1]) || AFFINITY_TIERS[2];

const LOYALTY_TIERS = [
  { range: [75, 100], label: "Devoted",   color: "#EAC074" },
  { range: [50, 74],  label: "Friendly",  color: "#86EFAC" },
  { range: [25, 49],  label: "Neutral",   color: "#A8A29E" },
  { range: [1, 24],   label: "Hostile",   color: "#F87171" },
  { range: [0, 0],    label: "Betrayal",  color: "#C72D2D" },
];
const loyaltyTier = (v) => LOYALTY_TIERS.find(t => v >= t.range[0] && v <= t.range[1]) || LOYALTY_TIERS[2];

function NarrativeUIKitScreen({ go }) {
  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 18 }}>
        <div className="fw-page-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="fw-eyebrow">Spec 10 · Narrative Layer</div>
            <h1>Narrative UI Kit</h1>
            <div className="sub">4 sub-systems · Scene Mode, Journal, Companion, Relationship. 14 components.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("menu")}>{Icon("chevL", { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("game")}>{Icon("scroll", { size: 12 })} See in-session</button>
          </div>
        </div>

        {/* Index */}
        <Card style={{ marginBottom: 18 }}>
          <CardHead icon="scroll" title="Index · 4 sub-systems / 14 components" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <IndexBlock title="10.1 · Scene Mode" color="#5EEAD4" items={[
              ["1","Scene Mode badge", "6 modes · accent + tone"],
              ["2","Reality Stability Meter", "4 tiers · UI distortion"],
              ["3","Threat Clock", "Segmented circle · trigger event"],
              ["4","Danger Level", "5-segment bar"],
              ["5","Objectives list", "Active / Completed / Failed"],
            ]} />
            <IndexBlock title="10.2 · Journal" color="#EAC074" items={[
              ["6","Entry types · 4 kinds", "Memory · Clue · Quest · Recap"],
              ["7","Auto vs Player note", "Source badge + timeline"],
              ["8","Journal full view", "Filter · search · timeline"],
            ]} />
            <IndexBlock title="10.3 · Companion" color="#86EFAC" items={[
              ["9","Companion sheet card", "Stats · type · portrait"],
              ["10","Behavior + Control", "Aggressive/Defensive/… · Auto/Manual"],
              ["11","Loyalty meter", "0-100 · 5 tiers"],
            ]} />
            <IndexBlock title="10.4 · Relationship" color="#A271FF" items={[
              ["12","NPC Affinity Card", "-100..+100 · 5 tiers"],
              ["13","Relationship Panel", "NPC list · filter by tier"],
              ["14","Affinity history", "Timeline · who/why/when"],
            ]} />
          </div>
        </Card>

        {/* SECTION 10.1 */}
        <SectionHeader num="10.1" title="Scene Mode" color="#5EEAD4" />

        <KitItem id="1" title="Scene Mode badge" trigger="Game Table header · changes accent color + AI tone">
          <SceneModeBadges />
        </KitItem>
        <KitItem id="2" title="Reality Stability Meter" trigger="Horror mode primary · 4 tiers progressively distort UI">
          <RealityStability />
        </KitItem>
        <KitItem id="3" title="Threat Clock" trigger="DM-controlled · advance fills segments → trigger event">
          <ThreatClocks />
        </KitItem>
        <KitItem id="4" title="Danger Level" trigger="Scene panel · 5-segment bar with flavor">
          <DangerLevel />
        </KitItem>
        <KitItem id="5" title="Objectives" trigger="Scene panel · active / completed / failed">
          <ObjectivesList />
        </KitItem>

        {/* SECTION 10.2 */}
        <SectionHeader num="10.2" title="Journal" color="#EAC074" />

        <KitItem id="6" title="Entry types · 4 kinds" trigger="Auto-generated or player-created entries">
          <EntryTypes />
        </KitItem>
        <KitItem id="7" title="Auto vs Player note · timeline row" trigger="Story-log style · source badge + tags">
          <JournalTimeline />
        </KitItem>
        <KitItem id="8" title="Journal full view" trigger="Open Journal screen · filter · search · timeline">
          <JournalFullView />
        </KitItem>

        {/* SECTION 10.3 */}
        <SectionHeader num="10.3" title="Companion" color="#86EFAC" />

        <KitItem id="9" title="Companion sheet card" trigger="Right-panel card · per active companion">
          <CompanionCard />
        </KitItem>
        <KitItem id="10" title="Behavior + Control Mode picker" trigger="Per companion · changes resolve logic">
          <BehaviorControl />
        </KitItem>
        <KitItem id="11" title="Loyalty meter · 5 tiers" trigger="Affects auto-resolve behavior + roleplay">
          <LoyaltyMeter />
        </KitItem>

        {/* SECTION 10.4 */}
        <SectionHeader num="10.4" title="Relationship" color="#A271FF" />

        <KitItem id="12" title="NPC Affinity Card" trigger="Per NPC per character · affects dialogue + pricing">
          <AffinityCard />
        </KitItem>
        <KitItem id="13" title="Relationship Panel · list" trigger="All NPCs met · filter by tier">
          <RelationshipPanel />
        </KitItem>
        <KitItem id="14" title="Affinity history" trigger="Click NPC → timeline of changes with reason">
          <AffinityHistory />
        </KitItem>

        <div style={{ marginTop: 24, padding: 16, background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.55 }}>
          <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 14 })}</span>
          {" "}Scene mode color tokens are exported as <span className="fw-mono" style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 3, color: "var(--arcane-bright)" }}>SCENE_MODES</span>. Wires per component noted below.
        </div>
      </div>
    </div>
  );
}

/* ---------- shared ---------- */
function KitItem({ id, title, trigger, children }) {
  return (
    <div id={`narr-${id}`} className="fw-kit-item">
      <div className="fw-kit-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="fw-kit-num">{id}</span>
          <div>
            <h2 className="fw-display" style={{ fontSize: 18, color: "var(--text)", letterSpacing: "0.04em" }}>{title}</h2>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Trigger · {trigger}</div>
          </div>
        </div>
      </div>
      <div className="fw-kit-canvas">{children}</div>
    </div>
  );
}
function SectionHeader({ num, title, color }) {
  return (
    <div className="fw-narr-section">
      <div className="fw-narr-section-num" style={{ color, borderColor: color + "55" }}>{num}</div>
      <h2 className="fw-display" style={{ fontSize: 22, color: color, letterSpacing: "0.06em" }}>{title}</h2>
      <span className="fw-narr-section-line" style={{ background: `linear-gradient(90deg, ${color}55, transparent)` }} />
    </div>
  );
}
function IndexBlock({ title, color, items }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid", borderColor: color + "33", borderRadius: 8, padding: 12 }}>
      <div className="fw-eyebrow" style={{ color, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map(([n, t, d]) => (
          <a key={n} href={`#narr-${n}`} style={{ display: "flex", gap: 8, padding: "4px 6px", borderRadius: 4, color: "var(--text-2)", textDecoration: "none", fontSize: 11.5 }}>
            <span style={{ fontFamily: "var(--f-mono)", color, width: 18 }}>{n}</span>
            <span style={{ flex: 1, color: "var(--text)" }}>{t}</span>
            <span style={{ color: "var(--text-4)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{d}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   10.1 SCENE MODE
   ============================================================ */

/* 1. Scene Mode badges */
function SceneModeBadges() {
  const [active, setActive] = React.useState("exploration");
  const cur = SCENE_MODES[active];
  return (
    <div>
      <div className="fw-scene-modes">
        {Object.entries(SCENE_MODES).map(([k, m]) => (
          <button key={k} onClick={() => setActive(k)}
            className={"fw-scene-mode" + (active === k ? " active" : "")}
            style={{
              borderColor: active === k ? m.color : "var(--border-soft)",
              background: active === k ? `linear-gradient(180deg, ${m.color}22, ${m.color}06)` : "var(--surface-2)",
              boxShadow: active === k ? `0 0 18px -4px ${m.glow}` : "none",
            }}>
            <span style={{ color: m.color }}>{Icon(m.icon, { size: 16 })}</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div className="fw-display" style={{ fontSize: 13, color: active === k ? m.color : "var(--text)" }}>{m.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{m.tone}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="fw-scene-active-preview" style={{ borderColor: cur.color + "55", background: `linear-gradient(180deg, ${cur.color}11, transparent)` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="fw-scene-pill" style={{ background: cur.color, color: "rgba(13,10,22,0.85)" }}>
            {Icon(cur.icon, { size: 12 })} {cur.label}
          </span>
          <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
            AI Warden tone shifts to · <b style={{ color: cur.color, fontStyle: "normal", fontFamily: "var(--f-display)", letterSpacing: "0.04em" }}>{cur.tone}</b>
          </span>
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">scene.mode</span> · changes UI accent token + AI tone parameter + Discord webhook color</div>
    </div>
  );
}

/* 2. Reality Stability Meter */
function RealityStability() {
  const [level, setLevel] = React.useState(2);
  const tiers = [
    { l: 0, n: "Stable",     desc: "Everything is as it appears.", effect: "no effect" },
    { l: 1, n: "Unstable",   desc: "Things shift at the edges.",   effect: "subtle shimmer" },
    { l: 2, n: "Fracturing", desc: "Reality bends and warps.",     effect: "distortion · audio gap" },
    { l: 3, n: "Broken",     desc: "Nothing here can be trusted.", effect: "heavy distortion · color drift" },
  ];
  return (
    <div className="fw-reality">
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "stretch" }}>
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Stability tiers · click to set</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tiers.map(t => (
              <button key={t.l} onClick={() => setLevel(t.l)}
                className={"fw-reality-tier" + (level === t.l ? " active" : "")}
                style={{
                  borderColor: level === t.l ? "#84CC16" : "var(--border-soft)",
                  background: level === t.l ? "rgba(132,204,22,0.06)" : "var(--surface-2)",
                }}>
                <span className="fw-mono" style={{ fontSize: 11, width: 16, color: "#84CC16" }}>{t.l}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)" }}>{t.n}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{t.desc}</div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{t.effect}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={"fw-reality-preview lvl-" + level}>
          <div className="fw-reality-glitch" />
          <div style={{ position: "relative", padding: 16 }}>
            <div className="fw-eyebrow" style={{ color: "#84CC16", marginBottom: 6 }}>Preview · live distortion</div>
            <div className="fw-display" style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.3, marginBottom: 8 }}>The chapel breathes.</div>
            <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, fontStyle: "italic" }}>
              The brazen censer above the altar burns blue, then violet, then nothing at all. You blink and the wall is closer. You blink and your sister's voice.
            </p>
            <div className="fw-reality-bar">
              {[0,1,2,3].map(i => <span key={i} style={{ background: i <= level ? "#84CC16" : "var(--bg-deep)", boxShadow: i <= level ? "0 0 6px #84CC16" : "none" }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">scene.realityStability: 0..3</span> · CSS filter chain + scrollbar drift · audio: subharmonic gain</div>
    </div>
  );
}

/* 3. Threat Clock */
function ThreatClocks() {
  const [clocks, setClocks] = React.useState([
    { id: 1, name: "The ritual completes", current: 4, max: 6, trigger: "A demon is summoned. Chapel collapses.", color: "var(--blood-bright)" },
    { id: 2, name: "Halric bleeds out",    current: 2, max: 4, trigger: "Halric dies. Death save fails final.", color: "#F87171" },
    { id: 3, name: "Reinforcements arrive",current: 1, max: 8, trigger: "Brass-Spear reserves enter the chapel.", color: "#F59E0B" },
  ]);
  const advance = (id) => setClocks(cs => cs.map(c => c.id === id ? { ...c, current: Math.min(c.max, c.current + 1) } : c));
  const retreat = (id) => setClocks(cs => cs.map(c => c.id === id ? { ...c, current: Math.max(0, c.current - 1) } : c));
  return (
    <div>
      <div className="fw-threat-grid">
        {clocks.map(c => <ThreatClockWidget key={c.id} clock={c} onAdvance={() => advance(c.id)} onRetreat={() => retreat(c.id)} />)}
        <button className="fw-threat-new">
          <span style={{ color: "var(--text-4)" }}>{Icon("plus", { size: 22 })}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>New clock</span>
        </button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">scene.threatClocks[]</span> · advanceClock(id) increments · when current ≥ max → trigger event + AI narrate</div>
    </div>
  );
}
function ThreatClockWidget({ clock, onAdvance, onRetreat }) {
  const pct = clock.current / clock.max;
  const triggered = clock.current >= clock.max;
  const size = 120, r = 50, cx = size/2, cy = size/2;
  // Build pie segments
  const segments = [];
  for (let i = 0; i < clock.max; i++) {
    const a1 = (i / clock.max) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / clock.max) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
    const filled = i < clock.current;
    const tierColor = pct < 0.5 ? "#A8A29E" : pct < 0.75 ? "#F59E0B" : pct < 1 ? "#F87171" : "var(--blood-bright)";
    segments.push(
      <path key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
        fill={filled ? tierColor : "var(--bg-deep)"}
        stroke="var(--bg)"
        strokeWidth="2"
      />
    );
  }
  return (
    <div className={"fw-threat-card" + (triggered ? " triggered" : "")}>
      <div className="fw-threat-clock-svg">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {segments}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--surface-2)" stroke="var(--border)" />
          <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text)" fontFamily="Cinzel" fontSize="18">{clock.current}/{clock.max}</text>
        </svg>
      </div>
      <div className="fw-display" style={{ fontSize: 13, color: triggered ? "var(--blood-bright)" : "var(--text)", textAlign: "center", marginTop: 8 }}>{clock.name}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", textAlign: "center", marginTop: 4, lineHeight: 1.4 }}>
        {triggered ? <span style={{ color: "var(--blood-bright)" }}>TRIGGERED · {clock.trigger}</span> : <>"{clock.trigger}"</>}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "center" }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onRetreat}>{Icon("minus", { size: 10 })} Retreat</button>
        <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={onAdvance}>{Icon("plus", { size: 10 })} Advance</button>
      </div>
    </div>
  );
}

/* 4. Danger Level */
function DangerLevel() {
  const [level, setLevel] = React.useState(3);
  const tiers = [
    { l: 0, n: "None",    desc: "Truly safe — only flavor.", color: "var(--success)"   },
    { l: 1, n: "Low",     desc: "Background tension.",        color: "#86EFAC"         },
    { l: 2, n: "Medium",  desc: "Threats present.",           color: "#F59E0B"         },
    { l: 3, n: "High",    desc: "Hostile and waiting.",       color: "#F87171"         },
    { l: 4, n: "Extreme", desc: "Imminent violence/death.",   color: "var(--blood-bright)" },
  ];
  const cur = tiers[level];
  return (
    <div className="fw-danger">
      <div className="fw-danger-head">
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Danger Level</div>
          <div className="fw-display" style={{ fontSize: 22, color: cur.color }}>{cur.n}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{cur.desc}</div>
        </div>
        <span className="fw-pill" style={{ background: cur.color + "22", borderColor: cur.color, color: cur.color, marginLeft: "auto" }}>
          {cur.n} · L{level}
        </span>
      </div>
      <div className="fw-danger-bar">
        {tiers.map(t => (
          <button key={t.l} onClick={() => setLevel(t.l)}
            className="fw-danger-seg"
            style={{
              background: t.l <= level ? t.color : "var(--bg-deep)",
              boxShadow: t.l === level ? `0 0 10px ${t.color}` : "none",
              borderColor: t.l <= level ? t.color : "var(--border-soft)",
            }}
            title={t.n}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: t.l <= level ? "rgba(0,0,0,0.6)" : "var(--text-4)" }}>{t.l}</span>
          </button>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">scene.dangerLevel: 0..4</span> · feeds combat balance hints + ambient music intensity</div>
    </div>
  );
}

/* 5. Objectives */
function ObjectivesList() {
  const [items, setItems] = React.useState([
    { id: 1, t: "Confront the Cinder-Reeve",       state: "active",    flavor: "It has not moved since you arrived." },
    { id: 2, t: "Reach the chapel beneath Ysavir", state: "completed", flavor: "Done. The brass doors are open." },
    { id: 3, t: "Save Halric Dale",                state: "active",    flavor: "He bleeds at the threshold." },
    { id: 4, t: "Keep the bone-tablet hidden",     state: "failed",    flavor: "The Reeve saw it. Of course it did." },
    { id: 5, t: "Recover the brass censer-chain",  state: "active",    flavor: "Still in the binding circle." },
  ]);
  const cycle = (id) => setItems(xs => xs.map(x => x.id === id ? { ...x, state: x.state === "active" ? "completed" : x.state === "completed" ? "failed" : "active" } : x));
  return (
    <div className="fw-objs">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(it => (
          <div key={it.id} className={"fw-obj-row " + it.state}>
            <button className={"fw-obj-mark " + it.state} onClick={() => cycle(it.id)}>
              {it.state === "completed" && Icon("check", { size: 12 })}
              {it.state === "failed" && Icon("x", { size: 12 })}
              {it.state === "active" && <span className="fw-obj-pulse" />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: it.state === "completed" ? "var(--text-3)" : it.state === "failed" ? "var(--text-3)" : "var(--text)", textDecoration: it.state === "completed" ? "line-through" : "none" }}>
                {it.t}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 2 }}>{it.flavor}</div>
            </div>
            <span className={"fw-obj-state " + it.state}>{it.state}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 11 })} Add objective</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
          {items.filter(i => i.state === "active").length} active · {items.filter(i => i.state === "completed").length} done · {items.filter(i => i.state === "failed").length} failed
        </span>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">scene.objectives[]</span> · completion fires Journal auto-entry + XP suggestion</div>
    </div>
  );
}

/* ============================================================
   10.2 JOURNAL
   ============================================================ */

const ENTRY_TYPES = {
  memory: { label: "Memory",       icon: "scroll", color: "#EAC074", glyph: "📖" },
  clue:   { label: "Clue",         icon: "eye",    color: "#A271FF", glyph: "🔍" },
  quest:  { label: "Quest Update", icon: "sword",  color: "#5EEAD4", glyph: "⚔️" },
  recap:  { label: "Recap",        icon: "book",   color: "#F59E0B", glyph: "📜" },
};

/* 6. Entry types */
function EntryTypes() {
  return (
    <div>
      <div className="fw-entry-grid">
        {Object.entries(ENTRY_TYPES).map(([k, t]) => (
          <div key={k} className="fw-entry-card" style={{ borderColor: t.color + "55", background: `linear-gradient(180deg, ${t.color}10, transparent)` }}>
            <div className="fw-entry-icon" style={{ background: t.color + "22", borderColor: t.color, color: t.color }}>
              <span style={{ fontSize: 18 }}>{t.glyph}</span>
            </div>
            <div className="fw-display" style={{ fontSize: 14, color: "var(--text)", marginTop: 8 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", textAlign: "center", marginTop: 4, lineHeight: 1.4 }}>
              {k === "memory" && "Past events that mattered."}
              {k === "clue"   && "Cryptic hints the party has gathered."}
              {k === "quest"  && "Story-thread progress."}
              {k === "recap"  && "Session summary, generated at end."}
            </div>
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">journal.entry.type: 'memory' | 'clue' | 'quest' | 'recap'</span> · render with type-specific glyph + color</div>
    </div>
  );
}

/* 7. Auto vs Player timeline row */
function JournalTimeline() {
  const entries = [
    { type: "recap",  auto: true,  title: "Session 15 · The Hollow Crown",         time: "2 days ago",    body: "The party reached the chapel beneath Ysavir. Halric fell. The Cinder-Reeve waited." },
    { type: "memory", auto: true,  title: "Halric stabilized — barely",            time: "session 15",    body: "Aedric's Medicine check (DC 13 → 17). He breathes shallow, but breathes." },
    { type: "clue",   auto: false, title: "Brass-Chain liturgy fragment",          time: "Session 15 mid", body: "Pew 4, second board from north. Words match Mother Censer's old prayers.", tags: ["bone-tablet", "Mother Censer"] },
    { type: "quest",  auto: true,  title: "Confront the Cinder-Reeve · active",   time: "Session 15",     body: "The Reeve speaks. We have not answered yet." },
    { type: "memory", auto: false, title: "Note: the Reeve uses past tense only", time: "1h ago",         body: "Worth checking against the binding circle inscriptions. Patience is a tactic.", tags: ["Cinder-Reeve"] },
  ];
  return (
    <div>
      <div className="fw-journal-timeline">
        {entries.map((e, i) => {
          const t = ENTRY_TYPES[e.type];
          return (
            <div key={i} className="fw-journal-row" style={{ borderLeftColor: t.color }}>
              <div className="fw-journal-row-head">
                <span className="fw-journal-icon" style={{ background: t.color + "22", borderColor: t.color, color: t.color }}>
                  {Icon(t.icon, { size: 12 })}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--f-display)", letterSpacing: "0.02em" }}>{e.title}</span>
                    <span className="fw-pill" style={{ fontSize: 9, padding: "0 5px", borderColor: t.color + "55", color: t.color, background: t.color + "11" }}>{t.label}</span>
                    {e.auto
                      ? <span className="fw-pill" style={{ fontSize: 8.5, padding: "0 5px", background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.35)", color: "var(--arcane-bright)" }}>AUTO</span>
                      : <span className="fw-pill gold" style={{ fontSize: 8.5, padding: "0 5px" }}>Player note</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{e.time}</div>
                </div>
              </div>
              <p className="fw-serif" style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, fontStyle: e.auto ? "normal" : "italic", paddingLeft: 32, marginTop: 4 }}>{e.body}</p>
              {e.tags && (
                <div style={{ display: "flex", gap: 4, marginTop: 6, paddingLeft: 32, flexWrap: "wrap" }}>
                  {e.tags.map(tag => <span key={tag} className="fw-pill dim" style={{ fontSize: 9, padding: "0 5px" }}>#{tag}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">journal.entries[]</span> · auto = generated by Event Queue · player = manual via "Add note" UI</div>
    </div>
  );
}

/* 8. Journal full view */
function JournalFullView() {
  const [filter, setFilter] = React.useState("all");
  return (
    <div className="fw-journal-full">
      <div className="fw-journal-toolbar">
        <div className="fw-input-wrap" style={{ flex: "1 1 240px", maxWidth: 320 }}>
          <span className="fw-input-icon">{Icon("search", { size: 12 })}</span>
          <input className="fw-input has-icon" placeholder="Search entries, tags, NPCs…" />
        </div>
        <div className="fw-journal-filters">
          {[
            ["all", "All", "var(--text-2)", null],
            ...Object.entries(ENTRY_TYPES).map(([k, t]) => [k, t.label, t.color, t.icon]),
          ].map(([k, l, c, ic]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={"fw-journal-filter" + (filter === k ? " active" : "")}
              style={{ borderColor: filter === k ? c : "var(--border-soft)", color: filter === k ? c : "var(--text-3)", background: filter === k ? c + "11" : "transparent" }}>
              {ic && Icon(ic, { size: 10 })} {l}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-gold fw-btn-sm">{Icon("plus", { size: 11 })} New note</button>
      </div>

      <div className="fw-journal-sessions">
        {[
          { s: "Session 15 · The Hollow Crown", d: "2 days ago", count: 12 },
          { s: "Session 14 · Brass-Spear ambush", d: "9 days ago", count: 8 },
          { s: "Session 13 · Return to Ysavir", d: "16 days ago", count: 14 },
        ].map((s, i) => (
          <div key={i} className="fw-journal-session">
            <div className="fw-journal-session-head">
              <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{s.s}</div>
              <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{s.d} · {s.count} entries</span>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px", fontSize: 10 }}>{Icon("chevD", { size: 10 })}</button>
            </div>
            {i === 0 && (
              <div style={{ paddingLeft: 14, marginTop: 6 }}>
                <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
                  Auto-recap · player notes · clue-board fragments · 4 quest updates
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">listEntries(&#123; sessionId, filter, query &#125;)</span> · group by session · expand/collapse</div>
    </div>
  );
}

/* ============================================================
   10.3 COMPANION
   ============================================================ */

/* 9. Companion sheet card */
function CompanionCard() {
  const companions = [
    { id: 1, name: "Thorn-Hide", type: "beast",    hp: 24, hpMax: 32, ac: 13, spd: 40, atk: "1d6+3 piercing", color: "#22C55E", loyalty: 88, behavior: "Defensive", control: "Auto",   active: true,
      conditions: ["Bond · Mirenna"], desc: "Wolf bonded to Mirenna." },
    { id: 2, name: "Brother Aldric", type: "npc",  hp: 14, hpMax: 28, ac: 15, spd: 30, atk: "1d8+1 piercing", color: "#A271FF", loyalty: 62, behavior: "Support",   control: "Manual", active: true,
      conditions: ["Cleric of the Old Faith"], desc: "Hireling, knows the chapel." },
    { id: 3, name: "Bound Spectre", type: "summon",hp: 12, hpMax: 12, ac: 11, spd: 40, atk: "1d4+2 force",    color: "#5EEAD4", loyalty: 100, behavior: "Aggressive", control: "Auto",   active: false,
      conditions: ["Concentration · Find Familiar"], desc: "Familiar summoned this session." },
  ];
  return (
    <div className="fw-comp-grid">
      {companions.map(c => {
        const lTier = loyaltyTier(c.loyalty);
        const typeMap = { beast: "Beast", npc: "NPC", summon: "Summon", hireling: "Hireling" };
        return (
          <div key={c.id} className={"fw-comp-card" + (c.active ? "" : " dim")}>
            <div className="fw-comp-portrait" style={{ background: `linear-gradient(135deg, ${c.color}33, #15101f)`, borderColor: c.color }}>
              <span className="fw-display" style={{ fontSize: 22, color: "var(--text)" }}>{c.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
              <span className="fw-comp-type-pill" style={{ background: c.color, color: "rgba(0,0,0,0.7)" }}>{typeMap[c.type]}</span>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{c.desc}</div>
              </div>
              <div className="fw-stat-bar">
                <span className="lbl">HP</span>
                <div className="fw-bar hp bar"><i style={{ width: `${(c.hp/c.hpMax)*100}%` }} /></div>
                <span className="num">{c.hp}/{c.hpMax}</span>
              </div>
              <div style={{ display: "flex", gap: 6, fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>
                <span>AC <b style={{ color: "var(--text)" }}>{c.ac}</b></span>
                <span>SPD <b style={{ color: "var(--text)" }}>{c.spd}</b></span>
                <span>ATK <b style={{ color: "var(--text)" }}>{c.atk}</b></span>
              </div>
              {/* Mini loyalty */}
              <div className="fw-loyalty-mini">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                  <span style={{ color: "var(--text-3)" }}>Loyalty</span>
                  <span style={{ color: lTier.color, fontFamily: "var(--f-mono)" }}>{c.loyalty} · {lTier.label}</span>
                </div>
                <div className="fw-loyalty-bar"><div style={{ width: c.loyalty + "%", background: lTier.color }} /></div>
              </div>
              <div style={{ display: "flex", gap: 4, fontSize: 10.5, color: "var(--text-2)" }}>
                <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.behavior}</span>
                <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{c.control}</span>
                {!c.active && <span className="fw-pill" style={{ fontSize: 9.5, background: "rgba(168,162,158,0.10)", color: "var(--text-4)" }}>Dormant</span>}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center", fontSize: 10.5 }}>{Icon("eye", { size: 10 })} Sheet</button>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px" }}>{Icon("kebab", { size: 11 })}</button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="fw-kit-wires" style={{ gridColumn: "1 / -1", marginTop: 4 }}>Wires to: <span className="fw-mono">companions[]</span> · isActive → joins combat as participant · ownerId resolves controlling player</div>
    </div>
  );
}

/* 10. Behavior + Control mode picker */
function BehaviorControl() {
  const [behavior, setBehavior] = React.useState("Defensive");
  const [control, setControl] = React.useState("Auto");
  const behaviors = [
    { v: "Aggressive", desc: "Target lowest-HP enemy.", color: "var(--blood-bright)", icon: "sword" },
    { v: "Defensive",  desc: "Protect owner. Interpose on hits.", color: "var(--gold)", icon: "shield" },
    { v: "Support",    desc: "Heal ally lowest HP (1d4 + WIS).", color: "var(--success)", icon: "heart" },
    { v: "Passive",    desc: "Skip turn. Hold position.", color: "var(--text-3)", icon: "minus" },
  ];
  return (
    <div className="fw-bhv">
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Behavior</div>
        <div className="fw-bhv-grid">
          {behaviors.map(b => (
            <button key={b.v} onClick={() => setBehavior(b.v)}
              className={"fw-bhv-card" + (behavior === b.v ? " active" : "")}
              style={{ borderColor: behavior === b.v ? b.color : "var(--border-soft)", background: behavior === b.v ? b.color + "11" : "var(--surface-2)" }}>
              <span style={{ color: b.color }}>{Icon(b.icon, { size: 18 })}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="fw-display" style={{ fontSize: 12.5, color: behavior === b.v ? b.color : "var(--text)" }}>{b.v}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{b.desc}</div>
              </div>
              {behavior === b.v && <span style={{ color: b.color }}>{Icon("check", { size: 13 })}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Control mode</div>
        <div className="fw-control-toggle">
          {["Auto", "Manual"].map(m => (
            <button key={m} onClick={() => setControl(m)}
              className={"fw-control-btn" + (control === m ? " active" : "")}>
              {Icon(m === "Auto" ? "wand" : "compass", { size: 12 })}
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{m}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
                  {m === "Auto" ? "AI resolves based on behavior + loyalty" : "Owner picks each action manually"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">companion.behavior + .controlMode</span> · Auto → dispatch to behavior resolver · Manual → owner action UI</div>
    </div>
  );
}

/* 11. Loyalty meter + 5 tiers */
function LoyaltyMeter() {
  const [val, setVal] = React.useState(62);
  const tier = loyaltyTier(val);
  const history = [
    { d: "1h ago",       v: -8,  reason: "Argued with companion over the brass key" },
    { d: "Session 14",   v: +5,  reason: "Shared loot fairly" },
    { d: "Session 13",   v: +15, reason: "Saved companion from death save" },
  ];
  return (
    <div className="fw-loyalty">
      <div className="fw-loyalty-head">
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Brother Aldric · loyalty</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span className="fw-display" style={{ fontSize: 40, color: tier.color, lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>/ 100</span>
            <span className="fw-pill" style={{ background: tier.color + "22", borderColor: tier.color, color: tier.color }}>{tier.label}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 4 }}>
            {tier.label === "Devoted" && "Will risk death for the party."}
            {tier.label === "Friendly" && "Follows behavior orders willingly."}
            {tier.label === "Neutral" && "Hesitates on risky orders. Often passive."}
            {tier.label === "Hostile" && "Disobeys. May counter the party."}
            {tier.label === "Betrayal" && "Will defect or attack at first chance."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setVal(v => Math.max(0, v - 5))}>{Icon("minus", { size: 10 })} −5</button>
          <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setVal(v => Math.min(100, v + 5))}>{Icon("plus", { size: 10 })} +5</button>
        </div>
      </div>

      <div className="fw-loyalty-track">
        {LOYALTY_TIERS.slice().reverse().map(t => (
          <span key={t.label} className="fw-loyalty-tier-mark" style={{
            left: `${Math.max(0, t.range[0])}%`,
            width: `${Math.min(100, t.range[1]) - Math.max(0, t.range[0]) + 1}%`,
            borderColor: t.color + "44",
            background: t.color + "08",
          }}>
            <span style={{ fontSize: 9, color: t.color, fontFamily: "var(--f-mono)" }}>{t.label}</span>
          </span>
        ))}
        <div className="fw-loyalty-bar" style={{ position: "relative", marginTop: 26 }}>
          <div style={{ width: val + "%", background: `linear-gradient(90deg, var(--blood-bright), ${tier.color})` }} />
        </div>
        <input type="range" min="0" max="100" value={val} onChange={e => setVal(+e.target.value)} className="fw-loyalty-input" />
      </div>

      <div className="fw-loyalty-history">
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Recent changes</div>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 8px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5, marginBottom: 4 }}>
            <span className="fw-mono" style={{ fontSize: 11, color: h.v > 0 ? "var(--success)" : "var(--blood-bright)", width: 32, textAlign: "center" }}>{h.v > 0 ? "+" : ""}{h.v}</span>
            <span style={{ flex: 1, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{h.reason}</span>
            <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{h.d}</span>
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">companion.loyalty.current</span> · tier derived · at 0 → Betrayal Event in Event Queue</div>
    </div>
  );
}

/* ============================================================
   10.4 RELATIONSHIP
   ============================================================ */

const NPCs = [
  { id: 1, n: "Brother Aldric",     role: "Cleric of the Old Faith", aff: 62,  quote: "ความลับของ cathedral มีเพียงผู้บริสุทธิ์เท่านั้นที่สมควรรู้",     color: "#A271FF" },
  { id: 2, n: "The Cinder-Reeve",   role: "Patron · Antagonist",      aff: -65, quote: "The shadow has not moved. Neither have I.",                       color: "#C72D2D" },
  { id: 3, n: "Mother Censer",      role: "Aedric's old kin",         aff: -88, quote: "You forget — the collar was mine first.",                        color: "#F87171" },
  { id: 4, n: "Brask of Brask's Hold", role: "Innkeep · Ally",        aff: 92,  quote: "Send word when you breathe again, lad.",                         color: "#D6A84F" },
  { id: 5, n: "Lira Vael",          role: "Sister · Off-screen",      aff: 70,  quote: "Aedric? My brother died in the Reach.",                          color: "#86EFAC" },
  { id: 6, n: "Septine warden",     role: "Faction · Neutral",        aff: 8,   quote: "Walk softly. The Sept is watching.",                              color: "#A8A29E" },
];

/* 12. NPC Affinity Card */
function AffinityCard() {
  const [val, setVal] = React.useState(62);
  const tier = affinityTier(val);
  const npc = NPCs[0];
  return (
    <div className="fw-aff-card" style={{ borderColor: tier.color + "55" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <span className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${npc.color}44, #15101f)`, borderColor: npc.color }}>BA</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-display" style={{ fontSize: 16, color: "var(--text)" }}>{npc.n}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{npc.role}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span className="fw-pill" style={{ background: tier.color + "22", borderColor: tier.color, color: tier.color }}>{tier.label}</span>
            <span style={{ fontFamily: "var(--f-display)", fontSize: 18, color: tier.color }}>{val > 0 ? "+" : ""}{val}</span>
          </div>
        </div>
      </div>

      <div className="fw-aff-bar-wrap">
        <div className="fw-aff-tier-labels">
          <span style={{ color: AFFINITY_TIERS[4].color }}>Hostile</span>
          <span style={{ color: AFFINITY_TIERS[3].color }}>Unfriendly</span>
          <span style={{ color: AFFINITY_TIERS[2].color }}>Neutral</span>
          <span style={{ color: AFFINITY_TIERS[1].color }}>Friendly</span>
          <span style={{ color: AFFINITY_TIERS[0].color }}>Allied</span>
        </div>
        <div className="fw-aff-bar">
          <div className="fw-aff-fill" style={{
            background: `linear-gradient(90deg, ${AFFINITY_TIERS[4].color} 0%, ${AFFINITY_TIERS[3].color} 25%, ${AFFINITY_TIERS[2].color} 50%, ${AFFINITY_TIERS[1].color} 75%, ${AFFINITY_TIERS[0].color} 100%)`,
          }} />
          <div className="fw-aff-marker" style={{ left: `${(val + 100) / 2}%`, background: tier.color, boxShadow: `0 0 12px ${tier.color}` }}>
            <span className="fw-mono">{val > 0 ? "+" : ""}{val}</span>
          </div>
          <span className="fw-aff-midline" />
        </div>
        <div className="fw-aff-bar-scale">
          <span>−100</span><span>−50</span><span>0</span><span>+50</span><span>+100</span>
        </div>
      </div>

      <blockquote className="fw-aff-quote">
        <span style={{ color: tier.color, marginRight: 6 }}>"</span>
        {npc.quote}
        <span style={{ color: tier.color, marginLeft: 6 }}>"</span>
      </blockquote>

      <div className="fw-aff-actions">
        <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => setVal(v => Math.max(-100, v - 5))}>{Icon("minus", { size: 11 })} Decrease</button>
        <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setVal(v => Math.min(100, v + 5))}>{Icon("plus", { size: 11 })} Increase</button>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("history", { size: 11 })} View history</button>
      </div>

      <div className="fw-kit-wires">Wires to: <span className="fw-mono">relationship[charId][npcId].affinity: -100..100</span> · adjustAffinity(delta, reason) · pricing/dialog branches off tier</div>
    </div>
  );
}

/* 13. Relationship Panel · list */
function RelationshipPanel() {
  const [filter, setFilter] = React.useState("all");
  const list = NPCs.filter(n => filter === "all" || affinityTier(n.aff).label.toLowerCase() === filter);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} className={"fw-rel-filter" + (filter === "all" ? " active" : "")}>All <span className="fw-mono">{NPCs.length}</span></button>
        {AFFINITY_TIERS.map(t => {
          const count = NPCs.filter(n => affinityTier(n.aff).label === t.label).length;
          return (
            <button key={t.label} onClick={() => setFilter(t.label.toLowerCase())}
              className={"fw-rel-filter" + (filter === t.label.toLowerCase() ? " active" : "")}
              style={{ borderColor: filter === t.label.toLowerCase() ? t.color : "var(--border-soft)", color: filter === t.label.toLowerCase() ? t.color : "var(--text-3)" }}>
              {t.label} <span className="fw-mono">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="fw-rel-list">
        {list.map(n => {
          const t = affinityTier(n.aff);
          return (
            <div key={n.id} className="fw-rel-row" style={{ borderColor: t.color + "33" }}>
              <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${n.color}44, #15101f)`, borderColor: n.color }}>{n.n.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--f-display)", letterSpacing: "0.02em" }}>{n.n}</span>
                  <span className="fw-pill" style={{ background: t.color + "22", borderColor: t.color, color: t.color, fontSize: 9, padding: "0 6px" }}>{t.label}</span>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{n.role}</div>
              </div>
              <div className="fw-rel-bar">
                <span className="fw-rel-bar-track">
                  <span className="fw-rel-bar-mid" />
                  <span className="fw-rel-bar-marker" style={{
                    left: `${(n.aff + 100) / 2}%`,
                    background: t.color,
                    boxShadow: `0 0 8px ${t.color}`,
                  }} />
                </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: t.color, minWidth: 32, textAlign: "right" }}>{n.aff > 0 ? "+" : ""}{n.aff}</span>
              </div>
              <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("chevR", { size: 11 })}</button>
            </div>
          );
        })}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">listRelationships(charId)</span> · sort by aff desc · tier filter computed on demand</div>
    </div>
  );
}

/* 14. Affinity history timeline */
function AffinityHistory() {
  const events = [
    { d: "1h ago",        v: -8,  reason: "Aedric refused to share the bone-tablet rubbing",          src: "Player choice" },
    { d: "Session 15 mid", v: +12, reason: "Helped Aldric tend to Halric",                            src: "Player choice" },
    { d: "Session 14 end", v: +5,  reason: "Defended the cathedral relic from the Brass-Spears",     src: "Player choice" },
    { d: "Session 14 mid", v: -3,  reason: "Made a joke about the Old Faith in front of Aldric",     src: "Player choice" },
    { d: "Session 13",     v: +20, reason: "Saved Aldric from the spectral hounds",                  src: "Combat outcome · auto" },
    { d: "Session 12",     v: +0,  reason: "First met at Brask's Hold",                              src: "Initial" },
  ];
  let runningTotal = 0;
  return (
    <div className="fw-aff-history">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span className="fw-avatar lg" style={{ background: "linear-gradient(135deg, #A271FF44, #15101f)", borderColor: "#A271FF" }}>BA</span>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 15, color: "var(--text)" }}>Brother Aldric · affinity timeline</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>6 events recorded · current 62 · Friendly</div>
        </div>
        <Seg value="All" onChange={() => {}} options={["All","Player","Auto"]} />
      </div>
      <div className="fw-aff-history-timeline">
        {events.slice().reverse().map((e, i) => {
          runningTotal += e.v;
          return (
            <div key={i} className="fw-aff-history-row">
              <span className="fw-aff-history-line" />
              <span className="fw-aff-history-dot" style={{ background: e.v > 0 ? "var(--success)" : e.v < 0 ? "var(--blood-bright)" : "var(--text-3)" }} />
              <div style={{ flex: 1, paddingLeft: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="fw-mono" style={{ fontSize: 13, color: e.v > 0 ? "var(--success)" : e.v < 0 ? "var(--blood-bright)" : "var(--text-3)" }}>{e.v > 0 ? "+" : ""}{e.v}</span>
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--text-4)" }}>→ {runningTotal}</span>
                  <span className="fw-pill dim" style={{ fontSize: 8.5, padding: "0 5px" }}>{e.src}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{e.d}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 2 }}>{e.reason}</div>
              </div>
            </div>
          );
        }).reverse()}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">relationshipHistory(charId, npcId)</span> · annotated with reason + source · auto entries from Event Queue</div>
    </div>
  );
}

Object.assign(window, { NarrativeUIKitScreen });

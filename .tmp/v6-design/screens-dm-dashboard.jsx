/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   SCREEN: DM DASHBOARD — pre-session prep + live tools
   ============================================================ */
function DMDashboardScreen({ go }) {
  const [section, setSection] = React.useState("overview");

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        {/* HEADER */}
        <DMHeader go={go} />

        {/* SECTION TABS */}
        <div className="fw-tabs" style={{ marginBottom: 20 }}>
          {[
            { id: "overview",  label: "Overview",   icon: "home" },
            { id: "encounter", label: "Encounter",  icon: "sword" },
            { id: "initiative",label: "Initiative", icon: "zap" },
            { id: "npcs",      label: "NPCs",       icon: "users" },
            { id: "scenes",    label: "Scenes & Handouts", icon: "map" },
            { id: "audio",     label: "Audio",      icon: "volume" },
          ].map(t => (
            <div key={t.id} className={"fw-tab " + (section === t.id ? "active" : "")} onClick={() => setSection(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {Icon(t.icon, { size: 11 })} {t.label}
            </div>
          ))}
          <span style={{ flex: 1, borderBottom: "1px solid var(--border-soft)" }} />
        </div>

        {section === "overview"   && <OverviewSection />}
        {section === "encounter"  && <EncounterSection />}
        {section === "initiative" && <InitiativeSection />}
        {section === "npcs"       && <NpcsSection />}
        {section === "scenes"     && <ScenesSection />}
        {section === "audio"      && <AudioSection />}
      </div>
    </div>
  );
}

/* ---------------- HEADER ---------------- */
function DMHeader({ go }) {
  return (
    <Card elev className="fw-orn" style={{ overflow: "hidden", marginBottom: 24 }}>
      <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", minHeight: 200 }}>
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="fw-pill gold">{Icon("crown", { size: 11 })} DM Dashboard</span>
            <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2.4s infinite" }}>
              <span style={{ width: 5, height: 5, borderRadius: 50, background: "currentColor" }} /> Session 16 · tonight 20:00
            </span>
            <span className="fw-pill dim">Prep · 78% complete</span>
          </div>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Act III · The Gilded Tomb</div>
            <h1 className="fw-display" style={{ fontSize: 34, lineHeight: 1.05, color: "var(--text)" }}>
              The Hollow Crown<br /><span style={{ color: "var(--gold-bright)" }}>of Ysavir</span>
            </h1>
          </div>
          <p className="fw-serif" style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6, fontStyle: "italic", maxWidth: 560 }}>
            They left the chapel mid-binding. Halric is down. The Cinder-Reeve is patient — tonight, it speaks. If they free the held shadow, the brass chain frays. If they don't, the chapel reaches up.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={() => go && go("game")}>
              {Icon("play", { size: 14 })} Start Session 16
            </button>
            <button className="fw-btn fw-btn-ghost">{Icon("scroll", { size: 12 })} Session 15 recap</button>
            <button className="fw-btn fw-btn-ghost">{Icon("sparkles", { size: 12 })} AI Warden brief</button>
          </div>
        </div>

        <div style={{ position: "relative", background: "linear-gradient(135deg, #1a1428 0%, #0a0814 100%)", borderLeft: "1px solid var(--border-soft)", padding: 22 }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.22), transparent 60%)" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="fw-eyebrow" style={{ marginBottom: 6 }}>The Party</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  { i: "AE", n: "Aedric Vael", c: "Warlock 7",  st: "Ready",       color: "#7C3AED", ok: true },
                  { i: "KI", n: "Kessra",      c: "Fighter 7",  st: "Ready",       color: "#D6A84F", ok: true },
                  { i: "MT", n: "Mirenna",     c: "Druid 7",    st: "Ready",       color: "#22C55E", ok: true },
                  { i: "HD", n: "Halric",      c: "Cleric 6",   st: "Unconscious", color: "#A8A29E", down: true },
                ].map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "rgba(20,17,29,0.55)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
                    <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${p.color}33, #15101f)`, fontSize: 10 }}>{p.i}</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11.5 }}>
                      <div style={{ color: "var(--text)" }}>{p.n}</div>
                      <div style={{ color: "var(--text-3)", fontSize: 10 }}>{p.c}</div>
                    </div>
                    <span style={{ fontSize: 10, color: p.ok ? "var(--success)" : "var(--blood-bright)", fontFamily: "var(--f-mono)" }}>{p.st}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   OVERVIEW — landing section
   ============================================================ */
function OverviewSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Tonight's Beats */}
        <Card>
          <CardHead icon="scroll" title="Tonight's Beats" right={
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 11 })} Add beat</button>
          } />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { t: "Cold open · the Cinder-Reeve speaks", dur: "10 min", kind: "Roleplay", done: true },
              { t: "Halric stabilizes (or doesn't)", dur: "5 min", kind: "Decision", done: true },
              { t: "Binding circle — INT(Arcana) DC 17, CHA DC 15", dur: "15 min", kind: "Skill", current: true },
              { t: "If they free the shadow — Brass-chain ambush", dur: "30 min", kind: "Combat" },
              { t: "If they don't — Chapel reaches up", dur: "30 min", kind: "Combat" },
              { t: "Resolution · descent to Act IV", dur: "10 min", kind: "Roleplay" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: b.current ? "linear-gradient(90deg, rgba(214,168,79,0.10), transparent)" : "var(--surface-2)", border: "1px solid " + (b.current ? "rgba(214,168,79,0.45)" : "var(--border-soft)"), borderRadius: 6, opacity: b.done ? 0.55 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 50, border: "1px solid " + (b.done ? "var(--gold-deep)" : b.current ? "var(--gold)" : "var(--border)"), background: b.done ? "rgba(214,168,79,0.2)" : "transparent", display: "grid", placeItems: "center", color: "var(--gold-bright)", flexShrink: 0 }}>
                  {b.done && Icon("check", { size: 10 })}
                  {b.current && <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--gold-bright)", animation: "fw-glow-pulse 2s infinite" }} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text)", textDecoration: b.done ? "line-through" : "none" }}>{b.t}</div>
                </div>
                <span className="fw-pill" style={{ fontSize: 9.5 }}>{b.kind}</span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)", width: 50, textAlign: "right" }}>{b.dur}</span>
              </div>
            ))}
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", color: "var(--text-3)", fontSize: 11.5, fontFamily: "var(--f-mono)" }}>
              <span>Total budget</span>
              <span style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
              <span style={{ color: "var(--gold-bright)" }}>~ 1h 40m</span>
            </div>
          </div>
        </Card>

        {/* Prep Checklist */}
        <Card>
          <CardHead icon="check" title="Prep Checklist" right={
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>11 / 14 · 78%</span>
          } />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
            {[
              ["Review Session 15 log", true],
              ["Re-read Brass-Chain ambush", true],
              ["Statblock: Cinder-Reeve", true],
              ["Statblock: Brass Spear ×2", true],
              ["Statblock: Bound Shadow", false],
              ["NPC voices · Reeve, Halric", true],
              ["Handouts: Binding circle map", true],
              ["Handouts: Chapel scene", true],
              ["Handouts: Bone-tablet rubbing", false],
              ["Soundboard: chapel ambience", true],
              ["Soundboard: combat cue", true],
              ["Soundboard: revelation cue", true],
              ["Player secrets · refresh", true],
              ["XP budget calculated", false],
            ].map(([t, done], i) => (
              <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px dashed var(--border-soft)", fontSize: 12.5, color: done ? "var(--text-3)" : "var(--text)", cursor: "pointer" }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid " + (done ? "var(--gold)" : "var(--border)"), background: done ? "rgba(214,168,79,0.15)" : "transparent", display: "grid", placeItems: "center", color: "var(--gold-bright)", flexShrink: 0 }}>
                  {done && Icon("check", { size: 9 })}
                </span>
                <span style={{ textDecoration: done ? "line-through" : "none", flex: 1 }}>{t}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* DM Notes */}
        <Card>
          <CardHead icon="scroll" title="DM Notes" right={<button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} Suggest</button>} />
          <div style={{ padding: 14 }}>
            <textarea className="fw-textarea" rows="6" defaultValue={"REMEMBER: The Cinder-Reeve does not speak in present tense. Always past or future. It has not moved in 30 years and it knows this.\n\nIf Aedric tries to bargain, he must invoke the brass collar — he KNOWS this from the pact. The Reeve will refuse twice before listening.\n\nMirenna's elk = 13 HP left. Don't forget."} />
          </div>
        </Card>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Secrets card */}
        <Card style={{ borderColor: "rgba(124,58,237,0.3)" }}>
          <CardHead icon="lock" title="Player Secrets" right={
            <span className="fw-pill" style={{ background: "rgba(124,58,237,0.15)", borderColor: "var(--arcane)", color: "var(--arcane-bright)", fontSize: 9 }}>DM only</span>
          } />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, fontFamily: "var(--f-serif)", lineHeight: 1.5 }}>
            <SecretRow who="Aedric" detail="The Cinder-Reeve is his sister's true patron, not his." />
            <SecretRow who="Kessra" detail="Owes a debt to the Brass Sept. They will collect this Act." />
            <SecretRow who="Mirenna" detail="Her elk is the wandering soul of her grandmother." />
            <SecretRow who="Halric" detail="If he dies tonight, Solm will resurrect him — at a cost." />
          </div>
        </Card>

        {/* Quick rolls for DM */}
        <Card>
          <CardHead icon="dice" title="DM Quick Rolls" />
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { n: "Random NPC name",     d: "d100 → table", icon: "users" },
              { n: "Wandering encounter", d: "d20 · Ysavir",  icon: "compass" },
              { n: "Weather",             d: "d10",           icon: "sparkles" },
              { n: "Loot · Tier 2",       d: "d100",          icon: "bag" },
              { n: "Critical narration",  d: "d8 → table",    icon: "flame" },
            ].map((r,i) => (
              <button key={i} className="fw-btn fw-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12 }}>
                <span style={{ color: "var(--gold)" }}>{Icon(r.icon, { size: 12 })}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{r.n}</span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>{r.d}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Threads */}
        <Card>
          <CardHead icon="scroll" title="Open Threads" right={
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>5 active</span>
          } />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <ThreadRow heat="hot" t="Bone-tablet · 2 / 3 fragments" sub="Touched session 14" />
            <ThreadRow heat="warm" t="Aedric's collar · who else can see it?" sub="Promised reveal Act III" />
            <ThreadRow heat="warm" t="Brass Sept's collector" sub="Should appear by S18" />
            <ThreadRow heat="cold" t="Lira's letter · unsent" sub="Player-driven" />
            <ThreadRow heat="cold" t="The wandering elk's first name" sub="Mirenna does not know yet" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SecretRow({ who, detail }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span className="fw-pill gold" style={{ fontSize: 9, padding: "0 6px", flexShrink: 0, marginTop: 2 }}>{who}</span>
      <span style={{ color: "var(--text-2)", fontStyle: "italic" }}>{detail}</span>
    </div>
  );
}

function ThreadRow({ heat, t, sub }) {
  const c = heat === "hot" ? "var(--blood-bright)" : heat === "warm" ? "var(--gold-bright)" : "var(--text-3)";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 50, background: c, boxShadow: heat === "hot" ? "0 0 8px var(--blood-bright)" : "none", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--text)" }}>{t}</div>
        <div style={{ fontSize: 10.5, color: "var(--text-4)" }}>{sub}</div>
      </div>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px" }}>{Icon("chevR", { size: 11 })}</button>
    </div>
  );
}

/* ============================================================
   ENCOUNTER BUILDER
   ============================================================ */
function EncounterSection() {
  const [selected, setSelected] = React.useState([
    { n: "Cinder-Reeve",    cr: 7,   xp: 2900, qty: 1, kind: "Solo · Boss" },
    { n: "Brass Spear",     cr: 2,   xp: 450,  qty: 2, kind: "Minion" },
    { n: "Bound Shadow",    cr: 1.5, xp: 700,  qty: 1, kind: "Hazard" },
  ]);
  const totalXp = selected.reduce((a, b) => a + b.xp * b.qty, 0);
  // Standard 4-player party @ lv 7 budget — hard ~3.7k, deadly ~5.6k
  const budget = { easy: 1750, med: 3500, hard: 5250, dead: 7800 };
  const tier = totalXp >= budget.dead ? "DEADLY" : totalXp >= budget.hard ? "HARD" : totalXp >= budget.med ? "MEDIUM" : "EASY";
  const tierColor = tier === "DEADLY" ? "var(--blood-bright)" : tier === "HARD" ? "var(--gold-bright)" : tier === "MEDIUM" ? "var(--gold)" : "var(--success)";

  const library = [
    { n: "Cinder-Reeve",      cr: 7,   xp: 2900, kind: "Boss",    type: "Undead·Fire",    in: true },
    { n: "Brass Spear",       cr: 2,   xp: 450,  kind: "Minion",  type: "Construct",      in: true },
    { n: "Bound Shadow",      cr: 1.5, xp: 700,  kind: "Hazard",  type: "Undead",         in: true },
    { n: "Censer-priest",     cr: 4,   xp: 1100, kind: "Caster",  type: "Humanoid·Cleric" },
    { n: "Soot-wretch",       cr: 0.5, xp: 100,  kind: "Swarm",   type: "Aberration" },
    { n: "Brass Mastiff",     cr: 3,   xp: 700,  kind: "Bruiser", type: "Construct·Fire" },
    { n: "Pale Septine",      cr: 5,   xp: 1800, kind: "Solo",    type: "Humanoid·Cleric" },
    { n: "Cinder-rat swarm",  cr: 1,   xp: 200,  kind: "Swarm",   type: "Beast" },
    { n: "Black Censer",      cr: 6,   xp: 2300, kind: "Hazard",  type: "Object" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      {/* LEFT: monster library */}
      <Card>
        <CardHead icon="skull" title="Bestiary · Region: Ysavir-Under" right={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("filter", { size: 11 })} Filter</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} AI suggest</button>
          </div>
        } />
        <div style={{ padding: 10 }}>
          <input className="fw-input" placeholder="Search creatures · stat blocks · tags…" style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {library.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: m.in ? "rgba(214,168,79,0.05)" : "var(--surface-2)", border: "1px solid " + (m.in ? "rgba(214,168,79,0.3)" : "var(--border-soft)"), borderRadius: 5 }}>
                <span style={{ width: 32, height: 32, borderRadius: 5, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center", color: m.in ? "var(--gold)" : "var(--text-3)", flexShrink: 0 }}>{Icon("skull", { size: 14 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{m.n}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{m.type} · {m.kind}</div>
                </div>
                <div style={{ width: 60, textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--gold-bright)" }}>CR {m.cr}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--text-4)" }}>{m.xp} XP</div>
                </div>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 8px" }}>{Icon("eye", { size: 11 })}</button>
                {m.in
                  ? <span className="fw-pill gold" style={{ fontSize: 9 }}>In encounter</span>
                  : <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 8px" }}>{Icon("plus", { size: 11 })} Add</button>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* RIGHT: encounter & balance */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Balance gauge */}
        <Card elev style={{ overflow: "hidden" }}>
          <div style={{ padding: 16, background: "radial-gradient(ellipse at 50% 0%, rgba(153,27,27,0.15), transparent 70%)" }}>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Difficulty · 4 players @ Lv 7</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span className="fw-display" style={{ fontSize: 36, color: tierColor, lineHeight: 1 }}>{tier}</span>
              <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-3)" }}>{totalXp.toLocaleString()} XP adjusted</span>
            </div>
            <div style={{ marginTop: 14, position: "relative", height: 10, background: "var(--bg-deep)", borderRadius: 50, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, var(--success) 0%, var(--gold) 50%, var(--blood-bright) 100%)", opacity: 0.6 }} />
              <div style={{ position: "absolute", top: -2, bottom: -2, width: 3, background: "var(--text)", left: `${Math.min(100, (totalXp / budget.dead) * 100)}%`, boxShadow: "0 0 6px rgba(245,241,232,0.9)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, fontFamily: "var(--f-mono)", color: "var(--text-4)" }}>
              <span>Easy {budget.easy}</span>
              <span>Med {budget.med}</span>
              <span>Hard {budget.hard}</span>
              <span>Deadly {budget.dead}</span>
            </div>
          </div>
        </Card>

        {/* Selected list */}
        <Card>
          <CardHead icon="sword" title="In This Encounter" right={
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("x", { size: 11 })} Clear</button>
          } />
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {selected.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: 5, background: "rgba(153,27,27,0.10)", border: "1px solid rgba(153,27,27,0.3)", display: "grid", placeItems: "center", color: "var(--blood-bright)", flexShrink: 0 }}>{Icon("skull", { size: 12 })}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{s.n}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{s.kind} · CR {s.cr} · {s.xp} XP</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 5 }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "4px 6px", border: 0 }} onClick={() => setSelected(s => s.map((x, j) => j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>{Icon("minus", { size: 10 })}</button>
                  <span style={{ width: 24, textAlign: "center", fontFamily: "var(--f-mono)", fontSize: 12 }}>×{s.qty}</span>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "4px 6px", border: 0 }} onClick={() => setSelected(s => s.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x))}>{Icon("plus", { size: 10 })}</button>
                </div>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 6px" }} onClick={() => setSelected(sel => sel.filter((_, j) => j !== i))}>{Icon("x", { size: 11 })}</button>
              </div>
            ))}
            <button className="fw-btn fw-btn-gold" style={{ marginTop: 6, justifyContent: "center" }}>
              {Icon("zap", { size: 13 })} Run Encounter · Roll Initiative
            </button>
          </div>
        </Card>

        <div style={{ padding: 12, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, fontSize: 12, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5 }}>
          <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 12 })}</span>
          {" "}Hazards (Bound Shadow) only count 50% toward XP budget. Halric is down — effective party is 3 + 1 unconscious, treat as 3-player budget when needed.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INITIATIVE TRACKER
   ============================================================ */
function InitiativeSection() {
  const [round, setRound] = React.useState(1);
  const order = [
    { n: "Kessra",         ini: 22, hp: "70/70", ac: 19, ally: true, ready: true,  current: false },
    { n: "Cinder-Reeve",   ini: 19, hp: "120/120", ac: 17, foe: true,  current: true },
    { n: "Aedric",         ini: 17, hp: "52/52", ac: 14, ally: true, you: true },
    { n: "Brass Spear A",  ini: 15, hp: "22/22", ac: 16, foe: true },
    { n: "Brass Spear B",  ini: 15, hp: "22/22", ac: 16, foe: true },
    { n: "Mirenna",        ini: 14, hp: "56/56", ac: 16, ally: true },
    { n: "Halric (down)",  ini: 8,  hp: "0/48",  ac: 18, ally: true, down: true },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <Card>
        <CardHead icon="zap" title={`Initiative Order · Round ${round}`} right={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setRound(r => Math.max(1, r - 1))}>{Icon("chevL", { size: 10 })} Prev</button>
            <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setRound(r => r + 1)}>Next round {Icon("chevR", { size: 10 })}</button>
          </div>
        } />
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {order.map((c, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: c.current ? "linear-gradient(90deg, rgba(153,27,27,0.18), transparent)" : c.you ? "linear-gradient(90deg, rgba(214,168,79,0.08), transparent)" : "var(--surface-2)",
              border: "1px solid " + (c.current ? "var(--blood)" : c.you ? "var(--gold-deep)" : "var(--border-soft)"),
              borderRadius: 6, opacity: c.down ? 0.55 : 1, position: "relative",
            }}>
              {c.current && <span style={{ position: "absolute", left: -1, top: 8, bottom: 8, width: 3, background: "var(--blood-bright)", borderRadius: 2 }} />}
              <span style={{ width: 28, fontFamily: "var(--f-mono)", fontSize: 14, color: "var(--gold-bright)", textAlign: "center" }}>{c.ini}</span>
              <span style={{ width: 9, height: 9, borderRadius: 50, background: c.foe ? "var(--blood-bright)" : "var(--success)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>
                {c.n}{c.you && <span style={{ marginLeft: 6, fontSize: 9.5, color: "var(--gold)", letterSpacing: "0.12em" }}>YOU</span>}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: c.down ? "var(--blood-bright)" : "var(--text-2)", minWidth: 60, textAlign: "right" }}>{c.hp}</span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)", minWidth: 36, textAlign: "right" }}>AC {c.ac}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 6px" }}>{Icon("heart", { size: 10 })}</button>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 6px" }}>{Icon("alert", { size: 10 })}</button>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 6px" }}>{Icon("kebab", { size: 10 })}</button>
              </div>
              {c.current && <span style={{ color: "var(--blood-bright)", fontSize: 10, letterSpacing: "0.12em", marginLeft: 2 }}>NOW</span>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead icon="alert" title="Active Conditions" />
          <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 5 }}>
            <span className="fw-cond buff">Bless · Mirenna · 6 rd</span>
            <span className="fw-cond bleed">Cursed (Hex) · Cinder-Reeve · until rest</span>
            <span className="fw-cond bleed">Prone · Brass Spear A</span>
            <span className="fw-cond">Concentrating · Aedric (Hex)</span>
            <span className="fw-cond bleed">Unconscious · Halric</span>
          </div>
        </Card>

        <Card>
          <CardHead icon="play" title="Now Acting · Cinder-Reeve" right={
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("eye", { size: 11 })} Stat block</button>
          } />
          <div style={{ padding: 12, fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span className="fw-pill blood">HP 120/120</span>
              <span className="fw-pill dim">AC 17</span>
              <span className="fw-pill dim">Spd 30 ft (fly 30)</span>
            </div>
            <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
              <b style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>Brass Words.</b> 60 ft. WIS save DC 17 or take 4d8 psychic and be Frightened until end of next turn.<br />
              <b style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>Censer Slam (recharge 5–6).</b> Melee +9 · 2d10+5 fire + 2d6 necrotic. Ignites flammables.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="fw-btn fw-btn-blood fw-btn-sm">{Icon("zap", { size: 11 })} Brass Words</button>
              <button className="fw-btn fw-btn-blood fw-btn-sm">{Icon("flame", { size: 11 })} Censer Slam</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm">End turn</button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="plus" title="Quick Add" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("user", { size: 11 })} NPC</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("skull", { size: 11 })} Monster</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("hex", { size: 11 })} Hazard</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("dice", { size: 11 })} Re-roll</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   NPCs SECTION
   ============================================================ */
function NpcsSection() {
  const npcs = [
    { n: "The Cinder-Reeve", role: "Patron · Antagonist", voice: "Brass-rasping. Past or future, never present.", mood: "Patient", quote: "The shadow has not moved. Neither have I.", important: true },
    { n: "Halric Dale", role: "Party Cleric · Down", voice: "Northern lilt, careful breaths.", mood: "Bleeding", quote: "If you free it, you will hear me say no first." },
    { n: "Mother Censer", role: "Aedric's old kin", voice: "Whisper-soft, mother-sharp.", mood: "Watchful", quote: "You forget — the collar was mine first." },
    { n: "Brask of Brask's Hold", role: "Innkeep · Ally", voice: "Slow, fond, often drunk.", mood: "Worried", quote: "Send word when you breathe again, lad." },
    { n: "Lira Vael", role: "Sister · Off-screen", voice: "Bright, fast, terrible at lying.", mood: "Unaware", quote: "Aedric? My brother died in the Reach." },
    { n: "Septine warden", role: "Faction · Neutral", voice: "Liturgical. Speaks in benedictions.", mood: "Curious" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {npcs.map((n, i) => (
        <Card key={i} style={{ borderColor: n.important ? "rgba(214,168,79,0.3)" : "var(--border-soft)" }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span className="fw-avatar lg" style={{ background: n.important ? "linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)" : "linear-gradient(135deg, rgba(124,58,237,0.25), #15101f)", borderColor: n.important ? "var(--gold-deep)" : "var(--border)" }}>
                {n.n.split(" ").map(x => x[0]).join("").slice(0, 2)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{n.n}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{n.role}</div>
              </div>
              <span className="fw-pill" style={{ fontSize: 9.5 }}>{n.mood}</span>
            </div>
            <div style={{ paddingTop: 10, borderTop: "1px dashed var(--border-soft)" }}>
              <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Voice</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginBottom: 10 }}>{n.voice}</div>
              {n.quote && (
                <>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Quote tonight</div>
                  <div style={{ fontSize: 13, color: "var(--gold-bright)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5, padding: 8, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
                    "{n.quote}"
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("mic", { size: 11 })} Voice</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("scroll", { size: 11 })} Notes</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px" }}>{Icon("kebab", { size: 11 })}</button>
            </div>
          </div>
        </Card>
      ))}
      <Card style={{ borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, color: "var(--text-3)", cursor: "pointer" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{Icon("plus", { size: 28 })}</div>
          <div style={{ fontSize: 12 }}>Add NPC</div>
          <div style={{ fontSize: 10.5, color: "var(--text-4)", marginTop: 4, fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Or generate with the Warden</div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   SCENES & HANDOUTS
   ============================================================ */
function ScenesSection() {
  const scenes = [
    { n: "Chapel of the Gilded Censer",   tag: "Indoor · Dim", current: true,  color1: "rgba(214,168,79,0.35)", color2: "rgba(124,58,237,0.30)" },
    { n: "Brass-Chain ambush",            tag: "Combat · Tight", color1: "rgba(153,27,27,0.35)", color2: "rgba(214,168,79,0.20)" },
    { n: "Binding Circle (close-up)",     tag: "Hazard · Detail", color1: "rgba(124,58,237,0.40)", color2: "rgba(153,27,27,0.20)" },
    { n: "Descent to Act IV",             tag: "Transition · Stair", color1: "rgba(20,17,29,0.6)",   color2: "rgba(214,168,79,0.20)" },
    { n: "Mother Censer's cell",          tag: "Reveal · later", color1: "rgba(124,58,237,0.30)", color2: "rgba(0,0,0,0.6)" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <Card>
        <CardHead icon="map" title="Scenes" right={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 11 })} Add</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} Generate</button>
          </div>
        } />
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {scenes.map((s, i) => (
            <div key={i} style={{
              position: "relative", overflow: "hidden",
              border: "1px solid " + (s.current ? "var(--gold-deep)" : "var(--border-soft)"),
              borderRadius: 8, height: 150,
              background: `linear-gradient(135deg, ${s.color1}, ${s.color2})`,
              cursor: "pointer",
            }}>
              <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
                <g fill="none" stroke="rgba(214,168,79,0.4)" strokeWidth="0.5">
                  <path d="M0 85 L50 75 L100 80 L150 70 L200 75 V110 H0 Z" fill="rgba(0,0,0,0.4)" />
                  <circle cx="100" cy="45" r="12" fill="rgba(214,168,79,0.45)" />
                </g>
              </svg>
              {s.current && (
                <span className="fw-pill gold" style={{ position: "absolute", top: 8, left: 8, fontSize: 9.5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 50, background: "var(--gold-bright)" }} /> Current
                </span>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, background: "linear-gradient(180deg, transparent, rgba(6,5,10,0.92))" }}>
                <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{s.n}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>{s.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHead icon="layers" title="Handouts" right={
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 11 })} Upload</button>
        } />
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { n: "Binding circle · drafted map", t: "Image · PNG · 1.2 MB", ready: true, share: "auto on beat 3", icon: "hex" },
            { n: "Bone-tablet rubbing #2",       t: "Image · WebP · 0.8 MB", ready: false, share: "manual", icon: "scroll" },
            { n: "Letter — Lira to Aedric",      t: "Document · MD",          ready: true, share: "DM only · drop after combat", icon: "mail" },
            { n: "Censer-priest sigil",          t: "SVG · vector",           ready: true, share: "manual", icon: "flame" },
            { n: "Ysavir-under quick map",       t: "Image · JPG · 2.4 MB",   ready: true, share: "shared on entry", icon: "map" },
          ].map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 5, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center", color: h.ready ? "var(--gold)" : "var(--text-3)" }}>{Icon(h.icon, { size: 13 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--text)" }}>{h.n}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{h.t}</div>
              </div>
              <span style={{ fontSize: 10, color: h.ready ? "var(--gold-bright)" : "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", maxWidth: 130, textAlign: "right" }}>{h.share}</span>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px" }}>{Icon("send", { size: 11 })}</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   AUDIO / SOUNDBOARD
   ============================================================ */
function AudioSection() {
  const [playing, setPlaying] = React.useState("chapel-ambience");
  const [vol, setVol] = React.useState(60);

  const ambience = [
    { id: "chapel-ambience",   n: "Chapel · censer & wind",     mood: "Brooding",  dur: "8:00 loop" },
    { id: "under-cathedral",   n: "Under-cathedral chant",      mood: "Dread",     dur: "12:00 loop" },
    { id: "ysavir-streets",    n: "Ysavir streets · night",     mood: "Travel",    dur: "10:00 loop" },
    { id: "combat-low",        n: "Combat · low drums",         mood: "Tension",   dur: "6:00 loop" },
    { id: "combat-high",       n: "Combat · brass and fire",    mood: "Climax",    dur: "5:00 loop" },
    { id: "silence",           n: "Held silence (room tone)",   mood: "Reveal",    dur: "—" },
  ];

  const sfx = [
    { id: "censer-crack",  n: "Censer cracks",     icon: "flame",   color: "gold" },
    { id: "brass-chime",   n: "Brass-chain chime", icon: "bell",    color: "gold" },
    { id: "shadow-cry",    n: "Bound shadow cry",  icon: "skull",   color: "arc" },
    { id: "door-stone",    n: "Stone door slam",   icon: "hex" },
    { id: "blood-thump",   n: "Heartbeat thump",   icon: "heart",   color: "blood" },
    { id: "revelation",    n: "Revelation sting",  icon: "sparkles", color: "gold" },
    { id: "dice-clatter",  n: "Bones falling",     icon: "dice" },
    { id: "footsteps",     n: "Slow footsteps",    icon: "compass" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Now playing */}
        <Card elev style={{ overflow: "hidden" }}>
          <div style={{ padding: 18, background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18), transparent 70%)", display: "flex", alignItems: "center", gap: 16 }}>
            <button style={{ width: 52, height: 52, borderRadius: 50, background: "linear-gradient(180deg, var(--gold-bright), var(--gold-deep))", border: "1px solid var(--gold)", color: "#1a1428", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 0 20px -4px rgba(214,168,79,0.5)" }}>
              {Icon("pause", { size: 20 })}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Now playing · ambience</div>
              <div className="fw-display" style={{ fontSize: 18, color: "var(--text)" }}>Chapel · censer & wind</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>02:14 / 08:00 · looping</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", minWidth: 180 }}>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>Master {vol}%</div>
              <input type="range" min="0" max="100" value={vol} onChange={e => setVol(+e.target.value)} style={{ width: 160, accentColor: "var(--gold)" }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("volume", { size: 12 })}</button>
                <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("mic", { size: 12 })}</button>
              </div>
            </div>
          </div>
        </Card>

        {/* Ambience */}
        <Card>
          <CardHead icon="volume" title="Ambience" />
          <div style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ambience.map(a => {
              const on = a.id === playing;
              return (
                <button key={a.id} className="fw-btn" onClick={() => setPlaying(a.id)} style={{
                  padding: 12, justifyContent: "flex-start", alignItems: "flex-start", flexDirection: "column", textAlign: "left", gap: 4,
                  background: on ? "linear-gradient(180deg, rgba(214,168,79,0.10), rgba(214,168,79,0.02))" : "var(--surface-2)",
                  borderColor: on ? "var(--gold-deep)" : "var(--border-soft)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <span style={{ color: on ? "var(--gold-bright)" : "var(--text-3)" }}>{Icon(on ? "pause" : "play", { size: 12 })}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{a.n}</span>
                    <span className="fw-pill" style={{ fontSize: 9 }}>{a.mood}</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)", marginLeft: 20 }}>{a.dur}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* SFX */}
        <Card>
          <CardHead icon="zap" title="One-shots · SFX" right={
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>Tap to play once. Hold to loop.</span>
          } />
          <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {sfx.map(s => {
              const c = s.color === "gold" ? "var(--gold-bright)" : s.color === "arc" ? "var(--arcane-bright)" : s.color === "blood" ? "var(--blood-bright)" : "var(--text-2)";
              return (
                <button key={s.id} className="fw-btn fw-btn-ghost" style={{ flexDirection: "column", padding: 10, gap: 4, color: c }}>
                  {Icon(s.icon, { size: 16 })}
                  <span style={{ fontSize: 10.5, color: "var(--text-2)" }}>{s.n}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead icon="scroll" title="Scene → Audio mapping" />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            {[
              { scene: "Cold open", aud: "Chapel · censer & wind", auto: true },
              { scene: "Combat starts", aud: "Combat · low drums", auto: true },
              { scene: "Reeve speaks", aud: "Held silence", auto: false },
              { scene: "Revelation moment", aud: "Revelation sting", auto: false },
              { scene: "Descent", aud: "Under-cathedral chant", auto: true },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1, minWidth: 0 }}>{m.scene}</span>
                <span style={{ color: "var(--text-3)" }}>{Icon("arrowR", { size: 11 })}</span>
                <span style={{ fontSize: 12, color: "var(--text)", flex: 1, minWidth: 0 }}>{m.aud}</span>
                <span className="fw-pill" style={{ fontSize: 9, background: m.auto ? "rgba(214,168,79,0.1)" : "transparent", borderColor: m.auto ? "rgba(214,168,79,0.35)" : "var(--border)", color: m.auto ? "var(--gold-bright)" : "var(--text-3)" }}>{m.auto ? "Auto" : "Manual"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon="cog" title="Audio Routing" />
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, color: "var(--text-2)" }}>Players hear ambience</span>
              <Toggle on={true} onChange={() => {}} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, color: "var(--text-2)" }}>Players hear SFX</span>
              <Toggle on={true} onChange={() => {}} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, color: "var(--text-2)" }}>Ducking when DM speaks</span>
              <Toggle on={true} onChange={() => {}} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, color: "var(--text-2)" }}>Fade on scene change</span>
              <Toggle on={false} onChange={() => {}} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DMDashboardScreen });

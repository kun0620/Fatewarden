/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   SCREEN: CHARACTER SHEET — Aedric Vael, Tiefling Warlock 7
   ============================================================ */
function CharacterSheetScreen({ go }) {
  const [tab, setTab] = React.useState("skills");
  const [hpCurrent, setHpCurrent] = React.useState(38);
  const [tempHp, setTempHp] = React.useState(0);
  const [deathSuccesses, setDeathSuccesses] = React.useState(0);
  const [deathFails, setDeathFails] = React.useState(0);
  const hpMax = 52;
  const hpPct = (hpCurrent / hpMax) * 100;
  const hpColor = hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)";

  const stats = { STR: [9,-1], DEX: [14,2], CON: [12,1], INT: [13,1], WIS: [11,0], CHA: [18,4] };
  const sgn = v => (v >= 0 ? "+" + v : v);

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        {/* =============== HEADER =============== */}
        <CharHeader go={go} />

        <div className="fw-cs-grid">
          {/* =============== LEFT COLUMN =============== */}
          <div className="fw-cs-col">

            {/* HP BIG CARD */}
            <Card elev className="fw-orn" style={{ overflow: "hidden" }}>
              <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
              <div style={{ padding: "16px 18px", textAlign: "center", background: "radial-gradient(ellipse at 50% 0%, rgba(153,27,27,0.18), transparent 70%)" }}>
                <div className="fw-eyebrow" style={{ color: "var(--text-3)", marginBottom: 4 }}>Hit Points</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
                  <span className="fw-display" style={{ fontSize: 48, lineHeight: 1, color: hpColor }}>{hpCurrent}</span>
                  <span style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--text-3)" }}>/ {hpMax}</span>
                </div>
                {tempHp > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--arcane-bright)", fontFamily: "var(--f-mono)" }}>+{tempHp} temp HP</div>
                )}
                <div style={{ marginTop: 12, height: 6, background: "var(--bg-deep)", borderRadius: 50, overflow: "hidden", border: "1px solid var(--border-soft)" }}>
                  <div style={{ height: "100%", width: `${hpPct}%`, background: `linear-gradient(90deg, var(--blood), ${hpColor})`, transition: "width 0.25s" }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
                  <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => setHpCurrent(h => Math.max(0, h - 5))}>{Icon("minus", { size: 11 })} 5</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setHpCurrent(h => Math.max(0, h - 1))}>{Icon("minus", { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setHpCurrent(h => Math.min(hpMax, h + 1))}>{Icon("plus", { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => setHpCurrent(h => Math.min(hpMax, h + 5))}>{Icon("plus", { size: 11 })} 5</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "center" }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setTempHp(t => t + 5)} style={{ fontSize: 10.5 }}>{Icon("shield", { size: 10 })} +Temp</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setHpCurrent(hpMax)} style={{ fontSize: 10.5 }}>{Icon("heart", { size: 10 })} Full heal</button>
                </div>
              </div>

              {/* DEATH SAVES (when 0 HP) */}
              {hpCurrent === 0 && (
                <div style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 18px", background: "rgba(153,27,27,0.05)" }}>
                  <div className="fw-eyebrow" style={{ color: "var(--blood-bright)", marginBottom: 6 }}>Death Saves</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--success)", marginBottom: 3 }}>Successes</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => (
                          <span key={i} onClick={() => setDeathSuccesses(deathSuccesses === i + 1 ? i : i + 1)}
                            style={{ width: 18, height: 18, borderRadius: 50, border: "1px solid var(--success)", background: i < deathSuccesses ? "var(--success)" : "transparent", cursor: "pointer" }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--blood-bright)", marginBottom: 3 }}>Failures</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => (
                          <span key={i} onClick={() => setDeathFails(deathFails === i + 1 ? i : i + 1)}
                            style={{ width: 18, height: 18, borderRadius: 50, border: "1px solid var(--blood-bright)", background: i < deathFails ? "var(--blood-bright)" : "transparent", cursor: "pointer" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: "100%", marginTop: 8, justifyContent: "center" }}>
                    {Icon("dice", { size: 11 })} Roll Death Save
                  </button>
                </div>
              )}
            </Card>

            {/* COMBAT VITALS */}
            <Card>
              <CardHead icon="shield" title="Combat Vitals" />
              <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <VitalTile label="AC"   value="14" sub="leather + Dex" />
                <VitalTile label="INIT" value="+2" sub="Dex" gold />
                <VitalTile label="SPD"  value="30" sub="ft / round" />
                <VitalTile label="PROF" value="+3" sub="Lv 7" />
                <VitalTile label="PASS · PERC" value="13" sub="10 + Wis" small />
                <VitalTile label="HIT DICE" value="5/7" sub="d8" />
              </div>
            </Card>

            {/* ABILITY SCORES */}
            <Card>
              <CardHead icon="dice" title="Ability Scores" />
              <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {Object.entries(stats).map(([k, [v, m]]) => (
                  <div key={k} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 10, position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="fw-eyebrow" style={{ fontSize: 10 }}>{k}</span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>{v}</span>
                    </div>
                    <div className="fw-display" style={{ fontSize: 26, color: "var(--gold-bright)", lineHeight: 1.1, marginTop: 2 }}>
                      {sgn(m)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* SAVING THROWS */}
            <Card>
              <CardHead icon="shield" title="Saving Throws" />
              <div style={{ padding: "8px 12px 12px" }}>
                {[
                  ["STR", -1, false], ["DEX", 2, false], ["CON", 1, false],
                  ["INT", 1, false], ["WIS", 3, true],  ["CHA", 7, true],
                ].map(([k, m, prof]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 50, border: "1px solid " + (prof ? "var(--gold)" : "var(--border)"), background: prof ? "var(--gold)" : "transparent", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1, letterSpacing: "0.04em" }}>{k}</span>
                    <span className="fw-mono" style={{ fontSize: 13, color: prof ? "var(--gold-bright)" : "var(--text-2)", minWidth: 30, textAlign: "right" }}>{sgn(m)}</span>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px" }}>{Icon("dice", { size: 10 })}</button>
                  </div>
                ))}
              </div>
            </Card>

            {/* SENSES */}
            <Card>
              <CardHead icon="eye" title="Senses & Languages" />
              <div style={{ padding: 12, fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.7 }}>
                <div><b style={{ color: "var(--text)" }}>Darkvision</b> 60 ft (Tiefling)</div>
                <div><b style={{ color: "var(--text)" }}>Resistance:</b> Fire (Tiefling)</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--text-3)" }}>Common · Infernal · Cinder-Cant</div>
              </div>
            </Card>
          </div>

          {/* =============== CENTER COLUMN =============== */}
          <div className="fw-cs-col">
            <div className="fw-tabs">
              {[
                { id: "skills",   label: "Skills",    icon: "eye" },
                { id: "features", label: "Features",  icon: "sparkles" },
                { id: "spells",   label: "Spells",    icon: "flame" },
                { id: "items",    label: "Inventory", icon: "bag" },
                { id: "lore",     label: "Lore & Notes", icon: "scroll" },
              ].map(t => (
                <div key={t.id} className={"fw-tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {Icon(t.icon, { size: 11 })} {t.label}
                </div>
              ))}
              <span style={{ flex: 1, borderBottom: "1px solid var(--border-soft)" }} />
            </div>

            <div style={{ marginTop: 16 }}>
              {tab === "skills"   && <SkillsPanel />}
              {tab === "features" && <FeaturesPanel />}
              {tab === "spells"   && <SpellsPanel />}
              {tab === "items"    && <ItemsPanel />}
              {tab === "lore"     && <LorePanel />}
            </div>
          </div>

          {/* =============== RIGHT COLUMN =============== */}
          <div className="fw-cs-col">

            {/* CONDITIONS */}
            <Card>
              <CardHead icon="alert" title="Conditions" right={
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 8px" }}>{Icon("plus", { size: 10 })}</button>
              } />
              <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 5 }}>
                <span className="fw-cond buff">Bless · 6 rd</span>
                <span className="fw-cond bleed">Cursed · until rest</span>
              </div>
            </Card>

            {/* RESOURCES */}
            <Card>
              <CardHead icon="flame" title="Resources" />
              <div style={{ padding: "12px 14px" }}>
                <ResourceBar label="Pact Slots (Lv 4)" cur={1} max={2} color="arcane" />
                <ResourceBar label="Hit Dice (d8)" cur={5} max={7} color="gold" />
                <ResourceBar label="Inspiration" cur={1} max={1} color="gold" diamond />
                <ResourceBar label="Channel Patron" cur={0} max={1} color="arcane" />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("flame", { size: 11 })} Short Rest</button>
                  <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("sparkles", { size: 11 })} Long Rest</button>
                </div>
              </div>
            </Card>

            {/* QUICK ROLLS */}
            <Card>
              <CardHead icon="dice" title="Quick Rolls" />
              <div style={{ padding: "8px 10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { n: "Eldritch Blast",  d: "2d10 + 4 force",   icon: "flame", primary: true },
                  { n: "Hex Damage",      d: "1d6 necrotic",     icon: "skull" },
                  { n: "Persuasion",      d: "1d20 + 7",         icon: "users" },
                  { n: "Stealth",         d: "1d20 + 2",         icon: "eye" },
                  { n: "Initiative",      d: "1d20 + 2",         icon: "zap" },
                ].map((r,i) => (
                  <button key={i} className="fw-btn fw-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", fontSize: 12, borderColor: r.primary ? "var(--gold-deep)" : undefined, background: r.primary ? "rgba(214,168,79,0.06)" : undefined }}>
                    <span style={{ color: r.primary ? "var(--gold-bright)" : "var(--gold)" }}>{Icon(r.icon, { size: 12 })}</span>
                    <span style={{ flex: 1, textAlign: "left" }}>{r.n}</span>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>{r.d}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* PERSONALITY */}
            <Card>
              <CardHead icon="heart" title="Roleplay" />
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--f-serif)", fontSize: 13.5, lineHeight: 1.55 }}>
                <RpLine label="Ideal" text="A bargain is the only honest covenant." />
                <RpLine label="Bond"  text="My sister, Lira, must never know what I gave for her." />
                <RpLine label="Flaw"  text="I keep returning to the brass censer when the dreams come." />
                <RpLine label="Trait" text="I count my own heartbeats when nervous." />
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HEADER ---------------- */
function CharHeader({ go }) {
  return (
    <div className="fw-cs-header fw-orn">
      <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
      <div className="fw-cs-portrait">
        <div className="fw-cs-portrait-inner">AE</div>
        <span className="fw-cs-level">7</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-eyebrow" style={{ color: "var(--gold)", marginBottom: 4 }}>Character Sheet · Active</div>
        <h1 className="fw-display" style={{ fontSize: 36, color: "var(--text)", lineHeight: 1.05, letterSpacing: "0.04em" }}>
          Aedric Vael
        </h1>
        <div className="fw-serif" style={{ fontStyle: "italic", fontSize: 16, color: "var(--text-2)", marginTop: 6 }}>
          Tiefling Warlock · The Cinder-Reeve · Outlander
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span className="fw-pill gold">{Icon("crown", { size: 10 })} The Hollow Crown of Ysavir</span>
          <span className="fw-pill dim">XP 23,400 / 34,000</span>
          <span className="fw-pill">Aedric · @aedric_v</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go && go("menu")}>{Icon("chevL", { size: 11 })} Back</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("scroll", { size: 11 })} Export PDF</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("link", { size: 11 })} Share</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("cog", { size: 11 })} Edit</button>
          <button className="fw-btn fw-btn-gold fw-btn-sm">{Icon("sparkles", { size: 11 })} Level Up</button>
        </div>
        <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)", letterSpacing: "0.04em" }}>
          last edit · 2d ago · before Session 15
        </div>
      </div>
    </div>
  );
}

/* ---------------- LITTLE PRIMS ---------------- */
function VitalTile({ label, value, sub, small, gold }) {
  return (
    <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "10px 8px", textAlign: "center" }}>
      <div className="fw-eyebrow" style={{ fontSize: small ? 8.5 : 9.5, marginBottom: 4 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: small ? 18 : 22, color: gold ? "var(--gold-bright)" : "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 2, fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{sub}</div>
    </div>
  );
}

function ResourceBar({ label, cur, max, color, diamond }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: "var(--text-3)" }}>{label}</span>
        <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-2)" }}>{cur} / {max}</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 10,
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

function RpLine({ label, text }) {
  return (
    <div>
      <div className="fw-eyebrow" style={{ fontSize: 9.5, color: "var(--gold)", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--text-2)", fontStyle: "italic" }}>"{text}"</div>
    </div>
  );
}

/* ---------------- SKILLS PANEL ---------------- */
function SkillsPanel() {
  const skills = [
    ["Acrobatics","DEX", 2, false],
    ["Animal Handling","WIS", 0, false],
    ["Arcana","INT", 4, true],
    ["Athletics","STR", -1, false],
    ["Deception","CHA", 7, true],
    ["History","INT", 1, false],
    ["Insight","WIS", 0, false],
    ["Intimidation","CHA", 7, true],
    ["Investigation","INT", 1, false],
    ["Medicine","WIS", 0, false],
    ["Nature","INT", 1, false],
    ["Perception","WIS", 3, true],
    ["Performance","CHA", 4, false],
    ["Persuasion","CHA", 7, true],
    ["Religion","INT", 4, true],
    ["Sleight of Hand","DEX", 2, false],
    ["Stealth","DEX", 2, false],
    ["Survival","WIS", 3, true],
  ];
  const sgn = v => (v >= 0 ? "+" + v : v);

  return (
    <Card>
      <CardHead icon="eye" title="Skills" right={
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>● proficient · ◐ expertise</span>
      } />
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
        {skills.map(([n, abil, m, prof]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--border-soft)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 50, border: "1px solid " + (prof ? "var(--gold)" : "var(--border)"), background: prof ? "var(--gold)" : "transparent", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: prof ? "var(--text)" : "var(--text-2)", flex: 1 }}>{n}</span>
            <span style={{ fontSize: 9.5, color: "var(--text-4)", letterSpacing: "0.1em" }}>{abil}</span>
            <span className="fw-mono" style={{ fontSize: 13, color: prof ? "var(--gold-bright)" : "var(--text-2)", minWidth: 28, textAlign: "right" }}>{sgn(m)}</span>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px" }}>{Icon("dice", { size: 10 })}</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- FEATURES PANEL ---------------- */
function FeaturesPanel() {
  const features = [
    { kind: "Race", n: "Darkvision",         t: "See in dim light as bright, in darkness as dim. 60 ft." },
    { kind: "Race", n: "Hellish Resistance", t: "Resistance to fire damage." },
    { kind: "Race", n: "Infernal Legacy",    t: "Thaumaturgy cantrip. Hellish Rebuke 1/day at lv 3. Darkness 1/day at lv 5." },
    { kind: "Class", n: "Pact Magic", t: "2 spell slots that recover on a short rest. Spell save DC 15, +7 to hit.", important: true },
    { kind: "Class", n: "Pact of the Tome", t: "A Book of Shadows. Gain 3 cantrips from any class.", important: true },
    { kind: "Class", n: "Eldritch Invocations", t: "Agonizing Blast · Repelling Blast · Devil's Sight · Book of Ancient Secrets.", important: true },
    { kind: "Class", n: "Mystic Arcanum (Lv 6)", t: "Cast Circle of Death 1/long rest, no slot.", important: true },
    { kind: "BG", n: "Wanderer", t: "Excellent memory for maps and geography. Recall general layouts of regions traveled." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {features.map((f, i) => (
        <Card key={i} className={f.important ? "" : ""} style={{ borderColor: f.important ? "rgba(214,168,79,0.3)" : "var(--border-soft)" }}>
          <div style={{ padding: "12px 16px", display: "flex", gap: 12 }}>
            <span className="fw-pill" style={{ height: "fit-content", marginTop: 2 }}>{f.kind}</span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: f.important ? "var(--gold-bright)" : "var(--text)", marginBottom: 4 }}>{f.n}</div>
              <div className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.55 }}>{f.t}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- SPELLS PANEL ---------------- */
function SpellsPanel() {
  const spells = [
    { lvl: "Cantrip", spells: [
      { n: "Eldritch Blast", s: "1A · 120 ft · 2 beams · 1d10+4 force each", on: true, important: true },
      { n: "Thaumaturgy",    s: "1A · 30 ft · sensory effect" },
      { n: "Mage Hand",      s: "1A · 30 ft · 10 lb · invisible (tome)" },
      { n: "Minor Illusion", s: "1A · 30 ft · 1 ft cube (tome)" },
    ]},
    { lvl: "Pact (Lv 4)", spells: [
      { n: "Hex",                 s: "1BA · 90 ft · 1d6 necrotic per hit · 1h conc", on: true, prepared: true, important: true },
      { n: "Armor of Agathys",    s: "1A · self · 10 temp HP · 10 cold dmg on melee hit" },
      { n: "Misty Step",          s: "1BA · 30 ft · teleport" },
      { n: "Hold Person",         s: "1A · 60 ft · paralyze · WIS save · 1m conc" },
      { n: "Counterspell",        s: "Reaction · 60 ft · interrupt cast" },
      { n: "Hunger of Hadar",     s: "1A · 150 ft · 20 ft sphere · 2d6 cold + 2d6 acid · 1m conc" },
    ]},
    { lvl: "Arcanum (Lv 6)", spells: [
      { n: "Circle of Death", s: "1A · 150 ft · 60 ft sphere · 8d6 necrotic · CON save · 1/long rest", important: true },
    ]},
  ];
  return (
    <div>
      <div style={{ padding: 14, background: "linear-gradient(180deg, rgba(124,58,237,0.07), rgba(124,58,237,0.02))", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 50, background: "rgba(124,58,237,0.15)", border: "1px solid var(--arcane)", display: "grid", placeItems: "center", color: "var(--arcane-bright)" }}>
          {Icon("flame", { size: 18 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>Pact Magic · Charisma</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>Spell save DC <b style={{ color: "var(--gold-bright)" }}>15</b> · Spell attack <b style={{ color: "var(--gold-bright)" }}>+7</b> · 2 slots / short rest</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1,2].map(i => (
            <span key={i} style={{ width: 26, height: 26, borderRadius: 6, background: i === 1 ? "var(--bg-deep)" : "linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))", border: "1px solid " + (i === 1 ? "var(--border)" : "var(--arcane)"), display: "grid", placeItems: "center", color: i === 1 ? "var(--text-4)" : "#fff", fontFamily: "var(--f-mono)", fontSize: 11 }}>{i === 1 ? "✓" : "4"}</span>
          ))}
        </div>
      </div>

      {spells.map((g, gi) => (
        <Card key={gi} style={{ marginBottom: 12 }}>
          <CardHead icon="flame" title={g.lvl} right={
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{g.spells.length} known</span>
          } />
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {g.spells.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: s.on ? "rgba(124,58,237,0.07)" : "var(--surface-2)", border: "1px solid " + (s.on ? "rgba(124,58,237,0.3)" : "var(--border-soft)"), borderRadius: 6 }}>
                <span style={{ color: s.on ? "var(--arcane-bright)" : s.important ? "var(--gold)" : "var(--text-3)" }}>{Icon("flame", { size: 13 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{s.s}</div>
                </div>
                {s.on && <span className="fw-pill" style={{ background: "rgba(124,58,237,0.18)", borderColor: "var(--arcane)", color: "var(--arcane-bright)", fontSize: 9.5 }}>Active</span>}
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px", fontSize: 10.5 }}>
                  {Icon("dice", { size: 10 })} Cast
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- INVENTORY PANEL ---------------- */
function ItemsPanel() {
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[["GP",47,"#D6A84F"],["SP",12,"#A8A29E"],["EP",2,"#B8B0A4"],["CP",30,"#8C5A3C"]].map(([k,v,c],i) => (
            <div key={i} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 10, textAlign: "center" }}>
              <div className="fw-eyebrow" style={{ fontSize: 10, color: c }}>{k}</div>
              <div className="fw-display" style={{ fontSize: 22, color: "var(--text)", lineHeight: 1.1 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead icon="sword" title="Equipped" right={
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Carry 34 / 90 lb</span>
        } />
        <div style={{ padding: 8 }}>
          <SheetItem icon="flame" name="Staff of the Cinder-Reeve" tag="Pact weapon · 1d8+4 fire · attuned" special />
          <SheetItem icon="shield" name="Leather armor" tag="AC 11 + Dex modifier" />
          <SheetItem icon="sword" name="Light crossbow" tag="1d8 piercing · 80/320 ft · 5 lb" />
          <SheetItem icon="sword" name="Dagger" tag="1d4 piercing · finesse · thrown 20/60" />
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead icon="bag" title="Carried" />
        <div style={{ padding: 8 }}>
          <SheetItem icon="heart" name="Potion of Healing" tag="2d4+2 HP · standard" qty={2} />
          <SheetItem icon="sparkles" name="Bone-tablet fragment" tag="Quest · Embers arc" lore />
          <SheetItem icon="sparkles" name="Brass censer-key" tag="Trinket · binding-resonance" lore />
          <SheetItem icon="flame" name="Torch" tag="6 hr · bright 20 ft" qty={3} />
          <SheetItem icon="bag" name="Rations, dried" tag="5 days · 10 lb" qty={5} />
          <SheetItem icon="bag" name="Rope, hempen 50 ft" tag="10 lb" />
          <SheetItem icon="book" name="Book of Shadows" tag="Pact tome · 3 cantrips" special />
        </div>
      </Card>

      <Card>
        <CardHead icon="scroll" title="Attunement" right={
          <span style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--f-mono)" }}>1 / 3</span>
        } />
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "rgba(214,168,79,0.07)", border: "1px solid var(--gold-deep)", borderRadius: 6 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, background: "rgba(214,168,79,0.15)", border: "1px solid var(--gold)", display: "grid", placeItems: "center", color: "var(--gold-bright)" }}>{Icon("flame", { size: 12 })}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--text)" }}>Staff of the Cinder-Reeve</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Bound to your pact. Cannot be unattuned mid-campaign.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, color: "var(--text-3)", fontSize: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, border: "1px dashed var(--border)", display: "grid", placeItems: "center" }}>{Icon("plus", { size: 12 })}</span>
            <span style={{ flex: 1 }}>Empty slot</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, color: "var(--text-3)", fontSize: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 5, border: "1px dashed var(--border)", display: "grid", placeItems: "center" }}>{Icon("plus", { size: 12 })}</span>
            <span style={{ flex: 1 }}>Empty slot</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SheetItem({ icon, name, tag, qty, special, lore }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: 10, marginBottom: 4, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5, alignItems: "center" }}>
      <span style={{
        width: 26, height: 26, borderRadius: 5,
        background: special ? "rgba(214,168,79,0.10)" : lore ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.025)",
        border: "1px solid " + (special ? "var(--gold-deep)" : lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)"),
        display: "grid", placeItems: "center",
        color: special ? "var(--gold-bright)" : lore ? "var(--arcane-bright)" : "var(--text-3)",
      }}>{Icon(icon, { size: 12 })}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{tag}</div>
      </div>
      {qty && <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-2)" }}>×{qty}</span>}
      <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px" }}>{Icon("kebab", { size: 12 })}</button>
    </div>
  );
}

/* ---------------- LORE PANEL ---------------- */
function LorePanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <CardHead icon="scroll" title="Backstory" right={<button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} Edit</button>} />
        <div style={{ padding: "14px 18px", fontFamily: "var(--f-serif)", fontSize: 15, color: "var(--text-2)", lineHeight: 1.7, fontStyle: "italic" }}>
          Born to a sept of cinder-priests in the Reach. At fourteen, signed a pact with the <b style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>Cinder-Reeve</b> to spare a sister's life — and has carried the brass collar of that bargain ever since. He counts his own heartbeats when nervous. He cannot pray to fire without flinching.
          <br /><br />
          Wandered the Border-Reach for three summers as a courier-by-trade and a question-asker by night. Joined the party at Brask's Hold the morning after the bone-tablet went missing.
        </div>
      </Card>

      <Card>
        <CardHead icon="users" title="Allies & Enemies" />
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <NpcCard name="Lira Vael" rel="Sister · Allied" desc="In the Reach. Believes I died at fourteen." good />
          <NpcCard name="Brother Halric" rel="Companion · Allied" desc="Cleric of Solm. Currently bleeding out." good />
          <NpcCard name="The Cinder-Reeve" rel="Patron · Owed" desc="Speaks through brass. Watches always." />
          <NpcCard name="Mother Censer" rel="Enemy" desc="Knows my real name. Once was kin." bad />
        </div>
      </Card>

      <Card>
        <CardHead icon="book" title="Session Notes" right={
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 11 })} New entry</button>
        } />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { d: "Session 15 · 2d ago", t: "Chapel of the Gilded Censer. Halric down. We stand before the binding circle — the Cinder-Reeve has not moved. I think it's waiting for me to speak first." },
            { d: "Session 14 · 9d ago", t: "Brass-spear ambush in the under-cathedral. Kessra split one in half. Mirenna's elk took a hit but lived. The bone-tablet hummed twice while we descended." },
            { d: "Session 13 · 16d ago", t: "Started Act III. Returned to Ysavir. The seeress was right — the city has more doors than it used to." },
          ].map((n, i) => (
            <div key={i} style={{ paddingLeft: 14, borderLeft: "2px solid var(--gold-deep)" }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{n.d}</div>
              <div style={{ fontFamily: "var(--f-serif)", fontSize: 14, color: "var(--text-2)", lineHeight: 1.55, fontStyle: "italic" }}>{n.t}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NpcCard({ name, rel, desc, good, bad }) {
  const c = good ? "rgba(34,197,94,0.3)" : bad ? "rgba(153,27,27,0.4)" : "var(--border-soft)";
  return (
    <div style={{ padding: 10, background: "var(--surface-2)", border: "1px solid " + c, borderRadius: 6 }}>
      <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{name}</div>
      <div style={{ fontSize: 10.5, color: good ? "#86EFAC" : bad ? "#FCA5A5" : "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{rel}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

Object.assign(window, { CharacterSheetScreen });

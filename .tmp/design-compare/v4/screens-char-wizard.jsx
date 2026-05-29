/* global React, Icon, Card, CardHead, Field, Seg, Toggle, Tile, CLASSES, RACES, BACKGROUNDS */

/* ============================================================
   SCREEN: CHARACTER WIZARD — 6-step creator
   ============================================================ */

const STEPS = [
  { id: "race",      label: "Race",        icon: "user",     desc: "Lineage and blood" },
  { id: "class",     label: "Class",       icon: "sword",    desc: "Calling and craft" },
  { id: "abilities", label: "Abilities",   icon: "dice",     desc: "Strength of the dice" },
  { id: "back",      label: "Background",  icon: "scroll",   desc: "Where you come from" },
  { id: "gear",      label: "Equipment",   icon: "bag",      desc: "What you carry" },
  { id: "review",    label: "Review",      icon: "check",    desc: "Bind the pact" },
];

function CharacterWizardScreen({ go }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [data, setData] = React.useState({
    name: "Aedric Vael",
    pronouns: "they / them",
    race: "Tiefling",
    subrace: "",
    class: "Warlock",
    subclass: "",
    background: "Outlander",
    alignment: "Chaotic Neutral",
    method: "Point buy",         // Standard Array / Point buy / Roll 4d6 / Manual
    abilities: { STR: 9, DEX: 14, CON: 12, INT: 13, WIS: 11, CHA: 16 },
    racialBonus: { CHA: 2, INT: 1 },   // tiefling baseline
    skills: ["Arcana", "Deception"],
    gearChoice: "starting",      // starting | gold
    startingGold: 80,
    traits: "I count my own heartbeats when nervous.",
    ideals: "A bargain is the only honest covenant.",
    bonds: "My sister, Lira, must never know what I gave for her.",
    flaws: "I keep returning to the brass censer when the dreams come.",
    backstory: "Born to a sept of cinder-priests in the Reach. At fourteen, signed a pact with the Cinder-Reeve to spare a sister's life — and has carried the brass collar of that bargain ever since.",
  });

  const setField = (k, v) => setData(d => ({ ...d, [k]: v }));
  const step = STEPS[stepIdx];

  const next = () => setStepIdx(i => Math.min(STEPS.length - 1, i + 1));
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 18 }}>
        {/* HEADER */}
        <div className="fw-wizard-head">
          <div>
            <div className="fw-eyebrow" style={{ color: "var(--gold)" }}>Forge a Warden · Step {stepIdx + 1} of {STEPS.length}</div>
            <h1 className="fw-display" style={{ fontSize: 30, color: "var(--text)", margin: "4px 0 4px", letterSpacing: "0.04em" }}>{step.label}</h1>
            <div style={{ fontSize: 14, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{step.desc}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("vault")}>{Icon("chevL", { size: 12 })} Vault</button>
            <button className="fw-btn fw-btn-ghost">{Icon("scroll", { size: 12 })} Save draft</button>
          </div>
        </div>

        {/* STEPPER */}
        <div className="fw-stepper">
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStepIdx(i)} className={"fw-step " + (i === stepIdx ? "active " : "") + (i < stepIdx ? "done " : "")}>
              <span className="fw-step-bullet">
                {i < stepIdx ? Icon("check", { size: 11 }) : <span>{i + 1}</span>}
              </span>
              <div style={{ textAlign: "left" }}>
                <div className="fw-step-label">{s.label}</div>
                <div className="fw-step-desc">{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && <span className="fw-step-line" />}
            </button>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="fw-wizard-grid">
          {/* LEFT — step content */}
          <div className="fw-fade">
            {step.id === "race"      && <StepRace data={data} setField={setField} />}
            {step.id === "class"     && <StepClass data={data} setField={setField} />}
            {step.id === "abilities" && <StepAbilities data={data} setField={setField} setData={setData} />}
            {step.id === "back"      && <StepBackground data={data} setField={setField} />}
            {step.id === "gear"      && <StepGear data={data} setField={setField} />}
            {step.id === "review"    && <StepReview data={data} />}
          </div>

          {/* RIGHT — sticky preview */}
          <CharPreview data={data} />
        </div>

        {/* FOOTER NAV */}
        <div className="fw-wizard-foot">
          <button className="fw-btn fw-btn-ghost" onClick={prev} disabled={stepIdx === 0}>
            {Icon("chevL", { size: 12 })} Back
          </button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>
            {stepIdx + 1} / {STEPS.length}
          </div>
          {stepIdx === STEPS.length - 1 ? (
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={() => go && go("vault")}>
              {Icon("check", { size: 13 })} Bind the pact
            </button>
          ) : (
            <button className="fw-btn fw-btn-gold" onClick={next}>
              Next · {STEPS[stepIdx + 1].label} {Icon("chevR", { size: 12 })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PREVIEW — sticky right side
   ============================================================ */
function CharPreview({ data }) {
  const mod = v => Math.floor((v - 10) / 2);
  const sgn = v => (v >= 0 ? "+" + v : v);
  const final = (k) => (data.abilities[k] || 10) + (data.racialBonus[k] || 0);
  return (
    <div style={{ position: "sticky", top: 20 }}>
      <Card elev className="fw-orn" style={{ overflow: "hidden" }}>
        <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
        <div style={{ position: "relative", height: 200, background: "linear-gradient(180deg, #1a1428 0%, #08070d 100%)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.42), transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(135deg, #2a1f3d, #0c0a14)", border: "2px solid var(--gold-deep)", boxShadow: "0 0 40px -10px rgba(214,168,79,0.6)", display: "grid", placeItems: "center", fontFamily: "var(--f-display)", fontSize: 42, color: "var(--gold-bright)" }}>
              {(data.name || "—").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="fw-display" style={{ fontSize: 20, color: "var(--text)", textAlign: "center" }}>{data.name || "Unbound"}</div>
          <div className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-3)", textAlign: "center", fontStyle: "italic", marginTop: 2 }}>
            {data.race}{data.subrace ? ` · ${data.subrace}` : ""} · {data.class} · Lv 1
          </div>

          <div className="fw-divider" style={{ marginTop: 14, marginBottom: 12 }}><span className="fw-eyebrow">Abilities</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {["STR","DEX","CON","INT","WIS","CHA"].map(k => {
              const val = final(k);
              const m = mod(val);
              const has = (data.racialBonus[k] || 0) > 0;
              return (
                <div key={k} style={{ background: "var(--bg-deep)", border: "1px solid " + (has ? "rgba(124,58,237,0.3)" : "var(--border-soft)"), borderRadius: 6, padding: 6, textAlign: "center", position: "relative" }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{k}</div>
                  <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: m >= 0 ? "var(--gold-bright)" : "var(--text-3)" }}>{sgn(m)}</div>
                  {has && <span style={{ position: "absolute", top: 2, right: 4, fontSize: 8, color: "var(--arcane-bright)", fontFamily: "var(--f-mono)" }}>+{data.racialBonus[k]}</span>}
                </div>
              );
            })}
          </div>

          <div className="fw-divider" style={{ marginTop: 14, marginBottom: 12 }}><span className="fw-eyebrow">Vitals</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <Vital2 label="HP" value="8" />
            <Vital2 label="AC" value="13" />
            <Vital2 label="SPD" value="30" />
          </div>

          {data.skills.length > 0 && (
            <>
              <div className="fw-divider" style={{ marginTop: 14, marginBottom: 8 }}><span className="fw-eyebrow">Skill picks</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.skills.map(s => <span key={s} className="fw-pill gold" style={{ fontSize: 9.5 }}>{s}</span>)}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
function Vital2({ label, value }) {
  return (
    <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
      <div className="fw-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: 15, color: "var(--gold-bright)" }}>{value}</div>
    </div>
  );
}

/* ============================================================
   STEP 1 — RACE
   ============================================================ */
const RACE_DATA = {
  "Human":     { bonus: "+1 all abilities",            bonusObj: { STR:1, DEX:1, CON:1, INT:1, WIS:1, CHA:1 }, speed: 30, traits: ["Extra language", "Versatile"],                    subraces: [] },
  "Elf":       { bonus: "+2 DEX",                      bonusObj: { DEX:2 },               speed: 30, traits: ["Darkvision 60 ft", "Keen Senses", "Trance"],      subraces: ["High Elf", "Wood Elf", "Drow"] },
  "Dwarf":     { bonus: "+2 CON",                      bonusObj: { CON:2 },               speed: 25, traits: ["Darkvision 60 ft", "Dwarven Resilience"],         subraces: ["Hill Dwarf", "Mountain Dwarf"] },
  "Halfling":  { bonus: "+2 DEX",                      bonusObj: { DEX:2 },               speed: 25, traits: ["Lucky", "Brave", "Halfling Nimbleness"],          subraces: ["Lightfoot", "Stout"] },
  "Tiefling":  { bonus: "+2 CHA, +1 INT",              bonusObj: { CHA:2, INT:1 },        speed: 30, traits: ["Darkvision 60 ft", "Hellish Resistance", "Infernal Legacy"], subraces: [] },
  "Half-Orc":  { bonus: "+2 STR, +1 CON",              bonusObj: { STR:2, CON:1 },        speed: 30, traits: ["Darkvision 60 ft", "Relentless Endurance", "Savage Attacks"], subraces: [] },
  "Half-Elf":  { bonus: "+2 CHA, +1 to two others",    bonusObj: { CHA:2, STR:1, DEX:1 }, speed: 30, traits: ["Darkvision 60 ft", "Fey Ancestry", "Two Skills"], subraces: [] },
  "Dragonborn":{ bonus: "+2 STR, +1 CHA",              bonusObj: { STR:2, CHA:1 },        speed: 30, traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"], subraces: [] },
  "Gnome":     { bonus: "+2 INT",                      bonusObj: { INT:2 },               speed: 25, traits: ["Darkvision 60 ft", "Gnome Cunning"],              subraces: ["Forest Gnome", "Rock Gnome"] },
};

function StepRace({ data, setField }) {
  const races = Object.keys(RACE_DATA);
  const cur = RACE_DATA[data.race];
  const pickRace = (r) => {
    setField("race", r);
    setField("subrace", "");
    setField("racialBonus", RACE_DATA[r].bonusObj);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead icon="user" title="Lineage" right={
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>SRD 5.1 · 9 races</span>
        } />
        <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {races.map(r => (
            <Tile key={r} title={r} desc={RACE_DATA[r].bonus} icon="user" active={data.race === r} onClick={() => pickRace(r)} />
          ))}
        </div>
      </Card>

      {cur && cur.subraces.length > 0 && (
        <Card>
          <CardHead icon="users" title={`${data.race} · Subrace`} />
          <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {cur.subraces.map(s => (
              <Tile key={s} title={s} active={data.subrace === s} onClick={() => setField("subrace", s)} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHead icon="sparkles" title={`Racial Traits · ${data.race}`} />
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <Pill2 label="Ability bonus" v={cur.bonus} accent="gold" />
            <Pill2 label="Speed" v={`${cur.speed} ft`} />
            <Pill2 label="Languages" v="Common + 1" />
          </div>
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Traits</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cur.traits.map(t => (
              <div key={t} style={{ padding: 12, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 6, display: "flex", gap: 10 }}>
                <span style={{ color: "var(--gold)" }}>{Icon("sparkles", { size: 12 })}</span>
                <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
function Pill2({ label, v, accent }) {
  return (
    <div style={{ padding: "8px 12px", background: "var(--bg-deep)", border: "1px solid " + (accent === "gold" ? "rgba(214,168,79,0.4)" : "var(--border-soft)"), borderRadius: 6, flex: 1 }}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 13, color: accent === "gold" ? "var(--gold-bright)" : "var(--text)", marginTop: 2, fontFamily: "var(--f-serif)" }}>{v}</div>
    </div>
  );
}

/* ============================================================
   STEP 2 — CLASS
   ============================================================ */
const CLASS_DATA = {
  "Warlock":  { hitDie: "d8",  primary: "CHA", saves: ["WIS","CHA"], skillN: 2, skills: ["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"] },
  "Fighter":  { hitDie: "d10", primary: "STR or DEX", saves: ["STR","CON"], skillN: 2, skills: ["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"] },
  "Cleric":   { hitDie: "d8",  primary: "WIS", saves: ["WIS","CHA"], skillN: 2, skills: ["History","Insight","Medicine","Persuasion","Religion"] },
  "Wizard":   { hitDie: "d6",  primary: "INT", saves: ["INT","WIS"], skillN: 2, skills: ["Arcana","History","Insight","Investigation","Medicine","Religion"] },
  "Rogue":    { hitDie: "d8",  primary: "DEX", saves: ["DEX","INT"], skillN: 4, skills: ["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"] },
  "Druid":    { hitDie: "d8",  primary: "WIS", saves: ["INT","WIS"], skillN: 2, skills: ["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"] },
  "Paladin":  { hitDie: "d10", primary: "STR", saves: ["WIS","CHA"], skillN: 2, skills: ["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"] },
  "Ranger":   { hitDie: "d10", primary: "DEX", saves: ["STR","DEX"], skillN: 3, skills: ["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"] },
};
const SUBCLASSES = {
  Warlock: ["The Fiend","The Archfey","The Great Old One","The Cinder-Reeve · custom"],
  Fighter: ["Champion","Battle Master","Eldritch Knight"],
  Cleric:  ["Life Domain","Light Domain","Knowledge Domain"],
  Wizard:  ["School of Evocation","School of Divination","School of Necromancy"],
  Rogue:   ["Thief","Assassin","Arcane Trickster"],
  Druid:   ["Circle of the Land","Circle of the Moon"],
  Paladin: ["Oath of Devotion","Oath of Vengeance","Oath of the Ancients"],
  Ranger:  ["Hunter","Beast Master"],
};

function StepClass({ data, setField }) {
  const cls = CLASS_DATA[data.class] || CLASS_DATA["Warlock"];
  const toggleSkill = (s) => {
    setField("skills", data.skills.includes(s)
      ? data.skills.filter(x => x !== s)
      : data.skills.length < cls.skillN ? [...data.skills, s] : data.skills);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead icon="sword" title="Class" right={
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>Subclass chosen at level 3 (preview below)</span>
        } />
        <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Object.keys(CLASS_DATA).map(c => (
            <Tile key={c} title={c} icon="sword" active={data.class === c} onClick={() => { setField("class", c); setField("skills", []); }}
              desc={`d${CLASS_DATA[c].hitDie.slice(1)} · ${CLASS_DATA[c].primary}`} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHead icon="sparkles" title={`${data.class} · Class Features`} />
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <Pill2 label="Hit Die" v={cls.hitDie} accent="gold" />
            <Pill2 label="Primary" v={cls.primary} />
            <Pill2 label="Saves" v={cls.saves.join(" · ")} />
            <Pill2 label="Skills" v={`Choose ${cls.skillN}`} />
          </div>

          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Skill Proficiencies · pick {cls.skillN} ({data.skills.length}/{cls.skillN})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cls.skills.map(s => {
              const on = data.skills.includes(s);
              const full = !on && data.skills.length >= cls.skillN;
              return (
                <button key={s} onClick={() => toggleSkill(s)} disabled={full}
                  className={"fw-btn fw-btn-sm " + (on ? "" : "fw-btn-ghost")}
                  style={{ borderColor: on ? "var(--gold-deep)" : undefined, color: on ? "var(--gold-bright)" : full ? "var(--text-4)" : undefined, background: on ? "rgba(214,168,79,0.10)" : undefined, opacity: full ? 0.4 : 1 }}>
                  {on && Icon("check", { size: 10 })} {s}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {SUBCLASSES[data.class] && (
        <Card>
          <CardHead icon="crown" title="Subclass · preview (chosen at Lv 3)" />
          <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {SUBCLASSES[data.class].map(s => (
              <Tile key={s} title={s} active={data.subclass === s} onClick={() => setField("subclass", s)} desc="Selected at level 3" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   STEP 3 — ABILITIES (Standard Array + Point Buy)
   ============================================================ */
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

function StepAbilities({ data, setField, setData }) {
  const method = data.method;
  const mod = v => Math.floor((v - 10) / 2);
  const sgn = v => (v >= 0 ? "+" + v : v);

  const setAbility = (k, v) => setData(d => ({ ...d, abilities: { ...d.abilities, [k]: v } }));

  // Point Buy
  const total = Object.values(data.abilities).reduce((a,b) => a + (POINT_COST[b] ?? 0), 0);
  const pointBudget = 27;
  const pointsLeft = pointBudget - total;

  // Standard Array assignment state
  const usedArray = Object.values(data.abilities);
  const remainingArray = STANDARD_ARRAY.filter(v => {
    const idx = usedArray.indexOf(v);
    if (idx === -1) return true;
    usedArray[idx] = null; // mark used
    return false;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead icon="dice" title="Generation Method" right={
          <Seg value={method} onChange={(v) => setField("method", v)} options={["Standard Array", "Point buy", "Roll 4d6", "Manual"]} />
        } />
        <div style={{ padding: 14, fontSize: 12.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.6 }}>
          {method === "Standard Array" && "The dice are already cast. Distribute 15, 14, 13, 12, 10, 8 — one to each ability. Racial bonuses apply after."}
          {method === "Point buy"      && "Begin with 8 in every ability. You have 27 points. Cannot exceed 15 before racial bonuses."}
          {method === "Roll 4d6"       && "Roll 4d6, drop the lowest, six times. The dice are honest. Take what you're given."}
          {method === "Manual"         && "Enter what you like. The DM will know."}
        </div>
      </Card>

      {/* Point pool / array remaining */}
      {method === "Point buy" && (
        <Card style={{ borderColor: pointsLeft < 0 ? "var(--blood)" : pointsLeft === 0 ? "var(--gold-deep)" : "var(--border)" }}>
          <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Point Pool</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Spend up to 27 points. Cost: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, <b>14→7</b>, <b>15→9</b>.</div>
            </div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 28, color: pointsLeft < 0 ? "var(--blood-bright)" : pointsLeft === 0 ? "var(--success)" : "var(--gold-bright)", lineHeight: 1 }}>
              {pointsLeft}<span style={{ fontSize: 14, color: "var(--text-3)" }}>/{pointBudget}</span>
            </div>
            <div style={{ width: 160, height: 6, background: "var(--bg-deep)", borderRadius: 50, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: Math.min(100, (total / pointBudget) * 100) + "%", background: pointsLeft < 0 ? "var(--blood-bright)" : pointsLeft === 0 ? "var(--success)" : "var(--gold)", transition: "width 0.2s" }} />
            </div>
          </div>
        </Card>
      )}

      {method === "Standard Array" && (
        <Card>
          <div style={{ padding: 14 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Pool · drag/assign one value to each ability</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STANDARD_ARRAY.map((v,i) => {
                const used = !remainingArray.includes(v);
                return (
                  <div key={i} style={{
                    width: 44, height: 44, borderRadius: 6,
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--f-display)", fontSize: 18,
                    background: used ? "var(--bg-deep)" : "linear-gradient(180deg, rgba(214,168,79,0.15), rgba(214,168,79,0.03))",
                    border: "1px solid " + (used ? "var(--border-soft)" : "var(--gold-deep)"),
                    color: used ? "var(--text-4)" : "var(--gold-bright)",
                    opacity: used ? 0.4 : 1,
                    textDecoration: used ? "line-through" : "none",
                  }}>{v}</div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHead icon="dice" title="Assign Scores" right={
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>Racial bonuses apply after assignment</span>
        } />
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          {Object.entries(data.abilities).map(([k, v]) => {
            const racial = data.racialBonus[k] || 0;
            const final = v + racial;
            const m = mod(final);
            const max = method === "Point buy" ? 15 : 20;
            const min = method === "Point buy" ? 8 : 3;
            const canInc = method === "Point buy" ? (v < 15 && (POINT_COST[v+1] - POINT_COST[v]) <= pointsLeft) : v < max;
            const canDec = v > min;

            if (method === "Standard Array") {
              return (
                <div key={k} className="fw-abil-tile">
                  <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{k}</div>
                  <select className="fw-select" value={v} onChange={e => setAbility(k, +e.target.value)} style={{ width: "100%", textAlign: "center", padding: "6px 4px", marginBottom: 6 }}>
                    {[...new Set([v, ...remainingArray])].sort((a,b)=>b-a).map(o => <option key={o}>{o}</option>)}
                  </select>
                  {racial > 0 && <div style={{ fontSize: 9.5, color: "var(--arcane-bright)", fontFamily: "var(--f-mono)", marginBottom: 2 }}>+{racial} racial</div>}
                  <div className="fw-display" style={{ fontSize: 28, color: "var(--gold-bright)", lineHeight: 1 }}>{final}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: m >= 0 ? "var(--gold-bright)" : "var(--text-3)" }}>{sgn(m)}</div>
                </div>
              );
            }
            return (
              <div key={k} className="fw-abil-tile">
                <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{k}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => canDec && setAbility(k, v - 1)} disabled={!canDec}>{Icon("minus", { size: 10 })}</button>
                  <span style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--text)", width: 28, textAlign: "center" }}>{v}</span>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => canInc && setAbility(k, v + 1)} disabled={!canInc}>{Icon("plus", { size: 10 })}</button>
                </div>
                {racial > 0 && <div style={{ fontSize: 9.5, color: "var(--arcane-bright)", fontFamily: "var(--f-mono)" }}>+{racial} racial</div>}
                <div className="fw-display" style={{ fontSize: 24, color: "var(--gold-bright)", lineHeight: 1.1, marginTop: 4 }}>{final}</div>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: m >= 0 ? "var(--gold-bright)" : "var(--text-3)" }}>{sgn(m)}</div>
                {method === "Point buy" && <div style={{ fontSize: 9, color: "var(--text-4)", marginTop: 2, fontFamily: "var(--f-mono)" }}>cost {POINT_COST[v] ?? "?"}</div>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   STEP 4 — BACKGROUND
   ============================================================ */
const BG_PRESETS = {
  "Acolyte":   { traits: "I quote scripture for every occasion.", ideals: "Faith is the only honest covenant.", bonds: "I will rebuild my fallen temple.", flaws: "I am suspicious of strangers." },
  "Charlatan": { traits: "I love a good disguise.", ideals: "Nothing is more beautiful than a perfect con.", bonds: "I owe a debt to a forgotten patron.", flaws: "I can't resist a mark." },
  "Folk Hero": { traits: "I judge people by their actions, not words.", ideals: "Justice. The downtrodden must rise.", bonds: "My home village shaped me.", flaws: "I am stubborn to a fault." },
  "Noble":     { traits: "My eloquence is a weapon.", ideals: "Responsibility. I serve those beneath my station.", bonds: "My family name is everything.", flaws: "I cannot believe I am ever wrong." },
  "Outlander": { traits: "I count my own heartbeats when nervous.", ideals: "A bargain is the only honest covenant.", bonds: "My sister, Lira, must never know what I gave for her.", flaws: "I keep returning to the brass censer when the dreams come." },
  "Sage":      { traits: "I read until the candle dies, then I light another.", ideals: "Knowledge above all.", bonds: "My research is my life's work.", flaws: "I miss the obvious while chasing the obscure." },
  "Soldier":   { traits: "I follow orders, but I won't follow them off a cliff.", ideals: "Discipline keeps the line.", bonds: "I would die for my unit.", flaws: "I freeze at the memory of one bad day." },
  "Hermit":    { traits: "I speak slowly. The world rushes enough.", ideals: "Solitude is the truest teacher.", bonds: "What I learned must be told.", flaws: "I find people exhausting." },
};

function StepBackground({ data, setField }) {
  const applyPreset = (bg) => {
    const p = BG_PRESETS[bg];
    if (p) {
      setField("background", bg);
      setField("traits", p.traits);
      setField("ideals", p.ideals);
      setField("bonds", p.bonds);
      setField("flaws", p.flaws);
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead icon="user" title="Name & Alignment" />
        <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
          <Field label="Character Name">
            <input className="fw-input" value={data.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="Pronouns">
            <input className="fw-input" value={data.pronouns} onChange={e => setField("pronouns", e.target.value)} />
          </Field>
          <Field label="Alignment">
            <select className="fw-select" value={data.alignment} onChange={e => setField("alignment", e.target.value)}>
              {["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"].map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead icon="book" title="Background" right={
          <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 11 })} AI suggest</button>
        } />
        <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Object.keys(BG_PRESETS).map(bg => (
            <Tile key={bg} title={bg} active={data.background === bg} onClick={() => applyPreset(bg)}
              desc={BG_PRESETS[bg].traits} />
          ))}
        </div>
        <div style={{ padding: "0 16px 16px", fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
          Selecting a background auto-fills personality fields below. You can still edit.
        </div>
      </Card>

      <Card>
        <CardHead icon="scroll" title="Personal History" />
        <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Backstory" hint="A few sentences. Where they're from, what binds them.">
            <textarea className="fw-textarea" rows="4" value={data.backstory} onChange={e => setField("backstory", e.target.value)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Trait"><input className="fw-input" value={data.traits} onChange={e => setField("traits", e.target.value)} /></Field>
            <Field label="Ideal"><input className="fw-input" value={data.ideals} onChange={e => setField("ideals", e.target.value)} /></Field>
            <Field label="Bond"><input className="fw-input" value={data.bonds} onChange={e => setField("bonds", e.target.value)} /></Field>
            <Field label="Flaw"><input className="fw-input" value={data.flaws} onChange={e => setField("flaws", e.target.value)} /></Field>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   STEP 5 — EQUIPMENT
   ============================================================ */
function StepGear({ data, setField }) {
  const startingGear = [
    { n: "Light crossbow & 20 bolts", t: "1d8 piercing · 80/320 ft", icon: "sword" },
    { n: "Simple dagger",             t: "1d4 piercing · finesse",   icon: "sword" },
    { n: "Leather armor",             t: "AC 11 + Dex",              icon: "shield" },
    { n: "Component pouch",           t: "Spellcasting focus",       icon: "sparkles" },
    { n: "Scholar's pack",            t: "12 lbs · ink, paper",      icon: "bag" },
    { n: "Staff of the Cinder-Reeve", t: "Pact weapon · 1d8 fire",   icon: "flame", special: true },
    { n: "Trinket: brass censer-key", t: "No mechanical effect",     icon: "sparkles", lore: true },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHead icon="bag" title="Starting Equipment" right={
          <Seg value={data.gearChoice} onChange={(v) => setField("gearChoice", v)} options={[
            { value: "starting", label: "Take class kit" },
            { value: "gold",     label: `Take ${data.startingGold} GP instead` },
          ]} />
        } />
        <div className="fw-card-body">
          {data.gearChoice === "starting" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {startingGear.map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-2)", border: "1px solid " + (g.special ? "var(--gold-deep)" : g.lore ? "rgba(124,58,237,0.3)" : "var(--border-soft)"), borderRadius: 6 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: g.special ? "rgba(214,168,79,0.10)" : g.lore ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.025)", border: "1px solid " + (g.special ? "var(--gold-deep)" : g.lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)"), display: "grid", placeItems: "center", color: g.special ? "var(--gold-bright)" : g.lore ? "var(--arcane-bright)" : "var(--text-3)" }}>{Icon(g.icon, { size: 12 })}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)" }}>{g.n}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{g.t}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: "center", background: "var(--bg-deep)", border: "1px dashed var(--border)", borderRadius: 8 }}>
              <div className="fw-display" style={{ fontSize: 36, color: "var(--gold-bright)", lineHeight: 1 }}>{data.startingGold} GP</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 6 }}>You'll spend this in the marketplace before session one.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   STEP 6 — REVIEW
   ============================================================ */
function StepReview({ data }) {
  const mod = v => Math.floor((v - 10) / 2);
  const sgn = v => (v >= 0 ? "+" + v : v);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card elev className="fw-orn" style={{ overflow: "hidden" }}>
        <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
        <div style={{ padding: 24, textAlign: "center", background: "radial-gradient(ellipse at 50% 0%, rgba(214,168,79,0.18), transparent 70%)" }}>
          <div className="fw-eyebrow" style={{ color: "var(--gold)", marginBottom: 6 }}>The Compact</div>
          <h2 className="fw-display" style={{ fontSize: 32, color: "var(--text)", letterSpacing: "0.04em" }}>{data.name}</h2>
          <div className="fw-serif" style={{ fontSize: 15, color: "var(--text-2)", marginTop: 4, fontStyle: "italic" }}>
            {data.race}{data.subrace ? ` · ${data.subrace}` : ""} · {data.class} · {data.background}
          </div>
          <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2, fontStyle: "italic" }}>{data.alignment} · {data.pronouns}</div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <CardHead icon="dice" title="Abilities · with racial" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {Object.entries(data.abilities).map(([k, v]) => {
              const f = v + (data.racialBonus[k] || 0);
              return (
                <div key={k} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 8, textAlign: "center" }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{k}</div>
                  <div className="fw-display" style={{ fontSize: 18, color: "var(--gold-bright)", lineHeight: 1 }}>{f}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--text-3)" }}>{sgn(mod(f))}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead icon="shield" title="Derived" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <Pill2 label="Max HP" v="8" accent="gold" />
            <Pill2 label="AC" v="13" />
            <Pill2 label="Speed" v="30 ft" />
            <Pill2 label="Init" v={sgn(mod(data.abilities.DEX))} />
            <Pill2 label="Prof" v="+2" />
            <Pill2 label="Spell DC" v="13" accent="gold" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead icon="scroll" title="Personality" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, fontStyle: "italic", paddingLeft: 12, borderLeft: "1px solid var(--gold-deep)" }}>
            {data.backstory}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
            <RpLine2 label="Trait" text={data.traits} />
            <RpLine2 label="Ideal" text={data.ideals} />
            <RpLine2 label="Bond"  text={data.bonds} />
            <RpLine2 label="Flaw"  text={data.flaws} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon="check" title="Pre-flight" />
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["Race chosen",    !!data.race,  data.race + (data.subrace ? ` · ${data.subrace}` : "")],
            ["Class chosen",   !!data.class, data.class],
            ["Skills picked",  data.skills.length >= 2, data.skills.join(", ") || "—"],
            ["Abilities set",  Object.values(data.abilities).every(v => v > 0), `Method: ${data.method}`],
            ["Background set", !!data.background, data.background],
            ["Name bound",     !!data.name,  data.name],
          ].map(([k, ok, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: 50, background: ok ? "rgba(34,197,94,0.18)" : "rgba(214,168,79,0.10)", color: ok ? "var(--success)" : "var(--gold)", display: "grid", placeItems: "center" }}>
                {Icon(ok ? "check" : "alert", { size: 10 })}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--text-2)", flex: 1 }}>{k}</span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
function RpLine2({ label, text }) {
  return (
    <div style={{ padding: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
      <div className="fw-eyebrow" style={{ fontSize: 9, color: "var(--gold)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic", fontFamily: "var(--f-serif)", lineHeight: 1.5 }}>"{text}"</div>
    </div>
  );
}

Object.assign(window, { CharacterWizardScreen });

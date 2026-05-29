/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   COMBAT UI KIT — design components for spec 08 handoff
   Each section is a self-contained UI for one combat feature.
   Dev wires these to combat state.
   ============================================================ */

function CombatUIKitScreen({ go }) {
  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 18 }}>
        <div className="fw-page-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="fw-eyebrow">Spec 08 · Combat System</div>
            <h1>Combat UI Kit</h1>
            <div className="sub">Reusable UI for each combat feature. Dev wires to combat state + Event Queue.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("menu")}>{Icon("chevL", { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("game")}>{Icon("play", { size: 12 })} See in combat</button>
          </div>
        </div>

        {/* Index */}
        <Card style={{ marginBottom: 18 }}>
          <CardHead icon="book" title="Index · 13 components" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
            {[
              ["1", "Roll Initiative overlay", "Pre-combat — d20 + DEX for everyone"],
              ["2", "Death Save panel", "0 HP — 3✓ / 3✗ tracker"],
              ["3", "Concentration save prompt", "Caster takes damage → CON DC"],
              ["4", "Reaction prompt", "Opportunity Attack / Shield trigger"],
              ["5", "Situational bonuses panel", "Flanking / Higher Ground / Prone"],
              ["6", "Enemy AI mode selector", "Aggressive / Defensive / Manual…"],
              ["7", "Manual enemy action picker", "DM-side action palette"],
              ["8", "Resistance preview", "vs target — fire ½, necrotic ×0"],
              ["9", "Massive Damage warning", "damage ≥ max HP → Instant Death"],
              ["10","Temp HP indicator", "Purple chip absorbing damage"],
              ["11","Exhaustion ladder", "6 levels stacked penalty"],
              ["12","Condition timer", "Bless 6r · Hex until rest"],
              ["13","Critical hit flash", "Nat 20 effect + doubled dice"],
            ].map(([n, t, d]) => (
              <a key={n} href={`#kit-${n}`} style={{ display: "flex", gap: 8, padding: "6px 8px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5, color: "var(--text-2)", textDecoration: "none" }}>
                <span style={{ fontFamily: "var(--f-mono)", color: "var(--gold)", fontSize: 11, width: 18 }}>{n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--text)" }}>{t}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{d}</div>
                </div>
              </a>
            ))}
          </div>
        </Card>

        <KitItem id="1" title="Roll Initiative Overlay" trigger="On Start Combat — all participants roll d20 + DEX + bonuses">
          <RollInitiativeOverlay />
        </KitItem>

        <KitItem id="2" title="Death Save Panel" trigger="Character HP = 0 — replaces token actions">
          <DeathSavePanel />
        </KitItem>

        <KitItem id="3" title="Concentration Save Prompt" trigger="Concentrating caster takes damage — auto-pop">
          <ConcentrationPrompt />
        </KitItem>

        <KitItem id="4" title="Reaction Prompt" trigger="When an enemy moves out of reach / casts spell / etc.">
          <ReactionPrompt />
        </KitItem>

        <KitItem id="5" title="Situational Bonuses Panel" trigger="Inline in Attack Flow — auto-detect flanking/cover/prone">
          <SituationalPanel />
        </KitItem>

        <KitItem id="6" title="Enemy AI Mode Selector" trigger="DM combat tracker — per-enemy behavior preset">
          <EnemyAIPicker />
        </KitItem>

        <KitItem id="7" title="Manual Enemy Action Picker" trigger="DM clicks for enemy — full action palette">
          <ManualEnemyPicker />
        </KitItem>

        <KitItem id="8" title="Resistance / Immunity Preview" trigger="In Attack Flow — show target's damage modifiers vs your damage type">
          <ResistancePreview />
        </KitItem>

        <KitItem id="9" title="Massive Damage / Instant Death Warning" trigger="Incoming damage ≥ target's max HP">
          <MassiveDamageBanner />
        </KitItem>

        <KitItem id="10" title="Temp HP Indicator" trigger="On token + inspector — absorbs damage before HP">
          <TempHPDemo />
        </KitItem>

        <KitItem id="11" title="Exhaustion Ladder" trigger="On character sheet + token tooltip — 6 stacking levels">
          <ExhaustionLadder />
        </KitItem>

        <KitItem id="12" title="Condition Timer" trigger="On token + inspector — countdown rounds or trigger label">
          <ConditionTimers />
        </KitItem>

        <KitItem id="13" title="Critical Hit Flash" trigger="Natural 20 — visual effect + doubled damage dice display">
          <CritFlashDemo />
        </KitItem>

        <div style={{ marginTop: 24, padding: 16, background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.55 }}>
          <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 14 })}</span>
          {" "}Each component is wired with static demo data. Dev hooks state to combat store / Event Queue. Selectors, props, and event signatures listed in each card's "Wires to" footnote.
        </div>
      </div>
    </div>
  );
}

function KitItem({ id, title, trigger, children }) {
  return (
    <div id={`kit-${id}`} className="fw-kit-item">
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

/* ============================================================
   1. ROLL INITIATIVE OVERLAY
   ============================================================ */
function RollInitiativeOverlay() {
  const [participants, setParticipants] = React.useState([
    { id: "aedric", n: "Aedric (you)", dex: 2, bonus: 0, ally: true,  rolled: 17, you: true },
    { id: "kessra", n: "Kessra",       dex: 0, bonus: 0, ally: true,  rolled: null },
    { id: "mirenna",n: "Mirenna",      dex: 3, bonus: 0, ally: true,  rolled: 11 },
    { id: "halric", n: "Halric",       dex: 0, bonus: 5, ally: true,  rolled: null, note: "Alert feat: +5" },
    { id: "reeve",  n: "Cinder-Reeve", dex: 1, bonus: 0, foe: true,   rolled: 18, boss: true },
    { id: "spearA", n: "Brass Spear A",dex: 0, bonus: 0, foe: true,   rolled: 14 },
    { id: "spearB", n: "Brass Spear B",dex: 0, bonus: 0, foe: true,   rolled: 9 },
  ]);
  const rollOne = (id) => {
    setParticipants(ps => ps.map(p => p.id === id ? { ...p, rolled: 1 + Math.floor(Math.random() * 20) } : p));
  };
  const rollAll = () => {
    setParticipants(ps => ps.map(p => p.rolled === null ? { ...p, rolled: 1 + Math.floor(Math.random() * 20) } : p));
  };
  const sorted = [...participants].sort((a,b) => {
    const ta = (a.rolled ?? -1) + a.dex + a.bonus;
    const tb = (b.rolled ?? -1) + b.dex + b.bonus;
    if (ta !== tb) return tb - ta;
    if (a.dex !== b.dex) return b.dex - a.dex;
    if (a.ally !== b.ally) return a.ally ? -1 : 1; // PC tie-break
    return 0;
  });
  const ready = participants.every(p => p.rolled !== null);
  return (
    <div className="fw-roll-init">
      <div className="fw-roll-init-head">
        <span style={{ color: "var(--blood-bright)" }}>{Icon("zap", { size: 16 })}</span>
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: "var(--blood-bright)" }}>Combat begins</div>
          <div className="fw-display" style={{ fontSize: 18, color: "var(--text)" }}>Roll Initiative</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>1d20 + DEX modifier + initiative bonuses. Tie → higher DEX, then PC wins.</div>
        </div>
        <button className="fw-btn fw-btn-gold" onClick={rollAll}>{Icon("dice", { size: 12 })} Roll all unrolled</button>
      </div>
      <div className="fw-roll-init-list">
        {sorted.map((p, i) => {
          const total = p.rolled !== null ? p.rolled + p.dex + p.bonus : null;
          return (
            <div key={p.id} className={"fw-roll-init-row" + (p.foe ? " foe" : " ally") + (p.you ? " you" : "")}>
              <span className="fw-mono fw-roll-init-place">{p.rolled !== null ? `#${i + 1}` : "—"}</span>
              <span style={{ width: 8, height: 8, borderRadius: 50, background: p.foe ? "var(--blood-bright)" : "var(--success)" }} />
              <span style={{ flex: 1, fontSize: 13 }}>
                {p.n}
                {p.boss && <span className="fw-pill blood" style={{ marginLeft: 6, fontSize: 8.5, padding: "0 5px" }}>BOSS</span>}
                {p.note && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--gold)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{p.note}</span>}
              </span>
              <span className="fw-mono" style={{ fontSize: 10.5, color: "var(--text-3)" }}>+{p.dex} DEX{p.bonus ? ` · +${p.bonus} bonus` : ""}</span>
              <div className="fw-roll-init-die">
                {p.rolled !== null ? (
                  <span className={"fw-display " + (p.rolled === 20 ? "crit" : "")} style={{ fontSize: 18, color: p.rolled === 20 ? "var(--gold-bright)" : "var(--text)" }}>{p.rolled}</span>
                ) : (
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => rollOne(p.id)}>{Icon("dice", { size: 11 })} Roll</button>
                )}
              </div>
              <span className="fw-roll-init-total">
                {total !== null ? <span className="fw-display" style={{ fontSize: 22, color: "var(--gold-bright)" }}>{total}</span> : <span style={{ color: "var(--text-4)" }}>—</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="fw-roll-init-foot">
        <button className="fw-btn fw-btn-ghost">{Icon("kebab", { size: 11 })} Manual reorder</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{participants.filter(p => p.rolled !== null).length} / {participants.length} rolled</span>
        <button className="fw-btn fw-btn-blood fw-btn-lg" disabled={!ready}>
          {Icon("sword", { size: 13 })} Start Combat · Round 1
        </button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">combat.startEncounter(participants)</span> → broadcast `combat:started` event</div>
    </div>
  );
}

/* ============================================================
   2. DEATH SAVE PANEL
   ============================================================ */
function DeathSavePanel() {
  const [success, setSuccess] = React.useState(2);
  const [fail, setFail] = React.useState(0);
  const [lastRoll, setLastRoll] = React.useState(14);

  const roll = () => {
    const r = 1 + Math.floor(Math.random() * 20);
    setLastRoll(r);
    if (r === 20) { setSuccess(0); setFail(0); }
    else if (r === 1) setFail(f => Math.min(3, f + 2));
    else if (r >= 10) setSuccess(s => Math.min(3, s + 1));
    else setFail(f => Math.min(3, f + 1));
  };

  return (
    <div className="fw-death-save">
      <div className="fw-death-save-head">
        <div style={{ width: 60, height: 60, borderRadius: 50, background: "rgba(153,27,27,0.18)", border: "2px solid var(--blood-bright)", display: "grid", placeItems: "center", color: "var(--blood-bright)", boxShadow: "0 0 24px -4px rgba(199,45,45,0.6)" }}>
          {Icon("skull", { size: 28 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: "var(--blood-bright)", marginBottom: 2 }}>Dying · 0 HP</div>
          <div className="fw-display" style={{ fontSize: 22, color: "var(--text)" }}>Halric Dale</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>At the start of his turn, he rolls death saves until stable, dead, or healed.</div>
        </div>
      </div>

      <div className="fw-death-save-tracks">
        <div>
          <div className="fw-eyebrow" style={{ color: "var(--success)", marginBottom: 6 }}>Successes · stabilize at 3</div>
          <div className="fw-death-pips">
            {[0,1,2].map(i => (
              <span key={i} onClick={() => setSuccess(success === i + 1 ? i : i + 1)} className={"fw-death-pip success" + (i < success ? " on" : "")}>
                {i < success && Icon("check", { size: 11 })}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="fw-eyebrow" style={{ color: "var(--blood-bright)", marginBottom: 6 }}>Failures · death at 3</div>
          <div className="fw-death-pips">
            {[0,1,2].map(i => (
              <span key={i} onClick={() => setFail(fail === i + 1 ? i : i + 1)} className={"fw-death-pip fail" + (i < fail ? " on" : "")}>
                {i < fail && Icon("x", { size: 11 })}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="fw-death-save-result">
        {lastRoll !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 6, background: lastRoll === 20 ? "rgba(214,168,79,0.18)" : lastRoll === 1 ? "rgba(153,27,27,0.18)" : lastRoll >= 10 ? "rgba(34,197,94,0.10)" : "rgba(153,27,27,0.10)", border: "1px solid " + (lastRoll === 20 ? "var(--gold)" : lastRoll === 1 ? "var(--blood-bright)" : lastRoll >= 10 ? "var(--success)" : "var(--blood)"), display: "grid", placeItems: "center" }}>
              <span className="fw-display" style={{ fontSize: 22, color: lastRoll === 20 ? "var(--gold-bright)" : lastRoll === 1 ? "var(--blood-bright)" : "var(--text)" }}>{lastRoll}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Last roll · d20</div>
              <div style={{ fontSize: 13, color: lastRoll === 20 ? "var(--gold-bright)" : lastRoll === 1 ? "var(--blood-bright)" : lastRoll >= 10 ? "#86EFAC" : "#FCA5A5", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
                {lastRoll === 20 ? "Natural 20 — revive at 1 HP!" : lastRoll === 1 ? "Natural 1 — counts as two failures." : lastRoll >= 10 ? "Success." : "Failure."}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fw-death-save-actions">
        <button className="fw-btn fw-btn-blood fw-btn-lg" onClick={roll}>
          {Icon("dice", { size: 13 })} Roll Death Save
        </button>
        <button className="fw-btn fw-btn-ghost">{Icon("heart", { size: 12 })} Healer's Kit (DC 10)</button>
        <button className="fw-btn fw-btn-ghost">{Icon("flame", { size: 12 })} Healing potion / spell</button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.deathSaves &#123; success, fail &#125;</span> · auto-trigger on HP=0 · stabilize at 3✓ · death at 3✗ · revive on nat 20</div>
    </div>
  );
}

/* ============================================================
   3. CONCENTRATION SAVE PROMPT
   ============================================================ */
function ConcentrationPrompt() {
  return (
    <div className="fw-prompt-modal">
      <div className="fw-prompt-icon" style={{ background: "rgba(124,58,237,0.18)", borderColor: "var(--arcane)", color: "var(--arcane-bright)" }}>
        {Icon("sparkles", { size: 24 })}
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-eyebrow" style={{ color: "var(--arcane-bright)" }}>Concentration check</div>
        <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", marginTop: 2 }}>Hex · in danger</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5, marginTop: 6 }}>
          Aedric took <b style={{ color: "var(--blood-bright)", fontStyle: "normal" }}>14 fire damage</b> from Brass Spear A.<br />
          Roll a Constitution save — <b style={{ color: "var(--gold-bright)", fontStyle: "normal", fontFamily: "var(--f-display)" }}>DC 10</b> (half damage rounded down, minimum 10).
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="fw-btn fw-btn-arcane fw-btn-lg">
            {Icon("dice", { size: 12 })} Roll CON save · +1
          </button>
          <button className="fw-btn fw-btn-ghost">Drop concentration</button>
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">on(damage) → if (target.concentrating) prompt(saveDC)</span> · fail → break concentration</div>
    </div>
  );
}

/* ============================================================
   4. REACTION PROMPT
   ============================================================ */
function ReactionPrompt() {
  return (
    <div className="fw-prompt-modal" style={{ background: "linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))", borderColor: "var(--gold-deep)" }}>
      <div className="fw-prompt-icon" style={{ background: "rgba(214,168,79,0.18)", borderColor: "var(--gold)", color: "var(--gold-bright)" }}>
        {Icon("zap", { size: 24 })}
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-eyebrow" style={{ color: "var(--gold-bright)" }}>Reaction available · 1/round</div>
        <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", marginTop: 2 }}>Opportunity Attack?</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5, marginTop: 6 }}>
          <b style={{ color: "var(--blood-bright)", fontStyle: "normal" }}>Brass Spear A</b> is leaving Aedric's melee reach. Take a free melee strike?
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="fw-btn fw-btn-gold fw-btn-lg">{Icon("sword", { size: 12 })} Strike with Staff · 1d8+4</button>
          <button className="fw-btn fw-btn-ghost">Let them go</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>5s · auto-passes if no action</div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">on(token.move) → if (leavingMeleeRange &amp;&amp; !disengage) prompt(observer)</span></div>
    </div>
  );
}

/* ============================================================
   5. SITUATIONAL BONUSES PANEL
   ============================================================ */
function SituationalPanel() {
  const [flanking, setFlanking] = React.useState(true);
  const [higher, setHigher] = React.useState(false);
  const [prone, setProne] = React.useState(true);
  const [invisible, setInvisible] = React.useState(false);
  const [long, setLong] = React.useState(false);

  const items = [
    { k: "flanking",  on: flanking,  set: setFlanking,  label: "Flanking",         effect: "Advantage · melee", icon: "users",    auto: true,  detail: "Kessra is on the opposite side of Brass Spear A." },
    { k: "higher",    on: higher,    set: setHigher,    label: "Higher Ground",    effect: "Advantage · ranged",icon: "arrowR",   auto: false, detail: "Stand on the altar dais." },
    { k: "prone",     on: prone,     set: setProne,     label: "Target Prone",     effect: "Advantage · melee (Disadv if ranged)", icon: "minus", auto: true, detail: "Brass Spear A is on the floor." },
    { k: "invisible", on: invisible, set: setInvisible, label: "You are Invisible",effect: "Advantage on attack", icon: "eyeOff", auto: false, detail: "—" },
    { k: "long",      on: long,      set: setLong,      label: "Long Range",       effect: "Disadvantage · ranged", icon: "compass", auto: true, detail: "Beyond 80 ft normal range." },
  ];

  // Compute net result
  let adv = 0, dis = 0;
  items.forEach(it => {
    if (!it.on) return;
    if (it.effect.startsWith("Advantage")) adv++;
    if (it.effect.startsWith("Disadvantage")) dis++;
  });
  const netResult = adv && !dis ? "Advantage" : dis && !adv ? "Disadvantage" : adv && dis ? "Normal · cancel" : "Normal";
  const netColor = netResult === "Advantage" ? "var(--success)" : netResult === "Disadvantage" ? "var(--blood-bright)" : "var(--text-2)";

  return (
    <div className="fw-sit-panel">
      <div className="fw-sit-head">
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Situational</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Auto-detected from positions. Override below.</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Net</div>
          <div className="fw-display" style={{ fontSize: 18, color: netColor }}>{netResult}</div>
        </div>
      </div>
      <div className="fw-sit-list">
        {items.map(it => (
          <div key={it.k} className={"fw-sit-row" + (it.on ? " on" : "")}>
            <span style={{ color: it.on ? "var(--gold-bright)" : "var(--text-4)" }}>{Icon(it.icon, { size: 14 })}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, color: "var(--text)" }}>{it.label}</span>
                {it.auto && <span className="fw-pill" style={{ fontSize: 8.5, padding: "0 5px", background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.35)", color: "var(--arcane-bright)" }}>AUTO</span>}
              </div>
              <div style={{ fontSize: 10.5, color: it.on ? (it.effect.startsWith("Advantage") ? "#86EFAC" : "#FCA5A5") : "var(--text-3)", fontFamily: "var(--f-mono)" }}>{it.effect}</div>
              <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 1 }}>{it.detail}</div>
            </div>
            <Toggle on={it.on} onChange={it.set} />
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">getSituational(attacker, target) → AdvantageState</span> · auto-detect from token positions, conditions, weapon properties</div>
    </div>
  );
}

/* ============================================================
   6. ENEMY AI MODE SELECTOR
   ============================================================ */
function EnemyAIPicker() {
  const [enemies, setEnemies] = React.useState([
    { id: "reeve",  n: "Cinder-Reeve",  mode: "Manual",     boss: true },
    { id: "spearA", n: "Brass Spear A", mode: "Aggressive" },
    { id: "spearB", n: "Brass Spear B", mode: "Aggressive" },
    { id: "shadow", n: "Bound Shadow",  mode: "Focused" },
  ]);
  const setMode = (id, mode) => setEnemies(es => es.map(e => e.id === id ? { ...e, mode } : e));
  const modes = [
    { v: "Aggressive", desc: "Attack lowest-HP target", color: "var(--blood-bright)" },
    { v: "Defensive",  desc: "Nearest target. Retreat < 25% HP", color: "var(--gold)" },
    { v: "Support",    desc: "Heal/buff allies first", color: "var(--success)" },
    { v: "Random",     desc: "Random target", color: "var(--text-3)" },
    { v: "Focused",    desc: "Lock on one target until dead", color: "var(--arcane-bright)" },
    { v: "Manual",     desc: "DM chooses every action", color: "var(--text)" },
  ];
  return (
    <div className="fw-ai-picker">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {enemies.map(e => (
          <div key={e.id} className="fw-ai-row">
            <span className="fw-avatar sm" style={{ background: "linear-gradient(135deg, rgba(153,27,27,0.2), #15101f)", borderColor: "var(--blood)", fontSize: 9 }}>{e.n.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text)" }}>{e.n}{e.boss && <span className="fw-pill gold" style={{ marginLeft: 6, fontSize: 8.5, padding: "0 5px" }}>BOSS</span>}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{modes.find(m => m.v === e.mode)?.desc}</div>
            </div>
            <div className="fw-ai-modes">
              {modes.map(m => (
                <button key={m.v} onClick={() => setMode(e.id, m.v)}
                  className={"fw-ai-chip" + (e.mode === m.v ? " active" : "")}
                  style={{ borderColor: e.mode === m.v ? m.color : undefined, color: e.mode === m.v ? m.color : undefined }}>
                  {m.v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
        Hybrid default: Boss = Manual (dramatic), Minions = AI (reduce DM workload).
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">enemy.aiMode = mode</span> · on enemy turn, dispatch to <span className="fw-mono">aiBehavior[mode]</span></div>
    </div>
  );
}

/* ============================================================
   7. MANUAL ENEMY ACTION PICKER
   ============================================================ */
function ManualEnemyPicker() {
  return (
    <div className="fw-manual-picker">
      <div className="fw-manual-head">
        <span className="fw-avatar lg" style={{ background: "linear-gradient(135deg, rgba(153,27,27,0.25), #15101f)", borderColor: "var(--blood)" }}>CR</span>
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: "var(--blood-bright)" }}>DM control · Round 3</div>
          <div className="fw-display" style={{ fontSize: 18, color: "var(--text)" }}>Cinder-Reeve · acting</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>
            <span>HP 120/120</span><span>·</span><span>AC 17</span><span>·</span><span>Init 19</span>
          </div>
        </div>
        <div className="fw-action-budget" style={{ display: "flex", gap: 4 }}>
          <span className="fw-budget-mini">A ✓</span>
          <span className="fw-budget-mini">BA ✓</span>
          <span className="fw-budget-mini">R ✓</span>
          <span className="fw-budget-mini">30/30</span>
        </div>
      </div>

      <div className="fw-manual-grid">
        <ManualBtn icon="sword"   label="Attack"        sub="Melee / ranged target" cost="1A" />
        <ManualBtn icon="flame"   label="Cast Spell"    sub="DC 17 · 2 known"       cost="1A" />
        <ManualBtn icon="arrowR"  label="Move"          sub="up to 30 ft"           cost="Move" />
        <ManualBtn icon="zap"     label="Dash"          sub="double movement"        cost="1A" />
        <ManualBtn icon="shield"  label="Dodge"         sub="atks vs you Disadv"     cost="1A" />
        <ManualBtn icon="sparkles"label="Special Ability" sub="Brass Words · cone" cost="1A" />
        <ManualBtn icon="crown"   label="Legendary"     sub="3 actions / round"      cost="legendary" gold />
        <ManualBtn icon="x"       label="Hold action"   sub="ready trigger"          cost="1A" />
      </div>

      <div className="fw-manual-target">
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Target picker</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Aedric", "Kessra (Front)", "Mirenna", "Halric (down)"].map((n,i) => (
            <button key={n} className={"fw-btn fw-btn-ghost fw-btn-sm" + (i === 1 ? " active" : "")} style={{ borderColor: i === 1 ? "var(--blood)" : undefined, color: i === 1 ? "var(--blood-bright)" : undefined, background: i === 1 ? "rgba(153,27,27,0.10)" : undefined }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
        <button className="fw-btn fw-btn-blood fw-btn-lg" style={{ flex: 1, justifyContent: "center" }}>
          {Icon("check", { size: 12 })} Commit action
        </button>
        <button className="fw-btn fw-btn-ghost">End turn</button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">combat.enemyAction(&#123; type, target, ability &#125;)</span> · push to Event Queue</div>
    </div>
  );
}
function ManualBtn({ icon, label, sub, cost, gold }) {
  return (
    <button className="fw-manual-btn" style={{ borderColor: gold ? "var(--gold-deep)" : undefined, background: gold ? "rgba(214,168,79,0.05)" : undefined }}>
      <span style={{ color: gold ? "var(--gold-bright)" : "var(--blood-bright)" }}>{Icon(icon, { size: 18 })}</span>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 12.5, color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{sub}</div>
      </div>
      <span className="fw-pill" style={{ fontSize: 9, padding: "1px 5px" }}>{cost}</span>
    </button>
  );
}

/* ============================================================
   8. RESISTANCE / IMMUNITY PREVIEW
   ============================================================ */
function ResistancePreview() {
  return (
    <div className="fw-res-preview">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span className="fw-avatar sm" style={{ background: "linear-gradient(135deg, rgba(153,27,27,0.2), #15101f)", borderColor: "var(--blood)", fontSize: 9 }}>CR</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--text)" }}>Cinder-Reeve</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Target preview · vs your damage types</div>
        </div>
      </div>
      <div className="fw-res-grid">
        <ResRow label="Fire"      kind="resist" detail="½ damage" />
        <ResRow label="Necrotic"  kind="resist" detail="½ damage" />
        <ResRow label="Poison"    kind="immune" detail="No effect" />
        <ResRow label="Bludgeoning · non-magical" kind="resist" detail="½ damage" />
        <ResRow label="Force"     kind="vuln"   detail="2× damage" />
        <ResRow label="Radiant"   kind="normal" detail="full damage" />
      </div>
      <div style={{ marginTop: 12, padding: 10, background: "var(--bg-deep)", border: "1px solid rgba(214,168,79,0.3)", borderRadius: 6, fontSize: 11.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5 }}>
        <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 11 })}</span>{" "}
        Eldritch Blast (Force) would hit for <b style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>doubled damage</b>. Recommend.
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">target.resistances + immunities + vulnerabilities</span> · raceRuntime + activeConditions</div>
    </div>
  );
}
function ResRow({ label, kind, detail }) {
  const map = {
    resist:  { c: "var(--success)",      icon: "shield", l: "Resists" },
    immune:  { c: "var(--gold-bright)",  icon: "x",      l: "Immune" },
    vuln:    { c: "var(--blood-bright)", icon: "alert",  l: "Vulnerable" },
    normal:  { c: "var(--text-3)",       icon: "minus",  l: "Normal" },
  }[kind];
  return (
    <div className="fw-res-row" style={{ borderColor: kind === "normal" ? "var(--border-soft)" : map.c + "55" }}>
      <span style={{ color: map.c }}>{Icon(map.icon, { size: 11 })}</span>
      <span style={{ flex: 1, fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: map.c, textTransform: "uppercase", letterSpacing: "0.1em" }}>{map.l}</span>
      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--text-3)" }}>{detail}</span>
    </div>
  );
}

/* ============================================================
   9. MASSIVE DAMAGE WARNING
   ============================================================ */
function MassiveDamageBanner() {
  return (
    <div className="fw-massive-banner">
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(153,27,27,0.18), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ width: 52, height: 52, borderRadius: 50, background: "rgba(153,27,27,0.18)", border: "2px solid var(--blood-bright)", display: "grid", placeItems: "center", color: "var(--blood-bright)", flexShrink: 0, animation: "fw-glow-pulse 1.6s infinite" }}>
        {Icon("skull", { size: 26 })}
      </div>
      <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
        <div className="fw-eyebrow" style={{ color: "var(--blood-bright)" }}>Instant Death incoming</div>
        <div className="fw-display" style={{ fontSize: 22, color: "var(--text)", marginTop: 2 }}>
          <b style={{ color: "var(--blood-bright)", fontFamily: "var(--f-display)" }}>78</b> damage → Halric (max HP <b style={{ fontFamily: "var(--f-display)" }}>48</b>)
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5, marginTop: 4 }}>
          Damage in a single hit exceeds maximum HP. Halric dies — no death save.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="fw-btn fw-btn-blood">{Icon("check", { size: 12 })} Apply</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("x", { size: 11 })} Reduce</button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">if (damage &gt;= target.maxHP) instantDeath()</span> · skip death-save flow</div>
    </div>
  );
}

/* ============================================================
   10. TEMP HP INDICATOR
   ============================================================ */
function TempHPDemo() {
  return (
    <div className="fw-temphp-demo">
      {/* Token tooltip variant */}
      <div className="fw-temphp-block">
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>On token (battle map)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="28" fill="#7C3AED" fillOpacity="0.85" stroke="var(--gold)" strokeWidth="1.2" />
              <text x="40" y="44" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="Cinzel">AE</text>
              {/* HP ring */}
              <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" />
              <circle cx="40" cy="40" r="30" fill="none" stroke="var(--success)" strokeWidth="3" strokeDasharray="113 188" transform="rotate(-90 40 40)" />
              {/* Temp HP ring */}
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(124,58,237,0.7)" strokeWidth="2" strokeDasharray="6 4" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--text-3)" }}>
              <span style={{ color: "var(--success)" }}>38</span><span style={{ color: "var(--text-4)" }}>/52 HP</span>
            </div>
            <div className="fw-temphp-chip">
              {Icon("shield", { size: 10 })} <span>+10 temp</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 6 }}>From Armor of Agathys. Absorbs damage before HP.</div>
          </div>
        </div>
      </div>

      {/* Inspector variant */}
      <div className="fw-temphp-block">
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>In Token Inspector / Sheet</div>
        <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span className="fw-display" style={{ fontSize: 24, color: "var(--success)" }}>38</span>
            <span style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--f-display)" }}>/ 52</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--arcane-bright)" }}>+10 temp</span>
          </div>
          <div style={{ position: "relative", height: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 50, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: "73%", background: "var(--success)", borderRadius: 50 }} />
            <div style={{ position: "absolute", inset: 0, left: "73%", width: "19%", background: "linear-gradient(90deg, var(--arcane-bright), var(--arcane-deep))", borderRadius: 50 }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)", marginTop: 6, textAlign: "right" }}>Temp HP overlays in arcane purple — absorbed first</div>
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.tempHP</span> · damage subtracts tempHP first, then HP · cleared on rest</div>
    </div>
  );
}

/* ============================================================
   11. EXHAUSTION LADDER
   ============================================================ */
function ExhaustionLadder() {
  const [level, setLevel] = React.useState(2);
  const tiers = [
    { l: 1, e: "Disadvantage on ability checks" },
    { l: 2, e: "Speed halved" },
    { l: 3, e: "Disadvantage on attacks and saves" },
    { l: 4, e: "HP maximum halved" },
    { l: 5, e: "Speed reduced to 0" },
    { l: 6, e: "Death" },
  ];
  return (
    <div className="fw-exhaust">
      <div className="fw-exhaust-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-eyebrow">Exhaustion · level {level} of 6</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>One level removed per long rest. Penalties stack downward.</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setLevel(l => Math.max(0, l - 1))}>{Icon("minus", { size: 10 })} Rest</button>
          <button className="fw-btn fw-btn-blood fw-btn-sm" onClick={() => setLevel(l => Math.min(6, l + 1))}>{Icon("plus", { size: 10 })} Take level</button>
        </div>
      </div>
      <div className="fw-exhaust-ladder">
        {tiers.map(t => {
          const on = level >= t.l;
          const death = t.l === 6;
          return (
            <div key={t.l} className={"fw-exhaust-tier" + (on ? " on" : "") + (death ? " death" : "")}>
              <span className="fw-exhaust-num">{t.l}</span>
              <span className="fw-exhaust-bar" />
              <span style={{ flex: 1, fontSize: 12, color: on ? (death ? "var(--blood-bright)" : "var(--text)") : "var(--text-4)", fontFamily: "var(--f-serif)", fontStyle: on ? "normal" : "italic" }}>{t.e}</span>
              {on && <span style={{ color: death ? "var(--blood-bright)" : "var(--blood)", fontSize: 11, fontFamily: "var(--f-mono)" }}>active</span>}
            </div>
          );
        })}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.exhaustionLevel: 0..6</span> · long rest decrements · apply cumulative penalties</div>
    </div>
  );
}

/* ============================================================
   12. CONDITION TIMERS
   ============================================================ */
function ConditionTimers() {
  const conds = [
    { n: "Bless",           rem: 6,   total: 10, kind: "buff",  trig: "10 rounds · concentration",  src: "Mirenna" },
    { n: "Hex (Cursed)",    rem: 56,  total: 60, kind: "buff",  trig: "1 hour · concentration",     src: "You" },
    { n: "Prone",           rem: null,           kind: "bad",   trig: "Stand up · half movement",   src: "Self" },
    { n: "Concentration · Hex", rem: null,       kind: "neutral", trig: "Until dropped or CON fail", src: "Self" },
    { n: "Stunned",         rem: 1,   total: 1,  kind: "bad",   trig: "End of caster's next turn",  src: "Brass Words" },
    { n: "Exhaustion 2",    rem: null,           kind: "bad",   trig: "Decrements on long rest",    src: "Forced march" },
  ];
  return (
    <div className="fw-cond-timers">
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {conds.map((c, i) => (
          <div key={i} className={"fw-cond-row " + c.kind}>
            <span style={{ color: c.kind === "buff" ? "var(--success)" : c.kind === "bad" ? "var(--blood-bright)" : "var(--gold)" }}>
              {Icon(c.kind === "buff" ? "sparkles" : c.kind === "bad" ? "alert" : "shield", { size: 12 })}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text)" }}>{c.n}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
                {c.trig} · from {c.src}
              </div>
            </div>
            {c.rem !== null ? (
              <div className="fw-cond-timer">
                <div className="fw-mono" style={{ fontSize: 11, color: c.rem < 3 ? "var(--blood-bright)" : "var(--gold-bright)" }}>
                  {c.rem >= 60 ? `${Math.floor(c.rem/10)}m` : `${c.rem}r`}
                </div>
                <div className="fw-cond-progress">
                  <div style={{ width: ((c.rem / c.total) * 100) + "%" }} />
                </div>
              </div>
            ) : (
              <span className="fw-pill dim" style={{ fontSize: 9 }}>manual</span>
            )}
            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("x", { size: 10 })}</button>
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">condition.duration</span> · auto-decrement at start of caster's turn · expire trigger from `triggerType`</div>
    </div>
  );
}

/* ============================================================
   13. CRITICAL HIT FLASH
   ============================================================ */
function CritFlashDemo() {
  const [show, setShow] = React.useState(false);
  return (
    <div className="fw-crit-demo">
      <div style={{ flex: 1 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Natural 20 visualization</div>
        <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.55 }}>
          Plays once when the d20 lands on 20. Damage dice double. Display includes the doubled roll, breakdown, and crit-flavor text from class/weapon.
        </p>
        <button className="fw-btn fw-btn-gold" style={{ marginTop: 10 }} onClick={() => setShow(true)}>
          {Icon("dice", { size: 12 })} Trigger crit
        </button>
      </div>
      <div className="fw-crit-stage">
        {show && (
          <div className="fw-crit-flash" onAnimationEnd={() => setShow(false)}>
            <div className="fw-crit-burst" />
            <div className="fw-crit-ring" />
            <div className="fw-crit-text">
              <div className="fw-display fw-crit-word">CRITICAL</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "center", marginTop: 4 }}>
                <span className="fw-display" style={{ fontSize: 14, color: "var(--text-3)" }}>1d8 → 2d8</span>
                <span className="fw-display" style={{ fontSize: 32, color: "var(--gold-bright)" }}>14</span>
                <span style={{ fontSize: 14, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>+4 fire</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--gold-bright)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 4 }}>
                "The brass cracks. The chapel holds its breath."
              </div>
            </div>
          </div>
        )}
        {!show && (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-4)", fontSize: 12, fontFamily: "var(--f-serif)", fontStyle: "italic", textAlign: "center", padding: 14 }}>
            Click "Trigger crit" to preview the flash.
          </div>
        )}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">on(attack.crit) → playCritFlash(weapon, dmg)</span> · doubles damage dice (not modifier)</div>
    </div>
  );
}

Object.assign(window, { CombatUIKitScreen });

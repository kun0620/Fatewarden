/* global React, WIcon, PortraitArt, WR_PARTY, WR_FOES, WR_INIT_ORDER */
/* ============================================================
   WARDEN'S RUN — COMBAT ARENA
   Darkest Dungeon style: party (4-3-2-1) LEFT vs foes (1-2-3-4) RIGHT
   Portrait cards · HP bars · conditions · initiative · action bar.
   ============================================================ */

function WRCombat() {
  const [activeId, setActiveId] = React.useState("aedric"); // your turn
  const [selectedSkill, setSelectedSkill] = React.useState(null);
  const [targets, setTargets] = React.useState([]);
  const [hoverTarget, setHoverTarget] = React.useState(null);
  const [floaters, setFloaters] = React.useState([]);
  const [log, setLog] = React.useState([
    { id: 1, t: "Kessra cleaves the Pact-Imp for 11. The brass screams." },
    { id: 2, t: "Pact-Imp strikes Kessra for 7 — blocked." },
    { id: 3, t: "Cinder-Wraith inflicts Vulnerable on the party.", crit: false },
  ]);

  const active = WR_PARTY.find(p => p.id === activeId);
  const isYourTurn = active && active.you;

  // available targets for selected skill (party-side positions)
  const validTargets = (skill) => {
    if (!skill) return [];
    if (skill.kind === "heal" || skill.self) {
      return WR_PARTY.filter(p => !p.down && (skill.self ? p.id === active.id : true)).map(p => ({ id: p.id, side: "ally" }));
    }
    if (skill.kind === "buff") {
      return WR_PARTY.filter(p => !p.down).map(p => ({ id: p.id, side: "ally" }));
    }
    // attack/util → foes whose pos is in skill.targets
    return WR_FOES.filter(f => skill.targets.includes(f.pos)).map(f => ({ id: f.id, side: "foe" }));
  };

  const targetable = selectedSkill ? validTargets(selectedSkill) : [];

  const commitAction = (targetId, targetSide) => {
    // Throw a floater on target
    const id = Date.now();
    const isHeal = selectedSkill.kind === "heal";
    const isCrit = Math.random() < 0.2;
    const dmgRange = selectedSkill.dmg ? selectedSkill.dmg.split("-").map(Number) : [10, 14];
    const v = isHeal ? "+12 HP" :
      "−" + (dmgRange[0] + Math.floor(Math.random() * (dmgRange[1] - dmgRange[0] + 1))) + (isCrit ? "!" : "");
    setFloaters(fs => [...fs, { id, target: targetId, side: targetSide, v, type: isHeal ? "heal" : "damage", crit: isCrit && !isHeal }]);
    setTimeout(() => setFloaters(fs => fs.filter(f => f.id !== id)), 1500);
    // log
    setLog(l => [{ id: Date.now(), t: `${active.name} uses ${selectedSkill.name}: ${v}.`, crit: isCrit && !isHeal }, ...l].slice(0, 6));
    setSelectedSkill(null);
    setTargets([]);
  };

  return (
    <div className="wr-combat-stage wr-screen-in">
      {/* INITIATIVE STRIP */}
      <div className="wr-init-strip">
        <span className="wr-round-pill">
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--wr-blood-bright)" }}/>
          Round <span className="num">3</span>
        </span>
        <div className="wr-init-label">
          {WIcon("clock", { size: 11 })} Initiative
        </div>
        <div className="wr-init-track">
          {WR_INIT_ORDER.map(t => (
            <div key={t.id} className={"wr-init-card " + (t.side === "foe" ? "foe" : "ally") + (t.now ? " now" : "") + (t.done ? " done" : "")}>
              <div className="wr-init-card-mini">
                <PortraitArt kind={t.portrait} color={t.color} />
              </div>
              <div className="wr-init-card-init">{t.init}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ARENA */}
      <div className="wr-arena">
        <div className="wr-arena-bg" />

        {/* PARTY (LEFT) — positions 4-3-2-1, back to front */}
        <div className="wr-combat-row party">
          {[...WR_PARTY].sort((a,b) => b.pos - a.pos).map(p => (
            <WRCombatant
              key={p.id}
              actor={p}
              side="ally"
              isActive={p.id === activeId}
              isTargetable={targetable.some(t => t.id === p.id)}
              isHoverTarget={hoverTarget === p.id}
              onHover={setHoverTarget}
              onClick={(id) => {
                if (selectedSkill && targetable.some(t => t.id === id)) commitAction(id, "ally");
                else if (!p.down) setActiveId(id); // for demo: switch active
              }}
              floater={floaters.find(f => f.target === p.id && f.side === "ally")}
            />
          ))}
        </div>

        {/* VS divider */}
        <div className="wr-combat-vs">
          <div className="wr-combat-vs-line" />
          <div className="wr-combat-vs-mark" />
          <div>VS</div>
          <div className="wr-combat-vs-mark" />
          <div className="wr-combat-vs-line" />
        </div>

        {/* FOES (RIGHT) — positions 1-2-3-4, front to back */}
        <div className="wr-combat-row foes">
          {[...WR_FOES].sort((a,b) => a.pos - b.pos).map(f => (
            <WRCombatant
              key={f.id}
              actor={f}
              side="foe"
              isTargetable={targetable.some(t => t.id === f.id)}
              isHoverTarget={hoverTarget === f.id}
              onHover={setHoverTarget}
              onClick={(id) => {
                if (selectedSkill && targetable.some(t => t.id === id)) commitAction(id, "foe");
              }}
              floater={floaters.find(fl => fl.target === f.id && fl.side === "foe")}
            />
          ))}
        </div>

        {/* COMBAT LOG */}
        <div className="wr-combat-log">
          {log.slice(0, 5).map(l => (
            <div key={l.id} className="wr-combat-log-entry">
              {l.crit && <span className="crit">CRIT — </span>}
              {l.t}
            </div>
          ))}
        </div>
      </div>

      {/* ACTION BAR */}
      <WRActionBar
        active={active}
        isYourTurn={isYourTurn}
        selectedSkill={selectedSkill}
        setSelectedSkill={setSelectedSkill}
        onEndTurn={() => {
          setSelectedSkill(null);
          // advance demo turn
          const order = WR_INIT_ORDER.filter(t => !t.done && !t.down);
          const cur = order.findIndex(t => t.id === activeId);
          const next = order[(cur + 1) % order.length];
          if (next) setActiveId(next.id);
        }}
      />
    </div>
  );
}

/* ----- Combatant card ----- */
function WRCombatant({ actor, side, isActive, isTargetable, isHoverTarget, onHover, onClick, floater }) {
  const hpPct = (actor.hp / actor.hpMax) * 100;
  const low = hpPct < 30 && hpPct > 0;

  const classes = ["wr-combatant", side];
  if (actor.down) classes.push("dead");
  if (isActive) classes.push("active");
  if (isTargetable) classes.push("targetable");
  if (isHoverTarget && isTargetable) classes.push("target");

  return (
    <div
      className={classes.join(" ")}
      onClick={() => !actor.down && onClick(actor.id)}
      onMouseEnter={() => onHover(actor.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Position indicator */}
      <div className="wr-combatant-pos">
        Pos <b>{actor.pos}</b>{actor.you ? " · You" : ""}{actor.boss ? " · Boss" : ""}
      </div>

      {/* Portrait */}
      <div className="wr-portrait">
        <span className="wr-pos-badge">{actor.pos}</span>
        {isTargetable && (
          <span className="wr-target-reticle">
            {WIcon("reticle", { size: 16 })}
          </span>
        )}
        <div className="wr-portrait-art">
          <PortraitArt kind={actor.portrait} color={actor.color} />
        </div>

        {/* damage floater */}
        {floater && (
          <span className={"wr-floater " + floater.type + (floater.crit ? " crit" : "")}>{floater.v}</span>
        )}

        <div className="wr-portrait-banner">
          <div className="wr-portrait-name">{actor.name}</div>
          <div className="wr-portrait-class">{actor.class || (actor.boss ? "Floor Boss" : "Enemy")}</div>
        </div>
      </div>

      {/* HP + conditions */}
      <div className="wr-combatant-hp">
        <div className="wr-hpbar">
          <span className={"wr-hpbar-fill" + (low ? " low" : "")} style={{ width: hpPct + "%" }} />
        </div>
        <div className="wr-combatant-hp-row">
          <span className="icon">{WIcon("heart", { size: 11 })}</span>
          <span><b>{actor.hp}</b> / {actor.hpMax}</span>
          {actor.block > 0 && (
            <span style={{ marginLeft: "auto", color: "var(--wr-gold-bright)" }}>
              {WIcon("shield", { size: 10 })} {actor.block}
            </span>
          )}
        </div>

        <div className="wr-combatant-conds">
          {actor.conds && actor.conds.map((c, i) => (
            <span key={i} className={"wr-cond-chip " + c.kind}>
              {c.k}
              {c.n != null && <span className="wr-cond-num"> {c.n}</span>}
            </span>
          ))}

          {/* Foe intent */}
          {side === "foe" && actor.intent && !actor.down && (
            <span className="wr-cond-chip" style={{ color: "var(--wr-blood-bright)", borderColor: "rgba(197,52,86,0.5)", background: "rgba(139,21,56,0.18)" }}>
              {actor.intent.kind === "attack" && <>{WIcon("sword", { size: 9, stroke: 2 })} {actor.intent.val}</>}
              {actor.intent.kind === "buff"   && <>{WIcon("shield",{ size: 9, stroke: 2 })} {actor.intent.val}</>}
              {actor.intent.kind === "debuff" && <>{WIcon("flame", { size: 9, stroke: 2 })} {actor.intent.val}</>}
              {actor.intent.kind === "channel"&& <>{WIcon("zap",   { size: 9, stroke: 2 })} {actor.intent.val}</>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- Action bar ----- */
function WRActionBar({ active, isYourTurn, selectedSkill, setSelectedSkill, onEndTurn }) {
  if (!active || active.down) {
    return (
      <div className="wr-action-bar">
        <div className="wr-action-who" style={{ borderColor: "var(--wr-edge)", background: "var(--wr-panel)" }}>
          <div className="wr-action-who-name" style={{ color: "var(--wr-text-3)" }}>NO ACTOR</div>
          <div className="wr-action-who-sub">Awaiting turn…</div>
        </div>
        <div />
        <div />
      </div>
    );
  }

  if (!isYourTurn) {
    return (
      <div className="wr-action-bar" style={{ gridTemplateColumns: "220px 1fr 160px" }}>
        <div className="wr-action-who" style={{ borderColor: "var(--wr-blood-deep)", background: "linear-gradient(180deg, rgba(139,21,56,0.10), rgba(139,21,56,0.02))" }}>
          <div className="wr-action-who-name" style={{ color: "var(--wr-blood-bright)" }}>{active.name}</div>
          <div className="wr-action-who-sub">{active.you ? "Your turn" : "Now acting…"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", fontFamily: "var(--wr-f-body)", fontStyle: "italic", color: "var(--wr-text-3)", fontSize: 14, textAlign: "center" }}>
          “{active.name} draws breath. The chamber holds it with them.”
        </div>
        <div className="wr-action-side">
          <button className="wr-btn wr-btn-ghost">{WIcon("eye", { size: 11 })} Watch</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wr-action-bar">
      <div className="wr-action-who">
        <div className="wr-action-who-name">{active.name}</div>
        <div className="wr-action-who-sub">
          {active.class} · pos <b style={{ color: "var(--wr-violet-bright)" }}>{active.pos}</b>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span className="wr-stat">{WIcon("heart", { size: 11 })} {active.hp}/{active.hpMax}</span>
          <span className="wr-stat">{WIcon("shield", { size: 11 })} {active.block}</span>
          <span className="wr-stat" style={{ color: "var(--wr-violet-bright)" }}>{WIcon("zap", { size: 11 })} 3/3</span>
        </div>
        {selectedSkill && (
          <div style={{
            marginTop: 6, padding: "6px 8px",
            background: "rgba(155,93,229,0.12)", border: "1px solid var(--wr-violet)",
            borderRadius: 2,
            fontFamily: "var(--wr-f-body)", fontSize: 12, fontStyle: "italic", color: "var(--wr-violet-bright)",
          }}>
            Pick a target →
          </div>
        )}
      </div>

      <div className="wr-action-grid">
        {active.skills.map(s => (
          <WRSkillBtn
            key={s.id}
            skill={s}
            selected={selectedSkill && selectedSkill.id === s.id}
            onClick={() => setSelectedSkill(selectedSkill && selectedSkill.id === s.id ? null : s)}
          />
        ))}
      </div>

      <div className="wr-action-side">
        <button className="wr-btn wr-btn-ghost">{WIcon("bag", { size: 12 })} Items <span style={{ opacity: 0.6, fontSize: 9 }}>3</span></button>
        <button className="wr-btn wr-btn-ghost">{WIcon("arrowR", { size: 12 })} Pass</button>
        <button className="wr-btn wr-btn-violet" onClick={onEndTurn}>
          End Turn {WIcon("chevR", { size: 12 })}
        </button>
      </div>
    </div>
  );
}

function WRSkillBtn({ skill, selected, onClick }) {
  return (
    <button className={"wr-action-skill " + skill.kind + (selected ? " selected" : "")} onClick={onClick}>
      <div className="wr-skill-head">
        <span style={{ color: skill.kind === "attack" ? "var(--wr-blood-bright)" : skill.kind === "heal" ? "var(--wr-good)" : skill.kind === "buff" ? "var(--wr-violet-bright)" : "var(--wr-gold-bright)" }}>
          {WIcon(
            skill.kind === "attack" ? (skill.melee ? "sword" : "flame")
            : skill.kind === "heal" ? "heart"
            : skill.kind === "buff" ? "shield"
            : "sparkles",
            { size: 12, stroke: 2 }
          )}
        </span>
        <span className="wr-skill-name">{skill.name}</span>
        <span className="wr-skill-cost">{skill.cost}</span>
      </div>
      <div className="wr-skill-meta">
        {skill.dmg && <><b>{skill.dmg}</b> dmg</>}
        {skill.val && <span style={{ color: "var(--wr-good)" }}>{skill.val}</span>}
      </div>
      {skill.targets && (
        <div className="wr-skill-targets">
          {[1, 2, 3, 4].map(p => (
            <span key={p} className={"wr-skill-target-dot" + (skill.targets.includes(p) ? " on" : "")} />
          ))}
        </div>
      )}
    </button>
  );
}

Object.assign(window, { WRCombat });

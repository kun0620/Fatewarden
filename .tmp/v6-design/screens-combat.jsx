/* global React, Icon, Card, CardHead, MOCK */

/* ============================================================
   COMBAT MODE — Hybrid tactical (grid + tokens, no fog/draw)
   ============================================================ */

/* ----- MAP & TOKEN DATA ----- */
const MAP_W = 22, MAP_H = 14, CELL = 36;

const TERRAIN = [
  { kind: "altar",  x: 10, y: 2, w: 2, h: 2 },
  { kind: "pew",    x: 3,  y: 5, w: 5, h: 1 },
  { kind: "pew",    x: 14, y: 5, w: 5, h: 1 },
  { kind: "pew",    x: 3,  y: 7, w: 5, h: 1 },
  { kind: "pew",    x: 14, y: 7, w: 5, h: 1 },
  { kind: "circle", x: 9,  y: 4, w: 4, h: 4 }, // binding circle
  { kind: "stair",  x: 9,  y: 12, w: 4, h: 2 },
];
const LIGHTS = [
  { x: 11, y: 3,  r: 5,   color: "gold" },
  { x: 4,  y: 11, r: 2.5, color: "torch" },
  { x: 18, y: 11, r: 2.5, color: "torch" },
];

const INITIAL_TOKENS = [
  { id: "reeve",  name: "Cinder-Reeve", x: 11, y: 4, color: "#991B1B", foe: true,  hp: 120, hpMax: 120, ac: 17, init: 19, conditions: [{ k: "Brass Aegis", buff: true }], boss: true },
  { id: "spearA", name: "Brass Spear A",x: 8,  y: 6, color: "#C72D2D", foe: true,  hp: 12,  hpMax: 22,  ac: 16, init: 15, conditions: [{ k: "Prone", bad: true }] },
  { id: "spearB", name: "Brass Spear B",x: 14, y: 6, color: "#C72D2D", foe: true,  hp: 22,  hpMax: 22,  ac: 16, init: 15 },
  { id: "kessra", name: "Kessra",       x: 10, y: 9, color: "#D6A84F", ally: true, hp: 64,  hpMax: 70,  ac: 19, init: 22 },
  { id: "aedric", name: "Aedric",       x: 11, y: 11, color: "#7C3AED", ally: true, hp: 38, hpMax: 52,  ac: 14, init: 17, you: true,
                  conditions: [{ k: "Concentrating · Hex", buff: true }] },
  { id: "mirenna",name: "Mirenna",      x: 13, y: 11, color: "#22C55E", ally: true, hp: 41, hpMax: 56,  ac: 16, init: 14, conditions: [{ k: "Bless", buff: true }] },
  { id: "halric", name: "Halric",       x: 9,  y: 12, color: "#A8A29E", ally: true, hp: 0,  hpMax: 48,  ac: 18, init: 8,  down: true,
                  conditions: [{ k: "Unconscious", bad: true }, { k: "Death 2✓/0✗", bad: true }] },
];

/* ============================================================
   COMBAT VIEW — swaps the story area
   ============================================================ */
function CombatModeView({ onExit, onChange }) {
  const [tokens, setTokens] = React.useState(INITIAL_TOKENS);
  const [selectedId, setSelectedId] = React.useState("aedric");
  const [tool, setTool] = React.useState("cursor");
  const [round, setRound] = React.useState(3);
  const [turnIdx, setTurnIdx] = React.useState(0); // index in initiative order
  const [actionState, setActionState] = React.useState({ action: false, bonus: false, reaction: false, moveUsed: 0 });
  const [flow, setFlow] = React.useState(null); // { kind: "attack" | "spell" | "move", source, target, ... }
  const [hover, setHover] = React.useState(null); // {x,y} cell hover
  const [measure, setMeasure] = React.useState(null); // {from, to}

  // Initiative order (sorted by init desc), filter conscious
  const order = React.useMemo(() => [...tokens].sort((a,b) => b.init - a.init), [tokens]);
  const current = order[turnIdx] || order[0];
  const selected = tokens.find(t => t.id === selectedId);
  const isYourTurn = current?.id === "aedric";

  /* token cell click */
  const onCellClick = (x, y) => {
    if (tool === "measure") {
      if (!measure || measure.to) setMeasure({ from: { x, y } });
      else setMeasure({ ...measure, to: { x, y } });
      return;
    }
    // Click on token
    const tk = tokens.find(t => t.x === x && t.y === y);
    if (tk) { setSelectedId(tk.id); return; }
    // Otherwise: move selected token if your turn and you have movement
    if (selected?.you && isYourTurn) {
      const dx = Math.abs(x - selected.x), dy = Math.abs(y - selected.y);
      const dist = Math.max(dx, dy) * 5;
      if (dist <= 30 - actionState.moveUsed) {
        setTokens(ts => ts.map(t => t.id === selectedId ? { ...t, x, y } : t));
        setActionState(a => ({ ...a, moveUsed: a.moveUsed + dist }));
      }
    }
  };

  const endTurn = () => {
    setTurnIdx(i => (i + 1) % order.length);
    if (turnIdx === order.length - 1) setRound(r => r + 1);
    setActionState({ action: false, bonus: false, reaction: false, moveUsed: 0 });
    setFlow(null);
  };

  const launchAttack = (weapon) => {
    if (actionState.action) return;
    setFlow({ kind: "attack", weapon, source: "aedric", target: null });
  };
  const launchSpell = (spell) => {
    if (spell.cost === "1A" && actionState.action) return;
    if (spell.cost === "1BA" && actionState.bonus) return;
    setFlow({ kind: "spell", spell, source: "aedric", target: null });
  };

  return (
    <div className="fw-combat-mode">
      {/* HEADER · INITIATIVE TICKER */}
      <InitiativeTicker order={order} turnIdx={turnIdx} round={round} onExit={onExit} />

      {/* MAIN: map + side */}
      <div className="fw-combat-main">
        <div className="fw-combat-map-wrap">
          {/* TOOLBAR */}
          <div className="fw-map-tools">
            <ToolBtn id="cursor"  icon="compass" label="Select" tool={tool} setTool={setTool} />
            <ToolBtn id="measure" icon="zap"     label="Measure" tool={tool} setTool={setTool} />
            <ToolBtn id="cone"    icon="flame"   label="Cone 15" tool={tool} setTool={setTool} />
            <ToolBtn id="sphere"  icon="hex"     label="Sphere 20" tool={tool} setTool={setTool} />
            <ToolBtn id="line"    icon="arrowR"  label="Line 30" tool={tool} setTool={setTool} />
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
              {tool === "measure" && measure?.from && !measure?.to && "Click target cell"}
              {selected && tool === "cursor" && `Selected · ${selected.name}`}
            </span>
          </div>

          <BattleMap
            tokens={tokens}
            selectedId={selectedId}
            current={current}
            tool={tool}
            onCellClick={onCellClick}
            hover={hover} setHover={setHover}
            measure={measure}
            isYourTurn={isYourTurn}
            moveBudget={30 - actionState.moveUsed}
            selected={selected}
          />

          {/* TURN HUD docked */}
          <TurnHUD
            isYourTurn={isYourTurn}
            current={current}
            actionState={actionState}
            onAttack={launchAttack}
            onSpell={launchSpell}
            onBonus={() => !actionState.bonus && setActionState(a => ({ ...a, bonus: true }))}
            onAction={() => !actionState.action && setActionState(a => ({ ...a, action: true }))}
            onDash={() => !actionState.action && setActionState(a => ({ ...a, action: true, moveUsed: Math.max(0, a.moveUsed - 30) }))}
            onEndTurn={endTurn}
          />
        </div>

        {/* RIGHT: token inspector */}
        <aside className="fw-token-inspector">
          {selected && <TokenInspector token={selected} onChange={onChange} />}
        </aside>
      </div>

      {/* MODAL FLOWS */}
      {flow?.kind === "attack" && <AttackFlow flow={flow} setFlow={setFlow} tokens={tokens} setTokens={setTokens} actionState={actionState} setActionState={setActionState} onChange={onChange} />}
      {flow?.kind === "spell"  && <SpellCastFlow flow={flow} setFlow={setFlow} tokens={tokens} setTokens={setTokens} actionState={actionState} setActionState={setActionState} onChange={onChange} />}
    </div>
  );
}

/* ============================================================
   INITIATIVE TICKER
   ============================================================ */
function InitiativeTicker({ order, turnIdx, round, onExit }) {
  return (
    <div className="fw-init-ticker">
      <div className="fw-init-round">
        <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2.4s infinite" }}>
          <span style={{ width: 5, height: 5, borderRadius: 50, background: "currentColor" }} /> Round {round}
        </span>
        <span className="fw-eyebrow" style={{ color: "var(--gold)" }}>Combat · Tactical</span>
      </div>
      <div className="fw-init-chain">
        {order.map((t, i) => (
          <div key={t.id} className={"fw-init-pill" + (i === turnIdx ? " current" : "") + (t.foe ? " foe" : " ally") + (t.down ? " down" : "")}>
            <span className="fw-mono" style={{ fontSize: 10.5 }}>{t.init}</span>
            <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${t.color}44, #15101f)`, fontSize: 9 }}>{t.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
            <span style={{ fontSize: 11, color: t.down ? "var(--text-3)" : "var(--text-2)" }}>{t.name}</span>
            <span className="fw-mono" style={{ fontSize: 10, color: "var(--text-3)" }}>{t.hp}/{t.hpMax}</span>
            {i === turnIdx && <span style={{ color: "var(--blood-bright)", fontSize: 9, letterSpacing: "0.12em" }}>NOW</span>}
          </div>
        ))}
      </div>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onExit} style={{ flexShrink: 0 }}>
        {Icon("x", { size: 11 })} End combat
      </button>
    </div>
  );
}

/* ============================================================
   BATTLE MAP — SVG grid + terrain + lights + tokens
   ============================================================ */
function BattleMap({ tokens, selectedId, current, tool, onCellClick, hover, setHover, measure, isYourTurn, moveBudget, selected }) {
  const w = MAP_W * CELL, h = MAP_H * CELL;
  const selectedTok = tokens.find(t => t.id === selectedId);

  // movement range overlay for selected (if your turn)
  const moveCells = React.useMemo(() => {
    if (!selectedTok?.you || !isYourTurn || moveBudget <= 0) return [];
    const range = Math.floor(moveBudget / 5);
    const cells = [];
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= range) {
          cells.push({ x: selectedTok.x + dx, y: selectedTok.y + dy });
        }
      }
    }
    return cells.filter(c => c.x >= 0 && c.y >= 0 && c.x < MAP_W && c.y < MAP_H);
  }, [selectedTok, isYourTurn, moveBudget]);

  // distance for measure
  const measureDist = measure?.from && measure?.to
    ? Math.max(Math.abs(measure.from.x - measure.to.x), Math.abs(measure.from.y - measure.to.y)) * 5
    : null;

  return (
    <div className="fw-battlemap" style={{ aspectRatio: `${w} / ${h}` }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        <defs>
          <radialGradient id="bm-floor" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#1f1830" />
            <stop offset="100%" stopColor="#08070d" />
          </radialGradient>
          <radialGradient id="bm-gold-light">
            <stop offset="0%" stopColor="rgba(234,192,116,0.45)" />
            <stop offset="100%" stopColor="rgba(214,168,79,0)" />
          </radialGradient>
          <radialGradient id="bm-torch-light">
            <stop offset="0%" stopColor="rgba(214,168,79,0.3)" />
            <stop offset="100%" stopColor="rgba(214,168,79,0)" />
          </radialGradient>
          <pattern id="bm-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="rgba(214,168,79,0.07)" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* floor */}
        <rect width={w} height={h} fill="url(#bm-floor)" />

        {/* lights underneath */}
        {LIGHTS.map((l, i) => (
          <circle key={i} cx={(l.x + 0.5) * CELL} cy={(l.y + 0.5) * CELL} r={l.r * CELL} fill={`url(#bm-${l.color === "gold" ? "gold" : "torch"}-light)`} />
        ))}

        {/* terrain */}
        {TERRAIN.map((t, i) => <Terrain key={i} t={t} />)}

        {/* grid lines */}
        <rect width={w} height={h} fill="url(#bm-grid)" />

        {/* movement overlay */}
        {moveCells.map((c, i) => (
          <rect key={i} x={c.x * CELL} y={c.y * CELL} width={CELL} height={CELL} fill="rgba(124,58,237,0.10)" stroke="rgba(124,58,237,0.3)" strokeWidth="0.5" />
        ))}

        {/* hover cell */}
        {hover && (
          <rect x={hover.x * CELL} y={hover.y * CELL} width={CELL} height={CELL} fill="rgba(214,168,79,0.10)" stroke="var(--gold)" strokeWidth="1" pointerEvents="none" />
        )}

        {/* templates */}
        {tool === "cone" && hover && selectedTok && (
          <ConeTemplate from={selectedTok} to={hover} />
        )}
        {tool === "sphere" && hover && (
          <SphereTemplate center={hover} radius={4} />
        )}
        {tool === "line" && hover && selectedTok && (
          <LineTemplate from={selectedTok} to={hover} />
        )}

        {/* measure */}
        {measure?.from && measure?.to && (
          <g>
            <line x1={(measure.from.x + 0.5) * CELL} y1={(measure.from.y + 0.5) * CELL}
                  x2={(measure.to.x + 0.5) * CELL}   y2={(measure.to.y + 0.5) * CELL}
                  stroke="var(--gold-bright)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx={(measure.to.x + 0.5) * CELL} cy={(measure.to.y + 0.5) * CELL} r="6" fill="var(--gold-bright)" />
            <text x={(measure.to.x + 0.5) * CELL + 12} y={(measure.to.y + 0.5) * CELL - 8} fill="var(--gold-bright)" fontSize="14" fontFamily="JetBrains Mono">{measureDist} ft</text>
          </g>
        )}

        {/* click cells */}
        {Array.from({ length: MAP_H }).map((_, y) =>
          Array.from({ length: MAP_W }).map((_, x) => (
            <rect key={`${x}-${y}`}
              x={x * CELL} y={y * CELL} width={CELL} height={CELL}
              fill="transparent"
              onMouseEnter={() => setHover({ x, y })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onCellClick(x, y)}
              style={{ cursor: tool === "cursor" ? "default" : "crosshair" }}
            />
          ))
        )}

        {/* tokens (on top) */}
        {tokens.map(tk => <Token key={tk.id} tk={tk} selected={tk.id === selectedId} current={tk.id === current?.id} />)}
      </svg>

      {/* selected token quick-tooltip */}
      {selectedTok && <TokenTooltip tk={selectedTok} />}
    </div>
  );
}

function Terrain({ t }) {
  if (t.kind === "altar") {
    return (
      <g>
        <rect x={t.x * CELL + 4} y={t.y * CELL + 4} width={t.w * CELL - 8} height={t.h * CELL - 8} rx="4"
              fill="rgba(214,168,79,0.10)" stroke="var(--gold-deep)" strokeWidth="1" />
        <text x={(t.x + t.w/2) * CELL} y={(t.y + t.h/2) * CELL + 4} textAnchor="middle" fill="var(--gold)" fontSize="10" fontFamily="Cinzel" letterSpacing="2">ALTAR</text>
      </g>
    );
  }
  if (t.kind === "pew") {
    return <rect x={t.x * CELL + 2} y={t.y * CELL + 8} width={t.w * CELL - 4} height={t.h * CELL - 16} rx="2" fill="rgba(20,17,29,0.7)" stroke="rgba(214,168,79,0.18)" strokeWidth="0.6" />;
  }
  if (t.kind === "circle") {
    const cx = (t.x + t.w/2) * CELL, cy = (t.y + t.h/2) * CELL;
    const r = (t.w / 2) * CELL - 4;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.5)" strokeWidth="1.2" strokeDasharray="3 3" />
        <circle cx={cx} cy={cy} r={r * 0.65} fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="0.8" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(124,58,237,0.7)" fontSize="9" fontFamily="Cinzel" letterSpacing="3">BINDING</text>
      </g>
    );
  }
  if (t.kind === "stair") {
    const lines = [];
    for (let i = 0; i < 4; i++) {
      lines.push(<line key={i} x1={t.x * CELL} y1={t.y * CELL + i * 16} x2={(t.x + t.w) * CELL} y2={t.y * CELL + i * 16} stroke="rgba(214,168,79,0.2)" strokeWidth="0.8" />);
    }
    return (
      <g>
        <rect x={t.x * CELL} y={t.y * CELL} width={t.w * CELL} height={t.h * CELL} fill="rgba(20,17,29,0.6)" />
        {lines}
        <text x={(t.x + t.w/2) * CELL} y={(t.y + t.h - 0.3) * CELL} textAnchor="middle" fill="rgba(214,168,79,0.4)" fontSize="9" fontFamily="Cinzel" letterSpacing="2">DESCENT</text>
      </g>
    );
  }
  return null;
}

function Token({ tk, selected, current }) {
  const cx = (tk.x + 0.5) * CELL;
  const cy = (tk.y + 0.5) * CELL;
  const r = CELL * 0.4;
  const hpPct = tk.hp / tk.hpMax;
  const initials = tk.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase();

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* selection ring */}
      {selected && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="var(--gold-bright)" strokeWidth="1.6" />}
      {/* current turn pulse */}
      {current && <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="var(--blood-bright)" strokeWidth="1.2" strokeDasharray="3 3">
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="6s" repeatCount="indefinite" />
      </circle>}
      {/* base */}
      <circle cx={cx} cy={cy} r={r} fill={tk.color} fillOpacity={tk.down ? "0.3" : "0.85"} stroke={tk.foe ? "var(--blood)" : "var(--gold)"} strokeWidth="1.2" />
      {/* initials */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Cinzel" fontWeight="600" opacity={tk.down ? "0.5" : "1"}>{initials}</text>
      {/* HP ring */}
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 2} fill="none"
              stroke={hpPct > 0.5 ? "#22C55E" : hpPct > 0.25 ? "#F59E0B" : "#EF4444"}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * (r + 2) * hpPct} ${2 * Math.PI * (r + 2)}`}
              transform={`rotate(-90 ${cx} ${cy})`} />
      {/* you marker */}
      {tk.you && <circle cx={cx + r * 0.7} cy={cy - r * 0.7} r="4" fill="var(--gold-bright)" stroke="var(--bg)" strokeWidth="1" />}
      {/* down */}
      {tk.down && (
        <g>
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--blood-bright)" strokeWidth="1.5" />
          <text x={cx} y={cy + r + 12} textAnchor="middle" fontSize="8" fill="var(--blood-bright)" fontFamily="JetBrains Mono" letterSpacing="1">0 HP</text>
        </g>
      )}
      {/* condition dots */}
      {tk.conditions && tk.conditions.slice(0, 3).map((c, i) => (
        <circle key={i} cx={cx - r + i * 6} cy={cy + r - 2} r="3" fill={c.bad ? "var(--blood-bright)" : c.buff ? "#86EFAC" : "var(--gold-bright)"} stroke="var(--bg)" strokeWidth="1" />
      ))}
    </g>
  );
}

function ConeTemplate({ from, to }) {
  const cx = (from.x + 0.5) * CELL, cy = (from.y + 0.5) * CELL;
  const tx = (to.x + 0.5) * CELL,   ty = (to.y + 0.5) * CELL;
  const angle = Math.atan2(ty - cy, tx - cx);
  const len = 15 / 5 * CELL; // 15 ft cone
  const half = len * Math.tan(Math.PI / 4); // 90 deg cone
  const p1 = [cx + Math.cos(angle) * len + Math.cos(angle + Math.PI/2) * half, cy + Math.sin(angle) * len + Math.sin(angle + Math.PI/2) * half];
  const p2 = [cx + Math.cos(angle) * len - Math.cos(angle + Math.PI/2) * half, cy + Math.sin(angle) * len - Math.sin(angle + Math.PI/2) * half];
  return <polygon points={`${cx},${cy} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill="rgba(214,168,79,0.18)" stroke="var(--gold)" strokeWidth="1" />;
}
function SphereTemplate({ center, radius }) {
  return <circle cx={(center.x + 0.5) * CELL} cy={(center.y + 0.5) * CELL} r={radius * CELL} fill="rgba(124,58,237,0.18)" stroke="var(--arcane)" strokeWidth="1" />;
}
function LineTemplate({ from, to }) {
  const cx = (from.x + 0.5) * CELL, cy = (from.y + 0.5) * CELL;
  const angle = Math.atan2((to.y - from.y), (to.x - from.x));
  const len = 30 / 5 * CELL;
  const ex = cx + Math.cos(angle) * len, ey = cy + Math.sin(angle) * len;
  return <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--gold)" strokeWidth={CELL * 0.6} strokeOpacity="0.25" strokeLinecap="round" />;
}

function TokenTooltip({ tk }) {
  return (
    <div className="fw-token-tooltip" style={{ borderColor: tk.foe ? "var(--blood)" : "var(--gold-deep)" }}>
      <div style={{ fontSize: 11.5, color: "var(--text)", fontWeight: 500 }}>{tk.name}</div>
      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>HP {tk.hp}/{tk.hpMax} · AC {tk.ac}</div>
    </div>
  );
}

function ToolBtn({ id, icon, label, tool, setTool }) {
  return (
    <button onClick={() => setTool(id)} className={"fw-map-tool " + (tool === id ? "active" : "")} title={label}>
      {Icon(icon, { size: 13 })}
      <span style={{ fontSize: 10, marginLeft: 4 }}>{label}</span>
    </button>
  );
}

/* ============================================================
   TOKEN INSPECTOR — right side panel
   ============================================================ */
function TokenInspector({ token, onChange }) {
  const hpPct = (token.hp / token.hpMax) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: token.foe ? "rgba(153,27,27,0.10)" : "rgba(214,168,79,0.05)", border: "1px solid " + (token.foe ? "rgba(153,27,27,0.35)" : "var(--border)"), borderRadius: 8 }}>
        <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${token.color}44, #15101f)`, borderColor: token.foe ? "var(--blood)" : "var(--gold-deep)" }}>
          {token.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{token.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
            Initiative <b style={{ color: "var(--gold-bright)", fontFamily: "var(--f-mono)" }}>{token.init}</b> · {token.foe ? "Hostile" : token.you ? "You" : "Ally"}
          </div>
        </div>
        {token.boss && <span className="fw-pill gold" style={{ fontSize: 9 }}>BOSS</span>}
        {token.you && <span className="fw-pill gold" style={{ fontSize: 9 }}>You</span>}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
          <span>HP</span>
          <span style={{ fontFamily: "var(--f-mono)", color: hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)" }}>{token.hp} / {token.hpMax}</span>
        </div>
        <div style={{ height: 6, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 50, overflow: "hidden" }}>
          <div style={{ height: "100%", width: hpPct + "%", background: `linear-gradient(90deg, var(--blood), ${hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)"})` }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <MiniStat label="AC" v={token.ac} />
        <MiniStat label="SPD" v="30 ft" />
        <MiniStat label="INIT" v={`+${token.init - 12}`} />
      </div>

      {token.conditions && token.conditions.length > 0 && (
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Conditions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {token.conditions.map((c, i) => <span key={i} className={"fw-cond " + (c.bad ? "bleed" : c.buff ? "buff" : "")}>{c.k}</span>)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button className="fw-btn fw-btn-blood fw-btn-sm" style={{ justifyContent: "center" }} onClick={() => onChange?.({ kind: "damage", target: token.name, amount: 7 })}>
          {Icon("minus", { size: 11 })} Damage
        </button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }} onClick={() => onChange?.({ kind: "heal", target: token.name, amount: 8 })}>
          {Icon("heart", { size: 11 })} Heal
        </button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("sparkles", { size: 11 })} Condition</button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("eye", { size: 11 })} Statblock</button>
      </div>
    </div>
  );
}

function MiniStat({ label, v }) {
  return (
    <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 5, padding: "6px 4px", textAlign: "center" }}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: 14, color: "var(--gold-bright)" }}>{v}</div>
    </div>
  );
}

/* ============================================================
   TURN HUD — dock at bottom of map
   ============================================================ */
function TurnHUD({ isYourTurn, current, actionState, onAttack, onSpell, onAction, onBonus, onDash, onEndTurn }) {
  if (!isYourTurn) {
    return (
      <div className="fw-turn-hud not-yours">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 50, background: current?.foe ? "var(--blood-bright)" : "var(--success)" }} />
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Now Acting</div>
            <div className="fw-display" style={{ fontSize: 16, color: "var(--text)" }}>{current?.name}</div>
          </div>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--text-3)", fontSize: 13 }}>
            {current?.foe ? "Hold breath. The Reeve does not blink." : "Wait for your turn."}
          </span>
        </div>
      </div>
    );
  }

  const moveLeft = 30 - actionState.moveUsed;
  return (
    <div className="fw-turn-hud yours">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <div className="fw-eyebrow" style={{ color: "var(--gold)", marginBottom: 2 }}>YOUR TURN</div>
          <div className="fw-display" style={{ fontSize: 18, color: "var(--text)" }}>Aedric Vael</div>
        </div>

        <div className="fw-action-budget">
          <BudgetSlot label="Action" used={actionState.action} icon="sword" />
          <BudgetSlot label="Bonus"  used={actionState.bonus}  icon="zap" gold />
          <BudgetSlot label="Reaction" used={actionState.reaction} icon="shield" />
          <div className="fw-budget-move">
            <div className="fw-eyebrow" style={{ fontSize: 9 }}>Move</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="fw-mono" style={{ fontSize: 13, color: moveLeft > 0 ? "var(--gold-bright)" : "var(--text-3)" }}>{moveLeft}</span>
              <span style={{ fontSize: 10, color: "var(--text-4)" }}>/ 30 ft</span>
            </div>
            <div style={{ height: 3, background: "var(--bg-deep)", borderRadius: 50, marginTop: 3 }}>
              <div style={{ height: "100%", width: (moveLeft / 30) * 100 + "%", background: "var(--gold-bright)", borderRadius: 50 }} />
            </div>
          </div>
        </div>

        <span style={{ flex: 1 }} />

        <div className="fw-quick-actions">
          <button className="fw-btn fw-btn-gold" onClick={() => onAttack({ n: "Staff of Cinder-Reeve", dmg: "1d8+4 fire", toHit: 7 })} disabled={actionState.action} title="Attack with main weapon">
            {Icon("flame", { size: 12 })} Attack <span className="fw-mini-cost">1A</span>
          </button>
          <button className="fw-btn fw-btn-arcane" onClick={() => onSpell({ n: "Eldritch Blast", lvl: "Cantrip", cost: "1A", dmg: "2d10+4", save: "atk", toHit: 7 })} disabled={actionState.action} title="Eldritch Blast">
            {Icon("flame", { size: 12 })} Blast <span className="fw-mini-cost">1A</span>
          </button>
          <button className="fw-btn fw-btn-ghost" onClick={() => onSpell({ n: "Hex", lvl: "1", cost: "1BA", curse: true })} disabled={actionState.bonus} title="Hex (bonus)">
            {Icon("skull", { size: 12 })} Hex <span className="fw-mini-cost">1BA</span>
          </button>
          <button className="fw-btn fw-btn-ghost" onClick={onDash} disabled={actionState.action} title="Dash — double movement">
            {Icon("arrowR", { size: 12 })} Dash
          </button>
          <button className="fw-btn fw-btn-ghost" onClick={onAction} disabled={actionState.action} title="Dodge">
            {Icon("shield", { size: 12 })} Dodge
          </button>
          <button className="fw-btn fw-btn-ghost" title="More actions">{Icon("kebab", { size: 12 })}</button>
        </div>

        <button className="fw-btn fw-btn-blood fw-btn-lg" onClick={onEndTurn}>
          End Turn {Icon("chevR", { size: 12 })}
        </button>
      </div>
    </div>
  );
}

function BudgetSlot({ label, used, icon, gold }) {
  return (
    <div className={"fw-budget-slot " + (used ? "spent" : "")}>
      <div className="fw-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <span style={{ color: used ? "var(--text-4)" : gold ? "var(--gold-bright)" : "var(--gold)" }}>
        {used ? Icon("x", { size: 14 }) : Icon(icon, { size: 14 })}
      </span>
    </div>
  );
}

/* ============================================================
   ATTACK FLOW MODAL
   ============================================================ */
function AttackFlow({ flow, setFlow, tokens, setTokens, actionState, setActionState, onChange }) {
  const [step, setStep] = React.useState("target"); // target | hit | damage | apply
  const [target, setTarget] = React.useState(null);
  const [hitRoll, setHitRoll] = React.useState(null);
  const [advantage, setAdvantage] = React.useState("normal");
  const [dmgRoll, setDmgRoll] = React.useState(null);

  const foes = tokens.filter(t => t.foe && !t.down);

  const rollHit = () => {
    const r1 = 1 + Math.floor(Math.random() * 20);
    const r2 = 1 + Math.floor(Math.random() * 20);
    const used = advantage === "adv" ? Math.max(r1, r2) : advantage === "dis" ? Math.min(r1, r2) : r1;
    setHitRoll({ raw: used, total: used + flow.weapon.toHit, all: [r1, r2], crit: used === 20, fumble: used === 1 });
    setStep("hit");
  };
  const rollDmg = () => {
    // 1d8 + 4 for staff
    const d1 = 1 + Math.floor(Math.random() * 8);
    const d2 = hitRoll.crit ? 1 + Math.floor(Math.random() * 8) : 0;
    const total = d1 + d2 + 4;
    setDmgRoll({ dice: [d1, d2].filter(Boolean), bonus: 4, total });
    setStep("damage");
  };
  const apply = () => {
    setTokens(ts => ts.map(t => t.id === target.id ? { ...t, hp: Math.max(0, t.hp - dmgRoll.total) } : t));
    setActionState(a => ({ ...a, action: true }));
    onChange?.({ kind: "damage", target: target.name, amount: dmgRoll.total, source: flow.weapon.n });
    setFlow(null);
  };

  const hit = hitRoll && target && hitRoll.total >= target.ac;

  return (
    <FlowModal title={`Attack · ${flow.weapon.n}`} onClose={() => setFlow(null)} accent="blood">
      {step === "target" && (
        <>
          <p className="fw-serif" style={{ fontStyle: "italic", color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
            Pick a target. The staff burns warm in your palm.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {foes.map(f => (
              <button key={f.id} className="fw-btn fw-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", padding: 10, borderColor: target?.id === f.id ? "var(--blood)" : "var(--border-soft)", background: target?.id === f.id ? "rgba(153,27,27,0.10)" : "transparent" }} onClick={() => setTarget(f)}>
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${f.color}44, #15101f)`, fontSize: 9 }}>{f.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>HP {f.hp}/{f.hpMax} · AC {f.ac}</div>
                </span>
                {target?.id === f.id && <span className="fw-pill blood">Selected</span>}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="fw-eyebrow">Roll</span>
            {["normal","adv","dis"].map(a => (
              <button key={a} className={"fw-btn fw-btn-sm " + (advantage === a ? "" : "fw-btn-ghost")} onClick={() => setAdvantage(a)} style={{ borderColor: advantage === a ? "var(--gold-deep)" : undefined, color: advantage === a ? "var(--gold-bright)" : undefined, background: advantage === a ? "rgba(214,168,79,0.08)" : undefined }}>
                {a === "normal" ? "Normal" : a === "adv" ? "Advantage" : "Disadvantage"}
              </button>
            ))}
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-blood" onClick={rollHit} disabled={!target}>
              {Icon("dice", { size: 12 })} Roll d20 + {flow.weapon.toHit}
            </button>
          </div>
        </>
      )}

      {step === "hit" && (
        <>
          <div style={{ textAlign: "center", padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>To Hit · vs AC {target.ac}</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
              <span className="fw-display" style={{ fontSize: 48, color: hitRoll.crit ? "var(--gold-bright)" : hitRoll.fumble ? "var(--blood-bright)" : "var(--text)" }}>{hitRoll.raw}</span>
              <span style={{ fontSize: 18, color: "var(--text-3)" }}>+ {flow.weapon.toHit}</span>
              <span style={{ fontSize: 18, color: "var(--text-3)" }}>=</span>
              <span className="fw-display" style={{ fontSize: 48, color: hit ? "var(--success)" : "var(--blood-bright)" }}>{hitRoll.total}</span>
            </div>
            {advantage !== "normal" && (
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)", marginTop: 6 }}>
                {advantage === "adv" ? "Advantage" : "Disadvantage"} · rolls [{hitRoll.all.join(", ")}]
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 14, fontFamily: "var(--f-serif)", fontStyle: "italic", color: hitRoll.crit ? "var(--gold-bright)" : hit ? "#86EFAC" : "#FCA5A5" }}>
              {hitRoll.crit ? "Critical hit. Brass cracks." : hit ? `Hit. ${target.name} reels.` : hitRoll.fumble ? "Natural one. The staff falters." : `Miss. The blow goes wide.`}
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setStep("target")}>Re-target</button>
            {hit ? (
              <button className="fw-btn fw-btn-blood" onClick={rollDmg}>{Icon("dice", { size: 12 })} Roll {hitRoll.crit ? "2d8 + 4" : "1d8 + 4"} damage</button>
            ) : (
              <button className="fw-btn fw-btn-blood" onClick={() => { setActionState(a => ({ ...a, action: true })); setFlow(null); }}>Commit miss</button>
            )}
          </div>
        </>
      )}

      {step === "damage" && (
        <>
          <div style={{ textAlign: "center", padding: 18 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Damage · fire</div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
              {dmgRoll.dice.map((d, i) => <span key={i} className="fw-display" style={{ fontSize: 36, color: "var(--gold-bright)" }}>{d}</span>)}
              <span style={{ fontSize: 18, color: "var(--text-3)" }}>+ {dmgRoll.bonus}</span>
              <span style={{ fontSize: 18, color: "var(--text-3)" }}>=</span>
              <span className="fw-display" style={{ fontSize: 48, color: "var(--blood-bright)" }}>{dmgRoll.total}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--text-2)" }}>
              {target.name} drops to <b style={{ color: "var(--text)", fontStyle: "normal" }}>{Math.max(0, target.hp - dmgRoll.total)} / {target.hpMax}</b>
            </div>
          </div>
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={apply}>
              {Icon("check", { size: 13 })} Apply {dmgRoll.total} fire damage
            </button>
          </div>
        </>
      )}
    </FlowModal>
  );
}

/* ============================================================
   SPELL CAST FLOW MODAL
   ============================================================ */
function SpellCastFlow({ flow, setFlow, tokens, setTokens, actionState, setActionState, onChange }) {
  const [step, setStep] = React.useState("target");
  const [target, setTarget] = React.useState(null);
  const [slot, setSlot] = React.useState("4"); // pact slot
  const [result, setResult] = React.useState(null);
  const isHex = flow.spell.curse;
  const targets = isHex ? tokens.filter(t => t.foe && !t.down) : tokens.filter(t => t.foe && !t.down);

  const rollAttack = () => {
    const beams = isHex ? 1 : 2;
    const rolls = Array.from({ length: beams }, () => {
      const r = 1 + Math.floor(Math.random() * 20);
      const total = r + flow.spell.toHit;
      const hit = total >= target.ac;
      const dmg = hit ? (1 + Math.floor(Math.random() * 10)) + 4 + (r === 20 ? 1 + Math.floor(Math.random() * 10) : 0) : 0;
      return { r, total, hit, dmg, crit: r === 20 };
    });
    const totalDmg = rolls.reduce((a,b) => a + b.dmg, 0);
    setResult({ rolls, totalDmg });
    setStep("result");
  };

  const apply = () => {
    if (isHex) {
      setTokens(ts => ts.map(t => t.id === target.id ? { ...t, conditions: [...(t.conditions || []), { k: "Cursed (Hex)", bad: true }] } : t));
      setActionState(a => ({ ...a, bonus: true }));
      onChange?.({ kind: "condition", target: target.name, condition: "Cursed (Hex)" });
    } else {
      setTokens(ts => ts.map(t => t.id === target.id ? { ...t, hp: Math.max(0, t.hp - result.totalDmg) } : t));
      setActionState(a => ({ ...a, action: true }));
      onChange?.({ kind: "damage", target: target.name, amount: result.totalDmg, source: flow.spell.n });
    }
    setFlow(null);
  };

  return (
    <FlowModal title={`Cast · ${flow.spell.n}`} onClose={() => setFlow(null)} accent="arcane">
      {step === "target" && (
        <>
          <div style={{ display: "flex", gap: 10, padding: 12, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, marginBottom: 14 }}>
            <span style={{ width: 36, height: 36, borderRadius: 50, background: "rgba(124,58,237,0.18)", border: "1px solid var(--arcane)", display: "grid", placeItems: "center", color: "var(--arcane-bright)" }}>
              {Icon("flame", { size: 16 })}
            </span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{flow.spell.n}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
                Level {flow.spell.lvl} · {flow.spell.cost} · {isHex ? "1d6 necrotic on hit, 1h conc" : "Spell atk +7 · 2 beams · 1d10+4 force each"}
              </div>
            </div>
          </div>

          {!isHex && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
              <span className="fw-eyebrow">Cast at</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["Cantrip"].map(s => <span key={s} className="fw-pill" style={{ background: "rgba(124,58,237,0.18)", borderColor: "var(--arcane)", color: "var(--arcane-bright)" }}>{s} · no slot</span>)}
              </div>
            </div>
          )}
          {isHex && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
              <span className="fw-eyebrow">Slot</span>
              <button className={"fw-btn fw-btn-sm " + (slot === "4" ? "" : "fw-btn-ghost")} onClick={() => setSlot("4")} style={{ background: slot === "4" ? "rgba(124,58,237,0.15)" : "transparent", borderColor: slot === "4" ? "var(--arcane)" : undefined, color: slot === "4" ? "var(--arcane-bright)" : undefined }}>
                Pact slot · Lv 4 (1 of 2)
              </button>
            </div>
          )}

          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Target</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {targets.map(f => (
              <button key={f.id} className="fw-btn fw-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", padding: 10, borderColor: target?.id === f.id ? "var(--arcane)" : "var(--border-soft)", background: target?.id === f.id ? "rgba(124,58,237,0.10)" : "transparent" }} onClick={() => setTarget(f)}>
                <span className="fw-avatar sm" style={{ background: `linear-gradient(135deg, ${f.color}44, #15101f)`, fontSize: 9 }}>{f.name.split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase()}</span>
                <span style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>HP {f.hp}/{f.hpMax} · AC {f.ac}</div>
                </span>
                {target?.id === f.id && <span className="fw-pill" style={{ background: "rgba(124,58,237,0.18)", borderColor: "var(--arcane)", color: "var(--arcane-bright)" }}>Selected</span>}
              </button>
            ))}
          </div>

          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            {isHex ? (
              <button className="fw-btn fw-btn-arcane" onClick={() => { setResult({ curse: true }); setStep("result"); }} disabled={!target}>
                {Icon("skull", { size: 12 })} Place curse
              </button>
            ) : (
              <button className="fw-btn fw-btn-arcane" onClick={rollAttack} disabled={!target}>
                {Icon("dice", { size: 12 })} Roll 2 beams · +7 each
              </button>
            )}
          </div>
        </>
      )}

      {step === "result" && (
        <>
          {result.curse ? (
            <div style={{ textAlign: "center", padding: 22 }}>
              <div style={{ color: "var(--arcane-bright)", fontSize: 36, marginBottom: 12 }}>{Icon("skull", { size: 36 })}</div>
              <div className="fw-display" style={{ fontSize: 20, color: "var(--text)", marginBottom: 6 }}>{target.name} is Cursed</div>
              <div className="fw-serif" style={{ fontStyle: "italic", color: "var(--text-2)", fontSize: 14, lineHeight: 1.5 }}>
                On each of your hits, 1d6 necrotic. Disadvantage on chosen ability checks.<br />Concentration · until rest or death.
              </div>
            </div>
          ) : (
            <div style={{ padding: 18 }}>
              <div className="fw-eyebrow" style={{ textAlign: "center", marginBottom: 12 }}>Beams · vs AC {target.ac}</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {result.rolls.map((r, i) => (
                  <div key={i} style={{ flex: 1, maxWidth: 180, padding: 12, background: r.hit ? "rgba(34,197,94,0.06)" : "rgba(153,27,27,0.06)", border: "1px solid " + (r.hit ? "rgba(34,197,94,0.35)" : "rgba(153,27,27,0.35)"), borderRadius: 8, textAlign: "center" }}>
                    <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Beam {i + 1}</div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 6 }}>
                      <span className="fw-display" style={{ fontSize: 22, color: r.crit ? "var(--gold-bright)" : "var(--text)" }}>{r.r}</span>
                      <span style={{ fontSize: 11, color: "var(--text-4)" }}>+7</span>
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>=</span>
                      <span className="fw-display" style={{ fontSize: 22, color: r.hit ? "var(--success)" : "var(--blood-bright)" }}>{r.total}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: r.hit ? "#86EFAC" : "#FCA5A5", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
                      {r.crit ? "Critical." : r.hit ? `Hit · ${r.dmg} force` : "Miss"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: 12, background: "var(--bg-deep)", borderRadius: 8, textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Total damage</span>
                <div className="fw-display" style={{ fontSize: 32, color: "var(--blood-bright)" }}>{result.totalDmg}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 2 }}>
                  {target.name} → <b style={{ color: "var(--text)", fontStyle: "normal" }}>{Math.max(0, target.hp - result.totalDmg)} / {target.hpMax}</b>
                </div>
              </div>
            </div>
          )}
          <div className="fw-flow-foot">
            <button className="fw-btn fw-btn-ghost" onClick={() => setFlow(null)}>Cancel</button>
            <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={apply}>
              {Icon("check", { size: 13 })} Commit
            </button>
          </div>
        </>
      )}
    </FlowModal>
  );
}

/* ============================================================
   FLOW MODAL shell
   ============================================================ */
function FlowModal({ title, accent, onClose, children }) {
  return (
    <div className="fw-flow-overlay" onClick={onClose}>
      <div className={"fw-flow-modal " + (accent ? "accent-" + accent : "")} onClick={e => e.stopPropagation()}>
        <div className="fw-flow-head">
          <div className="fw-display" style={{ fontSize: 16, color: "var(--text)" }}>{title}</div>
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose}>{Icon("x", { size: 12 })}</button>
        </div>
        <div className="fw-flow-body">{children}</div>
      </div>
    </div>
  );
}

Object.assign(window, { CombatModeView });

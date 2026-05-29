/* global React, WIcon, PortraitArt,
   WR_VOTE, NODE_INFO, WR_PARTY, WR_FORGE_ITEMS, WR_GAMBLE, WR_GOLD, WR_TOASTS */

/* ============================================================
   WARDEN'S RUN — Extras
   FLOW 4.2  Vote panel (map overlay)
   FLOW 6.5  Forge
   FLOW 6.6  Gamble
   FLOW 7.3  Character death (mid-run modal)
   ============================================================ */

/* ============== VOTE OVERLAY (used on top of map) ============== */
function WRVotePanel({ onClose, onOverride }) {
  const [picked, setPicked] = React.useState(null);
  const [remaining, setRemaining] = React.useState(WR_VOTE.remainingSec);

  React.useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const pct = (remaining / WR_VOTE.totalSec) * 100;
  /* who voted */
  const voterOf = (id) => WR_PARTY.find(p => p.id === id);
  const leading = WR_VOTE.options.reduce((a, b) => (b.votes.length > a.votes.length ? b : a), WR_VOTE.options[0]);

  return (
    <div className="wr-vote-overlay" role="dialog" aria-modal="true">
      <div className="wr-vote-card">
        <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>

        <div className="wr-vote-head">
          <div className="wr-eyebrow" style={{ color: "var(--wr-violet-bright)" }}>The Party Decides</div>
          <div className="wr-vote-title">Where shall we venture?</div>
          <div className="wr-vote-timer-row">
            <span className={"wr-vote-timer " + (remaining < 10 ? "low" : "")}>{remaining}s</span>
            <div className="wr-vote-timer-bar"><span style={{ width: pct + "%" }} className={remaining < 10 ? "low" : ""}/></div>
          </div>
        </div>

        <div className="wr-vote-options">
          {WR_VOTE.options.map(o => {
            const info = NODE_INFO[o.kind];
            const isLeading = o === leading && o.votes.length > 0;
            const isPicked  = picked === o.kind;
            return (
              <button key={o.kind} className={"wr-vote-option " + (isPicked ? "picked " : "") + (isLeading ? "leading" : "")} onClick={()=>setPicked(o.kind)}>
                <div className={"wr-vote-ic " + info.color}>{WIcon(info.icon,{size:22})}</div>
                <div className="wr-vote-body">
                  <div className="wr-vote-name">{info.label}</div>
                  <div className="wr-vote-blurb">{o.blurb}</div>
                  <div className="wr-vote-voters">
                    {o.votes.length === 0
                      ? <span style={{ color: "var(--wr-text-4)", fontStyle: "italic" }}>No votes yet</span>
                      : o.votes.map(vid => {
                        const v = voterOf(vid);
                        return v && (
                          <span key={vid} className="wr-voter-pip" title={v.name}>
                            <span className="wr-voter-pip-port"><PortraitArt kind={v.portrait} color={v.color}/></span>
                            <span>{v.name}</span>
                          </span>
                        );
                      })}
                  </div>
                </div>
                <div className="wr-vote-tally">
                  <div className="wr-vote-tally-num">{o.votes.length + (isPicked && !o.votes.includes("aedric") ? 1 : 0)}</div>
                  <div className="wr-vote-tally-of">/ 4</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="wr-vote-foot">
          <div style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", fontSize: 12, color: "var(--wr-text-3)" }}>
            Auto-resolves on timeout · ties broken by the host
          </div>
          <span style={{ flex: 1 }}/>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onClose}>Watch</button>
          <button className="wr-btn wr-btn-sm" onClick={onClose}>{WIcon("compass",{size:11})} Cast vote</button>
          <button className="wr-btn wr-btn-gold wr-btn-sm" onClick={onOverride} title="Host only">
            {WIcon("crown",{size:11})} Override
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 6.5 — FORGE ============== */
function WRForge({ onBack }) {
  const [pickedItem, setPickedItem] = React.useState(WR_FORGE_ITEMS[0]);
  const [pickedOpt, setPickedOpt] = React.useState(null);
  const [forged, setForged] = React.useState(false);

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner">
        {/* Banner */}
        <div className="wr-event-banner">
          <div className="wr-event-banner-art"><SceneForge/></div>
          <div className="wr-event-banner-fade"/>
          <div className="wr-event-banner-title">
            <div className="eyebrow" style={{ color: "var(--wr-gold-bright)" }}>The Forge Awaits</div>
            <h2>An Anvil in the Dark</h2>
          </div>
        </div>

        <div className="wr-narration">
          A bellows still breathes in the chamber beyond, though no smith stands at the anvil. The brass is hot. One item only — choose with care.
        </div>

        <div className="wr-forge-grid">
          {/* Items list */}
          <div className="wr-panel" style={{ padding: 12 }}>
            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Party Equipment</div>
            {WR_FORGE_ITEMS.map(it => (
              <button key={it.id} className={"wr-forge-row " + (pickedItem.id === it.id ? "active" : "") + (it.options ? "" : " disabled")}
                onClick={() => it.options && setPickedItem(it)}
                disabled={!it.options}>
                <div className="wr-forge-row-ic">{WIcon(it.icon,{size:18})}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 12, letterSpacing: "0.08em", color: "var(--wr-bone)" }}>
                    {it.name} <span style={{ color: "var(--wr-gold-bright)", fontFamily: "var(--wr-f-mono)" }}>{it.tier}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic" }}>
                    {it.who} · {it.desc}
                  </div>
                </div>
                {!it.options && <span className="wr-chip" style={{ fontSize: 8 }}>Maxed</span>}
              </button>
            ))}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--wr-edge-soft)", fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic", textAlign: "center" }}>
              One forging permitted per visit.
            </div>
          </div>

          {/* Selected item + options */}
          <div className="wr-panel wr-forge-detail">
            <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
            <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)", marginBottom: 10 }}>Forge Choice</div>
            <div className="wr-forge-current">
              <div className="wr-forge-current-ic">{WIcon(pickedItem.icon,{size:32})}</div>
              <div>
                <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 16, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>{pickedItem.name}</div>
                <div style={{ fontSize: 12, color: "var(--wr-text-2)", fontStyle: "italic", marginTop: 2 }}>{pickedItem.who} · current: {pickedItem.tier}</div>
              </div>
              <span style={{ flex: 1 }}/>
              <div className="wr-forge-arrow">{pickedItem.tier} {WIcon("arrowR",{size:14})} <b style={{ color: "var(--wr-gold-bright)" }}>+{(parseInt(pickedItem.tier.replace(/\D/g,""))||0)+1}</b></div>
            </div>

            <div className="wr-forge-options">
              {pickedItem.options.map(o => (
                <button key={o.id} className={"wr-forge-opt " + o.color + (pickedOpt === o.id ? " selected" : "")} onClick={()=>setPickedOpt(o.id)}>
                  <div className="wr-forge-opt-ic">{WIcon(o.color === "blood" ? "sword" : o.color === "gold" ? "shield" : "rune",{size:18})}</div>
                  <div style={{ flex: 1, fontSize: 13, letterSpacing: "0.04em", color: "var(--wr-bone)" }}>{o.label}</div>
                  <span className={"wr-forge-check " + (pickedOpt === o.id ? "on" : "")}>{WIcon("check",{size:11})}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="wr-btn wr-btn-ghost" onClick={onBack} style={{ flex: 1, justifyContent: "center" }}>Leave Forge</button>
              <button className="wr-btn wr-btn-gold wr-btn-lg" disabled={!pickedOpt || forged} onClick={()=>setForged(true)} style={{ flex: 2, justifyContent: "center" }}>
                {forged ? <>{WIcon("check",{size:14})} Forged</> : <>{WIcon("hammer",{size:14})} Forge Item</>}
              </button>
            </div>
            {forged && (
              <div className="wr-forge-result">
                {WIcon("sparkles",{size:14})} The brass settles. <b>{pickedItem.name}</b> tempered.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 6.6 — GAMBLE ============== */
function WRGamble({ onBack }) {
  const [rolling, setRolling] = React.useState(false);
  const [result, setResult] = React.useState(null); // { roll, band }

  const roll = () => {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      const r = 1 + Math.floor(Math.random() * 20);
      const band = WR_GAMBLE.outcomes.find(o => {
        if (o.roll === String(r)) return true;
        if (o.roll.includes("–")) {
          const [a, b] = o.roll.split("–").map(Number);
          return r >= a && r <= b;
        }
        return false;
      }) || WR_GAMBLE.outcomes[2];
      setRolling(false);
      setResult({ roll: r, band });
    }, 1100);
  };

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner">
        <div className="wr-event-banner">
          <div className="wr-event-banner-art"><SceneAltar/></div>
          <div className="wr-event-banner-fade"/>
          <div className="wr-event-banner-title">
            <div className="eyebrow" style={{ color: "var(--wr-violet-bright)" }}>An Altar of Two Faces</div>
            <h2>Fate Decides</h2>
          </div>
        </div>

        <div className="wr-narration">{WR_GAMBLE.flavor}</div>

        <div className="wr-gamble-grid">
          {/* Stake + roll */}
          <div className="wr-panel wr-gamble-stake">
            <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
            <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)" }}>Stake</div>
            <div className="wr-gamble-stake-num">
              <span className="wr-gold-coin" style={{ width: 24, height: 24, fontSize: 11 }}>G</span>
              <b>{WR_GAMBLE.stake}</b>
            </div>
            <div style={{ fontSize: 12, color: "var(--wr-text-3)", fontStyle: "italic", textAlign: "center", marginTop: 4 }}>
              You hold {WR_GOLD}g. The altar wants 50g to even speak.
            </div>

            <div className={"wr-die-stage " + (rolling ? "rolling " : "") + (result ? "settled " : "")}>
              {result ? (
                <div className={"wr-die-face roll-" + result.band.tone}>
                  <span>{result.roll}</span>
                </div>
              ) : (
                <div className="wr-die-face idle"><span>d20</span></div>
              )}
            </div>

            {result && (
              <div className={"wr-die-result tone-" + result.band.tone}>
                <div className="wr-eyebrow" style={{ marginBottom: 4 }}>Result · roll {result.roll}</div>
                <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 16, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>
                  {result.band.desc}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="wr-btn wr-btn-ghost" onClick={onBack} style={{ flex: 1, justifyContent: "center" }}>Walk Away</button>
              <button className="wr-btn wr-btn-violet wr-btn-lg" onClick={roll} disabled={rolling} style={{ flex: 2, justifyContent: "center" }}>
                {WIcon("dice2",{size:15})} {rolling ? "Rolling…" : result ? "Roll Again · 50g" : "Roll the Dice"}
              </button>
            </div>
          </div>

          {/* Risk + Reward preview */}
          <div className="wr-panel wr-gamble-table">
            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Risk · Reward</div>
            {WR_GAMBLE.outcomes.map(o => (
              <div key={o.roll} className={"wr-gamble-row tone-" + o.tone + (result?.band === o ? " hit" : "")}>
                <div className="wr-gamble-roll">{o.roll}</div>
                <div className="wr-gamble-bar"><span style={{ width: (o.weight * 5) + "%" }}/></div>
                <div className="wr-gamble-desc">{o.desc}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic" }}>
              The altar's weights are not perfectly fair. Bone is bone.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 7.3 — CHARACTER DEATH (mid-run modal) ============== */
function WRDeathModal({ open, onContinue }) {
  if (!open) return null;
  /* assume Halric just fell */
  const fallen = WR_PARTY[3];
  return (
    <div className="wr-death-overlay" role="dialog" aria-modal="true">
      <div className="wr-death-card">
        <div className="wr-death-rune">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" stroke="#8B1538" strokeWidth="1.5" fill="none"/>
            <circle cx="30" cy="30" r="20" stroke="#5B2A8C" strokeWidth="1" strokeDasharray="2 4" fill="none"/>
            <path d="M 15 30 L 30 15 L 45 30 L 30 45 Z" stroke="#C53456" fill="none" strokeWidth="1.2"/>
          </svg>
        </div>
        <div className="wr-death-portrait">
          <PortraitArt kind={fallen.portrait} color={fallen.color}/>
          <div className="wr-death-skull">{WIcon("skull",{size:42})}</div>
        </div>
        <div className="wr-eyebrow" style={{ color: "var(--wr-blood-bright)", marginTop: 14 }}>A Light Goes Out</div>
        <div className="wr-death-name">{fallen.name} <span style={{ color: "var(--wr-text-3)" }}>has fallen</span></div>
        <div className="wr-rule" style={{ maxWidth: 240, margin: "10px auto" }}><span className="wr-rule-diamond" style={{ background: "var(--wr-blood)" }}/></div>
        <div className="wr-death-epitaph">
          “He whispered his litany even as the shadow took him.<br/>
          Hold the line. The Reeve will be answered.”
        </div>
        <div className="wr-death-stats">
          <div><span className="wr-eyebrow">Class</span><b>{fallen.class}</b></div>
          <div><span className="wr-eyebrow">Levels</span><b>7</b></div>
          <div><span className="wr-eyebrow">Damage taken</span><b style={{ color: "var(--wr-blood-bright)" }}>248</b></div>
          <div><span className="wr-eyebrow">Last act</span><b>Cast Bless</b></div>
        </div>
        <div className="wr-death-foot">
          <div style={{ fontSize: 12, color: "var(--wr-text-3)", fontStyle: "italic", flex: 1, textAlign: "left" }}>
            3 of 4 wardens still stand. The run continues if any survive.
          </div>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onContinue}>Use Reliquary · revive</button>
          <button className="wr-btn wr-btn-blood" onClick={onContinue}>{WIcon("arrowR",{size:13})} Continue</button>
        </div>
      </div>
    </div>
  );
}

/* ============== SCENE ART ============== */
function SceneForge() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <radialGradient id="fg-glow" cx="50%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.55"/>
          <stop offset="60%" stopColor="#8B1538" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#050309" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="#0a0612"/>
      <ellipse cx="400" cy="200" rx="320" ry="100" fill="url(#fg-glow)"/>
      {/* anvil */}
      <g fill="#1a1024" stroke="#3a2849" strokeWidth="1.2">
        <path d="M 300 220 L 500 220 L 480 200 L 320 200 Z"/>
        <rect x="340" y="170" width="120" height="30" fill="#251735"/>
        <path d="M 360 170 L 440 170 L 440 100 L 360 100 Z"/>
        {/* horn */}
        <path d="M 460 110 Q 510 110 520 130 Q 510 140 460 130 Z"/>
      </g>
      {/* coals */}
      {Array.from({length: 18}).map((_,i)=> (
        <circle key={i} cx={350 + (i*7)%100} cy={195 + (i%3)*4} r={2 + (i%3)}
          fill={i%2 ? "#D4A028" : "#C53456"} opacity={0.7}/>
      ))}
      {/* hammer */}
      <g stroke="#9B5DE5" strokeWidth="2" fill="#1a1024">
        <rect x="380" y="40" width="40" height="20" rx="2"/>
        <rect x="395" y="58" width="10" height="80"/>
      </g>
      {/* sparks */}
      {Array.from({length: 12}).map((_,i) => (
        <circle key={i} cx={395 + (i%5)*8 - 16} cy={140 + (i%4)*10} r="1.2" fill="#D4A028" opacity="0.85"/>
      ))}
    </svg>
  );
}
function SceneAltar() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <radialGradient id="ga-glow" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.45"/>
          <stop offset="60%" stopColor="#5B2A8C" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#050309" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="#0a0612"/>
      <ellipse cx="400" cy="160" rx="340" ry="120" fill="url(#ga-glow)"/>
      {/* altar */}
      <g fill="#15101f" stroke="#3a2849" strokeWidth="1.4">
        <path d="M 320 230 L 480 230 L 460 200 L 340 200 Z"/>
        <rect x="340" y="160" width="120" height="40"/>
        <path d="M 350 160 L 450 160 L 460 130 L 340 130 Z"/>
      </g>
      {/* faces — left weeping, right laughing */}
      <g fill="none" stroke="#9B5DE5" strokeWidth="1.4">
        <circle cx="370" cy="142" r="10"/>
        <circle cx="365" cy="140" r="1.2" fill="#9B5DE5"/>
        <circle cx="375" cy="140" r="1.2" fill="#9B5DE5"/>
        <path d="M 365 148 Q 370 145 375 148"/>
        <path d="M 365 142 L 365 152 M 370 142 L 370 153" stroke="#5B2A8C" opacity="0.6"/>

        <circle cx="430" cy="142" r="10"/>
        <circle cx="425" cy="140" r="1.2" fill="#9B5DE5"/>
        <circle cx="435" cy="140" r="1.2" fill="#9B5DE5"/>
        <path d="M 425 148 Q 430 152 435 148"/>
      </g>
      {/* dice in air */}
      <g stroke="#D4A028" strokeWidth="1.4" fill="#1a1024">
        <rect x="510" y="80" width="24" height="24" rx="3" transform="rotate(15 522 92)"/>
        <rect x="540" y="120" width="20" height="20" rx="3" transform="rotate(-12 550 130)"/>
        <circle cx="522" cy="92" r="1.5" fill="#D4A028" transform="rotate(15 522 92)"/>
        <circle cx="550" cy="130" r="1.5" fill="#D4A028"/>
      </g>
      {/* embers */}
      {Array.from({length: 18}).map((_,i)=> (
        <circle key={i} cx={200 + i*25} cy={160 + (i%3)*30} r="1.2" fill="#9B5DE5" opacity={0.5 + (i%4)*0.1}/>
      ))}
    </svg>
  );
}

/* ============== TOAST STACK (utility, can be placed anywhere) ============== */
function WRToasts() {
  return (
    <div className="wr-toasts">
      {WR_TOASTS.map(t => (
        <div key={t.id} className={"wr-toast " + t.kind}>
          <span className="wr-toast-ic">{WIcon(t.icon,{size:13})}</span>
          <span style={{ flex: 1 }}>{t.text}</span>
          <button className="wr-toast-x" aria-label="Dismiss">{WIcon("x",{size:11})}</button>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { WRVotePanel, WRForge, WRGamble, WRDeathModal, WRToasts });

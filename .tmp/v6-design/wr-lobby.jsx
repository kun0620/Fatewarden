/* global React, WIcon, PortraitArt,
   WR_LOBBY, WR_VAULT_CHARS, WR_RECENT_RUNS, WR_FRIENDS,
   WR_DIFFICULTIES, WR_INTRO, WR_START_RELIC, WR_ACTIVE_UPGRADES, WR_POS_LABELS,
   WR_PARTY, WR_RUN, WR_WP */

/* ============================================================
   WARDEN'S RUN — Lobby flow (FLOW 1, 2, 3)
   Landing → Dashboard → Create Room → Lobby Room
   → Bind Character → Party Assembly → Run Intro
   ============================================================ */

/* ============== FLOW 1.1 — LANDING ============== */
function WRLanding({ onContinue }) {
  return (
    <div className="wr-landing">
      <div className="wr-landing-art" aria-hidden>
        <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
          <defs>
            <radialGradient id="lg-glow" cx="50%" cy="62%" r="55%">
              <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.35"/>
              <stop offset="55%" stopColor="#3a1e58" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#050309" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="lg-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d0719" stopOpacity="0"/>
              <stop offset="100%" stopColor="#050309" stopOpacity="1"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="720" fill="#080414"/>
          <ellipse cx="600" cy="440" rx="600" ry="240" fill="url(#lg-glow)"/>
          {/* gate silhouette */}
          <g fill="#040208" stroke="#231434" strokeWidth="1.2">
            <path d="M 360 720 V 360 Q 360 220 600 200 Q 840 220 840 360 V 720 Z" />
            <path d="M 600 200 V 720" stroke="#1b1028" strokeWidth="1.5"/>
            {/* arch ribs */}
            <path d="M 400 720 V 380 Q 400 260 600 240 Q 800 260 800 380 V 720" stroke="#1b1028" fill="none"/>
            <path d="M 440 720 V 400 Q 440 300 600 280 Q 760 300 760 400 V 720" stroke="#1b1028" fill="none"/>
            {/* pillar capitals */}
            <rect x="350" y="356" width="22" height="18" fill="#2a1b3a"/>
            <rect x="828" y="356" width="22" height="18" fill="#2a1b3a"/>
          </g>
          {/* burning braziers */}
          <g>
            <ellipse cx="305" cy="520" rx="30" ry="8" fill="#3b1a5a"/>
            <path d="M 300 520 Q 290 470 305 440 Q 320 470 310 520 Z" fill="#9B5DE5" opacity="0.85"/>
            <path d="M 302 510 Q 296 480 308 460 Q 314 480 306 510 Z" fill="#D4A028" opacity="0.95"/>
            <ellipse cx="895" cy="520" rx="30" ry="8" fill="#3b1a5a"/>
            <path d="M 890 520 Q 880 470 895 440 Q 910 470 900 520 Z" fill="#9B5DE5" opacity="0.85"/>
            <path d="M 892 510 Q 886 480 898 460 Q 904 480 896 510 Z" fill="#D4A028" opacity="0.95"/>
          </g>
          {/* embers */}
          {Array.from({length: 26}).map((_,i) => (
            <circle key={i} cx={120 + (i*37)%960 + (i%3)*10} cy={520 - (i*17)%280} r={(i%3)+1}
              fill={i%3===0 ? "#D4A028" : "#9B5DE5"} opacity={0.4 + ((i%5)/10)}/>
          ))}
          {/* floor mist */}
          <rect x="0" y="480" width="1200" height="240" fill="url(#lg-floor)"/>
        </svg>
      </div>

      <div className="wr-landing-frame">
        <div className="wr-landing-eyebrow">A descent for one to four wardens</div>
        <h1 className="wr-landing-title">
          FATE<span style={{color:"var(--wr-gold)"}}>·</span>WARDEN
        </h1>
        <div className="wr-landing-sub">Warden's Run</div>
        <div className="wr-rule" style={{ maxWidth: 320, margin: "20px auto" }}>
          <span className="wr-rule-diamond"/>
        </div>
        <div className="wr-landing-flavor">
          Run #18 awaits. The Reeve has not slept since you spared it.<br/>
          The brass is glowing again.
        </div>

        <div className="wr-landing-cta">
          <button className="wr-btn wr-btn-gold wr-btn-lg" onClick={onContinue}>
            {WIcon("compass",{ size: 15 })} Continue · Run #18
          </button>
          <button className="wr-btn wr-btn-ghost" onClick={onContinue}>
            {WIcon("plus",{ size: 13 })} New Run
          </button>
        </div>

        <div className="wr-landing-foot">
          <span className="wr-presence-dot online" /> 3 wardens online · session id YSAV·9217
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 1.2 — DASHBOARD ============== */
function WRDashboard({ onCreate, onJoin, onVault, onResume }) {
  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
        <div className="wr-dash-hero">
          <div>
            <div className="wr-eyebrow">Hearth · last seen 2 days ago</div>
            <div className="wr-landing-title" style={{ fontSize: 38, letterSpacing: "0.14em", margin: "4px 0 4px" }}>
              Welcome back, <span style={{ color: "var(--wr-gold-bright)" }}>Aedric</span>
            </div>
            <div className="wr-landing-flavor" style={{ fontSize: 15, textAlign: "left", margin: 0 }}>
              Your run is still open at the chapel. The Reeve has not moved.
            </div>
          </div>
          <div className="wr-dash-hero-wp">
            <div className="wr-eyebrow" style={{ color: "var(--wr-violet-bright)" }}>Warden Points</div>
            <div className="wr-dash-wp-num">{WR_WP.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "var(--wr-text-3)", fontStyle: "italic", marginTop: 4 }}>
              +{WR_RECENT_RUNS[0].wp} from current run
            </div>
          </div>
        </div>

        <div className="wr-dash-grid">
          {/* Resume / Quick start */}
          <div className="wr-panel wr-dash-actions">
            <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
            <button className="wr-dash-resume" onClick={onResume}>
              <span className="wr-presence-dot online pulse"/>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)" }}>Resume Run #17</div>
                <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 18, letterSpacing: "0.10em", marginTop: 2 }}>Cinder-Reeve · Stratum III</div>
                <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--wr-text-2)", marginTop: 4 }}>3 of 4 wardens online · last action 14 min ago</div>
              </div>
              {WIcon("arrowR", { size: 18 })}
            </button>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="wr-btn wr-btn-violet" style={{ flex: 1 }} onClick={onCreate}>{WIcon("plus",{size:12})} Open a new run</button>
              <button className="wr-btn" onClick={onJoin}>{WIcon("compass",{size:12})} Join by code</button>
              <button className="wr-btn wr-btn-ghost" onClick={onVault}>{WIcon("rune",{size:12})} Vault</button>
            </div>
          </div>

          {/* Friends column */}
          <div className="wr-panel" style={{ padding: 14 }}>
            <div className="wr-eyebrow" style={{ marginBottom: 10 }}>Wardens · online</div>
            {WR_FRIENDS.map(f => (
              <div key={f.handle} className="wr-friend-row">
                <div className="wr-friend-av" style={{ background: `linear-gradient(135deg, ${f.color || "#3a2849"}33, #1a0e2a)` }}>
                  {f.initials}
                  <span className={"wr-presence-dot " + f.presence}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 12, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic" }}>{f.activity}</div>
                </div>
                {f.presence === "online" && <button className="wr-btn wr-btn-sm wr-btn-ghost">Invite</button>}
              </div>
            ))}
          </div>
        </div>

        {/* Recent runs */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
            <div className="wr-eyebrow">Chronicle · recent runs</div>
            <span style={{ flex: 1, height: 1, background: "var(--wr-edge-soft)" }}/>
            <button className="wr-btn wr-btn-sm wr-btn-ghost">View all</button>
          </div>
          <div className="wr-runs-list">
            {WR_RECENT_RUNS.map(r => (
              <div key={r.n} className={"wr-run-row " + r.outcome}>
                <div className="wr-run-n">#{r.n}</div>
                <div className="wr-run-portraits">
                  {r.portraits.map((p,i) => (
                    <div key={i} className="wr-run-port" style={{ marginLeft: i ? -10 : 0, zIndex: 10 - i }}>
                      <PortraitArt kind={p} color={["#9B5DE5","#B8860B","#7BB662","#D4A028","#C53456"][i%5]}/>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 14, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic" }}>{r.when} · floors {r.floors}</div>
                </div>
                <div className={"wr-run-outcome " + r.outcome}>
                  {r.outcome === "victory" && <>{WIcon("crown",{size:11})} Victory</>}
                  {r.outcome === "defeat" && <>{WIcon("skull",{size:11})} Fallen</>}
                  {r.outcome === "ongoing" && <><span className="wr-presence-dot online pulse"/> Ongoing</>}
                </div>
                <div style={{ fontFamily: "var(--wr-f-mono)", fontSize: 12, color: "var(--wr-violet-bright)", width: 80, textAlign: "right" }}>
                  +{r.wp} WP
                </div>
                <button className="wr-btn wr-btn-icon wr-btn-ghost wr-btn-sm">{WIcon("chevR",{size:12})}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 2.1 — CREATE ROOM ============== */
function WRCreateRoom({ onOpen, onBack }) {
  const [name, setName] = React.useState("Cinder-Reeve Run");
  const [size, setSize] = React.useState(4);
  const [vis,  setVis ] = React.useState("invite");
  const [diff, setDiff] = React.useState("warden");

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack}>{WIcon("chevL",{size:11})} Back</button>
          <div className="wr-eyebrow">Create Room · step 1 of 3</div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)" }}>Open the Doors</div>
          <h2 className="wr-event-banner-title-h2" style={{ fontFamily: "var(--wr-f-head)", fontSize: 30, letterSpacing: "0.14em", color: "var(--wr-bone)", marginTop: 4 }}>
            A New Descent
          </h2>
          <div className="wr-rule" style={{ maxWidth: 280, margin: "12px auto 20px" }}><span className="wr-rule-diamond"/></div>
        </div>

        <div className="wr-form-grid">
          <div className="wr-field">
            <label className="wr-eyebrow">Room name</label>
            <input className="wr-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name your run…"/>
          </div>

          <div className="wr-field">
            <label className="wr-eyebrow">Mode</label>
            <div className="wr-input wr-input-static">
              <span style={{ color: "var(--wr-violet-bright)" }}>{WIcon("crownSkull",{size:14})}</span>
              <span style={{ flex: 1, color: "var(--wr-bone)", fontFamily: "var(--wr-f-head)", letterSpacing: "0.08em" }}>Warden's Run</span>
              <span style={{ color: "var(--wr-text-3)", fontSize: 11, fontStyle: "italic" }}>Co-op roguelite</span>
            </div>
          </div>

          <div className="wr-field">
            <label className="wr-eyebrow">Party size</label>
            <div className="wr-seg">
              {[1,2,3,4].map(n => (
                <button key={n} className={"wr-seg-btn " + (size === n ? "active" : "")} onClick={()=>setSize(n)}>{n}</button>
              ))}
            </div>
            <div className="wr-field-hint">{size === 1 ? "Solo. AI fills the remaining seats — they fight, you choose." : `${size} wardens. The descent scales to your line.`}</div>
          </div>

          <div className="wr-field">
            <label className="wr-eyebrow">Visibility</label>
            <div className="wr-seg">
              {[
                { v: "public", l: "Public" },
                { v: "invite", l: "Invite code" },
                { v: "private",l: "Private" },
              ].map(o => (
                <button key={o.v} className={"wr-seg-btn " + (vis === o.v ? "active" : "")} onClick={()=>setVis(o.v)}>{o.l}</button>
              ))}
            </div>
            <div className="wr-field-hint">
              {vis === "public" && "Anyone in the directory can join."}
              {vis === "invite" && "Only those with the room code or share link can join."}
              {vis === "private" && "Locked. You invite specific wardens by handle."}
            </div>
          </div>

          <div className="wr-field" style={{ gridColumn: "span 2" }}>
            <label className="wr-eyebrow">Difficulty</label>
            <div className="wr-diff-grid">
              {WR_DIFFICULTIES.map(d => (
                <button key={d.id} className={"wr-diff-card " + d.color + (diff === d.id ? " selected" : "")} onClick={()=>setDiff(d.id)}>
                  <div className="wr-diff-mark">{WIcon(d.id==="apprentice"?"sparkles":d.id==="warden"?"compass":"skull",{size:18})}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wr-diff-title">{d.label}</div>
                    <div className="wr-diff-desc">{d.desc}</div>
                    <ul className="wr-diff-mods">
                      {d.mods.map((m,i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                  <span className={"wr-diff-check " + (diff === d.id ? "on" : "")}>{WIcon("check",{size:11})}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="wr-btn wr-btn-ghost" onClick={onBack}>Cancel</button>
          <button className="wr-btn wr-btn-violet wr-btn-lg" onClick={onOpen}>
            Open the Doors {WIcon("arrowR",{size:14})}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 2.2 — ROOM LOBBY ============== */
function WRRoomLobby({ onBegin, onBind, onBack }) {
  const allReady = WR_LOBBY.seats.every(s => s.bound === null || s.ready);
  const occupied = WR_LOBBY.seats.filter(s => s.id && s.bound).length;
  const youSeat = WR_LOBBY.seats.find(s => s.you);

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack}>{WIcon("chevL",{size:11})} Leave room</button>
          <div className="wr-eyebrow">Lobby · step 2 of 3</div>
          <span style={{ flex: 1 }}/>
          <span className="wr-chip" style={{ color: "var(--wr-violet-bright)", borderColor: "var(--wr-violet-deep)" }}>
            <span className="wr-presence-dot online pulse"/> Live · {occupied}/4 bound
          </span>
        </div>

        <div className="wr-lobby-head">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow">Room name</div>
            <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 24, letterSpacing: "0.14em", color: "var(--wr-bone)", marginTop: 2 }}>{WR_LOBBY.roomName}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "var(--wr-text-3)", fontStyle: "italic" }}>
              <span>Mode: <b style={{ color: "var(--wr-text-2)", fontStyle: "normal" }}>{WR_LOBBY.mode}</b></span>
              <span>·</span>
              <span>Difficulty: <b style={{ color: "var(--wr-violet-bright)", fontStyle: "normal" }}>{WR_LOBBY.difficulty}</b></span>
              <span>·</span>
              <span>Visibility: <b style={{ color: "var(--wr-text-2)", fontStyle: "normal" }}>Invite code</b></span>
            </div>
          </div>
          <div className="wr-lobby-code">
            <div className="wr-eyebrow" style={{ fontSize: 9 }}>Room code</div>
            <div className="wr-lobby-code-val">{WR_LOBBY.roomCode}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="wr-btn wr-btn-sm">{WIcon("scroll",{size:11})} Copy</button>
              <button className="wr-btn wr-btn-sm wr-btn-ghost">{WIcon("compass",{size:11})} Share link</button>
            </div>
          </div>
        </div>

        <div className="wr-seats-grid">
          {WR_LOBBY.seats.map((s, i) => (
            <div key={s.id || i} className={"wr-seat " + (s.id ? (s.ready ? "ready" : "filled") : "empty") + (s.you ? " you" : "")}>
              <div className="wr-seat-num">Seat {i + 1}</div>
              {s.id ? (
                <>
                  <div className="wr-seat-portrait">
                    {s.bound ? <PortraitArt kind={s.bound} color={s.color}/> : (
                      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--wr-text-3)" }}>
                        {WIcon("question",{size:24})}
                      </div>
                    )}
                    {s.host && <div className="wr-seat-host">{WIcon("crown",{size:11})} Host</div>}
                  </div>
                  <div className="wr-seat-name">
                    {s.name} {s.you && <span style={{ color: "var(--wr-gold-bright)", fontSize: 9 }}>· YOU</span>}
                  </div>
                  <div className="wr-seat-handle">{s.handle}</div>
                  <div className="wr-seat-bound">
                    {s.bound
                      ? <>Bound: <b>{s.bound[0].toUpperCase() + s.bound.slice(1)}</b></>
                      : <span style={{ color: "var(--wr-warn)" }}>Choosing warden…</span>}
                  </div>
                  <div className={"wr-seat-status " + (s.ready ? "ready" : "")}>
                    {s.ready ? <>{WIcon("check",{size:11})} Ready</> : <>Not ready</>}
                  </div>
                </>
              ) : (
                <>
                  <div className="wr-seat-portrait empty">{WIcon("plus",{size:28})}</div>
                  <div className="wr-seat-name" style={{ color: "var(--wr-text-3)" }}>Open seat</div>
                  <div className="wr-seat-handle">Waiting for a warden…</div>
                  <button className="wr-btn wr-btn-sm wr-btn-ghost" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>Invite</button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Your control row */}
        <div className="wr-lobby-controls">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow">You · {youSeat?.name}</div>
            <div style={{ marginTop: 2, fontSize: 13, color: "var(--wr-text-2)" }}>
              {youSeat?.bound
                ? <>Bound to <b style={{ color: "var(--wr-bone)" }}>Aedric Vael · Warlock</b> · <button className="wr-btn wr-btn-sm wr-btn-ghost" onClick={onBind} style={{ marginLeft: 4 }}>Change</button></>
                : <>No warden bound yet. <button className="wr-btn wr-btn-sm" onClick={onBind}>Bind a warden</button></>}
            </div>
          </div>
          <button className={"wr-btn " + (youSeat?.ready ? "wr-btn-ghost" : "wr-btn-violet")}>
            {youSeat?.ready ? <>{WIcon("check",{size:12})} You are ready</> : <>{WIcon("compass",{size:12})} Mark Ready</>}
          </button>
          <button className={"wr-btn wr-btn-lg " + (allReady ? "wr-btn-gold" : "")} disabled={!allReady} onClick={onBegin} title={allReady ? "Begin the run" : "All wardens must be ready"}>
            {WIcon("arrowR",{size:14})} Begin Run
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 2.3 — BIND CHARACTER ============== */
function WRBindCharacter({ onBound, onBack }) {
  const [picked, setPicked] = React.useState("vc1");
  const sel = WR_VAULT_CHARS.find(c => c.id === picked);

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack}>{WIcon("chevL",{size:11})} Back to lobby</button>
          <div className="wr-eyebrow">Bind Character · choose your warden</div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div className="wr-eyebrow" style={{ color: "var(--wr-violet-bright)" }}>Pact-Binding</div>
          <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 28, letterSpacing: "0.14em", color: "var(--wr-bone)", marginTop: 4 }}>
            Choose Your Warden
          </div>
          <div className="wr-rule" style={{ maxWidth: 280, margin: "10px auto 14px" }}><span className="wr-rule-diamond"/></div>
          <div style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", color: "var(--wr-text-2)", fontSize: 14 }}>
            Once bound, a warden carries every wound and every relic of this run.
          </div>
        </div>

        <div className="wr-bind-grid">
          {WR_VAULT_CHARS.map(c => (
            <button key={c.id} className={"wr-bind-card " + (picked === c.id ? "selected" : "") + (c.tag === "wounded" ? " wounded" : "")} onClick={()=>setPicked(c.id)}>
              <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
              <div className="wr-bind-portrait">
                <PortraitArt kind={c.portrait} color={c.color}/>
                {c.bound && <span className="wr-chip gold" style={{ position: "absolute", top: 6, right: 6, fontSize: 8, padding: "1px 6px" }}>Last bound</span>}
                {c.tag === "wounded" && <span className="wr-chip blood" style={{ position: "absolute", top: 6, right: 6, fontSize: 8, padding: "1px 6px" }}>Wounded</span>}
                {c.tag === "new" && <span className="wr-chip" style={{ position: "absolute", top: 6, right: 6, fontSize: 8, padding: "1px 6px", color: "var(--wr-violet-bright)", borderColor: "var(--wr-violet)" }}>New</span>}
              </div>
              <div className="wr-bind-name">{c.name}</div>
              <div className="wr-bind-class">{c.cls} · Lv {c.lvl}</div>
              <div className="wr-bind-stats">
                <span>{WIcon("heart",{size:10})} {c.hp} HP</span>
                <span style={{ color: "var(--wr-violet-bright)" }}>{WIcon("rune",{size:10})} {c.pact}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer with selection */}
        <div className="wr-bind-foot">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow">Bound to</div>
            <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 18, color: "var(--wr-bone)", letterSpacing: "0.10em", marginTop: 2 }}>
              {sel.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--wr-text-3)", fontStyle: "italic" }}>
              {sel.cls} · Lv {sel.lvl} · {sel.hp} HP · {sel.pact}
            </div>
          </div>
          <button className="wr-btn wr-btn-ghost" onClick={onBack}>Cancel</button>
          <button className="wr-btn wr-btn-violet wr-btn-lg" onClick={onBound}>
            {WIcon("rune",{size:14})} Bind Pact
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 3.1 — PARTY ASSEMBLY ============== */
function WRAssembly({ onBegin, onBack }) {
  /* slotted positions (1=front,4=rear). Pre-arranged. */
  const slotted = [
    { pos: 1, char: WR_PARTY[0] }, // Kessra fighter — vanguard
    { pos: 2, char: WR_PARTY[1] }, // Mirenna druid  — flanker
    { pos: 3, char: WR_PARTY[2] }, // Aedric warlock — support
    { pos: 4, char: WR_PARTY[3] }, // Halric cleric  — rear
  ];

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack}>{WIcon("chevL",{size:11})} Back</button>
          <div className="wr-eyebrow">Assembly · step 3 of 3</div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)" }}>Form the Line</div>
          <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 28, letterSpacing: "0.14em", color: "var(--wr-bone)", marginTop: 4 }}>Party Assembly</div>
          <div className="wr-rule" style={{ maxWidth: 280, margin: "10px auto 16px" }}><span className="wr-rule-diamond"/></div>
        </div>

        {/* Line of battle */}
        <div className="wr-asm-line">
          {WR_POS_LABELS.map((p, i) => {
            const s = slotted[i];
            return (
              <div key={p.n} className="wr-asm-slot" data-pos={p.n}>
                <div className="wr-asm-slot-num">{p.n}</div>
                <div className="wr-asm-portrait">
                  <PortraitArt kind={s.char.portrait} color={s.char.color}/>
                </div>
                <div className="wr-asm-name">{s.char.name}</div>
                <div className="wr-asm-class">{s.char.class}</div>
                <div className="wr-asm-pos-title">{p.title}</div>
                <div className="wr-asm-pos-desc">{p.desc}</div>
                <button className="wr-btn wr-btn-sm wr-btn-ghost" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  {WIcon("refresh",{size:10})} Swap
                </button>
              </div>
            );
          })}
        </div>

        {/* Below: starting relic + active upgrades + party summary */}
        <div className="wr-asm-grid">
          <div className="wr-panel wr-asm-relic">
            <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
            <div className="wr-eyebrow" style={{ color: "var(--wr-gold-bright)" }}>Starting Relic</div>
            <div className="wr-asm-relic-card">
              <div className="wr-asm-relic-icon">{WIcon(WR_START_RELIC.icon,{size:28})}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 14, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>{WR_START_RELIC.name}</div>
                <div style={{ fontSize: 11, color: "var(--wr-violet-bright)", letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "var(--wr-f-head)", marginTop: 2 }}>{WR_START_RELIC.rarity}</div>
                <div style={{ fontSize: 12.5, color: "var(--wr-text-2)", fontStyle: "italic", marginTop: 6, lineHeight: 1.45 }}>
                  {WR_START_RELIC.desc}
                </div>
              </div>
            </div>
            <button className="wr-btn wr-btn-sm wr-btn-ghost" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
              {WIcon("refresh",{size:10})} Re-roll · 1 of 2
            </button>
          </div>

          <div className="wr-panel" style={{ padding: 14 }}>
            <div className="wr-eyebrow" style={{ color: "var(--wr-violet-bright)", marginBottom: 8 }}>Active Warden Upgrades</div>
            {WR_ACTIVE_UPGRADES.map((u, i) => (
              <div key={i} className="wr-up-row">
                <div className="wr-up-ic">{WIcon(u.icon,{size:14})}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 12, letterSpacing: "0.08em", color: "var(--wr-bone)" }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--wr-text-3)", fontStyle: "italic" }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="wr-panel" style={{ padding: 14 }}>
            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Line Summary</div>
            <div style={{ fontSize: 13, color: "var(--wr-text-2)", lineHeight: 1.5 }}>
              <div><b style={{ color: "var(--wr-bone)" }}>Total HP</b> <span style={{ fontFamily: "var(--wr-f-mono)", color: "var(--wr-blood-bright)" }}>226</span> · max <span style={{ fontFamily: "var(--wr-f-mono)" }}>226</span></div>
              <div><b style={{ color: "var(--wr-bone)" }}>Block</b> <span style={{ fontFamily: "var(--wr-f-mono)", color: "var(--wr-gold-bright)" }}>+1 / floor 1</span></div>
              <div><b style={{ color: "var(--wr-bone)" }}>Gold</b> <span style={{ fontFamily: "var(--wr-f-mono)", color: "var(--wr-gold-bright)" }}>50g</span> (Heavier Purse)</div>
              <div style={{ marginTop: 6, fontStyle: "italic", color: "var(--wr-text-3)" }}>The Reeve waits 6 floors deep. Line is set.</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
          <button className="wr-btn wr-btn-ghost" onClick={onBack}>Re-bind</button>
          <button className="wr-btn wr-btn-gold wr-btn-lg" onClick={onBegin}>
            {WIcon("compass",{size:14})} Begin Run
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== FLOW 3.2 — RUN INTRO (cinematic) ============== */
function WRIntro({ onEnter }) {
  return (
    <div className="wr-intro">
      <div className="wr-intro-bg" aria-hidden>
        <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
          <defs>
            <radialGradient id="ig-glow" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.25"/>
              <stop offset="50%" stopColor="#3a1e58" stopOpacity="0.08"/>
              <stop offset="100%" stopColor="#050309" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="720" fill="#050309"/>
          <ellipse cx="600" cy="400" rx="700" ry="240" fill="url(#ig-glow)"/>
          {/* descending stairs silhouette */}
          <g fill="#0c071a" stroke="#1b1028" strokeWidth="1">
            <path d="M 0 720 L 0 540 L 200 540 L 200 580 L 380 580 L 380 615 L 540 615 L 540 645 L 660 645 L 660 670 L 820 670 L 820 690 L 1200 690 L 1200 720 Z" />
          </g>
          {/* glow at bottom */}
          <ellipse cx="600" cy="700" rx="500" ry="40" fill="#9B5DE5" opacity="0.15"/>
        </svg>
      </div>
      <div className="wr-intro-content">
        <div className="wr-intro-eyebrow">Run #18 begins</div>
        <div className="wr-intro-stratum">{WR_INTRO.stratum}</div>
        <div className="wr-intro-title">{WR_INTRO.title}</div>
        <div className="wr-rule" style={{ maxWidth: 360, margin: "20px auto" }}><span className="wr-rule-diamond"/></div>
        <div className="wr-intro-lines">
          {WR_INTRO.lines.map((l, i) => <p key={i} style={{ animationDelay: (0.5 + i * 0.7) + "s" }}>{l}</p>)}
        </div>
        <button className="wr-btn wr-btn-violet wr-btn-lg wr-intro-cta" onClick={onEnter}>
          Enter the Chapel {WIcon("arrowR",{size:14})}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  WRLanding, WRDashboard, WRCreateRoom, WRRoomLobby,
  WRBindCharacter, WRAssembly, WRIntro,
});

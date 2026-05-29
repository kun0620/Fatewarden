/* global React, Icon, FateSeal, FateLogo, Card, CardHead, Field, MOCK */

/* ============================================================
   SCREEN: LOGIN
   ============================================================ */
function LoginScreen({ onAuth }) {
  const [mode, setMode] = React.useState("sign-in"); // or "create"
  const [showPw, setShowPw] = React.useState(false);
  const [email, setEmail] = React.useState("aedric.vael@oakwarden.realm");
  const [pw, setPw] = React.useState("••••••••••••");

  return (
    <div className="fw-login-wrap">
      {/* Background — atmospheric seal art */}
      <div className="fw-login-art">
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.5 }}>
          <div style={{ position: "relative", width: 720, height: 720 }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.7 }}>
              <FateSeal size={720} animate />
            </div>
            <div style={{ position: "absolute", inset: 130, opacity: 0.8 }}>
              <FateSeal size={460} animate={false} />
            </div>
          </div>
        </div>
        {/* corners flavor */}
        <div style={{ position: "absolute", top: 28, left: 28, color: "var(--text-3)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 10 }}>
          <FateLogo size="sm" />
        </div>
        <div style={{ position: "absolute", bottom: 28, left: 28, right: 28, display: "flex", alignItems: "center", gap: 12, color: "var(--text-3)", fontSize: 11.5 }}>
          <span className="fw-eyebrow">Volume Seven · Of Pacts &amp; Patient Gods</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border), transparent, var(--border))" }} />
          <span style={{ fontFamily: "var(--f-mono)" }}>v 0.8.3 — Rite of Embers</span>
        </div>
      </div>

      {/* Foreground — centered card */}
      <div className="fw-login-stage">
        <div className="fw-login-card fw-orn fw-fade">
          <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" /><span className="fw-orn-c br" />

          <div style={{ textAlign: "center" }}>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>
              {mode === "sign-in" ? "Return to the Table" : "Take Up the Mantle"}
            </div>
            <h1 className="fw-display" style={{ fontSize: 28, color: "var(--text)", lineHeight: 1.15 }}>
              {mode === "sign-in" ? "Welcome back, warden." : "Forge a new pact."}
            </h1>
            <p className="fw-serif" style={{ fontSize: 14, color: "var(--text-2)", marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
              {mode === "sign-in"
                ? "Your party waits. The Cinder-Reeve has not moved since last session."
                : "Bind a name to your dice. Carry it through every campaign."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <button className={"fw-tab " + (mode === "sign-in" ? "active" : "")} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={"fw-tab " + (mode === "create" ? "active" : "")} onClick={() => setMode("create")}>Create account</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "create" && (
              <Field label="Warden Name">
                <input className="fw-input" defaultValue="Aedric" />
              </Field>
            )}
            <Field label="Email">
              <input className="fw-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@realm.tld" />
            </Field>
            <Field label="Passphrase" right={
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => setShowPw(s => !s)}>
                {Icon(showPw ? "eyeOff" : "eye", { size: 12 })} {showPw ? "hide" : "show"}
              </button>
            }>
              <input className="fw-input" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" />
            </Field>

            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-3)" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid var(--border)", background: "var(--bg-deep)", display: "grid", placeItems: "center", color: "var(--gold)" }}>
                  {Icon("check", { size: 10 })}
                </span>
                Keep me at the table
              </label>
              <span style={{ flex: 1 }} />
              <a href="#" style={{ color: "var(--gold)", textDecoration: "none" }}>Forgot passphrase?</a>
            </div>
          </div>

          <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ justifyContent: "center" }} onClick={onAuth}>
            {Icon("login", { size: 16 })}
            {mode === "sign-in" ? "Enter the table" : "Bind your name"}
          </button>

          <div className="fw-divider"><span style={{ fontSize: 11, letterSpacing: "0.2em" }}>OR</span></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }}>
              {Icon("globe", { size: 14 })} Discord
            </button>
            <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }}>
              {Icon("link", { size: 14 })} Roll20 SSO
            </button>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", paddingTop: 6, borderTop: "1px dashed var(--border-soft)", marginTop: 4 }}>
            By entering you accept the <a href="#" style={{ color: "var(--text-3)" }}>Warden's Compact</a>.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN: MAIN MENU
   ============================================================ */
function MainMenuScreen({ go }) {
  const featured = MOCK.campaigns[0];
  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ paddingTop: 20 }}>

        {/* CONTINUE — hero block */}
        <Card elev className="fw-fade fw-orn" style={{ overflow: "hidden", marginBottom: 28, padding: 0 }}>
          <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", minHeight: 280 }}>
            <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="fw-pill gold">{Icon("flame", { size: 11 })} Continue Adventure</span>
                <span className="fw-pill dim">{Icon("history", { size: 11 })} Last played 2d ago</span>
              </div>
              <div>
                <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Act III · The Gilded Tomb</div>
                <h1 className="fw-display" style={{ fontSize: 36, lineHeight: 1.05 }}>
                  The Hollow Crown<br/><span style={{ color: "var(--gold)" }}>of Ysavir</span>
                </h1>
              </div>
              <p className="fw-serif" style={{ fontSize: 16, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 540, fontStyle: "italic" }}>
                The party stands before the chapel's binding circle. Halric remains down, stabilized but unconscious. The Cinder-Reeve waits for an answer.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                <button className="fw-btn fw-btn-gold fw-btn-lg" onClick={() => go("game")}>
                  {Icon("play", { size: 14 })} Resume Session 15
                </button>
                <button className="fw-btn fw-btn-ghost">{Icon("scroll", { size: 14 })} Session recap</button>
                <span style={{ flex: 1 }} />
                <div style={{ display: "flex", marginRight: 4 }}>
                  {MOCK.party.slice(0,4).map((p,i) => (
                    <div key={p.id} className="fw-avatar sm" style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.color}33, #15101f)` }}>{p.initials}</div>
                  ))}
                </div>
                <span style={{ color: "var(--text-3)", fontSize: 12 }}>4 players · live in 2d</span>
              </div>
            </div>
            <div style={{ position: "relative", background: "linear-gradient(135deg, #1a1428 0%, #0a0814 100%)", borderLeft: "1px solid var(--border-soft)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background:
                "radial-gradient(ellipse at 30% 40%, rgba(214,168,79,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.22), transparent 60%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.6 }}>
                <FateSeal size={260} animate />
              </div>
              {/* mock scene tag */}
              <div style={{ position: "absolute", left: 20, bottom: 20, right: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="fw-pill">Chapel of the Gilded Censer</span>
                <span className="fw-pill dim">Indoor · Dim Light</span>
                <span className="fw-pill blood">Combat possible</span>
              </div>
            </div>
          </div>
        </Card>

        {/* QUICK ACTIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
          <ActionTile icon="plus" gold title="Create Room" desc="New game, your rules" onClick={() => go("roomSetup")} />
          <ActionTile icon="login" title="Join Room" desc="With invite code" />
          <ActionTile icon="users" title="My Characters" desc="6 across 3 campaigns" />
          <ActionTile icon="book" title="Campaign Library" desc="14 campaigns" onClick={() => go("library")} />
          <ActionTile icon="wand" arcane title="AI Warden" desc="Try a solo run" />
          <ActionTile icon="cog" title="Settings" desc="Audio · Rules · Theme" onClick={() => go("settings")} />
        </div>

        {/* MIDDLE: characters + active rooms */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* My Characters */}
          <Card>
            <CardHead icon="users" title="My Characters" right={
              <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("plus", { size: 12 })} New</button>
            } />
            <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { name: "Aedric Vael",   role: "Tiefling Warlock · 7",      hp: 38, hpMax: 52, status: "Active · Ysavir" , color:"#7C3AED", init:"AE" },
                { name: "Vael of Hold",  role: "Half-Orc Paladin · 5",      hp: 0,  hpMax: 60, status: "Retired"          , color:"#D6A84F", init:"VH" },
                { name: "Quill Marrow",  role: "Halfling Rogue · 3",        hp: 22, hpMax: 26, status: "Salt & Ash · draft", color:"#22C55E", init:"QM" },
                { name: "Vesseline",     role: "Elf Wizard · 9",            hp: 41, hpMax: 48, status: "Archived"         , color:"#A8A29E", init:"VE" },
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: 12, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
                  <div className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${c.color}33, #15101f)` }}>{c.init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 8 }}>{c.role}</div>
                    <div className="fw-stat-bar">
                      <span className="lbl">HP</span>
                      <div className="fw-bar hp bar"><i style={{ width: `${(c.hp/c.hpMax)*100}%` }} /></div>
                      <span className="num">{c.hp}/{c.hpMax}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, fontFamily: "var(--f-serif)", fontStyle: "italic" }}>{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active rooms */}
          <Card>
            <CardHead icon="hex" title="Active Rooms" right={<button className="fw-btn fw-btn-ghost fw-btn-sm">View all</button>} />
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {MOCK.activeRooms.map(r => (
                <div key={r.id} style={{ padding: 12, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.live
                      ? <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2s infinite" }}><span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor" }} /> Live</span>
                      : <span className="fw-pill dim">Lobby</span>}
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>{r.code}</span>
                    <span style={{ flex: 1 }} />
                    <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("copy", { size: 11 })}</button>
                  </div>
                  <div className="fw-display" style={{ fontSize: 15, color: "var(--text)" }}>{r.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-3)" }}>
                    <span>{r.host}</span>
                    <span>·</span>
                    <span>{r.mode}</span>
                    <span style={{ flex: 1 }} />
                    <span>{r.players}/{r.max}</span>
                    <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => r.live ? "" : ""}>
                      {r.live ? <>Rejoin {Icon("arrowR", { size: 11 })}</> : <>Open lobby {Icon("arrowR", { size: 11 })}</>}
                    </button>
                  </div>
                </div>
              ))}
              <button className="fw-btn fw-btn-ghost" style={{ justifyContent: "center" }}>
                {Icon("plus", { size: 12 })} Join with code
              </button>
            </div>
          </Card>
        </div>

        {/* Recent campaigns timeline */}
        <Card>
          <CardHead icon="scroll" title="Recent Campaigns" right={
            <div style={{ display: "flex", gap: 6 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("filter", { size: 11 })} Filter</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go("library")}>View library {Icon("arrowR", { size: 11 })}</button>
            </div>
          } />
          <div style={{ padding: "8px 8px 16px" }}>
            {MOCK.recent.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, padding: "14px 12px", alignItems: "center", borderBottom: i === MOCK.recent.length - 1 ? "none" : "1px solid var(--border-soft)" }}>
                <div style={{ width: 96, height: 56, borderRadius: 6, background: "linear-gradient(135deg, #1a1428, #0c0a14)", border: "1px solid var(--border-soft)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: i === 0 ? "radial-gradient(ellipse at 30% 30%, rgba(214,168,79,0.35), transparent 60%)" : "radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.35), transparent 60%)" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div className="fw-display" style={{ fontSize: 14 }}>{r.name}</div>
                    <span className="fw-pill dim">{r.session}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.when}</span>
                  </div>
                  <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", color: "var(--text-2)", fontSize: 14 }}>{r.note}</div>
                </div>
                <button className="fw-btn fw-btn-ghost">Open</button>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}

function ActionTile({ icon, title, desc, gold, arcane, onClick }) {
  const c = gold ? "var(--gold-bright)" : arcane ? "var(--arcane-bright)" : "var(--text-2)";
  return (
    <button onClick={onClick} className="fw-card" style={{
      textAlign: "left", padding: 16, cursor: "pointer", color: "var(--text)",
      borderColor: gold ? "rgba(214,168,79,0.3)" : arcane ? "rgba(124,58,237,0.3)" : "var(--border-soft)",
      background: gold ? "linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))"
                : arcane ? "linear-gradient(180deg, rgba(124,58,237,0.08), rgba(124,58,237,0.01))" : "var(--surface)",
      display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
      font: "inherit",
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,0.35)", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center", color: c }}>
        {Icon(icon, { size: 16 })}
      </div>
      <div>
        <div className="fw-display" style={{ fontSize: 13, color: "var(--text)", letterSpacing: "0.08em" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  );
}

Object.assign(window, { LoginScreen, MainMenuScreen });

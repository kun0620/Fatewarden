/* global React, Icon, FateSeal, FateLogo, Card, CardHead, Field, MOCK */

/* ============================================================
   SCREEN: LOGIN
   ============================================================ */
function LoginScreen({ onAuth }) {
  const [mode, setMode] = React.useState("sign-in"); // or "create"
  const [showPw, setShowPw] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [email, setEmail] = React.useState("aedric.vael@oakwarden.realm");
  const [pw, setPw] = React.useState("hollowcrown-7");
  const [wname, setWname] = React.useState("Aedric");

  // floating embers — generated once
  const embers = React.useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      left: Math.random() * 100,
      delay: -Math.random() * 14,
      dur: 9 + Math.random() * 10,
      size: 1 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 60,
      opacity: 0.35 + Math.random() * 0.55,
    })),
  []);

  return (
    <div className="fw-login-wrap">
      {/* ---------- LEFT — ATMOSPHERIC HERO ---------- */}
      <aside className="fw-login-hero">
        <div className="fw-login-hero-bg" aria-hidden="true">
          <div className="fw-login-seal-stack">
            <FateSeal size={680} animate />
            <div className="fw-login-seal-inner"><FateSeal size={360} animate={false} /></div>
          </div>
          <div className="fw-login-embers">
            {embers.map((e, i) => (
              <span key={i} style={{
                left: e.left + "%",
                width: e.size, height: e.size,
                animationDelay: e.delay + "s",
                animationDuration: e.dur + "s",
                "--drift": e.drift + "px",
                opacity: e.opacity,
              }} />
            ))}
          </div>
        </div>

        {/* top brand */}
        <div className="fw-login-hero-top">
          <FateLogo size="sm" />
          <span className="fw-pill dim" style={{ fontSize: 10 }}>
            <span className="fw-dot fw-dot-gold" /> Realm online · 12,408 wardens
          </span>
        </div>

        {/* center: tagline + tonight-at-the-table */}
        <div className="fw-login-hero-center">
          <div className="fw-eyebrow" style={{ color: "var(--gold)" }}>Volume Seven · Of Pacts &amp; Patient Gods</div>
          <h1 className="fw-display fw-login-tagline">
            The dice<br />remember<br /><span style={{ color: "var(--gold-bright)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>everything.</span>
          </h1>
          <p className="fw-serif fw-login-flavor">
            "And when the warden returned, the table had not gone cold — only patient."
          </p>

          {/* Tonight-at-the-table preview */}
          <div className="fw-login-session fw-orn">
            <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
            <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
            <div className="fw-login-session-head">
              <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2.4s infinite" }}>
                <span className="fw-dot" /> Awaiting your move
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>SESSION 15 · 2d ago</span>
            </div>
            <div className="fw-display fw-login-session-title">The Hollow Crown of Ysavir</div>
            <div className="fw-serif" style={{ fontStyle: "italic", color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
              The chapel's binding circle still smolders. Halric breathes shallow. The Cinder-Reeve has not moved.
            </div>
            <div className="fw-login-session-party">
              {[
                { i: "AE", c: "#7C3AED" },
                { i: "BR", c: "#D6A84F" },
                { i: "MK", c: "#22C55E" },
                { i: "TH", c: "#C72D2D" },
              ].map((p, i) => (
                <span key={i} className="fw-avatar sm" style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.c}33, #15101f)`, borderColor: p.c + "55" }}>{p.i}</span>
              ))}
              <span style={{ flex: 1, color: "var(--text-3)", fontSize: 11.5, marginLeft: 10 }}>
                Brask, Mira, Thelos · 3 wardens at the table
              </span>
            </div>
          </div>
        </div>

        {/* bottom flavor */}
        <div className="fw-login-hero-bottom">
          <span className="fw-eyebrow">Chronicle</span>
          <span className="fw-hr-line" />
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--text-3)" }}>v 0.8.3 — Rite of Embers</span>
        </div>
      </aside>

      {/* ---------- RIGHT — FORM ---------- */}
      <main className="fw-login-form-pane">
        <div className="fw-login-card fw-orn">
          <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" /><span className="fw-orn-c br" />

          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>
              {mode === "sign-in" ? "Return to the Table" : "Take Up the Mantle"}
            </div>
            <h2 className="fw-display" style={{ fontSize: 26, color: "var(--text)", lineHeight: 1.15 }}>
              {mode === "sign-in" ? "Welcome back, warden." : "Forge a new pact."}
            </h2>
            <p className="fw-serif" style={{ fontSize: 14, color: "var(--text-2)", marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
              {mode === "sign-in"
                ? "Sign your sigil. Your party hasn't strayed far."
                : "Bind a name to your dice. Carry it through every campaign."}
            </p>
          </div>

          <div className="fw-login-tabs">
            <button className={"fw-tab " + (mode === "sign-in" ? "active" : "")} onClick={() => setMode("sign-in")}>Sign in</button>
            <button className={"fw-tab " + (mode === "create" ? "active" : "")} onClick={() => setMode("create")}>Create account</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "create" && (
              <Field label="Warden Name" hint="How the table will know you">
                <input className="fw-input" value={wname} onChange={e => setWname(e.target.value)} placeholder="e.g. Aedric, Sister Vael…" />
              </Field>
            )}
            <Field label="Email">
              <div className="fw-input-wrap">
                <span className="fw-input-icon">{Icon("mail", { size: 13 })}</span>
                <input className="fw-input has-icon" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@realm.tld" />
              </div>
            </Field>
            <Field label="Passphrase" right={
              <a href="#" style={{ color: "var(--gold)", textDecoration: "none", fontSize: 11, letterSpacing: "0.04em" }}>Forgot?</a>
            }>
              <div className="fw-input-wrap">
                <span className="fw-input-icon">{Icon("lock", { size: 13 })}</span>
                <input className="fw-input has-icon has-trail" type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••••" />
                <button type="button" className="fw-input-trail" onClick={() => setShowPw(s => !s)} title={showPw ? "Hide passphrase" : "Reveal passphrase"}>
                  {Icon(showPw ? "eyeOff" : "eye", { size: 13 })}
                </button>
              </div>
            </Field>

            <label className="fw-login-remember">
              <span className={"fw-check " + (remember ? "on" : "")} onClick={(e) => { e.preventDefault(); setRemember(r => !r); }}>
                {remember && Icon("check", { size: 10 })}
              </span>
              <span>Keep me at the table</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-4)", fontSize: 10.5 }}>30 days</span>
            </label>
          </div>

          <button className="fw-btn fw-btn-gold fw-btn-lg fw-login-cta" onClick={onAuth}>
            {Icon("login", { size: 15 })}
            <span>{mode === "sign-in" ? "Enter the table" : "Bind your name"}</span>
            <span className="fw-login-cta-arrow">{Icon("arrowR", { size: 14 })}</span>
          </button>

          <div className="fw-divider"><span style={{ fontSize: 10.5, letterSpacing: "0.22em" }}>OR SUMMON VIA</span></div>

          <div className="fw-login-sso">
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn">
              <span className="fw-login-sso-mark" style={{ background: "#5865F2" }} aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M20.3 4.4A19.8 19.8 0 0015.4 3l-.2.4a14.7 14.7 0 014.4 2.1 14 14 0 00-12 0A14.7 14.7 0 018 3.4L7.9 3a19.8 19.8 0 00-5 1.4A20.7 20.7 0 002.5 18a19.9 19.9 0 005.9 3l.5-.7a14.2 14.2 0 01-2.3-1.1l.5-.3a13.9 13.9 0 0010.8 0l.5.3a13.7 13.7 0 01-2.3 1.1l.5.7a19.8 19.8 0 006-3 20.6 20.6 0 00-2.3-13.6zM9 15.3a2.4 2.4 0 010-4.7 2.4 2.4 0 010 4.7zm6.1 0a2.4 2.4 0 010-4.7 2.4 2.4 0 010 4.7z"/></svg>
              </span>
              <span>Discord</span>
            </button>
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn">
              <span className="fw-login-sso-mark" style={{ background: "#fff" }} aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h6a5.2 5.2 0 01-2.2 3.4v2.8h3.6c2.1-2 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.8l-3.6-2.8a6.6 6.6 0 01-9.8-3.5H2.2v2.9A11 11 0 0012 23z"/><path fill="#FBBC05" d="M5.9 13.9a6.6 6.6 0 010-4.2V6.8H2.2a11 11 0 000 9.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.7l3.1-3.1A11 11 0 002.2 6.8L5.9 9.7A6.6 6.6 0 0112 5.4z"/></svg>
              </span>
              <span>Google</span>
            </button>
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn">
              <span className="fw-login-sso-mark" style={{ background: "#1877F2" }} aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0022 12z"/></svg>
              </span>
              <span>Facebook</span>
            </button>
          </div>

          <div className="fw-login-foot">
            <span>By entering you accept the <a href="#">Warden's Compact</a> &amp; <a href="#">Scrivener's Privacy</a>.</span>
          </div>
        </div>

        <div className="fw-login-aside-help">
          New to the table? <a href="#" onClick={(e) => { e.preventDefault(); setMode("create"); }}>Forge a pact in 60 seconds →</a>
        </div>
      </main>
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
          <ActionTile icon="login" title="Join Room" desc="With invite code" onClick={() => go("lobby")} />
          <ActionTile icon="users" title="My Characters" desc="6 across 3 campaigns" onClick={() => go("charSheet")} />
          <ActionTile icon="crown" gold title="DM Dashboard" desc="Tonight: Session 16" onClick={() => go("dmDash")} />
          <ActionTile icon="book" title="Campaign Library" desc="14 campaigns" onClick={() => go("library")} />
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

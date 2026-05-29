/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   SCREEN: CAMPAIGN LIBRARY
   ============================================================ */
function CampaignLibraryScreen({ go }) {
  const [filter, setFilter] = React.useState("All");
  const [view, setView] = React.useState("grid");

  const all = [
    ...MOCK.campaigns,
    { id: "cm5", title: "The Salt-Crown Court",  subtitle: "Political intrigue · Side",
      sessions: 9,  hours: 26, players: 5, status: "active",   theme: "High Fantasy", lastPlayed: "5 days ago" },
    { id: "cm6", title: "Last Light of Kaerwen", subtitle: "Mini-arc · Whisper-haunt",
      sessions: 3,  hours: 8,  players: 4, status: "paused",   theme: "Horror",       lastPlayed: "2 months ago" },
    { id: "cm7", title: "The Bastard Saint",     subtitle: "Investigation · Concluded",
      sessions: 18, hours: 56, players: 4, status: "archived", theme: "Mystery",      lastPlayed: "1 year ago" },
  ];

  const statusColor = s => ({
    active: { bg: "rgba(34,197,94,0.10)", bd: "rgba(34,197,94,0.4)", c: "#4ADE80" },
    paused: { bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.4)", c: "#FBBF24" },
    draft:  { bg: "rgba(124,58,237,0.10)", bd: "rgba(124,58,237,0.4)", c: "#A271FF" },
    archived: { bg: "rgba(168,162,158,0.10)", bd: "rgba(168,162,158,0.3)", c: "var(--text-3)" },
  }[s]);

  const themeAccent = t => ({
    "Dark Fantasy": "rgba(214,168,79,0.35)",
    "High Fantasy": "rgba(146,180,255,0.35)",
    "Horror":       "rgba(220,40,40,0.35)",
    "Mystery":      "rgba(124,58,237,0.4)",
  }[t]);

  const filters = ["All", "Active", "Paused", "Draft", "Archived"];
  const visible = filter === "All" ? all : all.filter(c => c.status === filter.toLowerCase());

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <div className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Stacks</div>
            <h1>Campaign Library</h1>
            <div className="sub">Every tale you've kept. Resume, fork, or shelve.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost">{Icon("scroll", { size: 12 })} Import campaign</button>
            <button className="fw-btn fw-btn-gold" onClick={() => go("roomSetup")}>{Icon("plus", { size: 12 })} New Campaign</button>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { k: "Campaigns",    v: all.length,                          sub: "Across three years" },
            { k: "Sessions run", v: all.reduce((a,b)=>a+b.sessions,0),   sub: "1 about to begin" },
            { k: "Hours at table", v: all.reduce((a,b)=>a+b.hours,0) + "h", sub: "Average 3h 12m / session" },
            { k: "Characters",   v: 11,                                   sub: "6 alive · 3 retired · 2 dead" },
          ].map((s,i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "14px 16px" }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{s.k}</div>
              <div className="fw-display" style={{ fontSize: 28, color: "var(--gold-bright)", lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div className="fw-search" style={{ width: 280 }}>
            {Icon("search", { size: 12 })} <input placeholder="Search campaigns, sessions, NPCs…" />
          </div>
          <div className="fw-seg">
            {filters.map(f => (
              <button key={f} className={"fw-seg-btn " + (filter === f ? "active" : "")} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <select className="fw-select" style={{ width: 160 }} defaultValue="Recent">
            <option>Sort: Recent</option>
            <option>Sort: Hours played</option>
            <option>Sort: Sessions</option>
            <option>Sort: A → Z</option>
          </select>
          <span style={{ flex: 1 }} />
          <div className="fw-seg">
            <button className={"fw-seg-btn " + (view === "grid" ? "active" : "")} onClick={() => setView("grid")}>{Icon("layers", { size: 12 })} Grid</button>
            <button className={"fw-seg-btn " + (view === "list" ? "active" : "")} onClick={() => setView("list")}>{Icon("scroll", { size: 12 })} List</button>
          </div>
        </div>

        {/* Grid view */}
        {view === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {visible.map(c => {
              const sc = statusColor(c.status);
              const acc = themeAccent(c.theme);
              return (
                <div key={c.id} className="fw-card fw-orn" style={{ overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", transition: "border-color 0.2s" }}
                     onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
                     onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-soft)"}>
                  <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
                  <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", background: "linear-gradient(135deg, #1a1428, #06050b)" }}>
                    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 40%, ${acc}, transparent 60%), radial-gradient(ellipse at 75% 70%, rgba(0,0,0,0.6), transparent 60%)` }} />
                    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice">
                      <g fill="none" stroke="rgba(214,168,79,0.2)" strokeWidth="0.6">
                        <path d="M0 130 L40 122 L80 115 L120 125 L160 110 L220 122 L300 115 V170 H0 Z" fill="rgba(0,0,0,0.45)" />
                        <path d="M0 100 L50 92 L100 98 L160 80 L220 95 L300 88" />
                      </g>
                    </svg>
                    <span style={{ position: "absolute", top: 10, left: 10, padding: "2px 8px", borderRadius: 999, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", background: sc.bg, border: `1px solid ${sc.bd}`, color: sc.c }}>{c.status}</span>
                    <span style={{ position: "absolute", top: 10, right: 10, padding: "2px 8px", borderRadius: 999, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-soft)", color: "var(--text-2)" }}>{c.theme}</span>
                  </div>
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <div>
                      <div className="fw-display" style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.2, letterSpacing: "0.02em" }}>{c.title}</div>
                      <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic", marginTop: 2 }}>{c.subtitle}</div>
                    </div>
                    <div style={{ display: "flex", marginBlock: 4 }}>
                      {Array.from({ length: c.players }).map((_, i) => (
                        <div key={i} className="fw-avatar sm" style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${["#7C3AED","#D6A84F","#22C55E","#A8A29E","#991B1B"][i%5]}33, #15101f)` }}>{["AE","KI","MT","HD","ZR"][i%5]}</div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)", marginTop: "auto", paddingTop: 8, borderTop: "1px dashed var(--border-soft)" }}>
                      <span>{c.sessions} sess.</span>
                      <span>{c.hours}h</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{c.lastPlayed}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => c.status !== "archived" && go("game")}>
                        {c.status === "active" ? <>Resume {Icon("arrowR", { size: 11 })}</> :
                         c.status === "paused" ? <>Continue {Icon("arrowR", { size: 11 })}</> :
                         c.status === "draft"  ? <>Open draft {Icon("arrowR", { size: 11 })}</> :
                                                  <>Review {Icon("arrowR", { size: 11 })}</>}
                      </button>
                      <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("kebab", { size: 12 })}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1.4fr 0.7fr 0.7fr 0.7fr 0.6fr 110px", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border-soft)", background: "rgba(0,0,0,0.2)" }}>
              {["", "Campaign", "Theme", "Status", "Sessions", "Last played", ""].map((h,i) => (
                <div key={i} className="fw-eyebrow">{h}</div>
              ))}
            </div>
            {visible.map(c => {
              const sc = statusColor(c.status);
              return (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "auto 1.4fr 0.7fr 0.7fr 0.7fr 0.6fr 110px", gap: 12, padding: "12px 16px", alignItems: "center", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ width: 56, height: 36, borderRadius: 4, background: `linear-gradient(135deg, ${themeAccent(c.theme)} 0%, transparent 70%), linear-gradient(135deg, #1a1428, #06050b)`, border: "1px solid var(--border-soft)" }} />
                  <div>
                    <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{c.title}</div>
                    <div className="fw-serif" style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>{c.subtitle}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>{c.theme}</div>
                  <div><span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", background: sc.bg, border: `1px solid ${sc.bd}`, color: sc.c }}>{c.status}</span></div>
                  <div style={{ fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--text-2)" }}>{c.sessions} · {c.hours}h</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{c.lastPlayed}</div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go("game")}>Open</button>
                    <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("kebab", { size: 12 })}</button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Empty / inspiration */}
        <Card elev style={{ marginTop: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            <div style={{ padding: 20, borderRight: "1px solid var(--border-soft)" }}>
              <span style={{ color: "var(--gold-bright)" }}>{Icon("sparkles", { size: 18 })}</span>
              <div className="fw-display" style={{ fontSize: 14, marginTop: 8 }}>Start from a Seed</div>
              <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>
                Pick a tone, a region, a hook. The Warden builds the first session for you.
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginTop: 10 }}>Try a seed {Icon("arrowR", { size: 10 })}</button>
            </div>
            <div style={{ padding: 20, borderRight: "1px solid var(--border-soft)" }}>
              <span style={{ color: "var(--gold-bright)" }}>{Icon("book", { size: 18 })}</span>
              <div className="fw-display" style={{ fontSize: 14, marginTop: 8 }}>Import a Module</div>
              <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>
                Bring a published adventure. Drop PDF, JSON, or a Roll20 export.
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginTop: 10 }}>Choose file {Icon("arrowR", { size: 10 })}</button>
            </div>
            <div style={{ padding: 20 }}>
              <span style={{ color: "var(--gold-bright)" }}>{Icon("users", { size: 18 })}</span>
              <div className="fw-display" style={{ fontSize: 14, marginTop: 8 }}>One-shot Tonight</div>
              <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>
                Three hours, four players, one tomb. Pre-built characters included.
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginTop: 10 }}>Browse one-shots {Icon("arrowR", { size: 10 })}</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN: SETTINGS
   ============================================================ */
function SettingsScreen() {
  const [section, setSection] = React.useState("profile");
  const [theme, setTheme] = React.useState("Cinder");
  const [readingMode, setReadingMode] = React.useState(true);
  const [voice, setVoice] = React.useState(true);
  const [confirmStrict, setConfirmStrict] = React.useState(true);
  const [diceStyle, setDiceStyle] = React.useState("Brass");
  const [readingSize, setReadingSize] = React.useState(15);

  const sections = [
    { id: "profile",   label: "Profile",          icon: "user"   },
    { id: "appearance",label: "Appearance",       icon: "flame"  },
    { id: "audio",     label: "Audio & Voice",    icon: "volume" },
    { id: "ai",        label: "AI Warden",        icon: "wand"   },
    { id: "rules",     label: "Rules & Dice",     icon: "dice"   },
    { id: "table",     label: "Table Manners",    icon: "users"  },
    { id: "account",   label: "Account & Compact",icon: "shield" },
  ];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <div className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Scribe's Desk</div>
            <h1>Settings</h1>
            <div className="sub">Quiet things that change how the table feels.</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>
          {/* Sidebar */}
          <Card style={{ position: "sticky", top: 20, padding: 8 }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className="fw-btn fw-btn-ghost" style={{
                  width: "100%", justifyContent: "flex-start", padding: "10px 12px", marginBottom: 2,
                  borderColor: "transparent",
                  background: section === s.id ? "rgba(214,168,79,0.08)" : "transparent",
                  color: section === s.id ? "var(--gold-bright)" : "var(--text-2)",
                  fontSize: 13,
                }}>
                <span style={{ color: section === s.id ? "var(--gold)" : "var(--text-3)" }}>{Icon(s.icon, { size: 13 })}</span>
                {s.label}
              </button>
            ))}
          </Card>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {section === "profile" && (
              <>
                <Card>
                  <CardHead icon="user" title="Warden Identity" />
                  <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 16, alignItems: "center" }}>
                    <div className="fw-avatar xl" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)" }}>AE</div>
                    <Field label="Display name"><input className="fw-input" defaultValue="Aedric" /></Field>
                    <Field label="Handle"><input className="fw-input" defaultValue="@aedric_v" /></Field>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>Change portrait</button>
                    <Field label="Email"><input className="fw-input" defaultValue="aedric.vael@oakwarden.realm" /></Field>
                    <Field label="Timezone">
                      <select className="fw-select" defaultValue="UTC">
                        <option>UTC</option><option>America/New_York</option><option>Europe/London</option>
                      </select>
                    </Field>
                  </div>
                </Card>
                <Card>
                  <CardHead icon="scroll" title="Signature" />
                  <div className="fw-card-body">
                    <Field label="The line carried on every character sheet" hint="Optional. Shown in small print at the bottom of your sheet.">
                      <input className="fw-input" defaultValue="One bargain, one breath, one die." />
                    </Field>
                  </div>
                </Card>
              </>
            )}

            {section === "appearance" && (
              <>
                <Card>
                  <CardHead icon="flame" title="Theme" />
                  <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {[
                      { n: "Cinder",  g: ["#0B0A10","#1D1828","#D6A84F"], desc: "Dark fantasy. Default." },
                      { n: "Sepulchre", g: ["#08070d","#1a1226","#7C3AED"], desc: "Arcane purple." },
                      { n: "Reliquary", g: ["#16100b","#3a2a18","#EAC074"], desc: "Warmer gold." },
                      { n: "Ash",     g: ["#0c0c0e","#1c1c20","#A8A29E"], desc: "Quiet greys." },
                    ].map(t => (
                      <button key={t.n} onClick={() => setTheme(t.n)} className="fw-card" style={{
                        textAlign: "left", padding: 0, cursor: "pointer", overflow: "hidden",
                        borderColor: theme === t.n ? "rgba(214,168,79,0.55)" : "var(--border-soft)",
                        boxShadow: theme === t.n ? "0 0 0 1px rgba(214,168,79,0.3), 0 0 24px -10px rgba(214,168,79,0.3)" : "none",
                      }}>
                        <div style={{ height: 70, background: `linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})`, position: "relative" }}>
                          <span style={{ position: "absolute", right: 8, bottom: 8, width: 22, height: 22, borderRadius: 50, background: t.g[2], boxShadow: `0 0 16px ${t.g[2]}80` }} />
                          <span style={{ position: "absolute", left: 8, bottom: 8, width: 14, height: 14, borderRadius: 50, background: t.g[1], border: "1px solid rgba(255,255,255,0.1)" }} />
                        </div>
                        <div style={{ padding: 10 }}>
                          <div className="fw-display" style={{ fontSize: 13, color: theme === t.n ? "var(--gold-bright)" : "var(--text)" }}>{t.n}</div>
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHead icon="book" title="Reading" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SettingRow label="Long-form reading mode"
                      desc="Wider line height and serif body in story log. Recommended for long sessions."
                      control={<Toggle on={readingMode} onChange={setReadingMode} />} />
                    <SettingRow label="Body text size" desc={`Currently ${readingSize}px in story log.`}
                      control={
                        <div style={{ display: "flex", alignItems: "center", gap: 8, width: 200 }}>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>A</span>
                          <input type="range" min="13" max="20" value={readingSize} onChange={e => setReadingSize(+e.target.value)} style={{ flex: 1, accentColor: "var(--gold)" }} />
                          <span style={{ fontSize: 15, color: "var(--text-3)" }}>A</span>
                        </div>
                      } />
                    <SettingRow label="Animated atmospheric background"
                      desc="Subtle particle drift on idle screens."
                      control={<Toggle on={true} onChange={() => {}} />} />
                    <SettingRow label="Reduce motion"
                      desc="Disable seal rotation, dice tumble, and ambient sway."
                      control={<Toggle on={false} onChange={() => {}} />} />
                  </div>
                </Card>
              </>
            )}

            {section === "ai" && (
              <>
                <Card>
                  <CardHead icon="wand" title="AI Warden Defaults" right={
                    <span className="fw-pill">Applies to new rooms</span>
                  } />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <SettingRow label="Authority"
                      desc="The Warden never alters game state without confirmation in either mode."
                      control={<Seg value="Assistant" onChange={() => {}} options={["Assistant","Co-DM","Off"]} />} />
                    <SettingRow label="Default tone"
                      control={<Seg value="Balanced" onChange={() => {}} options={["Balanced","Grim","Heroic","Mystery"]} />} />
                    <SettingRow label="Default rule strictness"
                      control={<Seg value="Standard" onChange={() => {}} options={["Casual","Standard","Hardcore"]} />} />
                    <SettingRow label="Suggest player choices"
                      desc="Show up to 4 next-action suggestions under the story log."
                      control={<Toggle on={true} onChange={() => {}} />} />
                    <SettingRow label="Auto-generate scenes on entry"
                      desc="When the party enters a new location, propose a scene description for the human DM to approve."
                      control={<Toggle on={false} onChange={() => {}} />} />
                  </div>
                </Card>
                <Card style={{ border: "1px solid rgba(214,168,79,0.4)" }}>
                  <CardHead icon="shield" title="Critical Change Confirmations" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { n: "HP damage",      desc: "Confirm before any HP loss is applied." },
                      { n: "Death save fail", desc: "Confirm before failed death save is recorded." },
                      { n: "Condition gained", desc: "Confirm before a player gains a condition." },
                      { n: "Inventory loss", desc: "Confirm before any item is removed from a sheet." },
                      { n: "Spell slot spend", desc: "Confirm before a slot is consumed." },
                    ].map((r,i) => (
                      <SettingRow key={i} label={r.n} desc={r.desc} dense
                        control={<Toggle on={i !== 4} onChange={() => {}} />} />
                    ))}
                    <div style={{ padding: 12, background: "var(--bg-deep)", borderRadius: 6, border: "1px dashed var(--border)", fontSize: 12, color: "var(--text-2)", fontStyle: "italic", fontFamily: "var(--f-serif)", lineHeight: 1.5 }}>
                      The Warden's hands are tied wherever you tie them. Untied actions still appear in the log, but never as state changes.
                    </div>
                  </div>
                </Card>
              </>
            )}

            {section === "audio" && (
              <Card>
                <CardHead icon="volume" title="Voice & Sound" />
                <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <SettingRow label="Voice chat default" desc="Auto-join voice when entering a room."
                    control={<Toggle on={voice} onChange={setVoice} />} />
                  <SettingRow label="Push-to-talk key"
                    control={<input className="fw-input" defaultValue="Space" style={{ width: 120, textAlign: "center", fontFamily: "var(--f-mono)" }} />} />
                  <SettingRow label="Microphone gate" desc="-32 dB"
                    control={<input type="range" defaultValue="40" style={{ width: 200, accentColor: "var(--gold)" }} />} />
                  <SettingRow label="Ambient bed volume"
                    control={<input type="range" defaultValue="60" style={{ width: 200, accentColor: "var(--gold)" }} />} />
                  <SettingRow label="Dice impact sounds"
                    control={<Toggle on={true} onChange={() => {}} />} />
                  <SettingRow label="Story bell on DM speech"
                    desc="A soft chime when the DM begins narrating."
                    control={<Toggle on={false} onChange={() => {}} />} />
                </div>
              </Card>
            )}

            {section === "rules" && (
              <>
                <Card>
                  <CardHead icon="dice" title="Dice" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SettingRow label="Dice style"
                      control={
                        <div style={{ display: "flex", gap: 6 }}>
                          {["Brass","Bone","Ash","Arcane"].map(d => (
                            <button key={d} onClick={() => setDiceStyle(d)} className={"fw-btn " + (diceStyle === d ? "" : "fw-btn-ghost") + " fw-btn-sm"} style={{ borderColor: diceStyle === d ? "var(--gold-deep)" : undefined, color: diceStyle === d ? "var(--gold-bright)" : undefined, background: diceStyle === d ? "rgba(214,168,79,0.08)" : undefined }}>{d}</button>
                          ))}
                        </div>
                      } />
                    <SettingRow label="Roll animation" control={<Toggle on={true} onChange={() => {}} />} />
                    <SettingRow label="Critical hit threshold"
                      control={<Seg value="20" onChange={() => {}} options={["19+","20","Brutal (only 20)"]} />} />
                    <SettingRow label="Auto-show DC after roll"
                      desc="If the table reveals the DC on roll, players see pass/fail immediately."
                      control={<Toggle on={false} onChange={() => {}} />} />
                  </div>
                </Card>
                <Card>
                  <CardHead icon="shield" title="House Rules" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { n: "Critical hit doubles dice (not result)", on: true },
                      { n: "Inspiration stacks up to 3",             on: false },
                      { n: "Healing potions are a bonus action",      on: true },
                      { n: "Death saves on private rolls",            on: true },
                      { n: "Flanking grants advantage",               on: false },
                    ].map((h,i) => (
                      <SettingRow key={i} label={h.n} dense control={<Toggle on={h.on} onChange={() => {}} />} />
                    ))}
                  </div>
                </Card>
              </>
            )}

            {section === "table" && (
              <Card>
                <CardHead icon="users" title="Table Manners" />
                <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <SettingRow label="Strict confirmations on critical state"
                    desc="Require explicit Confirm on HP, death, conditions, inventory loss."
                    control={<Toggle on={confirmStrict} onChange={setConfirmStrict} />} />
                  <SettingRow label="Lines & veils editor at session zero"
                    desc="Open a private list every player can edit before play."
                    control={<Toggle on={true} onChange={() => {}} />} />
                  <SettingRow label="Pause request requires no quorum"
                    desc="Any player may pause the session for a personal reason."
                    control={<Toggle on={true} onChange={() => {}} />} />
                  <SettingRow label="Quiet hours" desc="22:00 → 07:00 local"
                    control={<Seg value="Soft" onChange={() => {}} options={["Off","Soft","Strict"]} />} />
                </div>
              </Card>
            )}

            {section === "account" && (
              <>
                <Card>
                  <CardHead icon="shield" title="Account" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <SettingRow label="Email" control={<button className="fw-btn fw-btn-ghost fw-btn-sm">Change…</button>} />
                    <SettingRow label="Passphrase" control={<button className="fw-btn fw-btn-ghost fw-btn-sm">Rotate…</button>} />
                    <SettingRow label="Sessions on other devices" desc="3 active: this device, mobile, study."
                      control={<button className="fw-btn fw-btn-ghost fw-btn-sm">Sign out elsewhere</button>} />
                    <SettingRow label="Subscription"
                      desc="Wardencraft · monthly · renews 28 May."
                      control={<button className="fw-btn fw-btn-ghost fw-btn-sm">Manage</button>} />
                  </div>
                </Card>
                <Card>
                  <CardHead icon="scroll" title="Data & Compact" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <SettingRow label="Export all campaigns" desc="ZIP including JSON sheets, logs, and audio transcripts."
                      control={<button className="fw-btn fw-btn-ghost fw-btn-sm">Request export</button>} />
                    <SettingRow label="Read the Warden's Compact"
                      control={<button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("scroll", { size: 11 })} Open</button>} />
                    <SettingRow label="Delete account" desc="Irreversible. Campaigns are archived for thirty days, then dust."
                      control={<button className="fw-btn fw-btn-blood fw-btn-sm">Delete…</button>} />
                  </div>
                </Card>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, desc, control, dense }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: dense ? "4px 0" : "6px 0" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div>{control}</div>
    </div>
  );
}

Object.assign(window, { CampaignLibraryScreen, SettingsScreen });

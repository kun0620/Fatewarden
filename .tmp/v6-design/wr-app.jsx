/* global React, ReactDOM, WIcon, PortraitArt,
   WR_PARTY, WR_RELICS, WR_GOLD, WR_RUN,
   WRRunMap, WRCombat, WREvent, WRRest, WRShop, WRTreasure, WRSummary,
   WRLanding, WRDashboard, WRCreateRoom, WRRoomLobby, WRBindCharacter,
   WRAssembly, WRIntro, WRVault, WRVotePanel, WRForge, WRGamble,
   WRDeathModal, WRToasts */
/* ============================================================
   WARDEN'S RUN — App shell
   - Persistent topbar (shown during the in-run flow only)
   - Persistent party HP strip (in-run only; combat hides it)
   - Stage router covering 17 screens across 3 flow sections
   - Prototype nav floats above all
   ============================================================ */

const SCREENS = [
  /* Lobby section (FLOW 1, 2, 3) */
  { id: "landing",   label: "Landing",       icon: "compass",    section: "lobby", chrome: false },
  { id: "dashboard", label: "Hearth",        icon: "campfire",   section: "lobby", chrome: false },
  { id: "create",    label: "Create Room",   icon: "plus",       section: "lobby", chrome: false },
  { id: "lobby",     label: "Room Lobby",    icon: "scroll",     section: "lobby", chrome: false },
  { id: "bind",      label: "Bind Warden",   icon: "rune",       section: "lobby", chrome: false },
  { id: "assembly",  label: "Assembly",      icon: "shield",     section: "lobby", chrome: false },
  { id: "intro",     label: "Run Intro",     icon: "moon",       section: "lobby", chrome: false },

  /* In-run section (FLOW 4, 5, 6) */
  { id: "map",       label: "Run Map",       icon: "map",        section: "run",   chrome: true },
  { id: "mapVote",   label: "Map + Vote",    icon: "question",   section: "run",   chrome: true },
  { id: "combat",    label: "Combat",        icon: "sword",      section: "run",   chrome: false },
  { id: "event",     label: "Event",         icon: "question",   section: "run",   chrome: true },
  { id: "rest",      label: "Camp",          icon: "campfire",   section: "run",   chrome: true },
  { id: "shop",      label: "Bazaar",        icon: "bag",        section: "run",   chrome: true },
  { id: "treasure",  label: "Treasure",      icon: "chest",      section: "run",   chrome: true },
  { id: "forge",     label: "Forge",         icon: "anvil",      section: "run",   chrome: true },
  { id: "gamble",    label: "Gamble",        icon: "dice2",      section: "run",   chrome: true },

  /* Endings + meta (FLOW 7, 8) */
  { id: "death",     label: "Death",         icon: "skull",      section: "end",   chrome: true },
  { id: "summary",   label: "Victory",       icon: "crown",      section: "end",   chrome: false },
  { id: "defeat",    label: "Defeat",        icon: "skull",      section: "end",   chrome: false },
  { id: "vault",     label: "Warden's Vault",icon: "rune",       section: "end",   chrome: false },
];

function WardensRunApp() {
  const [screen, setScreen] = React.useState("landing");

  const cur = SCREENS.find(s => s.id === screen) || SCREENS[0];
  const showChrome = cur.chrome;
  const onMap   = screen === "map" || screen === "mapVote";
  const showParty = showChrome && screen !== "combat" && screen !== "summary" && screen !== "defeat";

  /* node click on map: route to the right node screen */
  const handleNode = (n) => {
    if (n.kind === "combat" || n.kind === "elite" || n.kind === "boss") setScreen("combat");
    else if (n.kind === "rest")     setScreen("rest");
    else if (n.kind === "shop")     setScreen("shop");
    else if (n.kind === "treasure") setScreen("treasure");
    else if (n.kind === "forge")    setScreen("forge");
    else if (n.kind === "gamble")   setScreen("gamble");
    else                            setScreen("event");
  };

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      {showChrome && <WRTopBar screen={screen} />}

      <WRNav screen={screen} setScreen={setScreen} />

      <div className="wr-stage">
        {/* Lobby flow */}
        {screen === "landing"   && <WRLanding   onContinue={() => setScreen("dashboard")} />}
        {screen === "dashboard" && <WRDashboard onCreate={() => setScreen("create")} onJoin={() => setScreen("lobby")} onVault={() => setScreen("vault")} onResume={() => setScreen("map")} />}
        {screen === "create"    && <WRCreateRoom onOpen={() => setScreen("lobby")} onBack={() => setScreen("dashboard")} />}
        {screen === "lobby"     && <WRRoomLobby onBegin={() => setScreen("assembly")} onBind={() => setScreen("bind")} onBack={() => setScreen("dashboard")} />}
        {screen === "bind"      && <WRBindCharacter onBound={() => setScreen("lobby")} onBack={() => setScreen("lobby")} />}
        {screen === "assembly"  && <WRAssembly onBegin={() => setScreen("intro")} onBack={() => setScreen("lobby")} />}
        {screen === "intro"     && <WRIntro onEnter={() => setScreen("map")} />}

        {/* In-run flow */}
        {onMap                  && <WRRunMap onPick={handleNode} />}
        {screen === "combat"    && <WRCombat />}
        {screen === "event"     && <WREvent />}
        {screen === "rest"      && <WRRest />}
        {screen === "shop"      && <WRShop />}
        {screen === "treasure"  && <WRTreasure />}
        {screen === "forge"     && <WRForge onBack={() => setScreen("map")} />}
        {screen === "gamble"    && <WRGamble onBack={() => setScreen("map")} />}

        {/* Endings + meta */}
        {screen === "death"     && <WRRunMap onPick={handleNode} />}
        {screen === "summary"   && <WRSummary />}
        {screen === "defeat"    && <WRSummary defeat />}
        {screen === "vault"     && <WRVault onBack={() => setScreen("dashboard")} />}
      </div>

      {/* Persistent party strip (in-run, non-combat) */}
      {showParty && <WRPartyStrip />}

      {/* Overlays */}
      {screen === "mapVote" && <WRVotePanel onClose={() => setScreen("map")} onOverride={() => setScreen("combat")} />}
      {screen === "death"   && <WRDeathModal open onContinue={() => setScreen("map")} />}
    </div>
  );
}

/* ---------- TOP BAR ---------- */
function WRTopBar() {
  return (
    <div className="wr-topbar">
      <div className="wr-topbar-section">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <WRSeal size={32} />
          <div style={{ lineHeight: 1.05 }}>
            <div className="wr-topbar-floor-label">Warden's Run</div>
            <div className="wr-topbar-floor-value" style={{ fontSize: 13, letterSpacing: "0.16em" }}>
              Run <b style={{ color: "var(--wr-gold-bright)" }}>#{WR_RUN.run}</b>
            </div>
          </div>
        </div>

        <div className="wr-topbar-divider" />

        <div className="wr-topbar-floor">
          <span className="wr-topbar-floor-label">Stratum</span>
          <span className="wr-topbar-floor-value"><b>{WR_RUN.floor}</b> / {WR_RUN.depth}</span>
        </div>
      </div>

      <div className="wr-topbar-divider" />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <span className="wr-eyebrow" style={{ flexShrink: 0 }}>Relics</span>
        <div className="wr-relics">
          {WR_RELICS.map(r => (
            <div key={r.id} className={"wr-relic " + r.rarity} title={`${r.name} — ${r.desc}`}>
              {WIcon(r.icon, { size: 16, stroke: 1.5 })}
              {r.count && <span className="wr-relic-count">{r.count}</span>}
            </div>
          ))}
          <button className="wr-relic" style={{ borderStyle: "dashed", color: "var(--wr-text-4)", background: "transparent" }} title="Empty slot">
            {WIcon("plus", { size: 12 })}
          </button>
        </div>
      </div>

      <div className="wr-topbar-divider" />

      <div className="wr-topbar-floor">
        <span className="wr-topbar-floor-label">Warden Pts</span>
        <span className="wr-topbar-floor-value" style={{ color: "var(--wr-violet-bright)", fontSize: 13 }}>
          {WR_RUN.wp.toLocaleString()}
        </span>
      </div>

      <div className="wr-gold-display">
        <span className="wr-gold-coin">G</span>
        <span className="wr-gold-amount">{WR_GOLD}</span>
      </div>

      <button className="wr-btn wr-btn-icon wr-btn-ghost wr-btn-sm" title="Run options">
        {WIcon("settings", { size: 14 })}
      </button>
    </div>
  );
}

function WRSeal({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <radialGradient id="wr-seal-fill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a0e2a"/>
          <stop offset="100%" stopColor="#050309"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#wr-seal-fill)" stroke="#9B5DE5" strokeWidth="0.7"/>
      <g stroke="#B8860B" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 22 l16 -10 l16 10"/>
        <path d="M16 32 l16 -10 l16 10" strokeOpacity="0.7"/>
        <path d="M16 42 l16 -10 l16 10" strokeOpacity="0.45"/>
        <path d="M16 52 l16 -10 l16 10" strokeOpacity="0.25"/>
      </g>
      <circle cx="32" cy="14" r="2" fill="#D4A028"/>
    </svg>
  );
}

/* ---------- PARTY STRIP (bottom) ---------- */
function WRPartyStrip() {
  return (
    <div className="wr-party-strip">
      {WR_PARTY.map(p => {
        const pct = (p.hp / p.hpMax) * 100;
        const low = pct < 30 && pct > 0;
        return (
          <div key={p.id} className={"wr-party-mini" + (p.down ? " down" : "")}>
            <div className="wr-party-mini-portrait">
              <PortraitArt kind={p.portrait} color={p.color} />
            </div>
            <div className="wr-party-mini-info">
              <div className="wr-party-mini-name">
                {p.name}
                {p.you && <span style={{ color: "var(--wr-gold-bright)", marginLeft: 4, fontSize: 9 }}>YOU</span>}
              </div>
              <div className="wr-party-mini-class">{p.class}{p.down ? " · fallen" : ""}</div>
            </div>
            <div className="wr-party-mini-hp">
              <div className="wr-hpbar">
                <span className={"wr-hpbar-fill" + (low ? " low" : "")} style={{ width: pct + "%" }} />
              </div>
              <div className="wr-party-mini-hp-num"><b>{p.hp}</b>/{p.hpMax}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- NAV (prototype jumper, grouped by section) ---------- */
function WRNav({ screen, setScreen }) {
  const sections = [
    { id: "lobby", label: "Lobby" },
    { id: "run",   label: "In-Run" },
    { id: "end",   label: "Endings" },
  ];

  return (
    <nav className="wr-nav" role="navigation" aria-label="Prototype screens">
      <span className="wr-nav-mark">
        <span className="wr-nav-dot" />
        Jump to
      </span>
      {sections.map((sec, si) => (
        <React.Fragment key={sec.id}>
          <span className="wr-nav-divider" />
          <span className="wr-nav-section">{sec.label}</span>
          {SCREENS.filter(s => s.section === sec.id).map(s => (
            <button
              key={s.id}
              className={"wr-nav-btn" + (screen === s.id ? " active" : "")}
              onClick={() => setScreen(s.id)}
              title={s.label}
              data-screen-label={s.label}
            >
              <span style={{ marginRight: 5, opacity: 0.7 }}>{WIcon(s.icon, { size: 11, stroke: 1.8 })}</span>
              {s.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById("wr-root")).render(<WardensRunApp />);

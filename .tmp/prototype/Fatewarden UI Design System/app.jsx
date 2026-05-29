/* global React, ReactDOM, Icon, FateLogo, FateSeal,
   LoginScreen, MainMenuScreen, RoomSetupScreen, CharacterSetupScreen,
   GameTableScreen, CampaignLibraryScreen, SettingsScreen, MOCK */

const { useState } = React;

const SCREENS = [
  { id: "login",     label: "Login",            icon: "lock"    },
  { id: "menu",      label: "Main Menu",        icon: "home"    },
  { id: "roomSetup", label: "Room Setup",       icon: "hex"     },
  { id: "charSetup", label: "Character Setup",  icon: "user"    },
  { id: "game",      label: "Game Table",       icon: "dice"    },
  { id: "library",   label: "Campaign Library", icon: "book"    },
  { id: "settings",  label: "Settings",         icon: "cog"     },
];

function App() {
  const [route, setRoute] = useState("login");
  // route values: login | menu | roomSetup | charSetup | game | library | settings

  const go = (r) => setRoute(r);

  // map of route -> top-bar crumb info
  const META = {
    menu:       { crumb: ["Hearth", "Main Menu"],          rail: "menu" },
    roomSetup:  { crumb: ["Hearth", "Forge a Room"],       rail: "menu" },
    charSetup:  { crumb: ["Hearth", "Bind your character"], rail: "menu" },
    game:       { crumb: ["At the Table", "Session 15"],    rail: "game" },
    library:    { crumb: ["The Stacks", "Campaign Library"],rail: "library" },
    settings:   { crumb: ["The Scribe's Desk", "Settings"], rail: "settings" },
  };

  if (route === "login") {
    return (
      <>
        <LoginScreen onAuth={() => go("menu")} />
        <ScreenJumper route={route} go={go} />
      </>
    );
  }

  const meta = META[route] || META.menu;

  const screenEl = (() => {
    switch (route) {
      case "menu":      return <MainMenuScreen go={go} />;
      case "roomSetup": return <RoomSetupScreen go={go} />;
      case "charSetup": return <CharacterSetupScreen go={go} />;
      case "game":      return <GameTableScreen go={go} />;
      case "library":   return <CampaignLibraryScreen go={go} />;
      case "settings":  return <SettingsScreen />;
      default:          return <MainMenuScreen go={go} />;
    }
  })();

  const isGame = route === "game";

  return (
    <>
      <div className="fw-bg-atmos" />
      <div className="fw-bg-noise" />
      <div className="fw-app">
        {/* Rail */}
        <nav className="fw-rail">
          <div className="fw-rail-logo">
            <FateSeal size={36} animate={false} />
          </div>
          <RailBtn icon="home"   label="Hearth"  active={["menu","roomSetup","charSetup"].includes(route)} onClick={() => go("menu")} />
          <RailBtn icon="dice"   label="Play"    active={route === "game"} onClick={() => go("game")} />
          <RailBtn icon="book"   label="Library" active={route === "library"} onClick={() => go("library")} />
          <RailBtn icon="users"  label="Party"   onClick={() => go("menu")} />
          <RailBtn icon="map"    label="World"   onClick={() => go("library")} />
          <span style={{ flex: 1 }} />
          <RailBtn icon="bell"   label="Notices" badge="3" />
          <RailBtn icon="cog"    label="Settings" active={route === "settings"} onClick={() => go("settings")} />
          <div style={{ marginTop: 6 }}>
            <button className="fw-avatar sm dm" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)", cursor: "pointer", border: "0" }} onClick={() => go("settings")}>
              AE
            </button>
          </div>
        </nav>

        <section className="fw-main">
          {!isGame && (
            <header className="fw-topbar">
              <div className="fw-crumb">
                <span>{meta.crumb[0]}</span>
                {Icon("chevR", { size: 10 })}
                <b>{meta.crumb[1]}</b>
              </div>
              <div className="fw-topbar-spacer" />
              <div className="fw-search">
                {Icon("search", { size: 12 })}
                <input placeholder="Search campaigns, characters, rules…" />
                <kbd>⌘K</kbd>
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("scroll", { size: 11 })} Bestiary</button>
              <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("bell", { size: 14 })}</button>
            </header>
          )}

          {screenEl}
        </section>
      </div>
      <ScreenJumper route={route} go={go} />
    </>
  );
}

/* ---------- SCREEN JUMPER (prototype navigator) ---------- */
function ScreenJumper({ route, go }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: 16,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: 6,
      background: "rgba(13, 11, 20, 0.92)",
      border: "1px solid var(--gold-deep)",
      borderRadius: 999,
      boxShadow: "0 0 0 1px rgba(214,168,79,0.2), 0 12px 30px -10px rgba(0,0,0,0.8), 0 0 24px -6px rgba(214,168,79,0.3)",
      backdropFilter: "blur(8px)",
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        paddingLeft: 10, paddingRight: 6,
        fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--gold-bright)", fontWeight: 500,
        fontFamily: "var(--f-ui)",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: 50, background: "var(--gold-bright)", boxShadow: "0 0 6px var(--gold-bright)" }} />
        Prototype
      </span>
      <span style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
      {open && SCREENS.map(s => {
        const active = route === s.id;
        return (
          <button key={s.id} onClick={() => go(s.id)} title={s.label} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px",
            background: active ? "linear-gradient(180deg, rgba(214,168,79,0.18), rgba(214,168,79,0.06))" : "transparent",
            border: "1px solid " + (active ? "var(--gold-deep)" : "transparent"),
            borderRadius: 999,
            color: active ? "var(--gold-bright)" : "var(--text-2)",
            fontFamily: "var(--f-ui)",
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: "0.04em",
            cursor: "pointer",
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--text-2)"; }}>
            <span style={{ color: active ? "var(--gold-bright)" : "var(--text-3)" }}>{Icon(s.icon, { size: 11 })}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
      <span style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
      <button onClick={() => setOpen(o => !o)} title={open ? "Collapse" : "Expand"} style={{
        width: 28, height: 28, borderRadius: 50,
        background: "transparent", border: "0", cursor: "pointer",
        display: "grid", placeItems: "center", color: "var(--text-3)",
      }}>
        {Icon(open ? "x" : "chevR", { size: 13 })}
      </button>
    </div>
  );
}

function RailBtn({ icon, label, active, badge, onClick }) {
  return (
    <button className={"fw-rail-btn " + (active ? "active" : "")} onClick={onClick} title={label}>
      {Icon(icon, { size: 17 })}
      <span className="fw-rail-label">{label}</span>
      {badge && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          minWidth: 14, height: 14, padding: "0 3px",
          background: "var(--blood)", border: "1px solid var(--bg)",
          borderRadius: 8, color: "#FFE6E6",
          fontSize: 9, fontFamily: "var(--f-mono)", display: "grid", placeItems: "center",
          boxShadow: "0 0 6px rgba(153,27,27,0.6)",
        }}>{badge}</span>
      )}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

/* global React, Icon, Card, CardHead, MOCK */

/* ============================================================
   SCREEN: CHARACTER VAULT — manage all characters
   ============================================================ */

const VAULT_CHARACTERS = [
  {
    id: "aedric-vael",
    name: "Aedric Vael",
    race: "Tiefling",
    class: "Warlock",
    level: 7,
    background: "Outlander",
    alignment: "Chaotic Neutral",
    hp: 38, hpMax: 52, ac: 14,
    color: "#7C3AED",
    portrait: "AE",
    quote: "A bargain is the only honest covenant.",
    status: "Active · The Hollow Crown of Ysavir",
    statusKind: "active",
    lastPlayed: "2d ago",
    abilities: { STR: 9, DEX: 14, CON: 12, INT: 13, WIS: 11, CHA: 18 },
    tags: ["Warlock", "Pact of Tome", "The Cinder-Reeve"],
  },
  {
    id: "vael-of-hold",
    name: "Vael of Hold",
    race: "Half-Orc",
    class: "Paladin",
    level: 5,
    background: "Soldier",
    alignment: "Lawful Good",
    hp: 0, hpMax: 60, ac: 18,
    color: "#D6A84F",
    portrait: "VH",
    quote: "I swore an oath. I will keep it.",
    status: "Retired · Of Embers, season 2",
    statusKind: "retired",
    lastPlayed: "3 months ago",
    abilities: { STR: 17, DEX: 11, CON: 14, INT: 9, WIS: 12, CHA: 15 },
    tags: ["Paladin", "Oath of Devotion"],
  },
  {
    id: "quill-marrow",
    name: "Quill Marrow",
    race: "Halfling",
    class: "Rogue",
    level: 3,
    background: "Charlatan",
    alignment: "Chaotic Neutral",
    hp: 22, hpMax: 26, ac: 15,
    color: "#22C55E",
    portrait: "QM",
    quote: "I count the coin twice. Once for me.",
    status: "Draft · Salt & Ash campaign",
    statusKind: "draft",
    lastPlayed: "1 week ago",
    abilities: { STR: 8, DEX: 16, CON: 13, INT: 12, WIS: 11, CHA: 14 },
    tags: ["Rogue", "Lightfoot"],
  },
  {
    id: "vesseline",
    name: "Vesseline",
    race: "Elf",
    class: "Wizard",
    level: 9,
    background: "Sage",
    alignment: "True Neutral",
    hp: 41, hpMax: 48, ac: 13,
    color: "#A8A29E",
    portrait: "VE",
    quote: "I read until the candle dies, then I light another.",
    status: "Archived · Volume Six",
    statusKind: "archived",
    lastPlayed: "11 months ago",
    abilities: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 13, CHA: 11 },
    tags: ["Wizard", "School of Divination"],
  },
  {
    id: "brask-thornhilt",
    name: "Brask Thornhilt",
    race: "Dwarf",
    class: "Cleric",
    level: 4,
    background: "Acolyte",
    alignment: "Lawful Neutral",
    hp: 32, hpMax: 36, ac: 18,
    color: "#C72D2D",
    portrait: "BT",
    quote: "Solm watches. So I work.",
    status: "Active · The Brass Sept",
    statusKind: "active",
    lastPlayed: "1d ago",
    abilities: { STR: 14, DEX: 10, CON: 15, INT: 11, WIS: 17, CHA: 12 },
    tags: ["Cleric", "Life Domain"],
  },
  {
    id: "mira-of-thornveil",
    name: "Mira of Thornveil",
    race: "Wood Elf",
    class: "Ranger",
    level: 6,
    background: "Outlander",
    alignment: "Neutral Good",
    hp: 48, hpMax: 54, ac: 16,
    color: "#4ADE80",
    portrait: "MI",
    quote: "The wood remembers what we forget.",
    status: "Draft",
    statusKind: "draft",
    lastPlayed: "5d ago",
    abilities: { STR: 12, DEX: 17, CON: 13, INT: 11, WIS: 15, CHA: 10 },
    tags: ["Ranger", "Hunter", "Bow"],
  },
];

const VAULT_FILTERS = [
  { id: "all",      label: "All",       count: VAULT_CHARACTERS.length },
  { id: "active",   label: "Active",    count: VAULT_CHARACTERS.filter(c => c.statusKind === "active").length },
  { id: "draft",    label: "Drafts",    count: VAULT_CHARACTERS.filter(c => c.statusKind === "draft").length },
  { id: "retired",  label: "Retired",   count: VAULT_CHARACTERS.filter(c => c.statusKind === "retired").length },
  { id: "archived", label: "Archived",  count: VAULT_CHARACTERS.filter(c => c.statusKind === "archived").length },
];

function CharacterVaultScreen({ go }) {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState("grid"); // grid | list
  const [classFilter, setClassFilter] = React.useState("All");

  const classes = ["All", ...new Set(VAULT_CHARACTERS.map(c => c.class))];

  const filtered = VAULT_CHARACTERS.filter(c => {
    if (filter !== "all" && c.statusKind !== filter) return false;
    if (classFilter !== "All" && c.class !== classFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.class.toLowerCase().includes(q) && !c.race.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        {/* HEADER */}
        <div className="fw-page-head" style={{ marginBottom: 18 }}>
          <div>
            <div className="fw-eyebrow">The Hearth · Vault</div>
            <h1>My Characters</h1>
            <div className="sub">Every warden you've bound to dice. {VAULT_CHARACTERS.length} in the vault.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("menu")}>{Icon("chevL", { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost">{Icon("link", { size: 12 })} Import JSON</button>
            <button className="fw-btn fw-btn-gold" onClick={() => go && go("charWizard")}>
              {Icon("plus", { size: 12 })} Forge new warden
            </button>
          </div>
        </div>

        {/* FILTER STRIP */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="fw-input-wrap" style={{ flex: "1 1 280px", maxWidth: 360 }}>
              <span className="fw-input-icon">{Icon("search", { size: 13 })}</span>
              <input className="fw-input has-icon" placeholder="Search by name, class, race…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {VAULT_FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={"fw-vault-pill " + (filter === f.id ? "active" : "")}>
                  {f.label} <span className="fw-vault-pill-count">{f.count}</span>
                </button>
              ))}
            </div>

            <span style={{ flex: 1 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="fw-eyebrow" style={{ fontSize: 9.5 }}>Class</span>
              <select className="fw-select" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}>
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--bg-deep)", borderRadius: 6, border: "1px solid var(--border-soft)" }}>
              <button onClick={() => setView("grid")} className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" style={{ background: view === "grid" ? "rgba(214,168,79,0.10)" : "transparent", color: view === "grid" ? "var(--gold-bright)" : "var(--text-3)" }} title="Grid">
                {Icon("hex", { size: 12 })}
              </button>
              <button onClick={() => setView("list")} className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" style={{ background: view === "list" ? "rgba(214,168,79,0.10)" : "transparent", color: view === "list" ? "var(--gold-bright)" : "var(--text-3)" }} title="List">
                {Icon("scroll", { size: 12 })}
              </button>
            </div>
          </div>
        </Card>

        {/* RESULTS */}
        {filtered.length === 0 ? (
          <Card>
            <div style={{ padding: 64, textAlign: "center", color: "var(--text-3)" }}>
              <div style={{ marginBottom: 14, opacity: 0.5 }}>{Icon("users", { size: 36 })}</div>
              <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", marginBottom: 6 }}>No wardens found</div>
              <div className="fw-serif" style={{ fontStyle: "italic" }}>The vault is silent on this account.</div>
              <button className="fw-btn fw-btn-gold" style={{ marginTop: 16 }} onClick={() => go && go("charWizard")}>
                {Icon("plus", { size: 12 })} Forge new warden
              </button>
            </div>
          </Card>
        ) : view === "grid" ? (
          <div className="fw-vault-grid">
            {filtered.map(c => <VaultCard key={c.id} char={c} go={go} />)}
            <button className="fw-vault-newcard" onClick={() => go && go("charWizard")}>
              <div className="fw-vault-newcard-icon">{Icon("plus", { size: 28 })}</div>
              <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>Forge new warden</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 4 }}>Bind a name to your dice.</div>
            </button>
          </div>
        ) : (
          <Card>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(c => <VaultRow key={c.id} char={c} go={go} />)}
            </div>
          </Card>
        )}

        {/* HELP STRIP */}
        <div style={{ marginTop: 24, display: "flex", gap: 12, padding: 14, background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5 }}>
            <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 14 })}</span>
            <div style={{ flex: 1 }}>
              When you join a session, the vault makes a <b style={{ color: "var(--text-2)", fontStyle: "normal" }}>snapshot</b> — HP, conditions, and inventory changes stay in the session. When the session ends, you'll choose whether to write those changes back here.
            </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- VAULT CARD (grid view) ---------------- */
function VaultCard({ char, go }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const hpPct = (char.hp / char.hpMax) * 100;
  const dim = char.statusKind === "retired" || char.statusKind === "archived";
  return (
    <div className={"fw-vault-card" + (dim ? " dim" : "") + (char.statusKind === "draft" ? " draft" : "")}>
      <div className="fw-vault-card-portrait" style={{ background: `linear-gradient(135deg, ${char.color}44, #06050b)` }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${char.color}33, transparent 65%)` }} />
        <div className="fw-vault-portrait-inner" style={{ borderColor: char.color }}>{char.portrait}</div>
        <span className="fw-vault-level">Lv {char.level}</span>
        <button className="fw-vault-menu-btn" onClick={() => setMenuOpen(o => !o)}>{Icon("kebab", { size: 14 })}</button>
        {menuOpen && (
          <div className="fw-vault-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => { setMenuOpen(false); go && go("charSheet"); }}>{Icon("eye", { size: 11 })} Open sheet</button>
            <button onClick={() => { setMenuOpen(false); go && go("charWizard"); }}>{Icon("cog", { size: 11 })} Edit</button>
            <button>{Icon("copy", { size: 11 })} Duplicate</button>
            <button>{Icon("scroll", { size: 11 })} Export JSON</button>
            <button>{Icon("sparkles", { size: 11 })} Level up</button>
            <button className="danger">{Icon("x", { size: 11 })} Delete</button>
          </div>
        )}
        <div className="fw-vault-status">
          <span className={"fw-vault-status-dot " + char.statusKind} />
          <span>{char.status}</span>
        </div>
      </div>
      <div className="fw-vault-card-body">
        <div className="fw-display" style={{ fontSize: 16, color: "var(--text)", marginBottom: 2 }}>{char.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
          {char.race} · {char.class} · {char.alignment}
        </div>

        <p className="fw-serif" style={{ fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.5, marginTop: 10, marginBottom: 10, paddingLeft: 8, borderLeft: "1px solid var(--gold-deep)" }}>
          "{char.quote}"
        </p>

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <div className="fw-vault-mini" style={{ flex: 1.4 }}>
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>HP</div>
            <div className="fw-mono" style={{ fontSize: 12, color: hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)" }}>{char.hp} / {char.hpMax}</div>
            <div style={{ height: 3, background: "var(--bg-deep)", borderRadius: 50, overflow: "hidden", marginTop: 4 }}>
              <div style={{ height: "100%", width: hpPct + "%", background: hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)" }} />
            </div>
          </div>
          <div className="fw-vault-mini">
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>AC</div>
            <div className="fw-mono" style={{ fontSize: 13, color: "var(--text)" }}>{char.ac}</div>
          </div>
          <div className="fw-vault-mini">
            <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>LV</div>
            <div className="fw-mono" style={{ fontSize: 13, color: "var(--gold-bright)" }}>{char.level}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => go && go("charSheet")}>
            {char.statusKind === "active" ? <>{Icon("play", { size: 11 })} Play</> : <>{Icon("eye", { size: 11 })} Open</>}
          </button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "5px 10px" }} title="Edit" onClick={() => go && go("charWizard")}>{Icon("cog", { size: 11 })}</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border-soft)", fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
          <span>last played · {char.lastPlayed}</span>
          <span>{char.background}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- VAULT ROW (list view) ---------------- */
function VaultRow({ char, go }) {
  const hpPct = (char.hp / char.hpMax) * 100;
  return (
    <div className="fw-vault-row">
      <span className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${char.color}44, #15101f)`, borderColor: char.color }}>{char.portrait}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{char.name}</div>
          <span className={"fw-vault-status-pill " + char.statusKind}>{char.statusKind}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{char.race} · {char.class} · Lv {char.level} · {char.background}</div>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", fontFamily: "var(--f-mono)", fontSize: 12 }}>
        <div style={{ width: 80 }}>
          <div style={{ fontSize: 9.5, color: "var(--text-4)", letterSpacing: "0.1em" }}>HP</div>
          <div style={{ color: hpPct > 50 ? "var(--success)" : hpPct > 25 ? "var(--warning)" : "var(--blood-bright)" }}>{char.hp}/{char.hpMax}</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: "var(--text-4)", letterSpacing: "0.1em" }}>AC</div>
          <div style={{ color: "var(--text)" }}>{char.ac}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go && go("charSheet")}>{Icon("eye", { size: 11 })} Sheet</button>
        <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => go && go("charSheet")}>
          {char.statusKind === "active" ? <>{Icon("play", { size: 11 })} Play</> : "Open"}
        </button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("kebab", { size: 12 })}</button>
      </div>
    </div>
  );
}

Object.assign(window, { CharacterVaultScreen, VAULT_CHARACTERS });

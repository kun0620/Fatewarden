/* global React, WIcon, PortraitArt,
   WR_WP, WR_VAULT_UNLOCKS, WR_RECENT_RUNS */

/* ============================================================
   WARDEN'S RUN — Meta progression (FLOW 8)
   Warden's Vault + Run History
   ============================================================ */

function WRVault({ onBack }) {
  const [tab, setTab] = React.useState("classes");
  const [hovered, setHovered] = React.useState(null);
  const items = WR_VAULT_UNLOCKS[tab];
  const tabs = [
    { id: "classes",  label: "Classes",   icon: "crown",   blurb: "Unlock new wardens to bind." },
    { id: "relics",   label: "Relics",    icon: "rune",    blurb: "Expand the relic pool for shops + treasure." },
    { id: "upgrades", label: "Upgrades",  icon: "anvil",   blurb: "Permanent bonuses for every future run." },
    { id: "bestiary", label: "Bestiary",  icon: "skull",   blurb: "Lore of every foe you have faced." },
  ];

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1180 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack}>{WIcon("chevL",{size:11})} Back</button>
          <div className="wr-eyebrow">Hearth · Meta progression</div>
        </div>

        {/* Vault hero */}
        <div className="wr-vault-hero">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow" style={{ color: "var(--wr-violet-bright)" }}>The Warden's Vault</div>
            <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 32, letterSpacing: "0.14em", color: "var(--wr-bone)", margin: "6px 0 4px" }}>
              Spend the dead's worth.
            </div>
            <div style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", color: "var(--wr-text-2)", fontSize: 14, maxWidth: 540, lineHeight: 1.5 }}>
              Every fallen warden leaves something behind. Convert Warden Points into permanent unlocks — new classes, deeper relic pools, and small mercies that travel between runs.
            </div>
          </div>
          <div className="wr-vault-wp">
            <div className="wr-eyebrow" style={{ fontSize: 9 }}>Warden Points</div>
            <div className="wr-vault-wp-num">{WR_WP.toLocaleString()}</div>
            <div className="wr-vault-wp-foot">+142 from Run #17 · pending</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="wr-vault-tabs">
          {tabs.map(t => (
            <button key={t.id} className={"wr-vault-tab " + (tab === t.id ? "active" : "")} onClick={()=>setTab(t.id)}>
              <span style={{ color: tab === t.id ? "var(--wr-gold-bright)" : "var(--wr-text-3)" }}>{WIcon(t.icon,{size:14})}</span>
              {t.label}
              <span className="wr-vault-tab-count">{WR_VAULT_UNLOCKS[t.id].length}</span>
            </button>
          ))}
        </div>
        <div className="wr-vault-blurb">{tabs.find(x => x.id === tab).blurb}</div>

        {/* Grid */}
        <div className="wr-vault-grid">
          {items.map(it => (
            <div key={it.id}
              className={"wr-vault-unlock " + it.state}
              onMouseEnter={()=>setHovered(it.id)}
              onMouseLeave={()=>setHovered(null)}>
              <div className="wr-corn tl"/><div className="wr-corn tr"/><div className="wr-corn bl"/><div className="wr-corn br"/>
              <div className="wr-vault-unlock-ic">{WIcon(it.icon,{size: 22})}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wr-vault-unlock-name">{it.name}</div>
                <div className="wr-vault-unlock-desc">{it.desc}</div>
                {it.req && <div className="wr-vault-unlock-req">{WIcon("lock",{size:10}) /* may be undefined */ || WIcon("eye",{size:10})} {it.req}</div>}
              </div>
              <div className="wr-vault-unlock-cta">
                {it.state === "owned" && (
                  <span className="wr-chip good" style={{ fontSize: 8 }}>
                    {WIcon("check",{size:10})} Owned
                  </span>
                )}
                {it.state === "ready" && (
                  <>
                    <div className="wr-vault-cost">
                      <span className="wr-vault-cost-num">{it.cost.toLocaleString()}</span>
                      <span className="wr-vault-cost-unit">WP</span>
                    </div>
                    <button className="wr-btn wr-btn-sm wr-btn-violet">Unlock</button>
                  </>
                )}
                {it.state === "locked" && (
                  <>
                    <div className="wr-vault-cost dim">
                      <span className="wr-vault-cost-num">{it.cost ? it.cost.toLocaleString() : "—"}</span>
                      <span className="wr-vault-cost-unit">WP</span>
                    </div>
                    <button className="wr-btn wr-btn-sm" disabled>Locked</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Run history compact */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
            <div className="wr-eyebrow">Run Chronicle</div>
            <span style={{ flex: 1, height: 1, background: "var(--wr-edge-soft)" }}/>
            <button className="wr-btn wr-btn-sm wr-btn-ghost">All runs</button>
          </div>
          <div className="wr-runs-list compact">
            {WR_RECENT_RUNS.map(r => (
              <div key={r.n} className={"wr-run-row " + r.outcome}>
                <div className="wr-run-n">#{r.n}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 13, letterSpacing: "0.10em", color: "var(--wr-bone)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--wr-text-3)", fontStyle: "italic" }}>{r.when} · floors {r.floors}</div>
                </div>
                <div className={"wr-run-outcome " + r.outcome}>
                  {r.outcome === "victory" && <>{WIcon("crown",{size:11})} Victory</>}
                  {r.outcome === "defeat" && <>{WIcon("skull",{size:11})} Fallen</>}
                  {r.outcome === "ongoing" && <><span className="wr-presence-dot online pulse"/> Ongoing</>}
                </div>
                <div style={{ fontFamily: "var(--wr-f-mono)", fontSize: 12, color: "var(--wr-violet-bright)", width: 80, textAlign: "right" }}>+{r.wp} WP</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WRVault });

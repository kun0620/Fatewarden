/* global React, WIcon, PortraitArt,
   WR_EVENT, WR_REST_CHOICES, WR_SHOP, WR_TREASURE, WR_SUMMARY, WR_GOLD */
/* ============================================================
   WARDEN'S RUN — Event · Rest · Shop · Treasure · Summary
   ============================================================ */

/* ============== EVENT ============== */
function WREvent() {
  const [chosen, setChosen] = React.useState(null);
  const ev = WR_EVENT;

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-event-banner">
          <div className="wr-event-banner-art">
            <SceneChapel />
          </div>
          <div className="wr-event-banner-fade" />
          <div className="wr-event-banner-title">
            <div className="eyebrow">Mystery Encounter</div>
            <h2>{ev.title}</h2>
          </div>
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-narration">
          {ev.narration.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-eyebrow" style={{ textAlign: "center", marginTop: -4 }}>What do you do?</div>

        <div className="wr-choice-list">
          {ev.choices.map((c, i) => (
            <button
              key={c.id}
              className="wr-choice"
              disabled={chosen && chosen !== c.id}
              onClick={() => setChosen(c.id)}
            >
              <span className="wr-choice-mark">{String.fromCharCode(65 + i)}</span>
              <span className="wr-choice-body">
                <div className="wr-choice-title">{c.title}</div>
                <div className="wr-choice-desc">{c.desc}</div>
                {c.tags && c.tags.length > 0 && (
                  <div className="wr-choice-meta">
                    {c.tags.map((t, j) => (
                      <span key={j} className={"wr-tag " + (t.c || "")}>{t.k}</span>
                    ))}
                  </div>
                )}
              </span>
              {chosen === c.id && (
                <span style={{
                  alignSelf: "center",
                  margin: "0 14px",
                  color: "var(--wr-violet-bright)",
                }}>{WIcon("check", { size: 18, stroke: 2.2 })}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Painted chapel scene placeholder */
function SceneChapel() {
  return (
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0e2a"/>
          <stop offset="60%" stopColor="#0a0612"/>
          <stop offset="100%" stopColor="#050309"/>
        </linearGradient>
        <radialGradient id="sc-glow" cx="50%" cy="55%" r="40%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.5"/>
          <stop offset="60%" stopColor="#8B1538" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="sc-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5E6D3"/>
          <stop offset="35%" stopColor="#D4A028"/>
          <stop offset="100%" stopColor="#8B1538" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="280" fill="url(#sc-sky)"/>
      <rect width="800" height="280" fill="url(#sc-glow)"/>

      {/* arch silhouette */}
      <path d="M0 280 V160 Q120 140 180 110 Q220 60 260 40 Q300 60 340 110 Q400 140 460 110 Q500 60 540 40 Q580 60 620 110 Q680 140 800 160 V280 z"
            fill="#0a0612" opacity="0.85"/>

      {/* pillars */}
      <g fill="#050309" opacity="0.9">
        <rect x="80"  y="110" width="22" height="170"/>
        <rect x="180" y="80"  width="26" height="200"/>
        <rect x="594" y="80"  width="26" height="200"/>
        <rect x="698" y="110" width="22" height="170"/>
      </g>

      {/* altar */}
      <g>
        <rect x="370" y="180" width="60" height="50" fill="#1d1228" stroke="#6E4E08" strokeWidth="1"/>
        <rect x="360" y="178" width="80" height="6" fill="#2a1b3a" stroke="#6E4E08" strokeWidth="1"/>
      </g>

      {/* censer chain */}
      <line x1="400" y1="40" x2="400" y2="130" stroke="#6E4E08" strokeWidth="1.2" strokeDasharray="3 4" />
      {/* glowing censer/orb */}
      <circle cx="400" cy="140" r="44" fill="url(#sc-orb)" opacity="0.9"/>
      <circle cx="400" cy="140" r="14" fill="#F5E6D3" opacity="0.8"/>

      {/* the held shadow on the wall */}
      <g opacity="0.55" transform="translate(280 110)">
        <path d="M30 0 a16 16 0 1 1 0.1 0 M10 130 v-22 c0-18 8-28 18-32 c-2-2 -2-5 0-7 c1-2 4-2 6 0 c2 2 2 5 0 7 c10 4 18 14 18 32 v22 z"
              fill="#000"/>
        {/* stretched shadow */}
        <path d="M52 130 q120 -8 220 0 q -110 30 -220 0 z" fill="#000" opacity="0.5"/>
      </g>

      {/* embers */}
      <g fill="#D4A028" opacity="0.8">
        <circle cx="160" cy="60" r="1.4"/>
        <circle cx="320" cy="40" r="1"/>
        <circle cx="500" cy="70" r="1.2"/>
        <circle cx="640" cy="40" r="1.4"/>
        <circle cx="220" cy="95" r="0.9"/>
        <circle cx="560" cy="100" r="1.1"/>
      </g>
    </svg>
  );
}

/* ============== REST ============== */
function WRRest() {
  const [chosen, setChosen] = React.useState(null);
  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div style={{ textAlign: "center" }}>
          <div className="wr-eyebrow">Camp · Floor 3</div>
          <h2 style={{ fontFamily: "var(--wr-f-head)", fontSize: 28, letterSpacing: "0.14em", color: "var(--wr-bone)", margin: "4px 0 10px", fontWeight: 500 }}>The Fire Holds</h2>
          <p style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", fontSize: 16, color: "var(--wr-text-2)", maxWidth: 540, margin: "0 auto" }}>
            You take stock. The walls are quiet — for an hour, at least. Choose one act before pressing deeper.
          </p>
        </div>

        <div className="wr-campfire">
          <SceneCampfire />
        </div>

        <div className="wr-rest-grid">
          {WR_REST_CHOICES.map(c => (
            <button
              key={c.id}
              className={"wr-rest-tile " + (c.color || "")}
              onClick={() => setChosen(c.id)}
              style={chosen === c.id ? { borderColor: "var(--wr-gold-bright)", boxShadow: "0 0 0 1px var(--wr-gold), 0 10px 28px -8px rgba(184,134,11,0.5)" } : null}
            >
              <span className="wr-rest-tile-icon">{WIcon(c.icon, { size: 22, stroke: 1.6 })}</span>
              <div className="wr-rest-tile-title">{c.title}</div>
              <div className="wr-rest-tile-desc">{c.desc}</div>
              <div className="wr-rest-tile-effect">{c.effect}</div>
              {chosen === c.id && (
                <span style={{
                  position: "absolute", top: 12, right: 12,
                  color: "var(--wr-gold-bright)",
                }}>{WIcon("check", { size: 18, stroke: 2.4 })}</span>
              )}
            </button>
          ))}
        </div>

        {chosen && (
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <button className="wr-btn wr-btn-gold wr-btn-lg">
              Settle In · Press Deeper {WIcon("chevR", { size: 12 })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneCampfire() {
  return (
    <svg viewBox="0 0 460 220" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <radialGradient id="cf-glow" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.8"/>
          <stop offset="40%" stopColor="#8B1538" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="cf-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#8B1538"/>
          <stop offset="50%" stopColor="#D4A028"/>
          <stop offset="100%" stopColor="#F5E6D3"/>
        </linearGradient>
      </defs>
      {/* far cave */}
      <rect width="460" height="220" fill="#0a0612"/>
      <ellipse cx="230" cy="200" rx="160" ry="40" fill="url(#cf-glow)"/>

      {/* logs */}
      <g stroke="#3a2849" strokeWidth="1.5" fill="#1d1228">
        <ellipse cx="200" cy="178" rx="80" ry="10"/>
        <line x1="160" y1="175" x2="180" y2="160" />
        <line x1="220" y1="160" x2="250" y2="175"/>
        <line x1="170" y1="180" x2="155" y2="165"/>
      </g>

      {/* flame */}
      <path d="M210 165 Q220 130 230 145 Q235 110 240 140 Q255 100 250 145 Q260 135 245 170 Q230 175 210 165 z" fill="url(#cf-flame)"/>
      <path d="M222 155 Q228 130 232 148 Q240 130 240 152 Q236 168 222 155 z" fill="#F5E6D3" opacity="0.8"/>

      {/* embers */}
      <g fill="#D4A028">
        <circle cx="180" cy="120" r="1.4"/>
        <circle cx="270" cy="100" r="1.2"/>
        <circle cx="160" cy="80" r="1"/>
        <circle cx="290" cy="60" r="1.4"/>
        <circle cx="240" cy="50" r="0.8"/>
        <circle cx="200" cy="40" r="1"/>
      </g>

      {/* silhouettes around fire */}
      <g fill="#000" opacity="0.85">
        <path d="M60 200 q-10 -50 18 -60 q24 8 16 60 z" />
        <path d="M380 200 q10 -50 -18 -60 q-24 8 -16 60 z" />
        <path d="M130 205 q-6 -30 12 -36 q14 4 8 36 z" opacity="0.8"/>
        <path d="M310 205 q6 -30 -12 -36 q-14 4 -8 36 z" opacity="0.8"/>
      </g>
    </svg>
  );
}

/* ============== SHOP ============== */
function WRShop() {
  const [purchased, setPurchased] = React.useState([]);
  const [gold, setGold] = React.useState(WR_GOLD);
  const buy = (item) => {
    if (item.reroll) {
      if (gold < item.price) return;
      setGold(g => g - item.price);
      return;
    }
    if (gold >= item.price && !purchased.includes(item.id)) {
      setGold(g => g - item.price);
      setPurchased(p => [...p, item.id]);
    }
  };

  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className="wr-shop-merchant">
          <div className="wr-shop-merchant-portrait">
            <PortraitArt kind="merchant" color="#9B5DE5" />
          </div>
          <div className="wr-shop-merchant-text">
            <div className="name">{WR_SHOP.merchant.name}</div>
            <div className="quote">“{WR_SHOP.merchant.quote}”</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div className="wr-gold-display">
              <span className="wr-gold-coin">G</span>
              <span className="wr-gold-amount">{gold}</span>
            </div>
            <span className="wr-eyebrow">Your Purse</span>
          </div>
        </div>

        <div className="wr-rule"><span className="wr-rule-diamond" /></div>

        <div className="wr-shop-grid">
          {WR_SHOP.items.map(it => {
            const isPurchased = purchased.includes(it.id);
            const cant = gold < it.price;
            return (
              <button
                key={it.id}
                className={"wr-shop-item " + it.rarity}
                disabled={isPurchased || cant}
                onClick={() => buy(it)}
              >
                <div className="wr-item-frame">
                  <span className="wr-item-rarity">{it.reroll ? "Action" : it.rarity}</span>
                  <span style={{ color: it.rarity === "legendary" ? "var(--wr-gold-bright)" : it.rarity === "rare" ? "var(--wr-violet-bright)" : "var(--wr-gold-bright)" }}>
                    {WIcon(it.icon, { size: 44, stroke: 1.2 })}
                  </span>
                </div>
                <div className="wr-item-name">{it.name}</div>
                <div className="wr-item-desc">{it.desc}</div>
                <div className="wr-item-price-row">
                  <span className={"wr-price " + (cant ? "cant" : "") + (isPurchased ? "sold" : "")}>
                    <span className="wr-gold-coin" style={{ width: 14, height: 14, fontSize: 7 }}>G</span>
                    {it.price}
                  </span>
                  <span style={{ fontFamily: "var(--wr-f-head)", fontSize: 9, letterSpacing: "0.18em", color: isPurchased ? "var(--wr-good)" : cant ? "var(--wr-blood-bright)" : "var(--wr-text-3)", textTransform: "uppercase" }}>
                    {isPurchased ? "Acquired" : cant ? "Too Costly" : it.reroll ? "Trade" : "Buy"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="wr-btn wr-btn-violet">
            {WIcon("arrowR", { size: 12 })} Leave Bazaar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== TREASURE ============== */
function WRTreasure() {
  const [chosen, setChosen] = React.useState(null);
  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner wr-treasure-stage">
        <div className="wr-eyebrow">Treasure Found</div>
        <h2 style={{ fontFamily: "var(--wr-f-head)", fontSize: 30, letterSpacing: "0.14em", color: "var(--wr-bone)", margin: 0, fontWeight: 500 }}>The Brass Casket</h2>
        <div className="wr-narration" style={{ marginTop: -4, marginBottom: 10, maxWidth: 580 }}>
          The chest exhales rust. Three reliquaries within — only one will be remembered.
        </div>

        <div className="wr-treasure-chest">
          <SceneChest />
        </div>

        <div className="wr-treasure-divider">— Choose One —</div>

        <div className="wr-treasure-cards">
          {WR_TREASURE.map((t, i) => (
            <button
              key={t.id}
              className={"wr-treasure-card " + (chosen === t.id ? "chosen" : "")}
              onClick={() => setChosen(t.id)}
              disabled={chosen && chosen !== t.id}
            >
              <div className="wr-treasure-card-frame">
                {WIcon(t.icon, { size: 56, stroke: 1.2 })}
              </div>
              <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 12.5, letterSpacing: "0.14em", color: "var(--wr-bone)", textTransform: "uppercase" }}>{t.name}</div>
              <div style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", fontSize: 13.5, color: "var(--wr-text-2)", lineHeight: 1.4 }}>{t.desc}</div>
              <span className="wr-item-rarity" style={{ position: "static", marginTop: "auto", color: "var(--wr-violet-bright)", border: "1px solid var(--wr-violet-deep)", padding: "1px 7px", borderRadius: 50, background: "rgba(91,42,140,0.3)" }}>
                {t.rarity}
              </span>
            </button>
          ))}
        </div>

        {chosen && (
          <button className="wr-btn wr-btn-gold wr-btn-lg" style={{ marginTop: 8 }}>
            {WIcon("check", { size: 12 })} Claim · {WR_TREASURE.find(t => t.id === chosen).name}
          </button>
        )}

        <button className="wr-btn wr-btn-ghost wr-btn-sm">
          {WIcon("x", { size: 11 })} Leave the chest — take none
        </button>
      </div>
    </div>
  );
}

function SceneChest() {
  return (
    <svg viewBox="0 0 220 160" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      <defs>
        <radialGradient id="ch-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#D4A028" stopOpacity="0.8"/>
          <stop offset="50%" stopColor="#9B5DE5" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0a0612" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="ch-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2849"/>
          <stop offset="100%" stopColor="#14091f"/>
        </linearGradient>
        <linearGradient id="ch-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAC067"/>
          <stop offset="100%" stopColor="#6E4E08"/>
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="50" rx="100" ry="50" fill="url(#ch-glow)"/>
      {/* lid */}
      <path d="M50 70 Q110 30 170 70 L170 90 L50 90 z" fill="url(#ch-body)" stroke="#6E4E08" strokeWidth="1.5"/>
      {/* base */}
      <rect x="40" y="88" width="140" height="60" fill="url(#ch-body)" stroke="#6E4E08" strokeWidth="1.5"/>
      {/* lock */}
      <rect x="100" y="100" width="20" height="20" fill="url(#ch-gold)" stroke="#3a2849"/>
      <circle cx="110" cy="110" r="3" fill="#0a0612"/>
      {/* bands */}
      <line x1="60" y1="88" x2="60" y2="148" stroke="#6E4E08" strokeWidth="2"/>
      <line x1="160" y1="88" x2="160" y2="148" stroke="#6E4E08" strokeWidth="2"/>
      {/* sparkle inside */}
      <g opacity="0.7">
        <path d="M110 60 l 1 4 l 4 1 l -4 1 l -1 4 l -1 -4 l -4 -1 l 4 -1 z" fill="#F5E6D3"/>
        <circle cx="80" cy="68" r="1.4" fill="#D4A028"/>
        <circle cx="140" cy="64" r="1" fill="#9B5DE5"/>
      </g>
    </svg>
  );
}

/* ============== SUMMARY ============== */
function WRSummary({ defeat }) {
  const isVictory = !defeat && WR_SUMMARY.victory;
  return (
    <div className="wr-scene wr-screen-in">
      <div className="wr-scene-inner">
        <div className={"wr-summary-banner" + (isVictory ? "" : " defeat")}>
          <div className="wr-summary-eyebrow">{isVictory ? "The Run Endures" : "The Wardens Have Fallen"}</div>
          <h1 className="wr-summary-title">{isVictory ? "VICTORY" : "DEFEAT"}</h1>
          <div className="wr-summary-subtitle">
            {isVictory
              ? "You bested The Cinder-Reeve. The fire descends with you."
              : "The Stratum claims you. The fire dies — but the names remember."}
          </div>
          <div className="wr-rule" style={{ maxWidth: 360, margin: "16px auto 0" }}>
            <span className="wr-rule-diamond" />
          </div>
        </div>

        <div className="wr-summary-grid">
          <div className="wr-stats-list">
            <div className="wr-stats-head">
              {WIcon("scroll", { size: 13 })}
              <h3>Chronicle of the Run</h3>
            </div>
            {WR_SUMMARY.stats.map((s, i) => (
              <div key={i} className="wr-stats-row">
                <span className="label">{s.l}</span>
                <span className={"value " + (s.c || "")}>{s.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="wr-wp-banner">
              <div className="wr-wp-label">Warden Points Earned</div>
              <div className="wr-wp-value">+{WR_SUMMARY.wp}</div>
              <div className="wr-wp-breakdown">
                {WR_SUMMARY.wpBreakdown.map((b, i) => <span key={i}>{b}</span>)}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(155,93,229,0.3)", fontFamily: "var(--wr-f-mono)", fontSize: 11, color: "var(--wr-text-2)" }}>
                Total · <b style={{ color: "var(--wr-bone)" }}>2,884 WP</b> · Rank IV · Cinder-Touched
              </div>
            </div>

            <div className="wr-stats-list">
              <div className="wr-stats-head">
                {WIcon("star", { size: 13 })}
                <h3>Unlocks</h3>
              </div>
              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {WR_SUMMARY.unlocks.map((u, i) => (
                  <div key={i} className="wr-unlock">
                    <span className="wr-unlock-icon">{WIcon(u.icon, { size: 16 })}</span>
                    <div className="wr-unlock-body">
                      <div className="wr-unlock-title">{u.title}</div>
                      <div className="wr-unlock-desc">{u.desc}</div>
                    </div>
                    {u.isNew && <span className="wr-unlock-badge">New</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button className="wr-btn wr-btn-violet wr-btn-lg">
            {WIcon("refresh", { size: 13 })} Begin a New Run
          </button>
          <button className="wr-btn wr-btn-ghost">
            {WIcon("scroll", { size: 12 })} Share Chronicle
          </button>
          <button className="wr-btn wr-btn-ghost">
            {WIcon("chevL", { size: 12 })} Return to Hearth
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WREvent, WRRest, WRShop, WRTreasure, WRSummary });

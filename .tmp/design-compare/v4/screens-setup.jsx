/* global React, Icon, Card, CardHead, Field, Seg, Toggle, Tile, MOCK, CLASSES, RACES, BACKGROUNDS */

/* ============================================================
   SCREEN: ROOM SETUP
   ============================================================ */
function RoomSetupScreen({ go }) {
  const [name, setName] = React.useState("The Gilded Tomb");
  const [mode, setMode] = React.useState("Classic D&D");
  const [theme, setTheme] = React.useState("Dark Fantasy");
  const [strict, setStrict] = React.useState("Standard");
  const [party, setParty] = React.useState(4);
  const [aiDm, setAiDm] = React.useState(true);
  const [vis, setVis] = React.useState("Invite");
  const [code] = React.useState("YSAV-9217");

  const modes = [
    { name: "Classic D&D", icon: "dice", desc: "Rules-as-written 5e. Human DM. Initiative, AC, conditions." },
    { name: "Story Mode",  icon: "scroll", desc: "Narrative-first. Soft rules. Resolution by intent, not math." },
    { name: "AI DM Mode",  icon: "wand",  desc: "AI Warden runs scenes and NPCs. Players keep the wheel." },
    { name: "Hexplore Mode", icon: "hex", desc: "Sandbox. Hex-by-hex travel, factions, downtime, dominion." },
  ];
  const themes = [
    { name: "Dark Fantasy", icon: "flame",   desc: "Grim, low-magic, moral cost. Berserk-shaped." },
    { name: "High Fantasy", icon: "crown",   desc: "Heroic, mythic, sweeping. Tolkien-shaped." },
    { name: "Horror",       icon: "skull",   desc: "Dread, sanity, things that should not be. Carrion-shaped." },
    { name: "Mystery",      icon: "eye",     desc: "Investigation, intrigue, clues. Noir-shaped." },
  ];
  const stricts = [
    { name: "Casual",   desc: "DM may rule loosely. Player intent often beats the die." },
    { name: "Standard", desc: "By the book, with DM discretion for table fun." },
    { name: "Hardcore", desc: "RAW. No takebacks. Death is permanent unless rules allow otherwise." },
  ];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <div className="fw-page-head">
          <div>
            <div className="fw-eyebrow">Step 1 of 2</div>
            <h1>Forge a Room</h1>
            <div className="sub">Set the rules of the table. You can change everything except mode after session one.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go("menu")}>Cancel</button>
            <button className="fw-btn fw-btn-ghost">Save as draft</button>
            <button className="fw-btn fw-btn-gold" onClick={() => go("charSetup")}>
              Next: Character Setup {Icon("arrowR", { size: 12 })}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

          {/* LEFT — form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Naming */}
            <Card elev>
              <CardHead icon="scroll" title="Identity" />
              <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
                <Field label="Room Name" hint="The banner the party will see when joining.">
                  <input className="fw-input" value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field label="Sigil">
                  <div style={{ display: "flex", gap: 8 }}>
                    {["flame","crown","skull","eye","sword","wand"].map((g, i) => (
                      <button key={g} className={"fw-btn fw-btn-icon " + (i === 0 ? "" : "fw-btn-ghost")} style={{ padding: 8, color: i === 0 ? "var(--gold-bright)" : "var(--text-3)" }}>
                        {Icon(g, { size: 16 })}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </Card>

            {/* Play Mode */}
            <Card>
              <CardHead icon="dice" title="Play Mode"
                right={<span style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Cannot be changed once session one begins.</span>}
              />
              <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {modes.map(m => (
                  <Tile key={m.name} title={m.name} desc={m.desc} icon={m.icon}
                    active={mode === m.name} onClick={() => setMode(m.name)} />
                ))}
              </div>
            </Card>

            {/* Theme */}
            <Card>
              <CardHead icon="flame" title="Theme" />
              <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {themes.map(t => (
                  <Tile key={t.name} title={t.name} desc={t.desc} icon={t.icon}
                    active={theme === t.name} onClick={() => setTheme(t.name)} />
                ))}
              </div>
            </Card>

            {/* Strictness + party */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
              <Card>
                <CardHead icon="shield" title="Rule Strictness" />
                <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stricts.map(s => (
                    <label key={s.name} onClick={() => setStrict(s.name)}
                      style={{ display: "flex", gap: 12, padding: 12, borderRadius: 8, cursor: "pointer",
                        background: strict === s.name ? "linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.02))" : "transparent",
                        border: "1px solid " + (strict === s.name ? "rgba(214,168,79,0.4)" : "var(--border-soft)") }}>
                      <span style={{ width: 16, height: 16, borderRadius: 50, border: "1px solid " + (strict === s.name ? "var(--gold)" : "var(--border)"), display: "grid", placeItems: "center", marginTop: 2 }}>
                        {strict === s.name && <span style={{ width: 7, height: 7, borderRadius: 50, background: "var(--gold)" }} />}
                      </span>
                      <div>
                        <div className="fw-display" style={{ fontSize: 13, color: strict === s.name ? "var(--text)" : "var(--text-2)" }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{s.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Card>
                  <CardHead icon="users" title="Party Size" right={
                    <span style={{ display: "flex", gap: 4 }}>
                      <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setParty(Math.max(2, party-1))}>{Icon("minus", { size: 12 })}</button>
                      <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setParty(Math.min(8, party+1))}>{Icon("plus", { size: 12 })}</button>
                    </span>
                  } />
                  <div className="fw-card-body" style={{ textAlign: "center" }}>
                    <div className="fw-display" style={{ fontSize: 56, color: "var(--gold-bright)", lineHeight: 1 }}>{party}</div>
                    <div className="fw-eyebrow" style={{ marginTop: 4 }}>Including you</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 14 }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} style={{
                          width: 18, height: 22, borderRadius: 3,
                          background: i < party ? "rgba(214,168,79,0.18)" : "rgba(255,255,255,0.02)",
                          border: "1px solid " + (i < party ? "var(--gold-deep)" : "var(--border-soft)"),
                          color: i < party ? "var(--gold-bright)" : "var(--text-4)",
                          display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--f-mono)",
                        }}>{i+1}</span>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHead icon="globe" title="Visibility" />
                  <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { v: "Private", desc: "Only those you invite can see this room." },
                      { v: "Invite",  desc: "Anyone with the code can join the lobby." },
                    ].map(o => (
                      <label key={o.v} onClick={() => setVis(o.v)}
                        style={{ display: "flex", gap: 10, padding: 10, borderRadius: 6, cursor: "pointer",
                          background: vis === o.v ? "rgba(124,58,237,0.10)" : "transparent",
                          border: "1px solid " + (vis === o.v ? "rgba(124,58,237,0.4)" : "var(--border-soft)") }}>
                        <span style={{ width: 14, height: 14, borderRadius: 50, border: "1px solid " + (vis === o.v ? "var(--arcane-bright)" : "var(--border)"), display: "grid", placeItems: "center", marginTop: 1 }}>
                          {vis === o.v && <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--arcane-bright)" }} />}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, color: "var(--text)" }}>{o.v}</div>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>{o.desc}</div>
                        </div>
                      </label>
                    ))}
                    {vis === "Invite" && (
                      <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center", padding: 8, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                        <span className="fw-eyebrow">Code</span>
                        <span style={{ flex: 1, fontFamily: "var(--f-mono)", color: "var(--gold-bright)", letterSpacing: "0.18em", textAlign: "center" }}>{code}</span>
                        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("copy", { size: 12 })}</button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* AI DM */}
            <Card style={{ border: "1px solid rgba(124,58,237,0.3)" }}>
              <CardHead icon="wand" title="AI Dungeon Master"
                right={<Toggle on={aiDm} onChange={setAiDm} />} />
              <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Tone">
                  <Seg value="Balanced" onChange={() => {}} options={["Balanced", "Grim", "Heroic", "Mystery"]} />
                </Field>
                <Field label="Rule Strictness">
                  <Seg value="Standard" onChange={() => {}} options={["Casual", "Standard", "Hardcore"]} />
                </Field>
                <Field label="Authority">
                  <Seg value="Assistant" onChange={() => {}} options={["Assistant", "Co-DM"]} />
                </Field>
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, padding: 12, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
                  <span style={{ color: "var(--arcane-bright)", marginTop: 2 }}>{Icon("info", { size: 14 })}</span>
                  <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5 }}>
                    The Warden never alters state without confirmation. Damage, conditions, death, and inventory loss always wait for your approval.
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* RIGHT — sticky preview summary */}
          <div style={{ position: "sticky", top: 20 }}>
            <Card elev className="fw-orn" style={{ overflow: "hidden" }}>
              <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
              <div style={{ padding: "0", borderBottom: "1px solid var(--border-soft)", background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18), transparent 70%)" }}>
                <div style={{ padding: "20px 18px 16px", textAlign: "center" }}>
                  <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Room preview</div>
                  <div className="fw-display" style={{ fontSize: 22, color: "var(--text)", letterSpacing: "0.04em" }}>{name}</div>
                  <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>{theme} · {mode}</div>
                </div>
              </div>
              <div style={{ padding: "16px" }}>
                <div className="fw-eyebrow" style={{ marginBottom: 8 }}>The Compact</div>
                <SummaryRow icon="dice"   k="Play Mode"        v={mode} />
                <SummaryRow icon="flame"  k="Theme"            v={theme} />
                <SummaryRow icon="shield" k="Rule Strictness"  v={strict} />
                <SummaryRow icon="users"  k="Party Size"       v={`${party} adventurers`} />
                <SummaryRow icon="wand"   k="AI Warden"        v={aiDm ? "Assistant · on" : "Off"} arc={aiDm} />
                <SummaryRow icon="globe"  k="Visibility"       v={vis === "Private" ? "Private" : `Invite — ${code}`} />

                <div className="fw-divider" style={{ marginTop: 18, marginBottom: 12 }}>
                  <span className="fw-eyebrow">Players</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <PlayerRow init="AE" name="Aedric (you)" tag="Host / DM" host />
                  {Array.from({ length: party - 1 }).map((_, i) => (
                    <PlayerRow key={i} init="—" name={`Slot ${i + 2}`} tag="Awaiting invite" empty />
                  ))}
                </div>

                <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ width: "100%", justifyContent: "center", marginTop: 18 }} onClick={() => go("charSetup")}>
                  Open the Doors {Icon("arrowR", { size: 13 })}
                </button>
                <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", marginTop: 10, fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
                  Next, you'll shape your character for this campaign.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon, k, v, arc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px dashed var(--border-soft)" }}>
      <span style={{ color: arc ? "var(--arcane-bright)" : "var(--gold)" }}>{Icon(icon, { size: 12 })}</span>
      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", flex: 1 }}>{k}</span>
      <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--f-serif)" }}>{v}</span>
    </div>
  );
}

function PlayerRow({ init, name, tag, host, empty }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: empty ? "transparent" : "var(--surface-2)", border: "1px " + (empty ? "dashed" : "solid") + " var(--border-soft)", borderRadius: 6 }}>
      <span className="fw-avatar sm" style={{ background: host ? "linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)" : "var(--surface-3)", color: empty ? "var(--text-4)" : "var(--gold-bright)", borderColor: host ? "var(--gold-deep)" : "var(--border-soft)" }}>{init}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: empty ? "var(--text-3)" : "var(--text)" }}>{name}</div>
        <div style={{ fontSize: 10.5, color: "var(--text-4)" }}>{tag}</div>
      </div>
      {host && <span className="fw-pill gold">DM</span>}
      {empty && <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px", fontSize: 11 }}>{Icon("plus", { size: 11 })} Invite</button>}
    </div>
  );
}

/* ============================================================
   SCREEN: CHARACTER SETUP
   ============================================================ */
function CharacterSetupScreen({ go }) {
  const [name, setName] = React.useState("Aedric Vael");
  const [race, setRace] = React.useState("Tiefling");
  const [cls, setCls] = React.useState("Warlock");
  const [bg, setBg] = React.useState("Outlander");
  const [align, setAlign] = React.useState("Chaotic Neutral");
  const [stats, setStats] = React.useState({ STR: 9, DEX: 14, CON: 12, INT: 13, WIS: 11, CHA: 16 });
  const [tab, setTab] = React.useState("identity");
  const total = Object.values(stats).reduce((a,b)=>a+b, 0);
  const mod = v => Math.floor((v - 10) / 2);
  const sgn = v => (v >= 0 ? "+" + v : v);

  const classMeta = CLASSES.find(c => c.name === cls) || CLASSES[0];

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <div className="fw-page-head">
          <div>
            <div className="fw-eyebrow">Step 2 of 2 · The Gilded Tomb</div>
            <h1>Bind Your Character</h1>
            <div className="sub">A name, a hand, a wound to carry. The dice know the rest.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go("roomSetup")}>{Icon("chevL", { size: 12 })} Back</button>
            <button className="fw-btn fw-btn-ghost">Import from My Characters</button>
            <button className="fw-btn fw-btn-gold" onClick={() => go("lobby")}>
              Enter Session {Icon("arrowR", { size: 12 })}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 320px", gap: 20, alignItems: "start" }}>

          {/* LEFT — Character portrait & summary */}
          <Card elev className="fw-orn" style={{ overflow: "hidden", position: "sticky", top: 20 }}>
            <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
            <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
            <div style={{ position: "relative", height: 280, background: "linear-gradient(180deg, #1a1428 0%, #08070d 100%)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.4), transparent 60%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <div style={{ width: 140, height: 140, borderRadius: "50%", background: "linear-gradient(135deg, #2a1f3d, #0c0a14)", border: "2px solid var(--gold-deep)", boxShadow: "0 0 40px -10px rgba(214,168,79,0.5)", display: "grid", placeItems: "center", fontFamily: "var(--f-display)", fontSize: 56, color: "var(--gold-bright)" }}>
                  AE
                </div>
              </div>
              <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6 }}>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ background: "rgba(0,0,0,0.5)" }}>{Icon("sparkles", { size: 12 })} Generate</button>
              </div>
              <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 6 }}>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ background: "rgba(0,0,0,0.5)" }}>Upload</button>
              </div>
            </div>
            <div style={{ padding: 16, textAlign: "center" }}>
              <div className="fw-display" style={{ fontSize: 20, color: "var(--text)" }}>{name}</div>
              <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic", marginTop: 2 }}>{race} · {cls} · Level 1</div>
              <div className="fw-divider" style={{ marginTop: 12, marginBottom: 12 }}><span className="fw-eyebrow">Vitals</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <Vital label="HP"  value="8 / 8" />
                <Vital label="AC"  value="13" />
                <Vital label="SPD" value="30 ft" />
              </div>
              <div style={{ marginTop: 14, padding: 10, background: "var(--bg-deep)", borderRadius: 6, border: "1px solid var(--border-soft)" }}>
                <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Pact / Patron</div>
                <div className="fw-serif" style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.5 }}>
                  The Cinder-Reeve, who whispers through brass and bone. Grants warlock spells while ash falls.
                </div>
              </div>
            </div>
          </Card>

          {/* CENTER — Editor with tabs */}
          <div>
            <div className="fw-tabs">
              {[
                { id: "identity", label: "Identity" },
                { id: "stats",    label: "Ability Scores" },
                { id: "back",     label: "Background" },
                { id: "gear",     label: "Starting Gear" },
              ].map(t => (
                <div key={t.id} className={"fw-tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>{t.label}</div>
              ))}
              <span style={{ flex: 1, borderBottom: "1px solid var(--border-soft)" }} />
            </div>

            <div style={{ marginTop: 16 }} className="fw-fade">
              {tab === "identity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Card>
                    <CardHead icon="user" title="Name & Lineage" />
                    <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
                      <Field label="Character Name">
                        <input className="fw-input" value={name} onChange={e => setName(e.target.value)} />
                      </Field>
                      <Field label="Alignment">
                        <select className="fw-select" value={align} onChange={e => setAlign(e.target.value)}>
                          {["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"].map(a => <option key={a}>{a}</option>)}
                        </select>
                      </Field>
                      <Field label="Race / Lineage">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {RACES.map(r => (
                            <button key={r} className={"fw-btn " + (r === race ? "fw-btn-gold" : "fw-btn-ghost") + " fw-btn-sm"} onClick={() => setRace(r)}>{r}</button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Pronouns">
                        <input className="fw-input" defaultValue="they / them" />
                      </Field>
                    </div>
                  </Card>

                  <Card>
                    <CardHead icon="sword" title="Class"
                      right={<span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>Subclass chosen at level 3.</span>} />
                    <div className="fw-card-body">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                        {CLASSES.map(c => (
                          <Tile key={c.name} icon={c.icon} title={c.name} desc={c.blurb}
                            active={cls === c.name} onClick={() => setCls(c.name)} />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 12, padding: 14, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(214,168,79,0.10)", border: "1px solid var(--gold-deep)", display: "grid", placeItems: "center", color: "var(--gold-bright)" }}>
                          {Icon(classMeta.icon, { size: 20 })}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="fw-display" style={{ fontSize: 14, color: "var(--text)" }}>{classMeta.name} · Lv 1</div>
                          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4, fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
                            {classMeta.blurb} Hit die d8 · 2 cantrips · 1 spell slot · Pact Magic recovers on short rest.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {tab === "stats" && (
                <Card>
                  <CardHead icon="dice" title="Ability Scores" right={
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="fw-eyebrow">Method</span>
                      <Seg value="Point buy" onChange={() => {}} options={["Standard","Point buy","Roll 4d6","Manual"]} />
                    </div>
                  } />
                  <div className="fw-card-body">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                      {Object.entries(stats).map(([k, v]) => (
                        <div key={k} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: 14, textAlign: "center", position: "relative" }}>
                          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{k}</div>
                          <div className="fw-display" style={{ fontSize: 36, color: "var(--gold-bright)", lineHeight: 1 }}>{v}</div>
                          <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{sgn(mod(v))}</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
                            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setStats(s => ({ ...s, [k]: Math.max(8, s[k]-1) }))}>{Icon("minus", { size: 10 })}</button>
                            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setStats(s => ({ ...s, [k]: Math.min(18, s[k]+1) }))}>{Icon("plus", { size: 10 })}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: 12, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
                      <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 14 })}</span>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>Point pool: <b style={{ color: "var(--gold-bright)", fontFamily: "var(--f-mono)" }}>27 / 27</b> · Total {total} · Tiefling adds +2 CHA, +1 INT after baseline.</div>
                      <span style={{ flex: 1 }} />
                      <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("dice", { size: 12 })} Re-roll</button>
                    </div>
                  </div>
                </Card>
              )}

              {tab === "back" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Card>
                    <CardHead icon="book" title="Background" />
                    <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {BACKGROUNDS.map(b => (
                        <Tile key={b} title={b} active={bg === b} onClick={() => setBg(b)}
                          desc={{
                            "Acolyte": "Faithful of a temple. Two languages.",
                            "Charlatan": "Confidence and forgery.",
                            "Folk Hero": "From the field. Vehicles, tools.",
                            "Noble": "Title and bearing. Politics.",
                            "Outlander": "Wilds-born. Survival.",
                            "Sage": "Library and method.",
                            "Soldier": "Drilled. Insignia honored.",
                            "Hermit": "Solitary years. A discovery."
                          }[b]} />
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <CardHead icon="scroll" title="Personal History" right={<button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("sparkles", { size: 12 })} Suggest with AI</button>} />
                    <div className="fw-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Field label="Backstory">
                        <textarea className="fw-textarea" rows="5" defaultValue={"Born to a sept of cinder-priests in the Reach. At fourteen, signed a pact with the Cinder-Reeve to spare a sister's life — and has carried the brass collar of that bargain ever since."} />
                      </Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Ideal"><input className="fw-input" defaultValue="A bargain is the only honest covenant." /></Field>
                        <Field label="Bond"><input className="fw-input" defaultValue="My sister, Lira, must never know what I gave for her." /></Field>
                        <Field label="Flaw"><input className="fw-input" defaultValue="I keep returning to the brass censer when the dreams come." /></Field>
                        <Field label="Trait"><input className="fw-input" defaultValue="I count my own heartbeats when nervous." /></Field>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {tab === "gear" && (
                <Card>
                  <CardHead icon="bag" title="Starting Gear" right={<span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>From Warlock + Outlander.</span>} />
                  <div className="fw-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {[
                      { n: "Light crossbow & 20 bolts", t: "Weapon · 1d8 piercing", on: true },
                      { n: "Simple dagger", t: "Weapon · 1d4 piercing · finesse", on: true },
                      { n: "Leather armor", t: "Armor · AC 11 + Dex", on: true },
                      { n: "Component pouch", t: "Spellcasting focus", on: true },
                      { n: "Scholar's pack", t: "12 lbs · ink, paper, parchment", on: true },
                      { n: "Staff of the Cinder-Reeve", t: "Pact weapon · 1d8 fire on hit", on: true, special: true },
                      { n: "Hunting trap", t: "Outlander · 25 gp", on: true },
                      { n: "Trinket: brass censer-key", t: "No mechanical effect.", on: true, lore: true },
                    ].map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 6, background: g.special ? "rgba(214,168,79,0.10)" : g.lore ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.025)", border: "1px solid " + (g.special ? "var(--gold-deep)" : g.lore ? "rgba(124,58,237,0.4)" : "var(--border-soft)"), display: "grid", placeItems: "center", color: g.special ? "var(--gold-bright)" : g.lore ? "var(--arcane-bright)" : "var(--text-3)" }}>
                          {Icon(g.special ? "flame" : g.lore ? "sparkles" : "bag", { size: 12 })}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "var(--text)" }}>{g.n}</div>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>{g.t}</div>
                        </div>
                        <Toggle on={g.on} onChange={() => {}} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* RIGHT — Sticky party panel */}
          <div style={{ position: "sticky", top: 20 }}>
            <Card>
              <CardHead icon="users" title="Your Party" right={<span style={{ fontSize: 11, color: "var(--text-3)" }}>3 / 4</span>} />
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { name: "Kessra Ironwake", role: "Dwarf Fighter · 7", ready: true, init: "KI", color: "#D6A84F" },
                  { name: "Mirenna Thornhart", role: "Wood Elf Druid · 7", ready: true, init: "MT", color: "#22C55E" },
                  { name: "Halric Dale", role: "Human Cleric · 6", ready: false, init: "HD", color: "#A8A29E", note: "rolling stats..." },
                ].map((p,i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
                    <span className="fw-avatar" style={{ background: `linear-gradient(135deg, ${p.color}33, #15101f)` }}>{p.init}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{p.role}</div>
                    </div>
                    {p.ready
                      ? <span className="fw-pill success">{Icon("check", { size: 10 })} Ready</span>
                      : <span className="fw-pill dim">{p.note}</span>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, padding: 10, border: "1px dashed var(--border)", borderRadius: 6, alignItems: "center", color: "var(--text-3)" }}>
                  <span style={{ width: 36, height: 36, borderRadius: 50, border: "1px dashed var(--border)", display: "grid", placeItems: "center" }}>{Icon("plus", { size: 14 })}</span>
                  <div style={{ flex: 1, fontSize: 12 }}>Invite the fifth seat</div>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("link", { size: 11 })}</button>
                </div>
              </div>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <CardHead icon="bell" title="Session Pacts" />
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--f-serif)" }}>
                <PactRow on text="Session 0 lines & veils respected." />
                <PactRow on text="HP, death, condition changes require confirmation." />
                <PactRow text="Spectator mode allowed for late joiners." />
                <PactRow on text="Side conversations move to whispers." />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Vital({ label, value }) {
  return (
    <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: "8px 6px" }}>
      <div className="fw-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: 16, color: "var(--gold-bright)" }}>{value}</div>
    </div>
  );
}
function PactRow({ on, text }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid " + (on ? "var(--gold)" : "var(--border)"), background: on ? "rgba(214,168,79,0.15)" : "transparent", display: "grid", placeItems: "center", color: "var(--gold-bright)", marginTop: 2, flexShrink: 0 }}>
        {on && Icon("check", { size: 9 })}
      </span>
      <span style={{ fontStyle: "italic", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

Object.assign(window, { RoomSetupScreen, CharacterSetupScreen });

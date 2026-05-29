/* global React, Icon, Card, CardHead, Field, Toggle, FateSeal, MOCK */

/* ============================================================
   SCREEN: LOBBY / PRE-GAME — waiting room before session starts
   ============================================================ */
function LobbyScreen({ go }) {
  const [ready, setReady] = React.useState(false);
  const [mic, setMic] = React.useState(true);
  const [vol, setVol] = React.useState(70);
  const [chatDraft, setChatDraft] = React.useState("");
  const [chat, setChat] = React.useState([
    { who: "Mirenna",   t: "you bringing the bone fragment back tonight? :)", time: "19:42", c: "#22C55E" },
    { who: "Kessra",    t: "I have it. Don't worry.", time: "19:43", c: "#D6A84F" },
    { who: "DM Maelis", t: "Lines & Veils refresh in the right pane — please skim. Also, Halric needs a death save first thing.", time: "19:44", c: "#A271FF", dm: true },
    { who: "you",       t: "Was Halric stabilized? I rolled medicine last session.", time: "19:48", you: true },
    { who: "DM Maelis", t: "Stable but unconscious. Death saves only if hit again.", time: "19:48", c: "#A271FF", dm: true },
  ]);

  const seats = [
    { i: "AE", name: "Aedric Vael",       c: "Warlock 7", color: "#7C3AED", you: true, ready: ready, mic: mic, ping: 24 },
    { i: "KI", name: "Kessra Ironwake",   c: "Fighter 7", color: "#D6A84F", ready: true,  mic: true,  ping: 18 },
    { i: "MT", name: "Mirenna Thornhart", c: "Druid 7",   color: "#22C55E", ready: true,  mic: true,  ping: 42 },
    { i: "HD", name: "Halric Dale",       c: "Cleric 6",  color: "#A8A29E", ready: false, mic: false, ping: 86, down: true, note: "Unconscious in fiction — ready to roll" },
    { kind: "empty", note: "Open seat · invite link" },
    { kind: "spectator", i: "BR", name: "Brask", c: "Spectator", color: "#D6A84F", ready: true,  mic: false },
  ];

  const send = () => {
    if (!chatDraft.trim()) return;
    setChat(c => [...c, { who: "you", t: chatDraft, time: new Date().toLocaleTimeString().slice(0,5), you: true }]);
    setChatDraft("");
  };

  const readyCount = seats.filter(s => s.kind !== "empty" && s.kind !== "spectator" && s.ready).length;
  const totalPlayers = seats.filter(s => s.kind !== "empty" && s.kind !== "spectator").length;

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>

        {/* HEADER BANNER */}
        <LobbyHeader go={go} readyCount={readyCount} totalPlayers={totalPlayers} />

        <div className="fw-lobby-grid">
          {/* LEFT — Party + chat */}
          <div className="fw-lobby-col">

            {/* PARTY SEATS */}
            <Card>
              <CardHead icon="users" title="The Table" right={
                <span style={{ fontSize: 11.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>
                  <b style={{ color: readyCount === totalPlayers ? "var(--success)" : "var(--gold-bright)" }}>{readyCount}</b> / {totalPlayers} ready
                </span>
              } />
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {seats.map((s, i) => <SeatCard key={i} seat={s} />)}
              </div>
            </Card>

            {/* CHAT */}
            <Card style={{ display: "flex", flexDirection: "column", minHeight: 340 }}>
              <CardHead icon="users" title="Table Chat · pre-game" right={
                <span style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Bring your dice. The Reeve does not.</span>
              } />
              <div className="fw-scroll" style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 280 }}>
                {chat.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span className="fw-avatar sm" style={{
                      background: m.dm ? "linear-gradient(135deg, rgba(124,58,237,0.4), #15101f)" : m.you ? "linear-gradient(135deg, rgba(214,168,79,0.35), #15101f)" : `linear-gradient(135deg, ${m.c || "#A8A29E"}33, #15101f)`,
                      borderColor: m.dm ? "var(--arcane)" : m.you ? "var(--gold-deep)" : "var(--border)",
                      fontSize: 10, flexShrink: 0,
                    }}>{m.who.slice(0,2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: m.dm ? "var(--arcane-bright)" : m.you ? "var(--gold-bright)" : "var(--text-2)", fontWeight: 500 }}>{m.you ? "You" : m.who}</span>
                        {m.dm && <span className="fw-pill" style={{ background: "rgba(124,58,237,0.15)", borderColor: "var(--arcane)", color: "var(--arcane-bright)", fontSize: 9 }}>DM</span>}
                        <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>{m.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontFamily: "var(--f-serif)" }}>{m.t}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--border-soft)", padding: 12, display: "flex", gap: 8 }}>
                <input className="fw-input" value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Say hello to the table…" style={{ flex: 1 }} />
                <button className="fw-btn fw-btn-icon fw-btn-ghost">{Icon("sparkles", { size: 13 })}</button>
                <button className="fw-btn fw-btn-gold" onClick={send}>{Icon("send", { size: 12 })} Send</button>
              </div>
            </Card>

            {/* AUDIO CHECK */}
            <Card>
              <CardHead icon="volume" title="Voice & Audio Check" />
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: mic ? "var(--gold-bright)" : "var(--text-3)" }}>{Icon(mic ? "mic" : "micOff", { size: 14 })}</span>
                    <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>Microphone</span>
                    <Toggle on={mic} onChange={setMic} />
                  </div>
                  <div style={{ background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, padding: 10 }}>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 6, fontFamily: "var(--f-mono)" }}>Input · meter</div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <span key={i} style={{
                          flex: 1, height: 10,
                          background: mic && i < 12 ? (i < 8 ? "var(--success)" : i < 11 ? "var(--gold-bright)" : "var(--blood-bright)") : "var(--surface-2)",
                          borderRadius: 1,
                          animation: mic && i < 12 ? `fw-meter-pulse ${0.6 + i * 0.04}s ease-in-out infinite alternate` : "none",
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, fontFamily: "var(--f-mono)" }}>BlueYeti X · 48kHz</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--gold-bright)" }}>{Icon("volume", { size: 14 })}</span>
                    <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>Master · {vol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={vol} onChange={e => setVol(+e.target.value)} style={{ width: "100%", accentColor: "var(--gold)" }} />
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ justifyContent: "center" }}>{Icon("play", { size: 11 })} Play test cue</button>
                  <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Output · Speakers (Realtek)</div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — Brief, lines & veils, ready CTA */}
          <div className="fw-lobby-col">

            {/* SESSION BRIEF */}
            <Card elev className="fw-orn" style={{ overflow: "hidden" }}>
              <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
              <div style={{ position: "relative", height: 130, overflow: "hidden", background: "linear-gradient(135deg, #1a1428, #06050b)" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(214,168,79,0.32), transparent 65%), radial-gradient(ellipse at 80% 40%, rgba(124,58,237,0.3), transparent 65%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.7 }}>
                  <FateSeal size={140} animate />
                </div>
                <div style={{ position: "absolute", left: 16, top: 14, display: "flex", gap: 6 }}>
                  <span className="fw-pill gold">{Icon("flame", { size: 10 })} Session 16</span>
                  <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2.4s infinite" }}>
                    <span style={{ width: 5, height: 5, borderRadius: 50, background: "currentColor" }} /> Starts in 14m
                  </span>
                </div>
              </div>
              <div style={{ padding: "16px 18px" }}>
                <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Act III · The Gilded Tomb</div>
                <h3 className="fw-display" style={{ fontSize: 22, color: "var(--text)", lineHeight: 1.1, marginBottom: 8 }}>The Hollow Crown<br /><span style={{ color: "var(--gold-bright)" }}>of Ysavir</span></h3>
                <div className="fw-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Last time</div>
                <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.55 }}>
                  The party reached the chapel beneath Ysavir. Brass-spears ambushed at the threshold. Halric went down covering Mirenna. The Cinder-Reeve has not moved since you arrived.
                </p>
                <div className="fw-eyebrow" style={{ fontSize: 9.5, marginTop: 12, marginBottom: 4 }}>Tonight</div>
                <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.55 }}>
                  The binding circle. The held shadow. A decision — and the brass chain frays either way.
                </p>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>{Icon("scroll", { size: 11 })} Read full recap</button>
              </div>
            </Card>

            {/* LINES & VEILS */}
            <Card>
              <CardHead icon="shield" title="Lines & Veils" right={
                <span className="fw-pill" style={{ background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.35)", color: "var(--arcane-bright)", fontSize: 9 }}>Compact</span>
              } />
              <div style={{ padding: "12px 14px" }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9.5, color: "var(--blood-bright)", marginBottom: 6 }}>Hard lines (off-screen)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <span className="fw-cond bleed">Harm to children</span>
                    <span className="fw-cond bleed">Sexual violence</span>
                    <span className="fw-cond bleed">Self-harm imagery</span>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div className="fw-eyebrow" style={{ fontSize: 9.5, color: "var(--gold-bright)", marginBottom: 6 }}>Veils (fade to black)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <span className="fw-cond">Graphic torture</span>
                    <span className="fw-cond">Animal harm</span>
                    <span className="fw-cond">Sustained body horror</span>
                  </div>
                </div>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ width: "100%", justifyContent: "center" }}>{Icon("plus", { size: 11 })} Raise a concern (DM only)</button>
              </div>
            </Card>

            {/* TONIGHT'S MOOD */}
            <Card style={{ borderColor: "rgba(124,58,237,0.3)" }}>
              <CardHead icon="wand" title="DM Note · Tonight's Mood" />
              <div style={{ padding: 14, display: "flex", gap: 12, fontSize: 12.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", lineHeight: 1.55 }}>
                <span style={{ width: 6, alignSelf: "stretch", background: "var(--arcane)", borderRadius: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontStyle: "italic" }}>
                    Slow burn, then a single sharp break. If you usually narrate combat in three sentences — tonight, give me one. The Reeve speaks like the room is colder. Halric does not speak at all.
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)", letterSpacing: "0.04em" }}>— DM Maelis · just now</div>
                </div>
              </div>
            </Card>

            {/* READY CHECK */}
            <Card style={{ borderColor: ready ? "rgba(34,197,94,0.4)" : "rgba(214,168,79,0.3)" }}>
              <div style={{ padding: 18, textAlign: "center" }}>
                <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Your Status</div>
                {ready ? (
                  <div>
                    <div className="fw-display" style={{ fontSize: 26, color: "var(--success)" }}>{Icon("check", { size: 22 })} Ready</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 4 }}>The dice are warm.</div>
                  </div>
                ) : (
                  <div>
                    <div className="fw-display" style={{ fontSize: 22, color: "var(--gold-bright)" }}>Awaiting your sigil</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 4 }}>Mark ready when you've reviewed the brief.</div>
                  </div>
                )}
                <button className={"fw-btn " + (ready ? "fw-btn-ghost" : "fw-btn-gold") + " fw-btn-lg"} style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => setReady(r => !r)}>
                  {ready ? <>{Icon("x", { size: 12 })} Unmark ready</> : <>{Icon("check", { size: 13 })} Mark ready</>}
                </button>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("scroll", { size: 11 })} Open sheet</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ flex: 1, justifyContent: "center" }}>{Icon("logout", { size: 11 })} Leave</button>
                </div>
              </div>
            </Card>

            <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ justifyContent: "center", opacity: readyCount >= 3 ? 1 : 0.5 }} onClick={() => go && go("game")}>
              {Icon("play", { size: 14 })} Host: Begin Session ({readyCount}/{totalPlayers})
            </button>
            <div style={{ fontSize: 10.5, color: "var(--text-4)", textAlign: "center", marginTop: -10, fontFamily: "var(--f-serif)", fontStyle: "italic" }}>
              Halric's player marked unconscious-as-narrative. We may begin.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HEADER ---------------- */
function LobbyHeader({ go, readyCount, totalPlayers }) {
  return (
    <div className="fw-lobby-banner fw-orn">
      <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
      <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 12, background: "linear-gradient(135deg, rgba(214,168,79,0.18), #15101f)", border: "1px solid var(--gold-deep)", display: "grid", placeItems: "center", color: "var(--gold-bright)", flexShrink: 0, boxShadow: "0 0 24px -6px rgba(214,168,79,0.35)" }}>
          {Icon("flame", { size: 26 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="fw-eyebrow" style={{ color: "var(--gold)" }}>Lobby · waiting room</span>
            <span className="fw-pill blood" style={{ animation: "fw-glow-pulse 2.4s infinite" }}>
              <span style={{ width: 5, height: 5, borderRadius: 50, background: "currentColor" }} /> Live in 14m
            </span>
          </div>
          <h1 className="fw-display" style={{ fontSize: 28, color: "var(--text)", lineHeight: 1.1, letterSpacing: "0.04em" }}>The Gilded Tomb</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="fw-pill">{Icon("dice", { size: 10 })} Classic D&amp;D 5e</span>
            <span className="fw-pill">{Icon("flame", { size: 10 })} Dark Fantasy</span>
            <span className="fw-pill">{Icon("shield", { size: 10 })} Standard rules</span>
            <span className="fw-pill dim">DM · Maelis</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: 6 }}>
            <span className="fw-eyebrow" style={{ fontSize: 9.5 }}>Code</span>
            <span style={{ fontFamily: "var(--f-mono)", color: "var(--gold-bright)", letterSpacing: "0.2em", fontSize: 14 }}>YSAV-9217</span>
            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("copy", { size: 11 })}</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => go && go("menu")}>{Icon("chevL", { size: 11 })} Back</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("link", { size: 11 })} Share link</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm">{Icon("cog", { size: 11 })}</button>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>
            {readyCount}/{totalPlayers} ready · 4 players · 1 spectator
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SEAT CARD ---------------- */
function SeatCard({ seat }) {
  if (seat.kind === "empty") {
    return (
      <div className="fw-seat fw-seat-empty">
        <div className="fw-seat-empty-mark">{Icon("plus", { size: 22 })}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>Open seat</div>
        <div style={{ fontSize: 10.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{seat.note}</div>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginTop: 10 }}>{Icon("link", { size: 11 })} Invite</button>
      </div>
    );
  }
  if (seat.kind === "spectator") {
    return (
      <div className="fw-seat fw-seat-spectator">
        <span className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${seat.color}33, #15101f)` }}>{seat.i}</span>
        <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{seat.name}</div>
        <span className="fw-pill dim" style={{ fontSize: 9.5 }}>{Icon("eye", { size: 9 })} Spectator</span>
        <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--f-mono)" }}>quiet mode</div>
      </div>
    );
  }
  return (
    <div className={"fw-seat " + (seat.you ? "you" : "") + (seat.ready ? " ready" : "")}>
      <div style={{ position: "relative" }}>
        <span className="fw-avatar lg" style={{ background: `linear-gradient(135deg, ${seat.color}33, #15101f)`, borderColor: seat.you ? "var(--gold)" : seat.ready ? "rgba(34,197,94,0.4)" : "var(--border)" }}>{seat.i}</span>
        <span style={{
          position: "absolute", bottom: -2, right: -2,
          width: 22, height: 22, borderRadius: 50,
          background: seat.ready ? "var(--success)" : "var(--surface-3)",
          border: "2px solid var(--surface)",
          display: "grid", placeItems: "center",
          color: seat.ready ? "#0a1a0e" : "var(--text-3)",
        }}>{seat.ready ? Icon("check", { size: 11 }) : <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--text-3)" }} />}</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{seat.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{seat.c}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
        <span style={{ color: seat.mic ? "var(--gold-bright)" : "var(--text-4)" }}>{Icon(seat.mic ? "mic" : "micOff", { size: 11 })}</span>
        <span style={{
          fontSize: 10, fontFamily: "var(--f-mono)",
          color: seat.ping < 30 ? "var(--success)" : seat.ping < 60 ? "var(--warning)" : "var(--blood-bright)",
        }}>{seat.ping} ms</span>
        {seat.you && <span className="fw-pill gold" style={{ fontSize: 9, padding: "0 5px" }}>You</span>}
        {seat.down && <span className="fw-pill bleed" style={{ fontSize: 9, padding: "0 5px", background: "rgba(153,27,27,0.14)", borderColor: "rgba(153,27,27,0.4)", color: "#FCA5A5" }}>0 HP</span>}
      </div>
      {seat.note && <div style={{ fontSize: 10, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", textAlign: "center", marginTop: 4, lineHeight: 1.3 }}>"{seat.note}"</div>}
    </div>
  );
}

Object.assign(window, { LobbyScreen });

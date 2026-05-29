/* global React, WIcon, WR_MAP, NODE_INFO */
/* ============================================================
   WARDEN'S RUN — RUN MAP
   Branching node graph, current floor marked, paths visible.
   ============================================================ */

function WRRunMap({ onPick }) {
  const [hovered, setHovered] = React.useState(null);
  const [currentIdx, setCurrentIdx] = React.useState(5); // we're on floor 2, middle
  const visited = [0, 2, 5]; // path taken so far

  const nodes = WR_MAP.floors;
  const edges = WR_MAP.edges;
  const numLayers = Math.max(...nodes.map(n => n.layer)) + 1;
  const scrollRef = React.useRef(null);

  // available = nodes that have an edge from current
  const available = edges
    .filter(([a]) => a === currentIdx)
    .map(([, b]) => b);

  // Layout: each layer is a row. Total height = numLayers * rowH
  const rowH = 100;
  const totalH = numLayers * rowH + 120;

  const positionOf = (idx) => {
    const n = nodes[idx];
    // INVERT: top = boss (deepest), bottom = start (entrance)
    const y = totalH - 80 - (n.layer * rowH);
    return { x: n.x * 100, y };
  };

  // Auto-center on current node — defer past initial render
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { y } = positionOf(currentIdx);
    // Disable smooth scroll briefly so initial jump is instant
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.5);
    requestAnimationFrame(() => { el.style.scrollBehavior = prev; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wr-map-stage">
      <div className="wr-map-scroll" ref={scrollRef}>
        <div className="wr-map-canvas wr-screen-in">
          <div className="wr-map-title">
            <div className="wr-rule"><span className="wr-rule-diamond" /></div>
            <h1>Stratum of Ash</h1>
            <div className="sub">Floor {WR_RUN.floor} of {WR_RUN.depth} · The Cinder-Reeve waits below</div>
          </div>

          {/* Graph */}
          <div className="wr-map-graph" style={{ height: totalH }}>
            {/* SVG connections */}
            <svg className="wr-map-svg" viewBox={`0 0 100 ${totalH}`} preserveAspectRatio="none">
              <defs>
                <pattern id="wr-path-dash" patternUnits="userSpaceOnUse" width="6" height="2">
                  <path d="M 0 1 L 4 1" stroke="rgba(184,134,11,0.45)" strokeWidth="1.2" />
                </pattern>
                <linearGradient id="wr-path-avail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9B5DE5" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#5B2A8C" stopOpacity="0.7"/>
                </linearGradient>
              </defs>
              {edges.map(([a, b], i) => {
                const A = positionOf(a);
                const B = positionOf(b);
                const isAvail   = a === currentIdx && available.includes(b);
                const isVisited = visited.includes(a) && visited.includes(b);
                // curve up to b
                const my = (A.y + B.y) / 2;
                const cp1 = `${A.x} ${my}`;
                const cp2 = `${B.x} ${my}`;
                const d = `M ${A.x} ${A.y} C ${cp1}, ${cp2}, ${B.x} ${B.y}`;
                let stroke = "rgba(58,40,73,0.7)";
                let sw = 0.4;
                let dash = "";
                if (isVisited) { stroke = "rgba(184,134,11,0.45)"; sw = 0.45; dash = "0.6 0.8"; }
                if (isAvail)   { stroke = "url(#wr-path-avail)";   sw = 0.7; dash = ""; }
                return (
                  <path
                    key={i}
                    d={d}
                    stroke={stroke}
                    strokeWidth={sw}
                    strokeDasharray={dash}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((n, idx) => {
              const info = NODE_INFO[n.kind];
              const isCurrent  = idx === currentIdx;
              const isVisited  = visited.includes(idx) && !isCurrent;
              const isAvail    = available.includes(idx);
              const isBoss     = n.kind === "boss";
              const { x, y } = positionOf(idx);

              const classes = ["wr-node"];
              if (isCurrent) classes.push("current");
              else if (isAvail) classes.push("available");
              else if (isVisited) classes.push("visited");
              else classes.push("locked");
              if (n.kind === "elite") classes.push("elite");
              if (isBoss) classes.push("boss");

              return (
                <button
                  key={idx}
                  className={classes.join(" ")}
                  style={{ left: `${x}%`, top: y }}
                  disabled={!isAvail}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (!isAvail) return;
                    setCurrentIdx(idx);
                    if (onPick) onPick(n);
                  }}
                  aria-label={info.label}
                >
                  <span className="wr-node-disc">
                    {WIcon(info.icon, { size: isBoss ? 36 : 26 })}
                  </span>
                  <span className="wr-node-label">{n.label}</span>

                  {hovered === idx && (
                    <div className="wr-node-tip">
                      <div style={{ fontFamily: "var(--wr-f-head)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--wr-bone)", marginBottom: 4 }}>{info.label}</div>
                      <div style={{ fontFamily: "var(--wr-f-body)", fontStyle: "italic", fontSize: 13, color: "var(--wr-text-2)", lineHeight: 1.4 }}>{info.blurb}</div>
                      {isAvail && (
                        <div style={{ marginTop: 6, fontFamily: "var(--wr-f-head)", fontSize: 9, letterSpacing: "0.22em", color: "var(--wr-violet-bright)" }}>
                          Click to advance →
                        </div>
                      )}
                      {!isAvail && !isVisited && !isCurrent && (
                        <div style={{ marginTop: 6, fontFamily: "var(--wr-f-head)", fontSize: 9, letterSpacing: "0.22em", color: "var(--wr-text-4)" }}>
                          Reach via available paths
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <WRMapLegend />
        </div>
      </div>

      {/* Depth indicator down the right edge */}
      <WRDepthRail floor={WR_RUN.floor} depth={WR_RUN.depth} />
    </div>
  );
}

function WRMapLegend() {
  const items = [
    { kind: "combat",   label: "Skirmish" },
    { kind: "elite",    label: "Elite" },
    { kind: "boss",     label: "Boss" },
    { kind: "rest",     label: "Camp" },
    { kind: "shop",     label: "Bazaar" },
    { kind: "treasure", label: "Treasure" },
    { kind: "mystery",  label: "Mystery" },
    { kind: "forge",    label: "Forge" },
    { kind: "gamble",   label: "Gamble" },
  ];
  return (
    <div style={{
      marginTop: 32,
      padding: "12px 16px",
      maxWidth: 720,
      marginLeft: "auto", marginRight: "auto",
      background: "linear-gradient(180deg, rgba(40, 26, 54, 0.6), rgba(20, 9, 31, 0.7))",
      border: "1px solid var(--wr-edge)",
      borderRadius: 3,
    }}>
      <div className="wr-eyebrow" style={{ textAlign: "center", marginBottom: 8 }}>Legend · Stratum Glyphs</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "6px 10px" }}>
        {items.map(it => {
          const info = NODE_INFO[it.kind];
          return (
            <div key={it.kind} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                border: "1px solid var(--wr-edge)",
                background: "var(--wr-bg-deep)",
                display: "grid", placeItems: "center",
                color: it.kind === "boss" || it.kind === "elite" ? "var(--wr-blood-bright)"
                       : it.kind === "shop" || it.kind === "mystery" || it.kind === "gamble" ? "var(--wr-violet-bright)"
                       : "var(--wr-gold-bright)",
              }}>
                {WIcon(info.icon, { size: 13 })}
              </span>
              <span style={{ fontFamily: "var(--wr-f-head)", fontSize: 10, letterSpacing: "0.14em", color: "var(--wr-text-2)", textTransform: "uppercase" }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WRDepthRail({ floor, depth }) {
  return (
    <div style={{
      position: "absolute",
      right: 10, top: 24, bottom: 24,
      width: 36,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      pointerEvents: "none",
      zIndex: 5,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--wr-bg-deep)",
          border: "1px solid var(--wr-blood)",
          display: "grid", placeItems: "center",
          color: "var(--wr-blood-bright)",
        }}>
          {WIcon("skull", { size: 12 })}
        </div>
        <span style={{ fontFamily: "var(--wr-f-head)", fontSize: 8, letterSpacing: "0.2em", color: "var(--wr-text-3)", writingMode: "vertical-rl", textOrientation: "mixed", textTransform: "uppercase" }}>Depths</span>
      </div>

      <div style={{
        flex: 1,
        width: 2,
        margin: "12px 0",
        background: "linear-gradient(180deg, var(--wr-blood-deep), var(--wr-gold-deep))",
        position: "relative",
      }}>
        {Array.from({ length: depth + 1 }).map((_, i) => {
          const isCurrent = (depth - i) === floor;
          return (
            <div key={i} style={{
              position: "absolute",
              left: "50%",
              top: `${(i / depth) * 100}%`,
              transform: "translate(-50%, -50%)",
              width: isCurrent ? 14 : 6,
              height: isCurrent ? 14 : 6,
              borderRadius: "50%",
              background: isCurrent ? "var(--wr-gold-bright)" : (depth - i) < floor ? "var(--wr-edge-hi)" : "var(--wr-gold-deep)",
              boxShadow: isCurrent ? "0 0 12px var(--wr-gold-bright)" : "none",
              border: isCurrent ? "1px solid var(--wr-bg)" : "0",
            }} />
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "var(--wr-f-head)", fontSize: 8, letterSpacing: "0.2em", color: "var(--wr-text-3)", writingMode: "vertical-rl", textOrientation: "mixed", textTransform: "uppercase" }}>Surface</span>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--wr-bg-deep)",
          border: "1px solid var(--wr-gold-deep)",
          display: "grid", placeItems: "center",
          color: "var(--wr-gold-bright)",
        }}>
          {WIcon("compass", { size: 12 })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WRRunMap });

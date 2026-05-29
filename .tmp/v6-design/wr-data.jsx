/* global React */
/* ============================================================
   WARDEN'S RUN — Icons, helpers, mock data, portrait art
   ============================================================ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- ICONS ---------- */
const WRI = {};
const wrmk = (name, paths) => {
  WRI[name] = ({ size = 18, stroke = 1.6, ...rest }) =>
    React.createElement("svg", {
      width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: stroke,
      strokeLinecap: "round", strokeLinejoin: "round", ...rest
    }, paths);
};
wrmk("sword",   <><path d="M14.5 6.5L18 3l3 3-3.5 3.5"/><path d="M14.5 6.5L4 17l3 3L17.5 9.5"/><path d="M5 18l1.5 1.5"/></>);
wrmk("sword2",  <><path d="M12 2v14M9 5l3-3 3 3M9 19h6M12 16v6"/></>);
wrmk("shield",  <><path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></>);
wrmk("skull",   <><path d="M12 3a8 8 0 00-8 8v3l2 2v3h3v-2h6v2h3v-3l2-2v-3a8 8 0 00-8-8z"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><path d="M11 16h2"/></>);
wrmk("crown",   <><path d="M3 7l3 6 3-7 3 5 3-5 3 7 3-6v11H3z"/><path d="M3 18h18"/></>);
wrmk("crownSkull", <><path d="M5 7l3 4 4-6 4 6 3-4-2 9H7zM6 16h12v3H6z"/><circle cx="10" cy="17.5" r="0.6"/><circle cx="14" cy="17.5" r="0.6"/></>);
wrmk("flame",   <><path d="M12 3c0 4 5 5 5 10a5 5 0 11-10 0c0-3 2-4 2-7 0 2 3 2 3-3z"/></>);
wrmk("torch",   <><path d="M10 3c-1 3 3 4 2 7-1 2-3 2-3 5h6c0-3-2-3-3-5-1-3 3-4 2-7z"/><path d="M10 18v3M12 18v3M14 18v3"/></>);
wrmk("campfire",<><path d="M12 5c-1 2 2 3 2 5a2 2 0 11-4 0c0-1.4 1-1.5 1-3"/><path d="M4 17l16 0M5 17l3-3M19 17l-3-3M9 17l3-3 3 3"/></>);
wrmk("heart",   <><path d="M12 20s-7-4.5-9-9C1.5 7 4 4 7 4c1.7 0 3.5 1 5 3 1.5-2 3.3-3 5-3 3 0 5.5 3 4 7-2 4.5-9 9-9 9z"/></>);
wrmk("heartPlus",<><path d="M12 20s-7-4.5-9-9C1.5 7 4 4 7 4c1.7 0 3.5 1 5 3 1.5-2 3.3-3 5-3 3 0 5.5 3 4 7-2 4.5-9 9-9 9z"/><path d="M12 9v6M9 12h6" stroke="currentColor"/></>);
wrmk("eye",     <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
wrmk("bag",     <><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></>);
wrmk("coin",    <><circle cx="12" cy="12" r="9"/><path d="M14 8h-3a2 2 0 000 4h2a2 2 0 010 4H10M12 6v2M12 16v2"/></>);
wrmk("chest",   <><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M8 7l4-4 4 4M11 13v3h2v-3z"/></>);
wrmk("treasure",<><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M8 7l4-4 4 4"/><circle cx="12" cy="15" r="1.2"/></>);
wrmk("scroll",  <><path d="M4 6c0-1.5 1-2 2.5-2H17a2 2 0 012 2v11"/><path d="M19 17H8a2 2 0 100 4h11"/><path d="M8 8h8M8 12h6"/></>);
wrmk("book",    <><path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M5 18a2 2 0 012-2h11"/></>);
wrmk("anvil",   <><path d="M3 11h14c2 0 3 1 3 3v1h-3v2H8v-2H5v-3l-2-1z"/><path d="M5 11V7h4"/></>);
wrmk("hammer",  <><path d="M14 4l6 6-4 4-6-6z"/><path d="M10 8l-7 7 3 3 7-7"/></>);
wrmk("dice",    <><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/></>);
wrmk("dice2",   <><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="16" r="1.2"/></>);
wrmk("question",<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 113 4v2M12 17.5v.5"/></>);
wrmk("star",    <><path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/></>);
wrmk("sparkles",<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="2"/></>);
wrmk("wand",    <><path d="M4 20L17 7M14 4l2 2M20 10l-2-2M19 4l1 1M13 11l3 3"/></>);
wrmk("potion",  <><path d="M9 3h6v3l2 3v9a2 2 0 01-2 2H9a2 2 0 01-2-2V9l2-3z"/><path d="M7 13h10"/></>);
wrmk("zap",     <><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>);
wrmk("arrowR",  <><path d="M5 12h14M13 6l6 6-6 6"/></>);
wrmk("chevR",   <><path d="M9 6l6 6-6 6"/></>);
wrmk("chevL",   <><path d="M15 6l-6 6 6 6"/></>);
wrmk("chevU",   <><path d="M18 15l-6-6-6 6"/></>);
wrmk("x",       <><path d="M6 6l12 12M18 6L6 18"/></>);
wrmk("check",   <><path d="M5 13l4 4 10-10"/></>);
wrmk("plus",    <><path d="M12 5v14M5 12h14"/></>);
wrmk("minus",   <><path d="M5 12h14"/></>);
wrmk("refresh", <><path d="M3 12a9 9 0 1015-7"/><path d="M18 3v6h-6"/></>);
wrmk("map",     <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>);
wrmk("compass", <><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5L13 13l-3.5 1.5L11 11z"/></>);
wrmk("target",  <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>);
wrmk("reticle", <><circle cx="12" cy="12" r="8"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/></>);
wrmk("bones",   <><path d="M4 5c0-1.5 2-2 3-1s1 2.5 0 3l8 8c1.5-1 3 0 3 1s-.5 3-2 3-2-1-2-2l-8-8c-1 1-3 0-3-1z"/></>);
wrmk("ghost",   <><path d="M5 20V11a7 7 0 1114 0v9l-2-2-2 2-3-2-3 2-2-2z"/><circle cx="9.5" cy="11" r="1"/><circle cx="14.5" cy="11" r="1"/></>);
wrmk("spider",  <><circle cx="12" cy="12" r="4"/><path d="M12 8V4M3 6l5 4M3 12h5M3 18l5-4M21 6l-5 4M21 12h-5M21 18l-5-4M12 16v4"/></>);
wrmk("bat",     <><path d="M12 5c-2 0-3 2-5 2s-4-1-4-1c0 4 2 7 5 7l1 2 1-2 1 2 1-2c3 0 5-3 5-7 0 0-2 1-4 1s-3-2-5-2z" transform="translate(2.5 0)"/></>);
wrmk("lightning",<><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></>);
wrmk("moon",    <><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></>);
wrmk("feather", <><path d="M20 4c-7 0-14 7-14 14v2h2c7 0 14-7 14-14V4z"/><path d="M16 8l-8 8M16 8H8M16 8v8"/></>);
wrmk("clock",   <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
wrmk("settings",<><circle cx="12" cy="12" r="3"/><path d="M19 12c0-.5 0-1-.2-1.5l2-1.5-2-3.5-2.4 1c-.7-.5-1.5-1-2.4-1.2L13.5 3h-3l-.5 2.3c-.9.3-1.7.7-2.4 1.2l-2.4-1-2 3.5 2 1.5c-.2.5-.2 1-.2 1.5s0 1 .2 1.5l-2 1.5 2 3.5 2.4-1c.7.5 1.5 1 2.4 1.2L10.5 21h3l.5-2.3c.9-.3 1.7-.7 2.4-1.2l2.4 1 2-3.5-2-1.5c.2-.5.2-1 .2-1.5z"/></>);
wrmk("rune",    <><path d="M12 2l4 4v12l-4 4-4-4V6z M12 6v12 M8 10h8 M8 14h8"/></>);

const WIcon = (name, props = {}) => {
  const C = WRI[name];
  return C ? <C {...props} /> : null;
};

/* ---------- PORTRAIT ART ---------- */
/* Stylized silhouette portraits — class crest + figure */
function PortraitArt({ kind, color }) {
  const c = color || "#9B5DE5";
  const id = "wrp-" + kind + "-" + c.replace("#", "");
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
      <defs>
        <radialGradient id={id + "-aura"} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.5" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + "-fig"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1428" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#0a0612" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#050309" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={id + "-rim"} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c} stopOpacity="0.6" />
          <stop offset="40%" stopColor={c} stopOpacity="0" />
          <stop offset="60%" stopColor={c} stopOpacity="0" />
          <stop offset="100%" stopColor={c} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* aura */}
      <circle cx="50" cy="60" r="50" fill={`url(#${id}-aura)`} />
      {/* class glyph behind head */}
      {kind === "warlock" && (
        <g stroke={c} strokeWidth="0.6" fill="none" opacity="0.5">
          <circle cx="50" cy="38" r="22" />
          <circle cx="50" cy="38" r="14" />
          <path d="M50 16v44 M28 38h44 M34 22l32 32 M66 22L34 54" />
        </g>
      )}
      {kind === "fighter" && (
        <g stroke={c} strokeWidth="0.8" fill="none" opacity="0.55">
          <path d="M50 12 L60 38 L50 64 L40 38 z" />
          <path d="M30 32h40" />
        </g>
      )}
      {kind === "cleric" && (
        <g stroke={c} strokeWidth="0.8" fill="none" opacity="0.55">
          <path d="M50 14v50 M30 32h40" />
          <circle cx="50" cy="38" r="14" />
        </g>
      )}
      {kind === "druid" && (
        <g stroke={c} strokeWidth="0.6" fill="none" opacity="0.55">
          <path d="M50 12 Q40 30 30 38 Q40 46 50 64 Q60 46 70 38 Q60 30 50 12 z" />
          <circle cx="50" cy="38" r="6" />
        </g>
      )}
      {kind === "rogue" && (
        <g stroke={c} strokeWidth="0.7" fill="none" opacity="0.55">
          <path d="M35 24 L65 52 M65 24 L35 52" />
          <circle cx="50" cy="38" r="14" />
        </g>
      )}
      {kind === "wizard" && (
        <g stroke={c} strokeWidth="0.6" fill="none" opacity="0.55">
          <path d="M50 18l3 9 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1z" />
        </g>
      )}
      {/* figure silhouette */}
      {kind === "warlock" && (
        <path fill={`url(#${id}-fig)`} d="
          M50 30 a10 10 0 1 1 0.1 0
          M30 130 v-18
          c0-14 5-22 14-26
          c-2-3 -2-6 0-9
          c2-3 8-3 12 0
          c2 3 2 6 0 9
          c9 4 14 12 14 26
          v18 z" />
      )}
      {kind === "fighter" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 28 a11 11 0 1 1 0.1 0" />
          <path d="M28 130 v-16 c0-14 7-22 16-24 l3-3 h6 l3 3 c9 2 16 10 16 24 v16 z" />
          {/* shield */}
          <path d="M22 76 q-4 6 0 28 q4 -6 0 -28 z" fillOpacity="0.7" />
          {/* sword shadow */}
          <path d="M78 60 l 2 -22 l 2 22 l -1 32 l -2 -8 z" fillOpacity="0.7" />
        </g>
      )}
      {kind === "cleric" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 30 a10 10 0 1 1 0.1 0" />
          <path d="M30 130 v-20 c0-12 6-20 14-24 c-1-3 0-5 3-6 h6 c3 1 4 3 3 6 c8 4 14 12 14 24 v20 z" />
          {/* halo */}
          <ellipse cx="50" cy="18" rx="14" ry="4" fill="none" stroke={c} strokeOpacity="0.6" strokeWidth="0.8" />
        </g>
      )}
      {kind === "druid" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 30 a10 10 0 1 1 0.1 0" />
          <path d="M28 130 v-18 c0-14 6-22 16-26 q-1-2 0-3 q5-1 12 0 q1 1 0 3 c10 4 16 12 16 26 v18 z" />
          {/* antlers */}
          <path d="M42 22 q-6 -10 -4 -16 q4 4 6 12 z" />
          <path d="M58 22 q6 -10 4 -16 q-4 4 -6 12 z" />
        </g>
      )}
      {kind === "rogue" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 28 a10 10 0 1 1 0.1 0" />
          {/* hood */}
          <path d="M30 36 q4 -18 20 -18 q16 0 20 18 q-2 6 -8 4 q-4 -8 -12 -8 q-8 0 -12 8 q-6 2 -8 -4 z" />
          <path d="M30 130 v-18 c0-14 6-20 14-24 l4-2 h4 l4 2 c8 4 14 10 14 24 v18 z" />
        </g>
      )}
      {kind === "wizard" && (
        <g fill={`url(#${id}-fig)`}>
          {/* pointed hat */}
          <path d="M40 24 l10 -22 l10 22 q-10 4 -20 0 z" />
          <path d="M50 38 a9 9 0 1 1 0.1 0" />
          <path d="M28 130 v-20 c0-14 6-20 14-22 q1 -2 4 -2 h8 q3 0 4 2 c8 2 14 8 14 22 v20 z" />
          {/* staff */}
          <path d="M82 130 l -2 -90 l 4 0 l -2 90 z" fillOpacity="0.6" />
          <circle cx="82" cy="38" r="3" fill={c} fillOpacity="0.7" />
        </g>
      )}
      {/* foe portraits */}
      {kind === "wraith" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M30 80 q-6 -50 20 -60 q26 10 20 60 q-2 26 -6 50 q-5 -4 -8 -16 q-3 12 -6 16 q-3 -4 -6 -16 q-3 12 -8 16 q-4 -24 -6 -50 z" />
          <circle cx="42" cy="44" r="3" fill={c} />
          <circle cx="58" cy="44" r="3" fill={c} />
        </g>
      )}
      {kind === "imp" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M40 18 l -4 -12 l 12 8 z" />
          <path d="M60 18 l 4 -12 l -12 8 z" />
          <path d="M50 30 a14 14 0 1 1 0.1 0" />
          <path d="M30 130 v-30 c0-18 8-30 20-30 s20 12 20 30 v30 z" />
          <circle cx="44" cy="30" r="2" fill={c} />
          <circle cx="56" cy="30" r="2" fill={c} />
        </g>
      )}
      {kind === "boss" && (
        <g fill={`url(#${id}-fig)`}>
          {/* horned skull boss */}
          <path d="M40 12 l-6 -10 l 16 6 z" />
          <path d="M60 12 l 6 -10 l -16 6 z" />
          <path d="M50 50 a18 18 0 1 1 0.1 0" />
          <path d="M22 130 v-22 c0-22 12-34 28-34 s28 12 28 34 v22 z" />
          <circle cx="42" cy="48" r="3" fill={c} />
          <circle cx="58" cy="48" r="3" fill={c} />
          <path d="M44 60 q6 4 12 0" stroke={c} strokeWidth="1" fill="none" />
        </g>
      )}
      {kind === "knight" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 24 a12 12 0 1 1 0.1 0" />
          {/* helm visor */}
          <rect x="42" y="22" width="16" height="4" fill={c} fillOpacity="0.6" />
          {/* shoulder pauldrons */}
          <path d="M26 70 q-4 20 0 40 l 6 -12 q-2 -16 0 -32 z" />
          <path d="M74 70 q4 20 0 40 l -6 -12 q2 -16 0 -32 z" />
          <path d="M30 130 v-22 c0-16 8-24 20-26 s20 10 20 26 v22 z" />
        </g>
      )}
      {kind === "merchant" && (
        <g fill={`url(#${id}-fig)`}>
          <path d="M50 32 a11 11 0 1 1 0.1 0" />
          {/* hood */}
          <path d="M32 38 q4 -22 18 -22 q14 0 18 22 q-2 8 -8 6 q-2 -10 -10 -10 q-8 0 -10 10 q-6 2 -8 -6 z" />
          <path d="M28 130 v-22 c0-14 6-22 14-24 c4-2 4-4 0-6 q10 -4 16 0 c -4 2 -4 4 0 6 c8 2 14 10 14 24 v22 z" />
          {/* coin pouch */}
          <circle cx="76" cy="100" r="6" fill={c} fillOpacity="0.4" />
        </g>
      )}
    </svg>
  );
}

/* ---------- PARTY ---------- */
const WR_PARTY = [
  {
    id: "kessra",
    name: "Kessra",
    class: "Vanguard",
    portrait: "fighter",
    color: "#B8860B",
    hp: 38, hpMax: 52,
    block: 4,
    pos: 1, // front
    conds: [{ k: "Guarded", kind: "buff", n: 2 }],
    skills: [
      { id: "cleave",  name: "Cleave",        kind: "attack", cost: 2, dmg: "8-12", targets: [1,2], desc: "Strike the front two foes. Heavy front-line damage.", melee: true },
      { id: "shield",  name: "Shield Wall",   kind: "buff",   cost: 1, val: "+6 Block", targets: [4,3,2,1], self: true, desc: "Raise block on every ally. The line holds." },
      { id: "taunt",   name: "Bellow",        kind: "util",   cost: 1, val: "Mark", targets: [1,2,3,4], desc: "Force foes to target you for one round." },
      { id: "execute", name: "Sundering Blow",kind: "attack", cost: 3, dmg: "18-24", targets: [1], desc: "Massive damage to one front foe. Heavier the lower their HP." },
    ],
  },
  {
    id: "mirenna",
    name: "Mirenna",
    class: "Druidwise",
    portrait: "druid",
    color: "#7BB662",
    hp: 41, hpMax: 56,
    block: 0,
    pos: 2,
    conds: [{ k: "Regen", kind: "buff", n: 3 }],
    skills: [
      { id: "thorns", name: "Bramble Lash",  kind: "attack", cost: 1, dmg: "6-9", targets: [3,4], desc: "Pull a back-rank foe. Inflicts Bleed (2)." },
      { id: "mend",   name: "Mend",          kind: "heal",   cost: 1, val: "+12 HP", targets: [4,3,2,1], desc: "Restore HP to any ally." },
      { id: "wild",   name: "Wild Form",     kind: "buff",   cost: 2, val: "+Dodge", self: true, desc: "Cloak in beasts. Dodge for two rounds." },
      { id: "summon", name: "Spirit of the Bear", kind: "util", cost: 3, val: "Summon", desc: "Spirit beast intercepts the next hit." },
    ],
  },
  {
    id: "aedric",
    name: "Aedric",
    class: "Warlock",
    portrait: "warlock",
    color: "#9B5DE5",
    hp: 28, hpMax: 52,
    block: 2,
    pos: 3,
    you: true,
    conds: [{ k: "Hexed", kind: "neutral", n: 1 }, { k: "Frail", kind: "debuff", n: 1 }],
    skills: [
      { id: "blast",  name: "Eldritch Blast", kind: "attack", cost: 1, dmg: "10-14", targets: [1,2,3,4], desc: "Force damage at any range." },
      { id: "hex",    name: "Hex",            kind: "util",   cost: 1, val: "+1d6", targets: [1,2,3,4], desc: "Mark a foe. Adds necrotic to your hits." },
      { id: "scorch", name: "Cinder Scourge", kind: "attack", cost: 2, dmg: "14-20", targets: [2,3,4], desc: "Pact fire. Two back-rank foes, splash damage." },
      { id: "drain",  name: "Soul Drain",    kind: "attack", cost: 3, dmg: "20-26", targets: [3,4], desc: "Heavy necrotic. Heal yourself for half damage dealt." },
    ],
  },
  {
    id: "halric",
    name: "Halric",
    class: "Light-Cleric",
    portrait: "cleric",
    color: "#D4A028",
    hp: 0, hpMax: 48,
    block: 0,
    pos: 4,
    down: true,
    conds: [{ k: "Unconscious", kind: "debuff" }, { k: "Death 1/3", kind: "debuff" }],
    skills: [
      { id: "smite",  name: "Radiant Smite", kind: "attack", cost: 2, dmg: "12-18", targets: [1,2] },
      { id: "bless",  name: "Bless",         kind: "buff",   cost: 1, val: "+1d4", targets: [4,3,2,1] },
      { id: "cure",   name: "Cure Wounds",   kind: "heal",   cost: 1, val: "+14 HP", targets: [4,3,2,1] },
      { id: "revive", name: "Revivify",      kind: "heal",   cost: 3, val: "Raise", targets: [4,3,2,1] },
    ],
  },
];

const WR_FOES = [
  {
    id: "imp",
    name: "Pact-Imp",
    portrait: "imp",
    color: "#C53456",
    hp: 12, hpMax: 24,
    pos: 1,
    conds: [{ k: "Hexed", kind: "neutral", n: 2 }],
    intent: { kind: "attack", val: "8-12", target: "front" },
  },
  {
    id: "wraith",
    name: "Cinder-Wraith",
    portrait: "wraith",
    color: "#5B2A8C",
    hp: 38, hpMax: 38,
    pos: 2,
    intent: { kind: "debuff", val: "Vulnerable", target: "all" },
  },
  {
    id: "knight",
    name: "Brass Knight",
    portrait: "knight",
    color: "#8B1538",
    hp: 56, hpMax: 72,
    pos: 3,
    conds: [{ k: "Block", kind: "gold", n: 8 }],
    intent: { kind: "buff", val: "+8 Block" },
  },
  {
    id: "reeve",
    name: "The Cinder-Reeve",
    portrait: "boss",
    color: "#8B1538",
    hp: 88, hpMax: 120,
    pos: 4,
    boss: true,
    conds: [{ k: "Brass Aegis", kind: "gold", n: 1 }],
    intent: { kind: "channel", val: "Inferno · 2 rounds", target: "all" },
  },
];

/* ---------- MAP ---------- */
/* Layered node grid. Each layer is a row, nodes have indices within their layer. */
const WR_MAP = {
  floors: [
    { layer: 0, kind: "start",    label: "Entrance", x: 0.5 },
    // floor 1
    { layer: 1, kind: "combat",   label: "Skirmish", x: 0.25 },
    { layer: 1, kind: "combat",   label: "Skirmish", x: 0.5 },
    { layer: 1, kind: "mystery",  label: "Mystery",  x: 0.75 },
    // floor 2
    { layer: 2, kind: "shop",     label: "Bazaar",   x: 0.15 },
    { layer: 2, kind: "combat",   label: "Skirmish", x: 0.4 },
    { layer: 2, kind: "treasure", label: "Treasure", x: 0.65 },
    { layer: 2, kind: "combat",   label: "Skirmish", x: 0.88 },
    // floor 3
    { layer: 3, kind: "mystery",  label: "Mystery",  x: 0.25 },
    { layer: 3, kind: "elite",    label: "Elite",    x: 0.55 },
    { layer: 3, kind: "rest",     label: "Camp",     x: 0.85 },
    // floor 4
    { layer: 4, kind: "forge",    label: "Forge",    x: 0.2 },
    { layer: 4, kind: "combat",   label: "Skirmish", x: 0.45 },
    { layer: 4, kind: "gamble",   label: "Gamble",   x: 0.7 },
    { layer: 4, kind: "shop",     label: "Bazaar",   x: 0.92 },
    // floor 5
    { layer: 5, kind: "elite",    label: "Elite",    x: 0.32 },
    { layer: 5, kind: "treasure", label: "Treasure", x: 0.6 },
    { layer: 5, kind: "rest",     label: "Camp",     x: 0.88 },
    // floor 6 — boss
    { layer: 6, kind: "boss",     label: "The Cinder-Reeve", x: 0.5 },
  ],
  /* connections by index pairs */
  edges: [
    [0,1],[0,2],[0,3],
    [1,4],[1,5],
    [2,5],[2,6],
    [3,6],[3,7],
    [4,8],[5,8],[5,9],[6,9],[6,10],[7,10],
    [8,11],[8,12],[9,12],[9,13],[10,13],[10,14],
    [11,15],[12,15],[12,16],[13,16],[13,17],[14,17],
    [15,18],[16,18],[17,18],
  ],
};

const NODE_INFO = {
  start:    { icon: "compass",    label: "Entrance",   color: "gold",     blurb: "Where the run begins." },
  combat:   { icon: "sword",      label: "Skirmish",   color: "blood",    blurb: "A pack of dungeon-things, hungry for warm meat. Earn gold + relic shard." },
  elite:    { icon: "crownSkull", label: "Elite",      color: "blood",    blurb: "A named horror. Brutal — but the loot is rare." },
  boss:     { icon: "skull",      label: "Floor Boss", color: "blood",    blurb: "The keeper of this stratum. Clear to descend." },
  rest:     { icon: "campfire",   label: "Camp",       color: "gold",     blurb: "Heal, scour a wound, upgrade an item, or re-prepare spells." },
  shop:     { icon: "bag",        label: "Bazaar",     color: "violet",   blurb: "Trade gold for relics and provisions." },
  treasure: { icon: "chest",      label: "Treasure",   color: "gold",     blurb: "A chest. Choose one of three relics." },
  mystery:  { icon: "question",   label: "Mystery",    color: "violet",   blurb: "Something is here. You will not know until you arrive." },
  forge:    { icon: "anvil",      label: "Forge",      color: "gold",     blurb: "Upgrade one item — once per run." },
  gamble:   { icon: "dice2",      label: "Gamble",     color: "violet",   blurb: "Wager 50g. Win double or curse a relic." },
};

/* ---------- INITIATIVE / TURN ORDER ---------- */
const WR_INIT_ORDER = [
  { id: "kessra",  side: "ally", init: 21, name: "Kessra",  portrait: "fighter", color: "#B8860B", done: true },
  { id: "imp",     side: "foe",  init: 18, name: "Pact-Imp",portrait: "imp",     color: "#C53456", done: true },
  { id: "aedric",  side: "ally", init: 17, name: "Aedric",  portrait: "warlock", color: "#9B5DE5", now: true },
  { id: "mirenna", side: "ally", init: 15, name: "Mirenna", portrait: "druid",   color: "#7BB662" },
  { id: "wraith",  side: "foe",  init: 14, name: "Wraith",  portrait: "wraith",  color: "#5B2A8C" },
  { id: "knight",  side: "foe",  init: 11, name: "Knight",  portrait: "knight",  color: "#8B1538" },
  { id: "halric",  side: "ally", init: 9,  name: "Halric",  portrait: "cleric",  color: "#D4A028", down: true },
  { id: "reeve",   side: "foe",  init: 6,  name: "Reeve",   portrait: "boss",    color: "#8B1538" },
];

/* ---------- RELICS ---------- */
const WR_RELICS = [
  { id: "r1", name: "Censer of Endings",   icon: "flame", rarity: "rare",      desc: "+2 dmg to Hexed foes. Each kill heals 4 HP.", count: null },
  { id: "r2", name: "Vow of the Vanguard", icon: "shield", rarity: "uncommon", desc: "Front rank starts each combat with +4 Block." },
  { id: "r3", name: "Coin of the Forgotten", icon: "coin", rarity: "uncommon", desc: "+10% gold from all sources." },
  { id: "r4", name: "Bone Reliquary",      icon: "bones", rarity: "legendary", desc: "Once per run: revive a fallen ally at half HP." },
  { id: "r5", name: "Mirror of Ash",       icon: "moon", rarity: "common",    desc: "Reflect 25% of a single attack." },
];

const WR_GOLD = 247;
const WR_RUN = { floor: 3, depth: 6, run: 17, wp: 142 };

/* ---------- EVENT (current) ---------- */
const WR_EVENT = {
  title: "The Held Shadow",
  scene: "chapel",
  narration: [
    "Cinder-smoke curls along the chapel floor. The brazen censer above the altar still glows, though the chant that lit it has long ceased.",
    "A figure stands where the priest once knelt — a silhouette without owner, mid-prayer, frozen. Its hand grips empty air where a chain should hang. It does not breathe. It does not blink. It is held.",
  ],
  choices: [
    { id: "speak", title: "Speak to the shadow", desc: "Whisper a name. See if the binding answers.", tags: [{ k: "Wisdom", c: "violet" }] },
    { id: "break", title: "Disrupt the binding deliberately", desc: "Snap the warding circle. Whatever is held will be free.", tags: [{ k: "Combat likely", c: "blood" }] },
    { id: "search",title: "Search the chapel", desc: "Find the missing censer-chain. The shadow seems to want it.", tags: [{ k: "Investigation", c: "violet" }, { k: "Reward", c: "gold" }] },
    { id: "leave", title: "Leave the chapel", desc: "This is not your wound to bind.", tags: [{ k: "Skip", c: "" }] },
  ],
};

const WR_REST_CHOICES = [
  { id: "heal",  icon: "campfire", title: "Tend Wounds",       desc: "Rest by the fire. The watch is quiet, for now.",
    effect: "Restore 30% of each ally's max HP.", color: "good" },
  { id: "cond",  icon: "potion",   title: "Scour a Wound",     desc: "Burn the curse out before it takes root.",
    effect: "Remove one debuff from any ally.", color: "violet" },
  { id: "forge", icon: "hammer",   title: "Mend at the Anvil", desc: "A whetstone, a hammer, an hour of work.",
    effect: "Upgrade one item: +1 tier, permanent.", color: "gold" },
  { id: "scribe",icon: "scroll",   title: "Pray + Recall",     desc: "Spells return as the fire dies low.",
    effect: "Restore all spell slots. Re-prepare prepared casters.", color: "blood" },
];

const WR_SHOP = {
  merchant: { name: "Veska, the Ash-Mender", quote: "Coin for kindness, child. The fire is still warm." },
  items: [
    { id: "p1", name: "Greater Healing Vial", desc: "Restore 20 HP to one ally.",     icon: "potion",   price: 60,  rarity: "common" },
    { id: "p2", name: "Smoke Bomb",           desc: "Whole party gains Dodge for 1 round.", icon: "flame", price: 75,  rarity: "uncommon" },
    { id: "r1", name: "Censer of Endings",    desc: "+2 dmg to Hexed foes. Kills heal 4.", icon: "flame", price: 180, rarity: "rare" },
    { id: "r2", name: "Pact-Iron Ring",       desc: "+2 max HP for warlocks each kill.", icon: "rune",    price: 220, rarity: "rare" },
    { id: "r3", name: "Memory of a Saint",    desc: "Revive one fallen ally once per run.", icon: "feather", price: 360, rarity: "legendary" },
    { id: "c1", name: "Bramble Crown",        desc: "Druid: regen +1 per round.",        icon: "sparkles", price: 90,  rarity: "uncommon" },
    { id: "s1", name: "Whetstone, Brass",     desc: "Upgrade one weapon — +1 tier.",     icon: "anvil",    price: 120, rarity: "uncommon" },
    { id: "rm", name: "Reroll the stock",     desc: "Shuffle this merchant's wares.",    icon: "refresh",  price: 25,  rarity: "common", reroll: true },
  ],
};

const WR_TREASURE = [
  { id: "t1", name: "Whisper-Veil",  desc: "+2 dodge while at full HP.",          icon: "feather",  rarity: "rare" },
  { id: "t2", name: "Black Censer",  desc: "Hex spells cost 1 less. Min cost: 1.",icon: "flame",    rarity: "rare" },
  { id: "t3", name: "Vow Coin",      desc: "Once per combat, refund a spell cost.",icon: "coin",   rarity: "rare" },
];

const WR_SUMMARY = {
  victory: true, // toggle for defeat preview later
  floor: 3,
  stats: [
    { l: "Floors descended",  v: "3 of 6",     c: "" },
    { l: "Rooms cleared",     v: "11",         c: "" },
    { l: "Elites slain",      v: "1",          c: "" },
    { l: "Damage dealt",      v: "1,247",      c: "" },
    { l: "Damage taken",      v: "612",        c: "" },
    { l: "Gold earned",       v: "412",        c: "gold" },
    { l: "Relics collected",  v: "5",          c: "violet" },
    { l: "Time in dungeon",   v: "47 min",     c: "" },
  ],
  wp: 142,
  wpBreakdown: ["Floor bonus +60", "Elite +30", "No-death +40", "Mystery +12"],
  unlocks: [
    { title: "The Anchorite",        desc: "A new playable class. Heals while still.",         icon: "bones",   isNew: true },
    { title: "Whisper-Veil",         desc: "Relic now available in shops.",                    icon: "feather", isNew: true },
    { title: "Floor Variant: Crypt", desc: "An alternate path through floor 3.",               icon: "map",     isNew: false },
  ],
};

/* ---------- EXPORTS ---------- */
Object.assign(window, {
  WIcon, WRI,
  PortraitArt,
  WR_PARTY, WR_FOES, WR_MAP, NODE_INFO,
  WR_INIT_ORDER, WR_RELICS, WR_GOLD, WR_RUN,
  WR_EVENT, WR_REST_CHOICES, WR_SHOP, WR_TREASURE, WR_SUMMARY,
});

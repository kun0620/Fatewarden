/* global React, Icon, Card, CardHead, Field, Seg, Toggle, MOCK */

/* ============================================================
   INVENTORY & EQUIPMENT UI KIT — spec 09 handoff
   ============================================================ */

const RARITY = {
  common:    { label: "Common",    color: "#A8A29E", glow: "rgba(168,162,158,0.3)" },
  uncommon:  { label: "Uncommon",  color: "#86EFAC", glow: "rgba(34,197,94,0.4)"  },
  rare:      { label: "Rare",      color: "#60A5FA", glow: "rgba(96,165,250,0.4)" },
  very_rare: { label: "Very Rare", color: "#A271FF", glow: "rgba(124,58,237,0.5)" },
  legendary: { label: "Legendary", color: "#EAC074", glow: "rgba(214,168,79,0.5)" },
  artifact:  { label: "Artifact",  color: "#F87171", glow: "rgba(248,113,113,0.5)" },
};

function InventoryUIKitScreen({ go }) {
  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480, paddingTop: 18 }}>
        <div className="fw-page-head" style={{ marginBottom: 16 }}>
          <div>
            <div className="fw-eyebrow">Spec 09 · Inventory &amp; Equipment</div>
            <h1>Inventory UI Kit</h1>
            <div className="sub">SRD 5.1 item system — 6 slots, attunement, rarity, currency, templates. Dev wires to item state + Event Queue.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("menu")}>{Icon("chevL", { size: 12 })} Hearth</button>
            <button className="fw-btn fw-btn-ghost" onClick={() => go && go("game")}>{Icon("bag", { size: 12 })} See in-session</button>
          </div>
        </div>

        {/* Index */}
        <Card style={{ marginBottom: 18 }}>
          <CardHead icon="bag" title="Index · 12 components" />
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
            {[
              ["1", "Equipment slots (6)",     "Head/Body/Hands/Weapon/Off-hand/Accessory"],
              ["2", "Backpack list",           "Stackable items with rarity colors"],
              ["3", "Currency panel (5 coin)", "PP/GP/EP/SP/CP grid + total value"],
              ["4", "Convert Currency modal",  "Auto-convert from/to amount"],
              ["5", "Item Detail modal",       "Full stat block + effects + lore"],
              ["6", "Attunement flow",         "Short rest attune · 3-slot limit"],
              ["7", "Item Template browser",   "Spawn SRD items by category"],
              ["8", "Item Effects panel",      "Passive bonuses while equipped"],
              ["9", "Drop confirmation",       "Quest items, magic items, attuned warning"],
              ["10","Two-handed lock",         "Off-hand disabled + reason"],
              ["11","Encumbrance bar",         "STR × 15 lb formula + threshold colors"],
              ["12","Item comparison",         "Swap preview — current vs new"],
            ].map(([n, t, d]) => (
              <a key={n} href={`#inv-${n}`} style={{ display: "flex", gap: 8, padding: "6px 8px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 5, color: "var(--text-2)", textDecoration: "none" }}>
                <span style={{ fontFamily: "var(--f-mono)", color: "var(--gold)", fontSize: 11, width: 18 }}>{n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--text)" }}>{t}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{d}</div>
                </div>
              </a>
            ))}
          </div>
        </Card>

        <InvKitItem id="1" title="Equipment Slots" trigger="Character sheet · 6 fixed slots, AC + bonuses recalculate on change">
          <EquipmentSlots />
        </InvKitItem>

        <InvKitItem id="2" title="Backpack List" trigger="Carried items · stackable, sortable, search/filter">
          <BackpackList />
        </InvKitItem>

        <InvKitItem id="3" title="Currency Panel" trigger="5 coin types · auto-total in GP">
          <CurrencyPanel />
        </InvKitItem>

        <InvKitItem id="4" title="Convert Currency Modal" trigger="Click 'Convert' on currency panel">
          <ConvertCurrencyModal />
        </InvKitItem>

        <InvKitItem id="5" title="Item Detail Modal" trigger="Click 'Info' on any item or hover-and-pin">
          <ItemDetailModal />
        </InvKitItem>

        <InvKitItem id="6" title="Attunement Flow" trigger="Short rest · attune to magic items · max 3 active">
          <AttunementFlow />
        </InvKitItem>

        <InvKitItem id="7" title="Item Template Browser" trigger="DM-side or character setup · spawn SRD item">
          <ItemTemplateBrowser />
        </InvKitItem>

        <InvKitItem id="8" title="Item Effects Panel" trigger="Active passives summary · on sheet sidebar">
          <ItemEffectsPanel />
        </InvKitItem>

        <InvKitItem id="9" title="Drop Confirmation" trigger="Drop item · warn if attuned/quest/magic">
          <DropConfirm />
        </InvKitItem>

        <InvKitItem id="10" title="Two-Handed Lock" trigger="Equip two-handed weapon · off-hand disabled with reason">
          <TwoHandedLock />
        </InvKitItem>

        <InvKitItem id="11" title="Encumbrance Bar" trigger="On Backpack tab · STR × 15 lb formula">
          <EncumbranceBar />
        </InvKitItem>

        <InvKitItem id="12" title="Item Comparison" trigger="Equip preview · hover/click new weapon while another is equipped">
          <ItemComparison />
        </InvKitItem>

        <div style={{ marginTop: 24, padding: 16, background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12.5, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.55 }}>
          <span style={{ color: "var(--gold)" }}>{Icon("info", { size: 14 })}</span>
          {" "}Each component uses the spec's data shapes (`Item`, `ItemEffect`, `Currency`). Wires noted on each card. Rarity uses 6 colors: common · uncommon · rare · very_rare · legendary · artifact.
        </div>
      </div>
    </div>
  );
}

function InvKitItem({ id, title, trigger, children }) {
  return (
    <div id={`inv-${id}`} className="fw-kit-item">
      <div className="fw-kit-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="fw-kit-num">{id}</span>
          <div>
            <h2 className="fw-display" style={{ fontSize: 18, color: "var(--text)", letterSpacing: "0.04em" }}>{title}</h2>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>Trigger · {trigger}</div>
          </div>
        </div>
      </div>
      <div className="fw-kit-canvas">{children}</div>
    </div>
  );
}

/* ============================================================
   1. EQUIPMENT SLOTS — 6 fixed slots
   ============================================================ */
function EquipmentSlots() {
  const [slots, setSlots] = React.useState({
    head:      null,
    body:      { n: "Leather Armor",  icon: "shield", ac: "+11 + Dex", rarity: "common"   },
    hands:     { n: "Leather Gloves", icon: "shield", rarity: "common" },
    weapon:    { n: "Longsword +1",   icon: "sword",  dmg: "1d8+1 slashing", rarity: "uncommon", magic: true, attuned: true },
    offhand:   { n: "Shield",         icon: "shield", ac: "+2", rarity: "common" },
    accessory: { n: "Ring of Protection", icon: "sparkles", rarity: "rare", magic: true, attuned: true, needsAttune: true },
  });
  const slotOrder = [
    { id: "head",      label: "Head",       icon: "user",     accept: "Helmet · Hat · Hood" },
    { id: "body",      label: "Body",       icon: "shield",   accept: "Armor · Robes" },
    { id: "hands",     label: "Hands",      icon: "user",     accept: "Gloves · Gauntlets · Bracers" },
    { id: "weapon",    label: "Main hand",  icon: "sword",    accept: "Any weapon" },
    { id: "offhand",   label: "Off-hand",   icon: "shield",   accept: "Shield · Light wpn · Torch" },
    { id: "accessory", label: "Accessory",  icon: "sparkles", accept: "Ring · Amulet · Cloak · Belt" },
  ];

  let ac = 11; // base
  if (slots.body) ac += 0; // visual only
  if (slots.offhand?.n === "Shield") ac += 2;
  if (slots.accessory?.n.includes("Ring of Protection")) ac += 1;
  ac += 2; // dex mod

  const attunedCount = Object.values(slots).filter(s => s?.attuned).length;

  return (
    <div className="fw-eq-slots">
      <div className="fw-eq-slots-grid">
        {slotOrder.map(s => (
          <EqSlot key={s.id} slot={s} item={slots[s.id]} onClear={() => setSlots(x => ({ ...x, [s.id]: null }))} />
        ))}
      </div>
      <div className="fw-eq-summary">
        <div className="fw-eq-summary-row">
          <span className="fw-eyebrow">Armor Class</span>
          <span className="fw-display" style={{ fontSize: 28, color: "var(--gold-bright)" }}>{ac}</span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--text-3)" }}>11 base · +Dex · +shield · +ring</span>
        </div>
        <div className="fw-eq-summary-row">
          <span className="fw-eyebrow">Attuned</span>
          <span className="fw-display" style={{ fontSize: 22, color: attunedCount >= 3 ? "var(--blood-bright)" : "var(--gold-bright)" }}>{attunedCount} / 3</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: 50, background: i < attunedCount ? "var(--gold-bright)" : "var(--bg-deep)", border: "1px solid " + (i < attunedCount ? "var(--gold)" : "var(--border)"), boxShadow: i < attunedCount ? "0 0 6px var(--gold)" : "none" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.equipment[slotId]</span> · on change → <span className="fw-mono">recalcAC()</span> · enforce slot capacity</div>
    </div>
  );
}
function EqSlot({ slot, item, onClear }) {
  const rar = item ? RARITY[item.rarity] : null;
  return (
    <div className={"fw-eq-slot" + (!item ? " empty" : "")} style={item ? { borderColor: rar.color + "55", background: `linear-gradient(180deg, ${rar.color}11, transparent)` } : null}>
      <div className="fw-eq-slot-head">
        <span className="fw-eyebrow" style={{ fontSize: 9 }}>{slot.label}</span>
        {item ? (
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClear} title="Unequip" style={{ padding: 3 }}>{Icon("x", { size: 10 })}</button>
        ) : (
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" title="Equip" style={{ padding: 3, color: "var(--text-4)" }}>{Icon("plus", { size: 10 })}</button>
        )}
      </div>
      {item ? (
        <>
          <div className="fw-eq-slot-icon" style={{ borderColor: rar.color + "55", color: rar.color, boxShadow: `0 0 18px -4px ${rar.glow}` }}>
            {Icon(item.icon, { size: 22 })}
            {item.magic && <span className="fw-eq-magic">✨</span>}
          </div>
          <div className="fw-eq-slot-name">{item.n}</div>
          <div className="fw-eq-slot-tag">
            {item.dmg || item.ac || RARITY[item.rarity].label}
          </div>
          {item.needsAttune && !item.attuned && (
            <span className="fw-pill" style={{ background: "rgba(214,168,79,0.10)", borderColor: "var(--gold-deep)", color: "var(--gold-bright)", fontSize: 8.5, padding: "0 5px", marginTop: 4 }}>Attune required</span>
          )}
          {item.attuned && (
            <span className="fw-pill gold" style={{ fontSize: 8.5, padding: "0 5px", marginTop: 4 }}>★ Attuned</span>
          )}
        </>
      ) : (
        <>
          <div className="fw-eq-slot-icon empty">
            {Icon(slot.icon, { size: 18 })}
          </div>
          <div className="fw-eq-slot-name" style={{ color: "var(--text-4)" }}>Empty</div>
          <div className="fw-eq-slot-tag" style={{ fontStyle: "italic" }}>{slot.accept}</div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   2. BACKPACK LIST
   ============================================================ */
function BackpackList() {
  const items = [
    { n: "Dagger",            icon: "sword",   qty: 2, wt: 1,   rarity: "common", cat: "Weapon · light, finesse, thrown" },
    { n: "Healing Potion",    icon: "potion",  qty: 3, wt: 0.5, rarity: "common", cat: "Potion · 2d4+2 HP", consumable: true },
    { n: "Scroll of Sleep",   icon: "scroll",  qty: 1, wt: 0.1, rarity: "uncommon", cat: "Scroll · Lv 1", consumable: true },
    { n: "Wand of Magic Missiles", icon: "sparkles", qty: 1, wt: 1, rarity: "uncommon", cat: "Wand · 7 charges", magic: true, attune: true },
    { n: "Torch",             icon: "torch",   qty: 5, wt: 1,   rarity: "common", cat: "Gear · 6 hr bright 20 ft" },
    { n: "Rations",           icon: "bag",     qty: 7, wt: 2,   rarity: "common", cat: "Gear · 1 day each" },
    { n: "Brass Censer-Key",  icon: "sparkles",qty: 1, wt: 0.1, rarity: "rare", cat: "Quest · binding-resonance", quest: true },
    { n: "Boots of Speed",    icon: "shield",  qty: 1, wt: 1,   rarity: "very_rare", cat: "Boots · speed ×2 (10 rds/day)", magic: true, attune: true },
  ];
  return (
    <div className="fw-bp-list">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="fw-input-wrap" style={{ flex: 1 }}>
          <span className="fw-input-icon">{Icon("search", { size: 12 })}</span>
          <input className="fw-input has-icon" placeholder="Search backpack…" />
        </div>
        <select className="fw-select" style={{ width: 140, padding: "4px 8px" }}>
          <option>All categories</option>
          <option>Weapon</option><option>Armor</option><option>Potion</option><option>Scroll</option><option>Gear</option><option>Quest</option>
        </select>
        <Seg value="Name" onChange={() => {}} options={["Name","Wt","Rarity"]} />
      </div>
      <div className="fw-bp-rows">
        {items.map((it, i) => {
          const rar = RARITY[it.rarity];
          return (
            <div key={i} className="fw-bp-row" style={{ borderColor: rar.color + "33" }}>
              <span className="fw-bp-icon" style={{ background: `linear-gradient(180deg, ${rar.color}22, transparent)`, borderColor: rar.color + "55", color: rar.color }}>
                {Icon(it.icon, { size: 14 })}
                {it.magic && <span className="fw-bp-magic">✨</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text)" }}>{it.n}</span>
                  <span className="fw-pill" style={{ fontSize: 8.5, padding: "0 5px", borderColor: rar.color + "55", color: rar.color, background: rar.color + "11" }}>{rar.label}</span>
                  {it.attune && <span className="fw-pill gold" style={{ fontSize: 8.5, padding: "0 5px" }}>★ Attune</span>}
                  {it.quest && <span className="fw-pill" style={{ background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.35)", color: "var(--arcane-bright)", fontSize: 8.5, padding: "0 5px" }}>Quest</span>}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{it.cat}</div>
              </div>
              <div className="fw-bp-meta">
                <div style={{ textAlign: "right" }}>
                  <div className="fw-mono" style={{ fontSize: 11, color: "var(--text-2)" }}>×{it.qty}</div>
                  <div className="fw-mono" style={{ fontSize: 10, color: "var(--text-4)" }}>{it.wt} lb{it.qty > 1 ? ` (${(it.wt * it.qty).toFixed(1)})` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {it.consumable
                    ? <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ padding: "3px 8px", fontSize: 10.5 }}>{Icon("flame", { size: 10 })} Use</button>
                    : <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "3px 8px", fontSize: 10.5 }}>{Icon("shield", { size: 10 })} Equip</button>}
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" title="Info" style={{ padding: 3 }}>{Icon("info", { size: 10 })}</button>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" title="More" style={{ padding: 3 }}>{Icon("kebab", { size: 10 })}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.inventory.items[]</span> · sort by computed key · row actions dispatch via Event Queue</div>
    </div>
  );
}

/* ============================================================
   3. CURRENCY PANEL (5-coin)
   ============================================================ */
function CurrencyPanel() {
  const c = { pp: 0, gp: 142, ep: 15, sp: 89, cp: 400 };
  // total value in GP: 1pp=10gp, 1ep=0.5gp, 1sp=0.1gp, 1cp=0.01gp
  const total = (c.pp * 10) + c.gp + (c.ep * 0.5) + (c.sp * 0.1) + (c.cp * 0.01);
  const coins = [
    { k: "PP", v: c.pp,  label: "Platinum", color: "#E5E7EB", note: "1 PP = 10 GP" },
    { k: "GP", v: c.gp,  label: "Gold",     color: "#EAC074", note: "1 GP = 10 SP" },
    { k: "EP", v: c.ep,  label: "Electrum", color: "#FDE68A", note: "1 EP = 5 SP" },
    { k: "SP", v: c.sp,  label: "Silver",   color: "#A8A29E", note: "1 SP = 10 CP" },
    { k: "CP", v: c.cp,  label: "Copper",   color: "#B45309", note: "—" },
  ];
  return (
    <div className="fw-cur-panel">
      <div className="fw-cur-grid">
        {coins.map(co => (
          <div key={co.k} className="fw-cur-cell" style={{ borderColor: co.color + "55" }}>
            <div className="fw-cur-coin" style={{ background: `radial-gradient(circle at 30% 30%, ${co.color}, ${co.color}66)`, boxShadow: `0 0 14px -4px ${co.color}66` }}>
              <span className="fw-cur-coin-mark">{co.k[0]}</span>
            </div>
            <div className="fw-display" style={{ fontSize: 22, color: "var(--text)", lineHeight: 1 }}>{co.v.toLocaleString()}</div>
            <div className="fw-eyebrow" style={{ fontSize: 9, marginTop: 4, color: co.color }}>{co.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--f-mono)", marginTop: 2 }}>{co.note}</div>
          </div>
        ))}
      </div>
      <div className="fw-cur-foot">
        <div>
          <div className="fw-eyebrow" style={{ fontSize: 9 }}>Total value · in GP</div>
          <div className="fw-display" style={{ fontSize: 26, color: "var(--gold-bright)" }}>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })} GP</div>
        </div>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-ghost">{Icon("arrowR", { size: 12 })} Convert Currency</button>
        <button className="fw-btn fw-btn-gold">{Icon("plus", { size: 12 })} Receive</button>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.currency &#123; pp, gp, ep, sp, cp &#125;</span> · total = pp*10 + gp + ep*0.5 + sp*0.1 + cp*0.01</div>
    </div>
  );
}

/* ============================================================
   4. CONVERT CURRENCY MODAL
   ============================================================ */
function ConvertCurrencyModal() {
  const [from, setFrom] = React.useState("cp");
  const [to,   setTo]   = React.useState("sp");
  const [amount, setAmount] = React.useState(100);

  const rates = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
  const result = (amount * rates[from]) / rates[to];

  return (
    <div className="fw-flow-modal accent-gold" style={{ position: "static", maxWidth: 520, margin: "0 auto" }}>
      <div className="fw-flow-head">
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: "var(--gold)" }}>Convert · auto-calc</div>
          <div className="fw-display" style={{ fontSize: 16, color: "var(--text)", marginTop: 2 }}>Exchange Currency</div>
        </div>
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("x", { size: 12 })}</button>
      </div>
      <div className="fw-flow-body" style={{ padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
          <Field label="From">
            <select className="fw-select" value={from} onChange={e => setFrom(e.target.value)}>
              <option value="pp">Platinum · PP</option>
              <option value="gp">Gold · GP</option>
              <option value="ep">Electrum · EP</option>
              <option value="sp">Silver · SP</option>
              <option value="cp">Copper · CP</option>
            </select>
            <input type="number" className="fw-input" value={amount} onChange={e => setAmount(+e.target.value || 0)} style={{ marginTop: 6 }} />
          </Field>
          <div style={{ paddingBottom: 14, color: "var(--gold)" }}>{Icon("arrowR", { size: 20 })}</div>
          <Field label="To">
            <select className="fw-select" value={to} onChange={e => setTo(e.target.value)}>
              <option value="pp">Platinum · PP</option>
              <option value="gp">Gold · GP</option>
              <option value="ep">Electrum · EP</option>
              <option value="sp">Silver · SP</option>
              <option value="cp">Copper · CP</option>
            </select>
            <input className="fw-input" value={Number.isInteger(result) ? result : result.toFixed(2)} readOnly style={{ marginTop: 6, fontFamily: "var(--f-mono)", color: "var(--gold-bright)" }} />
          </Field>
        </div>

        <div style={{ marginTop: 18, padding: 14, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6, textAlign: "center" }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Preview</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
            <span className="fw-display" style={{ fontSize: 22, color: "var(--text)" }}>{amount} {from.toUpperCase()}</span>
            <span style={{ color: "var(--gold)" }}>→</span>
            <span className="fw-display" style={{ fontSize: 28, color: "var(--gold-bright)" }}>{Number.isInteger(result) ? result : result.toFixed(2)} {to.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, fontStyle: "italic", fontFamily: "var(--f-serif)" }}>
            {result < amount && to !== from && "Round down to whole coin — fractional units stay in original."}
            {result >= amount && to !== from && "Pure rate · no transaction fee."}
          </div>
        </div>
      </div>
      <div className="fw-flow-foot" style={{ margin: 0 }}>
        <button className="fw-btn fw-btn-ghost">Cancel</button>
        <button className="fw-btn fw-btn-gold">{Icon("check", { size: 12 })} Convert</button>
      </div>
      <div className="fw-kit-wires" style={{ margin: "0 18px 18px" }}>Wires to: <span className="fw-mono">convert(from, to, amount) → updates char.currency</span></div>
    </div>
  );
}

/* ============================================================
   5. ITEM DETAIL MODAL
   ============================================================ */
function ItemDetailModal() {
  const rar = RARITY.very_rare;
  return (
    <div className="fw-item-modal" style={{ borderColor: rar.color, boxShadow: `0 0 40px -10px ${rar.glow}` }}>
      <div className="fw-item-modal-head" style={{ background: `radial-gradient(ellipse at 0% 50%, ${rar.color}22, transparent 70%)` }}>
        <div className="fw-item-modal-icon" style={{ borderColor: rar.color, color: rar.color, boxShadow: `0 0 24px -4px ${rar.glow}` }}>
          {Icon("flame", { size: 28 })}
          <span className="fw-eq-magic" style={{ fontSize: 16, top: -4, right: -4 }}>✨</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 2, color: rar.color }}>{rar.label} · Wondrous item</div>
          <h3 className="fw-display" style={{ fontSize: 22, color: "var(--text)" }}>Staff of the Cinder-Reeve</h3>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <span className="fw-pill" style={{ fontSize: 9 }}>Staff</span>
            <span className="fw-pill gold" style={{ fontSize: 9 }}>★ Attune required</span>
            <span className="fw-pill" style={{ fontSize: 9 }}>2 lb</span>
            <span className="fw-pill" style={{ fontSize: 9 }}>Pact weapon</span>
          </div>
        </div>
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("x", { size: 12 })}</button>
      </div>

      <div className="fw-item-modal-body">
        <div className="fw-item-stats">
          <StatItem label="Damage" v="1d8 + STR · slashing" />
          <StatItem label="Versatile" v="1d10 (2-handed)" />
          <StatItem label="Damage type" v="Fire (on crit)" />
          <StatItem label="Value" v="2,400 GP" />
        </div>

        <div className="fw-item-section">
          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Properties</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["Versatile", "Magical", "Pact-bound", "Sentient"].map(p => <span key={p} className="fw-pill" style={{ fontSize: 9 }}>{p}</span>)}
          </div>
        </div>

        <div className="fw-item-section">
          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Passive Effects · while attuned</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <EffectChip type="attack_bonus"   value="+1" desc="On all attacks with this weapon." />
            <EffectChip type="damage_bonus"   value="+1d6 fire" desc="On a critical hit, ignite flammables." />
            <EffectChip type="ability_bonus"  value="+1 CHA"    desc="Spellcasting ability bonus while held." />
          </div>
        </div>

        <div className="fw-item-section">
          <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Description</div>
          <p className="fw-serif" style={{ fontSize: 13.5, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.6 }}>
            Brass-bound rowan, marked with the Cinder-Reeve's collar. It warms in your hand only when the bargain is honored. Whispers in past tense.
          </p>
        </div>
      </div>

      <div className="fw-flow-foot" style={{ margin: 0 }}>
        <button className="fw-btn fw-btn-ghost">{Icon("scroll", { size: 11 })} Wiki</button>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-ghost">{Icon("x", { size: 11 })} Unequip</button>
        <button className="fw-btn fw-btn-gold">{Icon("sparkles", { size: 12 })} Re-attune</button>
      </div>
      <div className="fw-kit-wires" style={{ margin: "0 18px 18px" }}>Wires to: <span className="fw-mono">item.template</span> + <span className="fw-mono">item.effects[]</span> · open via row Info button</div>
    </div>
  );
}
function StatItem({ label, v }) {
  return (
    <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
      <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "var(--f-serif)" }}>{v}</div>
    </div>
  );
}

/* ============================================================
   6. ATTUNEMENT FLOW
   ============================================================ */
function AttunementFlow() {
  const [step, setStep] = React.useState("rest"); // rest | picker
  const slots = [
    { n: "Longsword +1",        attuned: true,  active: true },
    { n: "Ring of Protection",  attuned: true,  active: true },
    { n: "Boots of Speed",      attuned: true,  active: true },
  ];
  const candidate = { n: "Wand of Magic Missiles", rarity: "uncommon" };

  return (
    <div className="fw-attune">
      {/* Rest banner */}
      <div className="fw-attune-rest">
        <div style={{ width: 52, height: 52, borderRadius: 50, background: "linear-gradient(135deg, rgba(124,58,237,0.18), #15101f)", border: "2px solid var(--arcane)", display: "grid", placeItems: "center", color: "var(--arcane-bright)" }}>
          {Icon("sparkles", { size: 24 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: "var(--arcane-bright)" }}>Short Rest · 1 hour</div>
          <div className="fw-display" style={{ fontSize: 18, color: "var(--text)", marginTop: 2 }}>Attune to a magic item</div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", fontStyle: "italic", fontFamily: "var(--f-serif)", marginTop: 4 }}>
            Spend the rest in focus with one item. Max 3 attuned at once.
          </div>
        </div>
      </div>

      {/* Slot row — 3 max */}
      <div className="fw-attune-slots">
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Active attunements · 3 / 3</div>
        <div className="fw-attune-slot-row">
          {slots.map((s, i) => (
            <div key={i} className="fw-attune-slot">
              <span style={{ color: "var(--gold-bright)" }}>{Icon("sparkles", { size: 14 })}</span>
              <span style={{ fontSize: 12, color: "var(--text)" }}>{s.n}</span>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginLeft: "auto", fontSize: 10.5, padding: "3px 8px" }}>{Icon("x", { size: 10 })} Unattune</button>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="fw-attune-warn">
        <span style={{ color: "var(--blood-bright)" }}>{Icon("alert", { size: 16 })}</span>
        <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic", lineHeight: 1.5 }}>
          You can't attune to <b style={{ color: "var(--text)", fontStyle: "normal" }}>{candidate.n}</b> until you unattune from one above.
        </div>
        <button className="fw-btn fw-btn-blood fw-btn-sm">{Icon("x", { size: 11 })} Choose to release</button>
      </div>

      <div className="fw-kit-wires">Wires to: <span className="fw-mono">attune(itemId)</span> · enforce char.attunements &lt;= 3 · revert effects on unattune</div>
    </div>
  );
}

/* ============================================================
   7. ITEM TEMPLATE BROWSER
   ============================================================ */
function ItemTemplateBrowser() {
  const cats = [
    { id: "simple",  label: "Simple Weapons", count: 14, picks: ["Club", "Dagger", "Quarterstaff", "Shortbow", "Spear", "Sling", "Mace", "Sickle"] },
    { id: "martial", label: "Martial Weapons", count: 22, picks: ["Longsword", "Greataxe", "Rapier", "Warhammer", "Halberd", "Longbow", "Lance", "Whip"] },
    { id: "armor",   label: "Armor", count: 13, picks: ["Leather", "Studded Leather", "Chain Mail", "Plate", "Half Plate", "Shield"] },
    { id: "gear",    label: "Adventuring Gear", count: 20, picks: ["Rope", "Torch", "Rations", "Bedroll", "Healer's Kit", "Thieves' Tools", "Climber's Kit", "Lantern"] },
  ];
  return (
    <div className="fw-tpl-browser">
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div className="fw-input-wrap" style={{ flex: 1 }}>
          <span className="fw-input-icon">{Icon("search", { size: 12 })}</span>
          <input className="fw-input has-icon" placeholder="Search SRD 5.1 templates…" />
        </div>
        <Seg value="All" onChange={() => {}} options={["All", "Weapons", "Armor", "Gear"]} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map(c => (
          <div key={c.id} className="fw-tpl-cat">
            <div className="fw-tpl-cat-head">
              <span style={{ color: "var(--gold)" }}>{Icon(c.id === "armor" ? "shield" : c.id === "gear" ? "bag" : "sword", { size: 14 })}</span>
              <span className="fw-display" style={{ fontSize: 13, color: "var(--text)" }}>{c.label}</span>
              <span className="fw-pill dim" style={{ fontSize: 9 }}>{c.count} templates</span>
            </div>
            <div className="fw-tpl-grid">
              {c.picks.map(p => (
                <button key={p} className="fw-tpl-card">
                  <span className="fw-tpl-card-icon">{Icon(c.id === "armor" ? "shield" : c.id === "gear" ? "bag" : "sword", { size: 14 })}</span>
                  <span style={{ flex: 1, textAlign: "left", fontSize: 12 }}>{p}</span>
                  <span className="fw-btn fw-btn-ghost fw-btn-sm" style={{ padding: "2px 6px", fontSize: 9.5 }}>{Icon("plus", { size: 9 })} Spawn</span>
                </button>
              ))}
              <button className="fw-tpl-card" style={{ borderStyle: "dashed", color: "var(--text-3)", justifyContent: "center" }}>
                {Icon("chevR", { size: 11 })} Show all {c.count}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">spawnItem(templateId, qty)</span> · src/data/items.ts · default qty=1, custom name optional</div>
    </div>
  );
}

/* ============================================================
   8. ITEM EFFECTS PANEL
   ============================================================ */
function ItemEffectsPanel() {
  const effects = [
    { type: "ac_bonus",         value: "+1",        src: "Ring of Protection",  desc: "AC and saving throws +1." },
    { type: "attack_bonus",     value: "+1",        src: "Longsword +1",        desc: "Attack rolls with weapon +1." },
    { type: "damage_bonus",     value: "+1",        src: "Longsword +1",        desc: "Damage rolls with weapon +1." },
    { type: "ability_bonus",    value: "+1 CHA",    src: "Staff of the Cinder-Reeve", desc: "Spellcasting CHA bonus." },
    { type: "saving_throw_bonus", value: "+1 all", src: "Ring of Protection",  desc: "All saving throws +1." },
    { type: "speed_bonus",      value: "×2 (10r)",  src: "Boots of Speed",      desc: "Double speed, 10 rounds per long rest." },
    { type: "resistance",       value: "Fire ½",    src: "Cloak of Embers",     desc: "Resistance to fire damage.", inactive: true },
  ];
  return (
    <div className="fw-effects-panel">
      <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Active passive effects · 6 of 7 (1 from unattuned item)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {effects.map((e, i) => <EffectChip key={i} {...e} />)}
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">char.equipment.filter(i =&gt; i.equipped &amp;&amp; (!i.attune || i.attuned))</span> · flatMap effects · apply</div>
    </div>
  );
}
function EffectChip({ type, value, src, desc, inactive }) {
  const map = {
    ac_bonus:           { icon: "shield",   color: "var(--success)" },
    attack_bonus:       { icon: "sword",    color: "var(--blood-bright)" },
    damage_bonus:       { icon: "zap",      color: "var(--blood-bright)" },
    ability_bonus:      { icon: "dice",     color: "var(--gold-bright)" },
    saving_throw_bonus: { icon: "shield",   color: "var(--success)" },
    speed_bonus:        { icon: "arrowR",   color: "var(--arcane-bright)" },
    resistance:         { icon: "shield",   color: "var(--arcane-bright)" },
    immunity:           { icon: "shield",   color: "var(--gold-bright)" },
  }[type] || { icon: "sparkles", color: "var(--text-2)" };
  return (
    <div className="fw-effect-chip" style={{ opacity: inactive ? 0.45 : 1 }}>
      <span style={{ color: map.color, flexShrink: 0 }}>{Icon(map.icon, { size: 13 })}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, color: "var(--text)", fontFamily: "var(--f-display)", letterSpacing: "0.02em" }}>{value}</span>
          <span style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>{type.replace(/_/g, " ")}</span>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)" }}>{desc} — from {src}</div>
      </div>
      {inactive && <span className="fw-pill dim" style={{ fontSize: 8.5, padding: "0 5px" }}>Not attuned</span>}
    </div>
  );
}

/* ============================================================
   9. DROP CONFIRMATION
   ============================================================ */
function DropConfirm() {
  return (
    <div className="fw-flow-modal accent-blood" style={{ position: "static", maxWidth: 480, margin: "0 auto" }}>
      <div className="fw-flow-head">
        <div className="fw-display" style={{ fontSize: 16, color: "var(--text)", flex: 1 }}>Drop item?</div>
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm">{Icon("x", { size: 12 })}</button>
      </div>
      <div className="fw-flow-body">
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16, padding: 12, background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 6 }}>
          <span style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(214,168,79,0.10)", border: "1px solid var(--gold-deep)", display: "grid", placeItems: "center", color: "var(--gold-bright)" }}>
            {Icon("flame", { size: 18 })}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>Staff of the Cinder-Reeve</span>
              <span className="fw-pill" style={{ fontSize: 8.5, padding: "0 5px", borderColor: RARITY.very_rare.color + "55", color: RARITY.very_rare.color }}>Very Rare</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-mono)" }}>Pact weapon · 1d8 fire · 2 lb</div>
          </div>
        </div>

        <div className="fw-drop-warn">
          <span style={{ color: "var(--blood-bright)" }}>{Icon("alert", { size: 14 })}</span>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", fontFamily: "var(--f-serif)", lineHeight: 1.55 }}>
            This item is <b style={{ color: "var(--gold-bright)", fontFamily: "var(--f-display)" }}>attuned</b>.
            Dropping it will <b style={{ color: "var(--blood-bright)", fontFamily: "var(--f-display)" }}>break attunement</b> and lose all bonuses.
            <br/>
            <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>It is also pact-bound — the Cinder-Reeve will know.</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Field label="Drop where?">
            <Seg value="Ground" onChange={() => {}} options={["Ground", "Stash here", "Give to ally"]} />
          </Field>
        </div>
      </div>
      <div className="fw-flow-foot" style={{ margin: 0 }}>
        <button className="fw-btn fw-btn-ghost">Cancel</button>
        <button className="fw-btn fw-btn-blood">{Icon("minus", { size: 11 })} Drop &amp; break attune</button>
      </div>
      <div className="fw-kit-wires" style={{ margin: "0 18px 18px" }}>Wires to: <span className="fw-mono">dropItem(itemId, target)</span> · auto-unattune if needed · push to loot pool or party member</div>
    </div>
  );
}

/* ============================================================
   10. TWO-HANDED LOCK
   ============================================================ */
function TwoHandedLock() {
  return (
    <div className="fw-th-lock">
      <div className="fw-th-slot">
        <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Main hand</div>
        <div className="fw-th-slot-card filled">
          <div className="fw-eq-slot-icon" style={{ borderColor: "var(--gold-deep)", color: "var(--gold-bright)" }}>{Icon("sword", { size: 22 })}</div>
          <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8 }}>Greatsword</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>2d6 slashing · heavy · two-handed</div>
          <span className="fw-pill gold" style={{ marginTop: 6, fontSize: 9 }}>Two-handed</span>
        </div>
      </div>

      <div className="fw-th-link">
        <div className="fw-th-link-line" />
        <span className="fw-th-link-icon">{Icon("lock", { size: 14 })}</span>
        <div className="fw-th-link-line" />
      </div>

      <div className="fw-th-slot">
        <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Off-hand</div>
        <div className="fw-th-slot-card locked">
          <div className="fw-eq-slot-icon empty" style={{ color: "var(--text-4)" }}>{Icon("lock", { size: 18 })}</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>Locked</div>
          <div style={{ fontSize: 11, color: "var(--text-4)", fontStyle: "italic", fontFamily: "var(--f-serif)", lineHeight: 1.4 }}>
            Two-handed weapon equipped.<br />Unequip to free off-hand.
          </div>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" style={{ marginTop: 8, fontSize: 10.5 }}>{Icon("x", { size: 10 })} Unequip greatsword</button>
        </div>
      </div>
      <div className="fw-kit-wires" style={{ gridColumn: "1 / -1", marginTop: 0 }}>Wires to: <span className="fw-mono">if (weapon.properties.includes('two-handed')) lockSlot('offhand')</span></div>
    </div>
  );
}

/* ============================================================
   11. ENCUMBRANCE BAR
   ============================================================ */
function EncumbranceBar() {
  const [str, setStr] = React.useState(14);
  const [carry, setCarry] = React.useState(58);
  const max = str * 15;
  const pct = (carry / max) * 100;
  const tier = pct < 50 ? "Light" : pct < 75 ? "Medium" : pct <= 100 ? "Heavy" : "Overburdened";
  const color = pct < 50 ? "var(--success)" : pct < 75 ? "var(--warning)" : pct <= 100 ? "var(--gold-bright)" : "var(--blood-bright)";

  return (
    <div className="fw-enc">
      <div className="fw-enc-head">
        <div>
          <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Carry weight</div>
          <div className="fw-display" style={{ fontSize: 26, color: color, lineHeight: 1 }}>{carry} <span style={{ fontSize: 14, color: "var(--text-3)" }}>/ {max} lb</span></div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--f-serif)", fontStyle: "italic", marginTop: 4 }}>
            Limit = STR <b style={{ color: "var(--text-2)", fontStyle: "normal" }}>{str}</b> × 15 lb = <b style={{ color: "var(--text-2)", fontStyle: "normal" }}>{max} lb</b>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span className="fw-pill" style={{ fontSize: 10, borderColor: color, color: color, background: color + "11" }}>{tier}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>STR</span>
            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setStr(s => Math.max(3, s - 1))}>{Icon("minus", { size: 10 })}</button>
            <span className="fw-mono" style={{ width: 22, textAlign: "center", color: "var(--gold-bright)" }}>{str}</span>
            <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={() => setStr(s => Math.min(20, s + 1))}>{Icon("plus", { size: 10 })}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>Load</span>
            <input type="range" min="0" max={Math.round(max * 1.3)} value={carry} onChange={e => setCarry(+e.target.value)} style={{ width: 140, accentColor: color === "var(--blood-bright)" ? "#EF4444" : "#D6A84F" }} />
          </div>
        </div>
      </div>

      <div className="fw-enc-bar">
        <div className="fw-enc-bar-fill" style={{ width: Math.min(100, pct) + "%", background: color }} />
        {/* Tier markers */}
        <span className="fw-enc-tick" style={{ left: "50%" }}><span>50%</span></span>
        <span className="fw-enc-tick" style={{ left: "75%" }}><span>75%</span></span>
        <span className="fw-enc-tick" style={{ left: "100%" }}><span>Max</span></span>
        {pct > 100 && (
          <div className="fw-enc-over">{Icon("alert", { size: 11 })} +{Math.round(carry - max)} lb over</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 11, color: "var(--text-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--success)" }} /> Light (&lt;50%)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--warning)" }} /> Medium · speed -10 ft</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--gold-bright)" }} /> Heavy · speed -20 ft, disadv</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 50, background: "var(--blood-bright)" }} /> Over · cannot pickup</div>
      </div>
      <div className="fw-kit-wires">Wires to: <span className="fw-mono">maxCarry = char.abilities.STR * 15</span> · over → blockPickup() + apply penalty</div>
    </div>
  );
}

/* ============================================================
   12. ITEM COMPARISON
   ============================================================ */
function ItemComparison() {
  const cur = { n: "Longsword +1", dmg: "1d8+1 · slashing", weight: 3, rarity: "uncommon", magic: true, effects: ["+1 attack","+1 damage"] };
  const nw  = { n: "Flame Tongue", dmg: "1d8 + 2d6 fire", weight: 3, rarity: "rare",    magic: true, effects: ["+0 attack", "+2d6 fire damage", "Sheds bright light 40 ft"] };
  const diff = (a, b) => a > b ? "+" : a < b ? "−" : "=";
  return (
    <div className="fw-cmp">
      <CmpCard label="Currently equipped" item={cur} side="current" />
      <div className="fw-cmp-mid">
        <div style={{ color: "var(--gold)", fontSize: 22, fontWeight: 500 }}>vs</div>
        <div className="fw-cmp-deltas">
          <div className="fw-cmp-delta">
            <span className="fw-eyebrow" style={{ fontSize: 9 }}>Damage</span>
            <span className="fw-display" style={{ fontSize: 14, color: "var(--success)" }}>+2d6 fire</span>
          </div>
          <div className="fw-cmp-delta">
            <span className="fw-eyebrow" style={{ fontSize: 9 }}>Attack</span>
            <span className="fw-display" style={{ fontSize: 14, color: "var(--blood-bright)" }}>−1</span>
          </div>
          <div className="fw-cmp-delta">
            <span className="fw-eyebrow" style={{ fontSize: 9 }}>Weight</span>
            <span className="fw-display" style={{ fontSize: 14, color: "var(--text-3)" }}>= 3 lb</span>
          </div>
          <div className="fw-cmp-delta">
            <span className="fw-eyebrow" style={{ fontSize: 9 }}>Rarity</span>
            <span className="fw-display" style={{ fontSize: 12, color: RARITY.rare.color }}>↑ Rare</span>
          </div>
        </div>
        <button className="fw-btn fw-btn-gold fw-btn-sm" style={{ marginTop: 12 }}>{Icon("arrowR", { size: 11 })} Swap to Flame Tongue</button>
      </div>
      <CmpCard label="Considering" item={nw} side="new" />
      <div className="fw-kit-wires" style={{ gridColumn: "1 / -1", marginTop: 0 }}>Wires to: <span className="fw-mono">compareItems(currentSlot, candidate)</span> · show on hover/click of equip target</div>
    </div>
  );
}
function CmpCard({ label, item, side }) {
  const rar = RARITY[item.rarity];
  return (
    <div className="fw-cmp-card" style={{ borderColor: rar.color + "55", background: `linear-gradient(180deg, ${rar.color}08, transparent)` }}>
      <div className="fw-eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="fw-eq-slot-icon" style={{ borderColor: rar.color, color: rar.color, margin: "0 auto" }}>
        {Icon("sword", { size: 22 })}
        {item.magic && <span className="fw-eq-magic">✨</span>}
      </div>
      <div className="fw-display" style={{ fontSize: 15, color: "var(--text)", textAlign: "center", marginTop: 8 }}>{item.n}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
        <span className="fw-pill" style={{ fontSize: 9, padding: "0 6px", borderColor: rar.color + "55", color: rar.color, background: rar.color + "11" }}>{rar.label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
        <CmpStat label="Damage" v={item.dmg} />
        <CmpStat label="Weight" v={item.weight + " lb"} />
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border-soft)" }}>
        <div className="fw-eyebrow" style={{ fontSize: 8.5, marginBottom: 4 }}>Effects</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {item.effects.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--f-serif)", fontStyle: "italic" }}>· {e}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
function CmpStat({ label, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "var(--bg-deep)", border: "1px solid var(--border-soft)", borderRadius: 4 }}>
      <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "var(--f-mono)" }}>{v}</span>
    </div>
  );
}

Object.assign(window, { InventoryUIKitScreen });

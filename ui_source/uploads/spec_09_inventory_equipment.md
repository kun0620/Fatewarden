# ระบบที่ 9 — Inventory & Equipment

## ภาพรวม
ระบบจัดการ items และ equipment ของตัวละคร
รองรับ SRD 5.1 items ทั้งหมด พร้อม magic item และ attunement

---

## Equipment Slots

6 slots สำหรับ equip:

| Slot | รองรับ Item Type | จำกัด |
|------|----------------|--------|
| **Head** | Helmet, Hat, Hood | 1 |
| **Body** | Light/Medium/Heavy Armor, Robes | 1 |
| **Hands** | Gloves, Gauntlets, Bracers | 1 |
| **Weapon (Main)** | Any weapon | 1 |
| **Off-hand** | Shield, Light weapon, Torch | 1 |
| **Accessory** | Ring, Amulet, Cloak, Belt | 1 |

### Equip Rules
- Equip weapon ใหม่ → unequip weapon เก่าอัตโนมัติ
- Equip armor ใหม่ → unequip armor เก่าอัตโนมัติ
- Two-handed weapon → ล็อก off-hand slot อัตโนมัติ
- AC recalculate ทันทีหลัง equip/unequip

---

## Item Categories

| Category | ตัวอย่าง |
|----------|---------|
| **Weapon** | Longsword, Shortbow, Dagger |
| **Armor** | Leather Armor, Chain Mail, Plate |
| **Shield** | Shield |
| **Potion** | Healing Potion, Antitoxin |
| **Scroll** | Spell Scroll |
| **Tool** | Thieves' Tools, Healer's Kit |
| **Gear** | Rope, Torch, Rations |
| **Ammunition** | Arrows, Bolts, Sling Bullets |
| **Currency** | pp, gp, ep, sp, cp |
| **Quest Item** | Key, Letter, McGuffin |

---

## Item Data Structure

```typescript
Item {
  id: string                    // uuid
  templateId?: string           // อ้างอิง ItemTemplate ถ้า spawn จาก template
  name: string
  description: string
  category: ItemCategory
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact'
  weight: number                // lbs
  value: number                 // gp
  quantity: number
  equipped: boolean
  attunement: boolean           // ต้อง attune ไหม
  attuned: boolean              // attune แล้วหรือยัง

  weapon?: {
    damageDice: string          // เช่น '1d8'
    damageType: DamageType
    properties: WeaponProperty[]
    rangeNormal?: number        // ft
    rangeLong?: number          // ft
    versatileDice?: string      // เช่น '1d10' ถ้า versatile
  }

  armor?: {
    type: 'light' | 'medium' | 'heavy' | 'shield'
    baseAC: number
    maxDexBonus?: number        // null = unlimited
    stealthDisadvantage: boolean
    strengthRequirement?: number
  }

  effects?: ItemEffect[]        // passive effects เมื่อ equip
}

ItemEffect {
  type: 'ac_bonus' | 'attack_bonus' | 'damage_bonus'
       | 'ability_bonus' | 'saving_throw_bonus'
       | 'resistance' | 'immunity' | 'speed_bonus'
  value: number | string
  target?: string               // ability key หรือ damage type
  description: string
}
```

---

## Encumbrance

```
Carry Weight Limit = STR score × 15 lbs
```

- เกิน limit → ไม่สามารถ pick up item เพิ่มได้
- แสดง weight bar: current / max ใน Inventory UI
- Weight bar สีเปลี่ยนตาม %: เขียว → เหลือง → แดง

---

## Attunement System

### Rules
- Magic item บาง item ต้อง attune ก่อนใช้ passive effects
- Attune ใช้เวลา Short Rest (1 hour) + focus กับ item
- **สูงสุด 3 items** ที่ attuned พร้อมกัน
- Unattune ทันที หรือเมื่อ item ออกจาก possession
- ตายแล้วฟื้น → attunement ยังคงอยู่

### Flow
```
1. Equip magic item ที่ต้อง attune
2. แสดง "Attunement Required" badge
3. Short Rest → เลือก "Attune" กับ item นี้
4. ถ้า attuned items = 3 → ต้อง unattune อันใดอันหนึ่งก่อน
5. Attune สำเร็จ → passive effects apply
```

---

## Item Effects (Passive)

เมื่อ equip + attuned (ถ้าต้อง) → effects apply อัตโนมัติ:

| Effect Type | ตัวอย่าง Item | ผล |
|------------|-------------|-----|
| ac_bonus | Ring of Protection +1 | AC +1 |
| attack_bonus | +1 Longsword | attack rolls +1 |
| damage_bonus | +1 Longsword | damage rolls +1 |
| ability_bonus | Gauntlets of Ogre Power | STR = 19 |
| saving_throw_bonus | Cloak of Protection | all saves +1 |
| resistance | Cloak of Displacement | resistance to first hit each round |
| speed_bonus | Boots of Speed | speed ×2 |

---

## Currency System

5 สกุลเงินตาม SRD 5.1:

| สกุล | ชื่อเต็ม | Exchange Rate |
|------|---------|--------------|
| PP | Platinum Piece | 1 PP = 10 GP |
| GP | Gold Piece | 1 GP = 10 SP |
| EP | Electrum Piece | 1 EP = 5 SP |
| SP | Silver Piece | 1 SP = 10 CP |
| CP | Copper Piece | — |

### Auto-Convert
- กด Convert → เลือก from/to/amount → คำนวณและเปลี่ยนให้อัตโนมัติ
- เช่น 100 CP → 10 SP → 1 GP

---

## Inventory UI

### 3 Tabs

**Equipment Tab**
```
┌────────────────────────────────────┐
│  HEAD: Empty              [+]      │
│  BODY: Leather Armor      [x]      │
│  HANDS: Leather Gloves    [x]      │
│  WEAPON: Longsword +1     [x] ✨   │  ← ✨ = magic item
│  OFF-HAND: Shield         [x]      │
│  ACCESSORY: Empty         [+]      │
└────────────────────────────────────┘
│  AC: 15  |  Attuned: 1/3           │
```

**Backpack Tab**
```
┌────────────────────────────────────┐
│ 🗡 Dagger           x2  0.5 lbs   │
│ 🧪 Healing Potion   x3  0.5 lbs   │
│ 📜 Scroll of Sleep  x1  0.1 lbs   │
│ 🔦 Torch            x5  1 lbs     │
│ 🍖 Rations          x7  2 lbs     │
└────────────────────────────────────┘
│ Weight: 12.5 / 150 lbs  ████░░░░  │
```

**Currency Tab**
```
┌────────────────────────────────────┐
│  PP:   0    GP: 142                │
│  EP:  15    SP:  89    CP: 400     │
│                                    │
│  Total value: ~158 GP              │
│  [Convert Currency]                │
└────────────────────────────────────┘
```

### Item Actions (per item)
- **Equip / Unequip** — เปลี่ยน equipped state
- **Attune / Unattune** — เปลี่ยน attuned state (ถ้า item ต้อง attune)
- **Use** — สำหรับ consumable (potion, scroll)
- **Drop** — ลบออกจาก inventory
- **Info** — แสดง item detail modal

---

## Item Templates (SRD 5.1)

ระบบมี template สำเร็จรูปให้ spawn ได้ทันที:

### Simple Weapons (14)
club, dagger, greatclub, handaxe, javelin, light hammer, mace,
quarterstaff, sickle, spear, light crossbow, dart, shortbow, sling

### Martial Weapons (22)
battleaxe, flail, glaive, greataxe, greatsword, halberd, lance,
longsword, maul, morningstar, pike, rapier, scimitar, shortsword,
trident, war pick, warhammer, whip, hand crossbow, heavy crossbow,
longbow, net

### Armor (13)
padded, leather, studded leather, hide, chain shirt, scale mail,
breastplate, half plate, ring mail, chain mail, splint, plate, shield

### Adventuring Gear (20)
rope, torch, rations, bedroll, tinderbox, lantern, oil,
healer's kit, thieves' tools, climber's kit, crowbar, grappling hook,
mirror, waterskin, backpack, blanket, candle, chalk, ink, parchment

---

## Legacy Migration

Character เก่าที่มี `equipment: string[]`:
- migrate อัตโนมัติเมื่อโหลด
- แต่ละ string → Item พื้นฐาน (category='gear', qty=1, weight=0)
- currency เริ่มที่ 0 ทุกสกุล
- maxCarryWeight = STR score × 15

---

## หมายเหตุ

- Item state เปลี่ยนผ่าน Event Queue เสมอ (AddItemEvent, EquipItemEvent ฯลฯ)
- AC recalculate อัตโนมัติหลัง equip/unequip ทุกครั้ง
- Magic item effects apply/remove ตาม equipped + attuned state
- Inventory sync realtime ใน multiplayer session
- Item template ใน src/data/items.ts — spawn ด้วย spawnItem(templateId, qty)

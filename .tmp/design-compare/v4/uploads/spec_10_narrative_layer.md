# ระบบที่ 10 — Narrative Layer

## ภาพรวม
ระบบที่เพิ่มความลึกให้ story ประกอบด้วย 4 ระบบย่อย:
Scene Mode, Journal, Companion, Relationship

---

## 10.1 Scene Mode

### 6 Modes

| Mode | สี Accent | AI Tone | เมื่อไหร่ |
|------|-----------|---------|---------|
| **Exploration** | Teal | curious, descriptive | เดินสำรวจ, ค้นหา |
| **Combat** | Crimson | urgent, tactical | ต่อสู้ |
| **Social** | Amber | warm, diplomatic | คุยกับ NPC, negotiation |
| **Rest** | Gold | calm, reflective | พัก short/long rest |
| **Horror** | Sickly Green | oppressive, uncertain | cosmic horror, dread |
| **Transition** | Gray | neutral | ระหว่างเปลี่ยน scene |

### Reality Stability Meter
ใช้ใน Horror mode เป็นหลัก:

| Level | ความหมาย | Visual |
|-------|---------|--------|
| Stable | ทุกอย่างปกติ | ไม่มี effect |
| Unstable | สิ่งแปลกปลอมเริ่มปรากฏ | UI สั่นเล็กน้อย |
| Fracturing | reality กำลังพัง | distortion effect |
| Broken | ไม่มีอะไรเป็นจริง | heavy distortion |

### Scene Panel แสดง
- Mode badge (สีตาม mode)
- Location name
- Danger level (5 segments: none/low/medium/high/extreme)
- Reality stability indicator
- Active objectives list (active/completed/failed)
- Threat clocks (segmented circle)

### Host Controls
- Transition Scene (เปลี่ยน mode + location)
- Add/Complete/Fail Objective
- Advance Threat Clock
- Set Danger Level
- Set Reality Stability

---

## 10.2 Journal System

### Auto-Generated Entries
ระบบบันทึกอัตโนมัติเมื่อ:

| Event | Entry Type | ตัวอย่าง |
|-------|-----------|---------|
| Combat win | Memory | "เอาชนะ Cursed Sentinel ที่ Iron Cathedral" |
| Item found | Memory | "ได้รับ Longsword +1 จาก chest" |
| NPC met | Memory | "พบกับ Brother Aldric นักบวชผู้ลึกลับ" |
| Quest update | Quest Update | "ค้นพบว่า tome อยู่ที่ inner sanctum" |
| Session start | Recap | "Session 3 — กลับสู่ Iron Cathedral..." |
| Clue found | Clue | "รอยเลือดบนแท่นบูชาชี้ไปทางเหนือ" |

### Player Notes
- เพิ่ม note เองได้ทุกเวลา
- เลือก entry type: Memory / Clue / Quest Update / Recap
- กรอก title + content (textarea)
- เพิ่ม tag ได้ (optional)

### 4 Entry Types

| Type | Icon | ใช้สำหรับ |
|------|------|---------|
| **Memory** | 📖 | เหตุการณ์สำคัญที่ผ่านมา |
| **Clue** | 🔍 | เงื่อนงำที่ค้นพบ |
| **Quest Update** | ⚔️ | ความคืบหน้าของ quest |
| **Recap** | 📜 | สรุป session |

### Journal UI
- Filter by type
- Search by keyword
- Timeline view (เรียงตาม session/chapter)
- Click entry → expand detail

---

## 10.3 Companion System

### Companion Types
- **NPC** — ตัวละครในเรื่องที่ join party
- **Beast** — สัตว์ที่ bond กับ character (Ranger, Druid)
- **Summon** — สิ่งที่ถูก summon (spell, class feature)
- **Hireling** — จ้างมาช่วย

### Companion Data

```typescript
CompanionSheet {
  id: string
  name: string
  type: 'npc' | 'beast' | 'summon' | 'hireling'
  ownerId: string          // player ที่ควบคุม
  portrait?: string
  stats: {
    armorClass: number
    hitPoints: number
    maxHitPoints: number
    tempHitPoints: number
    speed: number
    abilities: Record<AbilityKey, number>
    attackDice: string     // เช่น '1d6+3'
    attackType: DamageType
    conditions: string[]
  }
  behavior: 'aggressive' | 'defensive' | 'support' | 'passive'
  loyalty: {
    current: number        // 0-100
    tier: 'hostile' | 'neutral' | 'friendly' | 'devoted'
  }
  isActive: boolean
  controlMode: 'auto' | 'manual'
}
```

### Behavior Modes

| Behavior | การกระทำใน Combat |
|----------|-----------------|
| **Aggressive** | โจมตี target HP ต่ำสุด |
| **Defensive** | protect owner, interpose เมื่อ owner โดนโจมตี |
| **Support** | heal ally HP ต่ำสุดด้วย 1d4+WIS |
| **Passive** | ไม่ทำอะไร skip turn |

### Control Mode
- **Auto** — resolve อัตโนมัติตาม behavior ตอน turn ถึง
- **Manual** — host กดปุ่มควบคุมเอง
- Host เปลี่ยน mode ได้ตลอดเวลา

### Loyalty System

| Range | Tier | ผลต่อ Behavior |
|-------|------|----------------|
| 75-100 | **Devoted** | Aggressive เพิ่ม, เสี่ยงตายเพื่อ party |
| 50-74 | **Friendly** | ทำตาม behavior mode ปกติ |
| 25-49 | **Neutral** | Passive บ่อยขึ้น, ลังเลคำสั่งเสี่ยง |
| 1-24 | **Hostile** | ไม่ทำตาม, อาจ counter party |
| 0 | **Betrayal** | ทรยศหรือทิ้ง party ทันที |

### Loyalty Changes
- +loyalty: ช่วย party, roleplay ดี, ให้ของที่ companion ต้องการ
- -loyalty: ไม่สนใจ companion, ทำสิ่งที่ขัดกับ values ของ companion
- Host/DM adjust loyalty ได้ manual พร้อมระบุเหตุผล

### Combat Integration
- เมื่อ startCombat: companion ที่ isActive = true → เพิ่มเป็น participant อัตโนมัติ
- Turn ถึง companion:
  - Auto mode → resolve action ตาม behavior + loyalty tier
  - Manual mode → host กดปุ่มเลือก action

### Companion Panel UI
- Card ต่อ companion: portrait + name + type badge
- HP bar
- Loyalty meter (0-100) + tier label (สีเปลี่ยนตาม tier)
- Behavior selector (dropdown)
- Control mode toggle (Auto/Manual)
- Conditions list
- Actions: +Loyalty / -Loyalty / Dismiss

---

## 10.4 Relationship System

### Affinity Score
- Range: -100 ถึง +100
- ต่อ NPC ต่อ character (แยกกันแต่ละ PC)

### Affinity Tiers

| Range | Tier | ผลใน Game |
|-------|------|----------|
| 76-100 | **Allied** | ช่วยเหลือแบบไม่มีเงื่อนไข, share secrets |
| 26-75 | **Friendly** | ให้ข้อมูลเพิ่ม, ลด price |
| -25-25 | **Neutral** | ปฏิบัติตาม NPC role ปกติ |
| -26-75 | **Unfriendly** | ไม่ให้ข้อมูล, เพิ่ม price, หลีกเลี่ยง |
| -76-100 | **Hostile** | โจมตีถ้ามีโอกาส, ส่ง enemy ตาม |

### Affinity Changes
- AI DM Mode: AI adjust affinity ตาม player choices → propose event
- Campaign Runner: NPC Dialogue Node + Flag system adjust affinity
- Host adjust manual ได้พร้อมระบุเหตุผล

### NPC Profile Card
```
Brother Aldric
Type: NPC — Cleric of the Old Faith
Affinity: [██████░░░] 62 — Friendly

"ความลับของ cathedral มีเพียงผู้บริสุทธิ์เท่านั้นที่สมควรรู้"

[+ Increase] [- Decrease] [View History]
```

### Relationship Panel
- List ของ NPCs ที่เคยพบ
- Filter by tier
- Click NPC → ดู profile + affinity history

---

## Threat Clock System

### Visual
Segmented circle คล้าย pie chart:
- แบ่งเป็น segment ตาม max value (เช่น 6 segments)
- สีเปลี่ยนตามความเต็ม: gray → yellow → orange → red
- เมื่อเต็ม → สั่น + แสดง trigger event text

### Threat Clock Data
```typescript
ThreatClock {
  id: string
  name: string
  current: number
  max: number
  triggerEvent: string   // "The ritual completes — demon summoned"
  triggered: boolean
}
```

### การทำงาน
- Host กด Advance Clock → current ++
- เมื่อ current ≥ max → triggered = true → แสดง trigger event
- AI DM รู้ clock state → narrate ความกดดันที่เพิ่มขึ้น
- Session นึงมีได้หลาย clock พร้อมกัน

---

## Integration ระหว่าง Systems

```
Scene Mode
  → AI DM ปรับ tone ตาม mode
  → UI accent color เปลี่ยน
  → Threat Clocks แสดงใน Scene Panel

Journal
  → Auto-entry เมื่อ combat win, item found, NPC met
  → Session Recap generate จาก Journal entries

Companion
  → เข้า Combat อัตโนมัติ
  → Loyalty เปลี่ยนตาม player choices
  → Betrayal trigger เมื่อ loyalty = 0

Relationship
  → AI DM อ่าน affinity → NPC ปฏิบัติต่าง
  → Campaign Runner อ่าน affinity ใน Condition Check
  → Journal บันทึก affinity changes สำคัญ
```

---

## หมายเหตุ

- Scene Mode sync realtime ทุก client ผ่าน `scene_states` table
- Journal เก็บต่อ player ต่อ session ใน `journal_entries` table
- Companion sync realtime ผ่าน `companions` table
- Relationship เก็บต่อ character ต่อ NPC ใน `relationships` table
- Threat Clocks เก็บใน `scene_states.threat_clocks` (jsonb)

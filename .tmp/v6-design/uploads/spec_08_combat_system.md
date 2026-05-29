# ระบบที่ 8 — Combat System

## ภาพรวม
ระบบต่อสู้ turn-based ตาม SRD 5.1
ใช้ทั้งใน AI DM Mode และ Campaign Runner (Combat Node)

---

## Action Economy

แต่ละ turn player มี:

| Action Type | คำอธิบาย | ตัวอย่าง |
|-------------|----------|---------|
| **Action** | กิจกรรมหลัก 1 อย่าง | Attack, Cast Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use Object |
| **Bonus Action** | กิจกรรมเสริม (ถ้า class/spell ให้) | Off-hand attack, Cunning Action, Healing Word |
| **Reaction** | ตอบสนองต่อ trigger (1 ครั้งต่อ round) | Opportunity Attack, Shield spell, Uncanny Dodge |
| **Movement** | เดิน ≤ speed ft. | แบ่งได้ก่อน/หลัง action |
| **Free Action** | กิจกรรมเล็กน้อย | พูดสั้นๆ, วาง/ดึงของ, สื่อสาร nonverbal |

### Track ใน UI
- Action: 🔵 available / ⬜ used
- Bonus Action: 🟣 available / ⬜ used
- Reaction: 🟡 available / ⬜ used
- Movement: bar แสดง ft. ที่ใช้ไปแล้ว vs. speed

---

## Initiative System

### การ Roll Initiative
```
Initiative Score = d20 + DEX modifier + special bonuses
```

### Special Initiative Bonuses
- **Alert feat**: +5 initiative, ไม่ถูก surprised
- **Remarkable Athlete (Champion)**: เพิ่ม half proficiency ถ้าไม่มี proficiency อยู่แล้ว
- **Jack of All Trades (Bard level 2)**: เพิ่ม half proficiency
- **War Caster / Initiative spells**: ตามที่ feature/spell ระบุ

### Tie-breaking
1. DEX score สูงกว่า → ไปก่อน
2. ยัง tie → roll d20 อีกครั้ง
3. Player vs Enemy tie → Player ไปก่อน (house rule default)

### Initiative Order
- sort จากสูงไปต่ำ
- แสดงใน CombatTracker เป็น ordered list
- Host/player เรียงลำดับได้ manual ถ้าต้องการ

---

## Attack Resolution

### Flow การโจมตี
```
1. เลือก attack type (melee / ranged / spell)
2. เลือก target
3. เลือก advantage/disadvantage (ถ้ามี)
4. Roll d20 + attack bonus
5. เทียบกับ AC ของ target
6. Hit → Roll damage
7. Apply damage ผ่าน Event Queue
```

### Hit / Miss
- **Hit**: attack roll ≥ target AC
- **Miss**: attack roll < target AC
- **Critical Hit**: nat 20 (หรือ lower ถ้า class feature เช่น Champion)
- **Critical Miss**: nat 1 = miss อัตโนมัติ (ไม่ว่า AC จะต่ำแค่ไหน)

### Advantage / Disadvantage
- **Advantage**: roll 2d20 เอาสูงสุด
- **Disadvantage**: roll 2d20 เอาต่ำสุด
- ถ้ามีทั้งสอง → ยกเลิกกัน roll d20 ปกติ

### Situational Bonuses
| สถานการณ์ | ผล |
|-----------|-----|
| Flanking (อยู่คนละฝั่ง target) | Advantage on melee attack |
| Higher Ground | Advantage on ranged attack |
| Target Prone | Melee: Advantage, Ranged: Disadvantage |
| Target Invisible | Disadvantage |
| Attacker Invisible | Advantage |
| Long Range (ranged weapon) | Disadvantage |

---

## Damage System

### Flow การคำนวณ Damage
```
1. Roll damage dice + modifier
   Critical Hit → double damage dice (ไม่ใช่ double total)
2. เช็ค vulnerability → damage ×2
3. เช็ค resistance → damage ÷2 (round down)
4. เช็ค immunity → damage = 0
5. หัก Temp HP ก่อน
6. ลด HP จริง
7. ถ้า HP = 0 → trigger death save
```

### Resistance / Immunity / Vulnerability
- มาจาก: race traits, class features, conditions, spells, magic items
- ระบบอ่านจาก raceRuntime + classRuntime + activeConditions + inventory effects

### Temp HP
- ดูดก่อน HP จริงเสมอ
- ไม่ stack — เอา temp HP สูงสุดอันเดียว
- หายไปเมื่อ short/long rest

### Massive Damage (Instant Death)
- โดน damage ในครั้งเดียว ≥ max HP → ตายทันที (ไม่ต้อง death save)

---

## Conditions

### SRD Conditions ทั้งหมด
| Condition | Mechanical Effect | หมดเมื่อ |
|-----------|------------------|---------|
| Blinded | Disadvantage on attack, ศัตรู Advantage vs เรา | manual remove |
| Charmed | ไม่โจมตี charmer, charmer Advantage on social | manual remove |
| Deafened | ไม่ได้ยิน, fail check ที่ต้องได้ยิน | manual remove |
| Frightened | Disadvantage on attack/check ถ้าเห็น source | manual remove |
| Grappled | Speed = 0 | escape / source ย้ายไปไกล |
| Incapacitated | ทำ action/reaction ไม่ได้ | manual remove |
| Invisible | Advantage on attack, ศัตรู Disadvantage vs เรา | manual remove |
| Paralyzed | Incapacitated + fail STR/DEX save + attack vs เรา Advantage + crit ถ้า within 5ft | manual remove |
| Petrified | ทุกอย่างหยุด + resistance all damage + fail STR/DEX | manual remove |
| Poisoned | Disadvantage on attack + ability check | manual remove |
| Prone | Disadvantage on attack, melee vs เรา Advantage, ranged vs เรา Disadvantage | stand up (half movement) |
| Restrained | Speed = 0, Disadvantage on attack, ศัตรู Advantage vs เรา | manual remove |
| Stunned | Incapacitated + fail STR/DEX + attack vs เรา Advantage | สิ้น turn ของ caster |
| Unconscious | Prone + Incapacitated + fail STR/DEX + attack Advantage + crit ถ้า within 5ft | manual remove |
| Exhaustion | 6 levels, แต่ละ level เพิ่ม penalty | long rest ลด 1 level |

### Concentration
- เมื่อโดน damage → Constitution saving throw DC = max(10, damage/2)
- Fail → spell concentration break
- ระบบ prompt อัตโนมัติเมื่อ concentration caster โดน damage

### Condition Expiry
- บาง condition หมดอัตโนมัติตาม trigger ที่กำหนด
- บาง condition ต้องให้ DM/Host remove manual
- ระบบแสดง timer หรือ trigger condition สำหรับแต่ละ condition

---

## Death Save System

### Trigger
HP ถึง 0 → character สถานะ "dying" → Death Save mode เริ่ม

### Death Save Roll
- ต้น turn ของ character ที่ dying → roll d20
- **10+**: Success (mark ⬜⬜⬜ success)
- **9-**: Failure (mark ⬜⬜⬜ fail)
- **Nat 20**: ฟื้นขึ้นมาทันทีด้วย 1 HP (reset death saves)
- **Nat 1**: นับเป็น 2 failures
- **3 Successes**: Stabilize (หยุด death save, ยัง unconscious)
- **3 Failures**: ตาย

### Stabilize วิธีอื่น
- Healer's Kit: action + DC 10 Medicine check
- Healing spell/potion: ฟื้นด้วย HP ที่ได้รับ

### Instant Death
- Massive damage ≥ max HP → ตายทันที
- บาง spell/effect ระบุ instant death โดยตรง

### UI
```
[💀 DYING] Kael Veynor
Successes: ✅ ⬜ ⬜
Failures:  ❌ ❌ ⬜
[Roll Death Save]
```

---

## Enemy AI

### Rule-based AI (auto mode)

Behavior patterns ที่ designer/host เลือก:

| Behavior | การตัดสินใจ |
|----------|------------|
| **Aggressive** | โจมตี target HP ต่ำสุด |
| **Defensive** | โจมตี target ที่ใกล้ที่สุด, ถอยถ้า HP < 25% |
| **Support** | heal/buff ally ก่อน โจมตีทีหลัง |
| **Random** | สุ่ม target |
| **Focused** | โจมตี target เดิมจนตาย |

### Host Control (manual mode)
- Host กดปุ่ม action ให้ enemy เอง
- เลือก: Attack / Move / Dash / Dodge / Cast Spell / Use Ability
- เลือก target จาก participant list

### Hybrid (default)
- Host เลือกต่อ enemy ว่าจะเป็น auto หรือ manual
- Boss: manual (dramatic control)
- Minions: auto (ลด workload)

---

## Combat Flow

### เริ่ม Combat
```
1. สร้าง encounter (เพิ่ม participants)
2. Roll initiative ทุกคน
3. Sort initiative order
4. กด "Start Combat"
5. Turn 1 เริ่ม
```

### แต่ละ Turn
```
1. rehydrateParticipant (sync จาก character state ล่าสุด)
2. Reset action economy (action/bonus/reaction = available)
3. Highlight active participant
4. Player/AI ทำ action
5. Events ผ่าน Event Queue → state update → sync ทุก client
6. กด "End Turn" → ไป participant ถัดไป
```

### จบ Combat
```
1. กด "End Combat"
2. Reset conditions ที่ expire หลัง combat
3. Loot phase (ถ้ามี)
4. Return to exploration phase
```

---

## Combat Tracker UI

```
┌─────────────────────────────────────┐
│  ⚔️ ROUND 3                         │
├─────────────────────────────────────┤
│ 🔵 Kael Veynor        Init: 18      │  ← active turn
│    ████████░░  8/12 HP  AC: 15      │
│    [Poisoned]                       │
│    A:✅ BA:✅ R:✅ Move: 20/30ft    │
├─────────────────────────────────────┤
│    Elarion             Init: 15     │
│    ████████████ 12/12 HP  AC: 13   │
├─────────────────────────────────────┤
│ 💀 Cursed Sentinel     Init: 12     │  ← enemy
│    ████░░░░░░░  4/16 HP  AC: 14    │
│    [Frightened]                     │
├─────────────────────────────────────┤
│  [NEXT TURN →]  [Sort] [End Combat] │
└─────────────────────────────────────┘
```

---

## หมายเหตุ

- Combat state เก็บใน Supabase ตาราง `combat_states`
- ทุก state change ผ่าน Event Queue → broadcast realtime
- Enemy data มาจาก Combat Node (Campaign Runner) หรือ host เพิ่มเอง (AI DM Mode)
- Opportunity Attack: trigger เมื่อ enemy เดินออกจาก melee range โดยไม่ Disengage
- Concentration tracking ผูกกับ spell ที่ cast — break เมื่อ fail CON save

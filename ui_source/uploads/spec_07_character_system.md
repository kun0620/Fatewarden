# ระบบที่ 7 — Character System

## ภาพรวม
ระบบสร้างและจัดการตัวละคร D&D 5e
รองรับทั้ง AI DM Mode และ Campaign Runner

---

## Character Creation Wizard

Step-by-step 6 ขั้นตอน:

```
Step 1: Race
Step 2: Class
Step 3: Abilities
Step 4: Background
Step 5: Equipment
Step 6: Review & Save
```

### Step 1 — Race
- เลือก Race จาก 9 ตัว (SRD 5.1)
- เลือก Subrace (ถ้ามี)
- แสดง: racial traits, ability bonuses, speed, darkvision, languages
- Ability bonus apply อัตโนมัติ

### Step 2 — Class
- เลือก Class จาก 12 ตัว (SRD 5.1)
- แสดง: hit die, saving throws, armor/weapon proficiencies, skill choices
- เลือก skills ตาม skillChoiceCount ของ class
- แสดง features ที่ได้ที่ level 1

### Step 3 — Abilities
เลือกวิธี assign:

**Standard Array**
- แจก [15, 14, 13, 12, 10, 8] ใส่ 6 ability scores
- drag-and-drop หรือ dropdown เลือก

**Point Buy**
- เริ่มที่ score 8 ทุก ability
- มี 27 points ซื้อเพิ่ม
- ตาราง cost: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9
- ไม่เกิน 15 ก่อนใส่ racial bonus

หลังเลือก method → racial bonus apply อัตโนมัติ → แสดง final scores + modifiers

### Step 4 — Background
- กรอก: name, background, alignment, personality traits, ideals, bonds, flaws
- เลือก background สำเร็จรูป (optional) → auto-fill personality fields
- กรอก backstory (textarea, optional)

### Step 5 — Equipment
- Starting equipment จาก class (ตาม classes.ts)
- หรือเลือก gold แทน (ตาม class starting wealth)
- เพิ่ม items จาก item template ได้เพิ่มเติม

### Step 6 — Review & Save
- แสดง character sheet ครบทั้งหมด
- derived stats คำนวณแล้ว
- กด Save → เพิ่มเข้า Character Vault

---

## Derived Stats (คำนวณอัตโนมัติ)

| Stat | Formula |
|------|---------|
| Ability Modifier | floor((score - 10) / 2) |
| Proficiency Bonus | ตาม level (1-4: +2, 5-8: +3, ...) |
| Saving Throws | modifier + proficiency (ถ้า proficient) |
| Skill Bonuses | modifier + proficiency (ถ้า proficient หรือ expertise) |
| Initiative | DEX modifier |
| Passive Perception | 10 + WIS modifier + proficiency (ถ้า proficient) |
| AC | ตาม armor equipped + DEX modifier (ตาม armor type) |
| Max HP | hit die + CON modifier (level 1) + roll/avg ต่อ level |
| Spell Save DC | 8 + proficiency + spellcasting ability modifier |
| Spell Attack Bonus | proficiency + spellcasting ability modifier |

Recalculate อัตโนมัติเมื่อ:
- Equip/Unequip armor
- Level up
- Ability score เปลี่ยน
- Condition apply/remove (ที่กระทบ stats)

---

## Level Up System

เมื่อ level up ระบบทำอัตโนมัติ:

```
1. เพิ่ม level
2. แสดง features ใหม่ที่ได้ที่ level นี้
3. คำนวณ HP เพิ่ม (roll หรือ average)
4. Recover resources ทั้งหมด (long rest)
5. แสดง guided choices ที่ต้องเลือก
```

### Guided Choices ตาม Level

| Trigger | Choice |
|---------|--------|
| Level 3 | เลือก Subclass |
| Level 4, 8, 12, 16, 19 | ASI (+2 one / +1 two) หรือ Feat |
| Caster levels | เลือก Spells known เพิ่ม |
| Class-specific | Bard: Expertise, Ranger: Favored Enemy ฯลฯ |

### HP Calculation ตอน Level Up
- Roll: สุ่ม hit die (เช่น d8) + CON modifier
- Average: hit die / 2 + 1 + CON modifier (เช่น d8 → 5 + CON)
- Player เลือกว่าใช้ Roll หรือ Average

---

## Character Sheet

### Compact View (ระหว่างเล่น)
- Name + Class + Level + Race
- HP bar (current/max) + AC + Speed
- 6 Ability scores + modifiers
- Active conditions
- Class resources (pips)
- Quick actions: Roll, Rest, Level Up

### Full View (grimoire style)
- Identity section (name, race, class, background, alignment, deity)
- Ability scores grid (6 abilities)
- Stats row (HP, AC, Speed, Initiative, Proficiency, Darkvision)
- Saving throws list
- Skills list (proficient highlighted)
- Class features list
- Spells (ถ้าเป็น caster)
- Weapon style + attacks
- Equipment
- Backstory + personality traits + ideals + bonds + flaws
- Theme quote

---

## Character Vault

- เก็บได้ไม่จำกัดต่อ account
- แสดงเป็น card grid: portrait, name, class, level, race
- Actions: Play, Edit, Duplicate, Export JSON, Delete
- Search / Filter by class หรือ level

---

## Import / Export

### Export
- กด Export JSON → download `character_name.json`
- รวม: stats, equipment, features, spells, backstory ทุกอย่าง

### Import
- กด Import JSON → เลือกไฟล์ → validate → เพิ่มเข้า vault
- Validate: schema ถูกต้อง, class/race รู้จัก, required fields ครบ

---

## Character Snapshot ใน Session

เมื่อ player เข้า session ระบบทำ snapshot:
- copy character state ณ ตอนนั้น
- การเปลี่ยนแปลงระหว่าง session (HP, conditions, inventory) อยู่ใน session
- เมื่อจบ session ถามว่าจะ save กลับเข้า vault ไหม

---

## Data Structure

```typescript
Character {
  id: string
  userId: string
  name: string
  race: string
  subrace?: string
  class: string
  subclass?: string
  level: number
  background: string
  alignment: string
  abilities: Record<AbilityKey, number>
  hitPoints: number
  maxHitPoints: number
  hitDice: number
  maxHitDice: number
  armorClass: number
  speed: number
  proficiencies: string[]
  savingThrows: string[]
  skills: string[]
  inventory: Inventory
  spellSlots: Record<number, { used: number, max: number }>
  spellsKnown: string[]
  features: string[]
  activeConditions: string[]
  exhaustionLevel: 0|1|2|3|4|5|6
  systemData: {
    classRuntime?: ClassRuntime
    raceRuntime?: RaceRuntime
  }
  personality: {
    traits: string
    ideals: string
    bonds: string
    flaws: string
    backstory: string
    quote?: string
  }
  portraitUrl?: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## หมายเหตุ

- ใช้ SRD 5.1 data จาก classes.ts, races.ts, spellSlots.ts, items.ts
- Derived stats recalculate ทุกครั้งที่ source data เปลี่ยน
- Character Vault เก็บใน Supabase ตาราง `characters`
- Session snapshot เก็บแยกจาก vault — ไม่ overwrite vault อัตโนมัติ
- Portrait image เก็บเป็น URL (Supabase Storage หรือ external URL)

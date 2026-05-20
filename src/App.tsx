import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { MainMenu } from './components/MainMenu';
import { CampaignLibrary } from './components/CampaignLibrary';
import { SettingsPage } from './components/SettingsPage';
import { RoomSetupPage } from './components/RoomSetupPage';
import { LobbyScreen } from './components/LobbyScreen';
import { CharacterSheetPage } from './components/CharacterSheetPage';
import { DMDashboard } from './components/DMDashboard';
import { BestiaryScreen } from './components/BestiaryScreen';
import { CharacterVaultScreen } from './components/CharacterVaultScreen';
import { CharacterWizardScreen } from './components/CharacterWizardScreen';
import { AppRail } from './components/AppRail';
import { Topbar } from './components/Topbar';
import { CombatMode } from './components/CombatMode';
import { Icon } from './components/ui/Icons';
import { PartyChoicePanel } from './components/PartyChoicePanel';
import { useAuthFlow } from './hooks/useAuthFlow';
import { useAiDm } from './hooks/useAiDm';
import { useCharacterSync } from './hooks/useCharacterSync';
import { useGamePhase } from './hooks/useGamePhase';
import { usePartyChoiceSync } from './hooks/usePartyChoiceSync';
import { useSessionFlow } from './hooks/useSessionFlow';
import { demoCharacter, demoMessages } from './data/demo';
import { createEventQueueState, processEventQueue, type EventRuntimeState } from './engine/events/eventQueue';
import type { GameEvent } from './engine/events/types';
import { getGamePhaseDefinition } from './lib/gamePhases';
import { createEmptyInventory } from './lib/inventory';
import { requestAiDmReply, sendSessionMessage } from './lib/messages';
import { getPlayModeDefinition } from './lib/playModes';
import { getSessionThemeDefinition } from './lib/sessionThemes';
import { subscribeToSessionUpdates, updateSessionCombatState } from './lib/sessions';
import { useGameStore } from './store/useGameStore';
import { computeAppStage, getGateSteps, isGateStage } from './lib/appFlow';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import type {
  AiConfirmAction,
  Character,
  Combatant,
  DiceRoll,
  EncounterState,
  GamePhase,
  GameSession,
  StoryMessage,
} from './types';

type MobilePanel = 'quest' | 'party' | 'inventory' | 'map';
type LeftSidebarTab = 'party' | 'character' | 'inventory' | 'quests';
type RightSidebarTab = 'dice' | 'combat' | 'ai' | 'rules' | 'tools';

const prototypeParty = [
  { initials: 'AE', name: 'Aedric Vael', role: 'Warlock - Lv 7', hp: '38/52', hpPct: 73, ac: 14, slots: '1/2', you: true, tone: 'violet' },
  { initials: 'KI', name: 'Kessra Ironwake', role: 'Fighter - Lv 7', hp: '64/70', hpPct: 91, ac: 19, slots: '', tone: 'gold' },
  { initials: 'MT', name: 'Mirenna Thornhart', role: 'Druid - Lv 7', hp: '41/56', hpPct: 73, ac: 16, slots: '', tone: 'green' },
  { initials: 'HD', name: 'Halric Dale', role: 'Cleric - Lv 6', hp: '0/48', hpPct: 0, ac: 18, slots: '', down: true, tone: 'blood' },
];

const prototypeInventory = [
  { icon: 'flame', name: 'Staff of the Cinder-Reeve', meta: 'Pact weapon - 1d8 fire', tag: 'Attuned' },
  { icon: 'potion', name: "Healer's Potion", meta: '2d4+2 HP - standard', tag: 'x2' },
  { icon: 'sparkles', name: 'Brass censer-key', meta: 'Binding-resonance trinket', tag: 'Quest' },
  { icon: 'scroll', name: 'Bone-tablet fragment', meta: 'Embers arc clue', tag: 'Lore' },
];

const prototypeQuests = [
  { title: 'Free the held shadow', meta: 'Primary - chapel binding', state: 'active' },
  { title: 'Find the missing censer-chain', meta: 'Scene clue - south wall', state: 'open' },
  { title: 'Keep Halric alive', meta: 'Death saves pending', state: 'danger' },
];

const prototypeQuickSlots = [
  { name: "Healer's Potion", icon: 'potion', cost: '1A', qty: '2', tone: 'gold' },
  { name: 'Brass censer-key', icon: 'sparkles', cost: 'Free', qty: '', tone: 'arcane' },
  { name: 'Torch', icon: 'torch', cost: '1A', qty: '3', tone: 'gold' },
  null,
];

const prototypeEquippedItems = [
  {
    name: 'Staff of the Cinder-Reeve',
    meta: 'Pact weapon · 1d8 fire',
    icon: 'flame',
    tag: 'Attuned',
    charges: '5/7',
    special: true,
  },
  {
    name: 'Leather armor',
    meta: 'AC 11 + Dex',
    icon: 'shield',
    tag: '',
    charges: '',
  },
  {
    name: 'Light crossbow',
    meta: '1d8 piercing · 80/320',
    icon: 'sword',
    tag: '',
    charges: '',
  },
];

const prototypeCarriedItems = [
  { name: "Healer's Potion", meta: '2d4+2 HP · standard', icon: 'potion', qty: 'x2', special: false },
  { name: 'Bone-tablet fragment', meta: 'Quest · Embers arc', icon: 'scroll', qty: '', special: true },
  { name: 'Brass censer-key', meta: 'Trinket · binding-resonance', icon: 'sparkles', qty: '', special: true },
];

function formatLocalTime() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function addUniqueMessage(messages: StoryMessage[], next: StoryMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next];
}

function storyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AE';
}

function PrototypeStoryEntry({
  avatar,
  children,
  meta,
  name,
  tone = 'player',
}: {
  avatar: string;
  children: ReactNode;
  meta: string;
  name: string;
  tone?: 'dm' | 'player';
}) {
  return (
    <article className="fw-story-entry">
      <div className={`fw-story-avatar ${tone === 'dm' ? 'dm' : ''}`}>{avatar}</div>
      <div className="fw-story-copy">
        <div className="fw-story-kicker">
          <span>{name}</span>
          <small>{meta}</small>
        </div>
        {children}
      </div>
    </article>
  );
}

function PrototypeRollCard({
  detail,
  result,
  status,
  title,
}: {
  detail: string;
  result: number;
  status: string;
  title: string;
}) {
  return (
    <div className="fw-story-roll">
      <div className="fw-story-roll__value">{result}</div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <em>{status}</em>
    </div>
  );
}

function PrototypeStoryFeed({
  characterName,
  sessionTitle,
}: {
  characterName: string;
  sessionTitle?: string;
}) {
  const initials = storyInitials(characterName);

  return (
    <div className="fw-proto-story">
      <PrototypeStoryEntry avatar="DM" meta="just now" name="Dungeon Master" tone="dm">
        <p className="fw-story-text">
          Cinder-smoke curls along the chapel floor. The brazier above the altar gutters - a single coal still alive within.
          The chant has stopped. Whoever stood here moments ago is gone, but their shadow remains, stretched too long
          across the south wall.
        </p>
      </PrototypeStoryEntry>

      <PrototypeStoryEntry avatar={initials} meta="action" name={characterName}>
        <p className="fw-story-action">
          I keep my shield up and step toward the censer. Slow. I want a closer look at that shadow.
        </p>
      </PrototypeStoryEntry>

      <PrototypeRollCard
        detail="1d20+3 for Perception"
        result={17}
        status="Success"
        title={`${characterName} rolled`}
      />

      <PrototypeStoryEntry avatar="DM" meta="just now" name="Dungeon Master" tone="dm">
        <p className="fw-story-text">
          You see the silhouette wears no helm - a circlet, perhaps. The shadow's hand grips empty air where a
          censer-chain should hang. It is mid-prayer, frozen.
        </p>
      </PrototypeStoryEntry>

      <PrototypeStoryEntry avatar={initials} meta="action" name={characterName}>
        <p className="fw-story-action">I cast Detect Magic and look for residue around the altar.</p>
      </PrototypeStoryEntry>

      <PrototypeRollCard
        detail="1d20+5 for Arcana"
        result={24}
        status="Critical insight"
        title={`${characterName} rolled`}
      />

      <section className="fw-ai-suggestion">
        <div className="fw-ai-suggestion__icon">{Icon('wand', { size: 16 })}</div>
        <div>
          <div className="fw-story-kicker">
            <span>AI Warden</span>
            <b>Suggestion</b>
          </div>
          <p className="fw-story-text">
            The residue traces a binding - not an ordinary banishment. Whoever stood here is held, not gone.
            The shadow is the warding, and it is failing.
          </p>
          <div className="fw-story-actions">
            <button className="fw-btn fw-btn-purple fw-btn-sm" type="button">Accept as canon</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Re-suggest</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Dismiss</button>
          </div>
        </div>
      </section>

      <section className="fw-roll-request">
        <div>
          <strong>DM requests: Charisma (Persuasion)</strong>
          <span>Convince the held shadow it is free. DC 15</span>
        </div>
        <div className="fw-roll-request__actions">
          <button className="fw-btn fw-btn-gold fw-btn-sm" type="button">{Icon('dice', { size: 12 })} Roll d20+3</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Adv</button>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Dis</button>
        </div>
      </section>

      <div className="fw-story-session-note">
        <span>{sessionTitle || 'Session'}</span>
        <span>Story UI prototype mode</span>
      </div>
    </div>
  );
}

function PrototypeLeftPanel({
  character,
  tab,
}: {
  character: Character;
  tab: LeftSidebarTab;
}) {
  if (tab === 'character') {
    return (
      <div className="fw-proto-panel fw-proto-you-panel">
        <div className="fw-proto-hero-id">
          <div className="fw-avatar lg dm">{storyInitials(character.name || 'Aedric Vael')}</div>
          <div>
            <div className="fw-display">{character.name || 'Aedric Vael'}</div>
            <p>{character.ancestry || 'Tiefling'} {character.className || 'Warlock'} · Lv {character.level || 7}</p>
            <div className="fw-proto-condition-row">
              <span className="fw-cond">Bless</span>
              <span className="fw-cond bleed">Cursed</span>
            </div>
          </div>
        </div>
        <div className="fw-proto-stat-grid">
          {[
            ['HP', `${character.hitPoints}/${character.maxHitPoints}`],
            ['AC', String(character.armorClass)],
            ['SPD', `${character.speed || 30} ft`],
            ['PROF', '+3'],
            ['INIT', '+2'],
            ['PASS', '13'],
          ].map(([label, value]) => (
            <div className="fw-proto-stat" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="fw-proto-section-title">Resources</div>
        {[ 
          ['Pact Slots', 1, 2, 'arcane'],
          ['Hit Dice (d8)', 5, 7, 'gold'],
          ['Inspiration', 1, 1, 'gold'],
        ].map(([label, current, max, tone]) => (
          <div className={`fw-proto-resource ${tone}`} key={String(label)}>
            <div><span>{label}</span><b>{current}/{max}</b></div>
            <div>{Array.from({ length: Number(max) }).map((_, index) => <i className={index < Number(current) ? 'on' : ''} key={index} />)}</div>
          </div>
        ))}
        <div className="fw-proto-section-title">Ability Scores</div>
        <div className="fw-proto-ability-grid">
          {[
            ['STR', '9', '-1'],
            ['DEX', '14', '+2'],
            ['CON', '12', '+1'],
            ['INT', '13', '+1'],
            ['WIS', '11', '+0'],
            ['CHA', '18', '+4'],
          ].map(([label, score, mod]) => (
            <div className="fw-proto-ability" key={label}>
              <span>{label}</span>
              <strong>{score}</strong>
              <em>{mod}</em>
            </div>
          ))}
        </div>
        <div className="fw-proto-section-title">Spells · Pact Magic</div>
        {[
          ['Eldritch Blast', 'Cantrip · 2 beams · 1d10 force each', true],
          ['Hex', 'Lvl 1 · 1d6 necrotic per hit', true],
          ['Armor of Agathys', 'Lvl 1 · 10 temp HP', false],
          ['Misty Step', 'Lvl 2 · BA · teleport 30 ft', false],
        ].map(([spell, meta, active], index) => (
          <div className={`fw-proto-list-row spell ${active ? 'active' : ''}`} key={String(spell)}>
            <span>{Icon(index < 2 ? 'flame' : 'sparkles', { size: 13 })}</span>
            <div><strong>{spell}</strong><small>{meta}</small></div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'inventory') {
    return (
      <div className="fw-proto-panel fw-proto-inventory-panel">
        <section className="fw-inv-quickbar">
          <div className="fw-eyebrow fw-proto-inv-eyebrow">
            {Icon('zap', { size: 9 })} Quick-use · 1-2-3-4
          </div>
          <div className="fw-proto-quick-grid">
            {prototypeQuickSlots.map((item, index) => item ? (
              <button className="fw-quickslot" key={item.name} type="button">
                <span className="fw-quickslot-kbd">{index + 1}</span>
                <span className={item.tone === 'arcane' ? 'arcane' : ''}>{Icon(item.icon, { size: 15 })}</span>
                <b>{item.name.split(' ').slice(0, 2).join(' ')}</b>
                {item.cost ? <small className="fw-quickslot-action">{item.cost}</small> : null}
                {item.qty ? <small className="fw-quickslot-qty">{item.qty}</small> : null}
              </button>
            ) : (
              <button className="fw-quickslot empty" key="empty" type="button">
                <span className="fw-quickslot-kbd">{index + 1}</span>
                {Icon('plus', { size: 14 })}
                <b>Pin</b>
              </button>
            ))}
          </div>
        </section>

        <div className="fw-inv-subtabs">
          <button className="fw-inv-subtab active" type="button">{Icon('bag', { size: 11 })} My Bag <span className="fw-inv-subtab-count">9</span></button>
          <button className="fw-inv-subtab" type="button">{Icon('sparkles', { size: 11 })} Loot Pool <span className="fw-inv-subtab-count blood">4</span></button>
        </div>

        <div className="fw-proto-carry-card">
          <div>
            <span>{Icon('bag', { size: 12 })}</span>
            <b>Carry</b>
            <em>34 / 90 lb</em>
          </div>
          <i><b /></i>
        </div>
        <input className="fw-input fw-proto-bag-search" placeholder="Search bag..." readOnly />
        <div className="fw-proto-filter-row">
          {[
            ['All', 'bag'],
            ['Weapons', 'sword'],
            ['Armor', 'shield'],
            ['Consumables', 'potion'],
            ['Quest', 'sparkles'],
          ].map(([label, icon], index) => (
            <button className={`fw-inv-chip ${index === 0 ? 'active' : ''}`} key={label} type="button">
              {Icon(icon, { size: 9 })} {label}
            </button>
          ))}
        </div>
        <div className="fw-proto-section-title muted-line">Equipped</div>
        {prototypeEquippedItems.map((item) => (
          <div className={`fw-inv-row ${item.special ? 'special' : ''}`} key={item.name}>
            <div className="fw-inv-row-head">
              <span className="fw-inv-icon">{Icon(item.icon, { size: 13 })}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.meta}</small>
              </div>
              {item.tag ? <span className="fw-cond">{item.tag}</span> : null}
              {item.charges ? <span className="fw-inv-charges">{item.charges}</span> : null}
              {Icon('chevD', { size: 11 })}
            </div>
            <div className="fw-inv-actions">
              <button type="button">Unequip</button>
              <button type="button">{Icon('zap', { size: 10 })}</button>
              <button type="button">{Icon('users', { size: 10 })} Give</button>
            </div>
          </div>
        ))}
        <div className="fw-proto-section-title muted-line">
          <span>Carried</span>
          <em>6</em>
        </div>
        {prototypeCarriedItems.map((item) => (
          <div className={`fw-inv-row ${item.special ? 'lore' : ''}`} key={item.name}>
            <div className="fw-inv-row-head">
              <span className="fw-inv-icon">{Icon(item.icon, { size: 13 })}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.meta}</small>
              </div>
              {item.qty ? <span className="fw-inv-qty">{item.qty}</span> : null}
              {Icon('chevD', { size: 11 })}
            </div>
            <div className="fw-inv-actions">
              <button type="button">{Icon('zap', { size: 10 })}</button>
              <button type="button">{Icon('users', { size: 10 })} Give</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'quests') {
    return (
      <div className="fw-proto-panel fw-proto-quest-panel">
        <section className="fw-proto-quest-card active">
          <div>
            <span>Main</span>
            <strong>The Gilded Tomb</strong>
          </div>
          <ul>
            <li className="done">Find the chapel beneath the city.</li>
            <li className="done">Confirm the Cinder-Reeve.</li>
            <li className="current">Decide the fate of the held shadow.</li>
            <li>Recover the brass censer-chain.</li>
          </ul>
        </section>
        <section className="fw-proto-quest-card">
          <div>
            <span>Side</span>
            <strong>The Bone-Tablet</strong>
            <em>2 / 3</em>
          </div>
          <ul>
            <li>Reassemble three fragments.</li>
            <li>Find the tablet's reader.</li>
          </ul>
        </section>
        <section className="fw-proto-quest-card">
          <div>
            <span>Personal</span>
            <strong>A Letter to Lira</strong>
          </div>
          <ul>
            <li>Write a letter, then never send it.</li>
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="fw-proto-panel">
      <div className="fw-proto-section-title">Initiative - Round 3</div>
      {prototypeParty.map((member, index) => (
        <div className={`fw-proto-party-card ${member.you ? 'you' : ''} ${member.down ? 'down' : ''}`} key={member.name}>
          {index === 0 ? <i className="turn" /> : null}
          <div className={`fw-avatar ${member.tone}`}>{member.initials}</div>
          <div>
            <div className="fw-proto-party-name">
              <strong>{member.name}</strong>
              {member.you ? <span className="fw-pill gold">You</span> : null}
              {member.down ? <span className="fw-pill blood">Down</span> : null}
            </div>
            <small>{member.role}</small>
            <div className="fw-proto-hp">
              <span>HP</span>
              <b><i style={{ width: `${member.hpPct}%` }} /></b>
              <em>{member.hp}</em>
            </div>
            <div className="fw-proto-micro">
              <span>AC <b>{member.ac}</b></span>
              {member.slots ? <span>Slots <b>{member.slots}</b></span> : null}
              {member.down ? <span className="danger">Death - 2 / 0</span> : null}
            </div>
          </div>
        </div>
      ))}
      <button className="fw-btn fw-btn-ghost fw-btn-sm fw-proto-wide" type="button">{Icon('alert', { size: 12 })} Simulate incoming damage</button>
    </div>
  );
}

function PrototypeRightPanel({
  onOpenCombat,
  tab,
}: {
  onOpenCombat: () => void;
  tab: RightSidebarTab;
}) {
  if (tab === 'combat') {
    const turn = [
      { n: 'Kessra', ini: 22, hp: '64/70', ally: true },
      { n: 'Cinder-Reeve', ini: 19, hp: '-', foe: true, current: true },
      { n: 'Aedric (you)', ini: 17, hp: '38/52', ally: true },
      { n: 'Brass Spear x2', ini: 15, hp: '12/22', foe: true },
      { n: 'Mirenna', ini: 14, hp: '41/56', ally: true },
      { n: 'Halric (down)', ini: 8, hp: '0/48', ally: true, down: true },
    ];

    return (
      <div className="fw-proto-right-panel fw-proto-right-combat">
        <div className="fw-combat-round-head">
          <span className="fw-pill blood"><i /> Round 3</span>
          <small>Surprise: none</small>
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" type="button">{Icon('chevR', { size: 12 })}</button>
        </div>

        <div className="fw-combat-turn-list">
          {turn.map((item) => (
            <div className={`fw-combat-turn ${item.current ? 'current' : ''} ${item.down ? 'down' : ''}`} key={item.n}>
              <b>{item.ini}</b>
              <i className={item.foe ? 'foe' : ''} />
              <span>{item.n}</span>
              <em>{item.hp}</em>
              {item.current ? <strong>NOW</strong> : null}
            </div>
          ))}
        </div>

        <div>
          <div className="fw-proto-section-title">Active Conditions</div>
          <div className="fw-combat-conditions">
            <span className="fw-cond">Bless (Mirenna - 8rd)</span>
            <span className="fw-cond bleed">Cursed (Aedric - until rest)</span>
            <span className="fw-cond bleed">Prone (Brass Spear)</span>
            <span className="fw-cond buff">Concentration (Hex)</span>
          </div>
        </div>

        <div className="fw-combat-actions">
          <button className="fw-btn fw-btn-blood" type="button">{Icon('minus', { size: 12 })} Damage</button>
          <button className="fw-btn fw-btn-ghost" type="button">{Icon('heart', { size: 12 })} Heal</button>
          <button className="fw-btn fw-btn-ghost" type="button">{Icon('sparkles', { size: 12 })} Condition</button>
          <button className="fw-btn fw-btn-ghost" type="button">{Icon('plus', { size: 12 })} NPC</button>
        </div>

        <button className="fw-btn fw-btn-gold fw-proto-wide" type="button">
          End Turn {Icon('chevR', { size: 12 })}
        </button>
        <button className="fw-btn fw-btn-ghost fw-proto-wide" onClick={onOpenCombat} type="button">
          {Icon('map', { size: 12 })} Battle map
        </button>
      </div>
    );
  }

  if (tab === 'ai') {
    const actions = [
      ['Generate Scene', 'From recent log + chosen tone.', 'sparkles'],
      ['Suggest Consequence', 'Outcome of last action.', 'alert'],
      ['Ask Rules', 'RAW citation. No state change.', 'book'],
      ['Voice NPC', 'Speak as the Cinder-Reeve.', 'users'],
      ['Roll Random Encounter', 'By region - Ysavir under.', 'map'],
    ];

    return (
      <div className="fw-proto-right-panel fw-proto-right-ai">
        <div className="fw-ai-panel-head">
          <span>{Icon('wand', { size: 14 })}</span>
          <div>
            <strong>AI Warden</strong>
            <small>Assistant - awaits the DM.</small>
          </div>
          <button className="fw-toggle on" type="button" aria-label="AI Warden enabled" />
        </div>

        <div>
          <div className="fw-proto-section-title">Tone</div>
          <div className="fw-ai-tone-grid">
            {['Balanced', 'Grim', 'Heroic', 'Mystery'].map((tone, index) => (
              <button className={index === 0 ? 'active' : ''} key={tone} type="button">{tone}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="fw-proto-section-title">Rule Strictness</div>
          <div className="fw-dice-mode fw-ai-strictness">
            {['Casual', 'Standard', 'Hardcore'].map((mode, index) => (
              <button className={index === 1 ? 'active' : ''} key={mode} type="button">{mode}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="fw-proto-section-title">Warden Actions</div>
          <div className="fw-ai-action-list">
            {actions.map(([title, body, icon]) => (
              <button className="fw-ai-action" key={title} type="button">
                <span>{Icon(icon, { size: 12 })}</span>
                <div><strong>{title}</strong><small>{body}</small></div>
              </button>
            ))}
          </div>
        </div>

        <div className="fw-ai-pending-card">
          <div><span>{Icon('alert', { size: 12 })}</span><b>Pending Confirmation</b></div>
          <p>The Warden proposes: <strong>Aedric takes 7 fire damage</strong> from the brazen censer's burst.</p>
          <div>
            <button className="fw-btn fw-btn-gold fw-btn-sm" type="button">{Icon('check', { size: 11 })} Confirm</button>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">{Icon('x', { size: 11 })} Reject</button>
          </div>
        </div>

        <p className="fw-ai-note">The Warden suggests. It never commits damage, conditions, death, or inventory loss without your approval.</p>
      </div>
    );
  }

  if (tab === 'tools' || tab === 'rules') {
    const tools = [
      ['Pause', 'pause'],
      ['Recap', 'scroll'],
      ['Bell', 'bell'],
      ['Loot', 'bag'],
      ['Map', 'map'],
      ['Handouts', 'layers'],
    ];
    const rules = [
      ['Prone', 'Disadv on attack. Melee attacks vs prone gain adv.'],
      ['Cursed (Hex)', '1d6 necrotic on hit. Disadv on chosen ability.'],
      ['Concentration', 'DC 10 or half damage on hit.'],
      ['Unconscious', 'Drops what holds. Auto-fails STR / DEX saves.'],
    ];

    return (
      <div className="fw-proto-right-panel fw-proto-right-tools">
        <div>
          <div className="fw-proto-section-title">Session Tools</div>
          <div className="fw-tools-grid">
            {tools.map(([label, icon]) => (
              <button className="fw-tool-btn" key={label} type="button">
                <span>{Icon(icon, { size: 14 })}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="fw-proto-section-title">Rules - Conditions</div>
          <input className="fw-input fw-rule-search" placeholder="Search rules, spells, conditions..." />
          <div className="fw-rule-list">
            {rules.map(([title, body]) => (
              <div className="fw-rule-row" key={title}>
                <strong>{title}</strong>
                <small>{body}</small>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="fw-proto-section-title">Audio</div>
          <div className="fw-audio-card">
            <button className="fw-btn fw-btn-icon" type="button">{Icon('play', { size: 12 })}</button>
            <div>
              <strong>Cinder Chapel - ambient loop</strong>
              <span><i /></span>
            </div>
          </div>
        </div>

        <button className="fw-btn fw-btn-blood fw-proto-wide" type="button">
          {Icon('logout', { size: 12 })} End Session
        </button>
      </div>
    );
  }

  return (
    <div className="fw-proto-right-panel fw-proto-right-dice">
      <div className="fw-proto-dice-card">
        <span>Last Roll - 1d20+3</span>
        <strong>17 <em>+3</em></strong>
        <small>= 20 vs DC 15</small>
        <p>Success.</p>
      </div>

      <div className="fw-dice-title-row">
        <div className="fw-proto-section-title">Quick Dice</div>
        <div className="fw-dice-mode">
          <button className="active" type="button">Normal</button>
          <button type="button">Adv</button>
          <button type="button">Dis</button>
        </div>
      </div>

      <div className="fw-proto-dice-grid">
        {['D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100'].map((die) => (
          <button className={die === 'D20' ? 'active' : ''} key={die} type="button">
            <strong>{die}</strong>
            <span>{die === 'D20' ? '1-20' : die === 'D100' ? '1-100' : '1-' + die.slice(1)}</span>
          </button>
        ))}
      </div>

      <div className="fw-proto-section-title">Saved Rolls</div>
      {[
        ['Eldritch Blast', '2d10 + 4 - force', 'flame'],
        ['Hex Damage', '1d6 - necrotic', 'skull'],
        ['Persuasion (CHA)', '1d20 + 6', 'users'],
        ['Death Save', '1d20', 'skull'],
      ].map(([roll, meta, icon]) => (
        <button className="fw-proto-saved-roll" key={roll} type="button">
          <span>{Icon(icon, { size: 11 })}</span>
          <strong>{roll}</strong>
          <em>{meta}</em>
        </button>
      ))}
      <button className="fw-btn fw-btn-ghost fw-btn-sm fw-proto-wide" type="button">{Icon('plus', { size: 11 })} Custom roll</button>

      <div className="fw-proto-section-title">Recent</div>
      <div className="fw-proto-recent-card">
        <div><span>You</span> - Perception 17 <b>✓</b></div>
        <div><span>Mirenna</span> - Arcana 24 <b>★</b></div>
        <div><span>Halric</span> - Death 8 <b className="danger">×</b></div>
      </div>
    </div>
  );
}

function findCombatant(combatants: Combatant[], action: AiConfirmAction) {
  if (action.targetId) {
    const byId = combatants.find((combatant) => combatant.id === action.targetId);
    if (byId) return byId;
  }

  if (!action.targetName) return null;
  const targetName = action.targetName.toLowerCase().trim();
  return combatants.find((combatant) => combatant.name.toLowerCase().trim() === targetName) ?? null;
}

function combatantToRuntimeCharacter(combatant: Combatant): Character {
  return {
    id: combatant.id,
    name: combatant.name,
    ancestry: '',
    className: '',
    level: 1,
    background: '',
    age: '',
    alignment: '',
    languages: [],
    proficiencies: [],
    armorClass: combatant.armorClass,
    hitPoints: combatant.hitPoints,
    maxHitPoints: combatant.maxHitPoints,
    speed: 30,
    darkvision: 0,
    inspiration: false,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: [],
    inventory: createEmptyInventory(),
    features: [],
    spells: [],
    backstory: '',
    personalityTraits: [],
    portraitUrl: '',
    activeConditions: [...combatant.conditions],
    exhaustionLevel: 0,
    hitDice: 1,
    maxHitDice: 1,
    spellSlots: {},
    systemData: {},
  };
}

function applyRuntimeCharacterToCombatant(combatant: Combatant, runtimeCharacter: Character): Combatant {
  return {
    ...combatant,
    hitPoints: runtimeCharacter.hitPoints,
    maxHitPoints: runtimeCharacter.maxHitPoints,
    conditions: [...runtimeCharacter.activeConditions],
  };
}

export function App() {
  const [storyMessages, setStoryMessages] = useState<StoryMessage[]>(hasSupabaseConfig ? [] : demoMessages);
  const [localPhase, setLocalPhase] = useState<GamePhase>('setup');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('quest');
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>('party');
  const [rightSidebarTab, setRightSidebarTab] = useState<RightSidebarTab>('dice');
  const [storyTab, setStoryTab] = useState<'story' | 'chat' | 'lore'>('story');
  const [actionMode, setActionMode] = useState<'speak' | 'act' | 'aside'>('speak');
  const [actionDraft, setActionDraft] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingRoomSetup, setPendingRoomSetup] = useState(false);
  const [pendingLibrary, setPendingLibrary] = useState(false);
  const [pendingSettings, setPendingSettings] = useState(false);
  const [pendingLobby, setPendingLobby] = useState(false);
  const [pendingCharSheet, setPendingCharSheet] = useState(false);
  const [pendingCharVault, setPendingCharVault] = useState(false);
  const [pendingCharWizard, setPendingCharWizard] = useState(false);
  const [pendingDmDash, setPendingDmDash] = useState(false);
  const [pendingBestiary, setPendingBestiary] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  const [aiPanelBusy, setAiPanelBusy] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<AiConfirmAction | null>(null);
  const [pendingConfirmSourceMessage, setPendingConfirmSourceMessage] = useState<StoryMessage | null>(null);
  const [dismissedConfirmActionKeys, setDismissedConfirmActionKeys] = useState<Set<string>>(new Set());

  const { authSession, authLoading, user, signOut: authSignOut } = useAuthFlow();
  const {
    activeSession,
    setActiveSession,
    pendingSession,
    setPendingSession,
    roomModal,
    setRoomModal,
    characterStatus,
    setCharacterStatus,
    character,
    setCharacter,
    encounter,
    setEncounter,
    requestEnterSession,
    completeCharacterEntry,
    switchTable,
  } = useSessionFlow();

  const { persistCharacter, saveLocalCharacter } = useCharacterSync(
    activeSession,
    user,
    setCharacter,
    setCharacterStatus,
  );

  const { currentPhase, phaseBusy, changeGamePhase } = useGamePhase(
    activeSession,
    user,
    'setup',
    () => {},
    setActiveSession,
    setStoryMessages,
  );

  const partyChoiceState = useGameStore((state) => state.partyChoiceState);
  const dispatchGameEvent = useGameStore((state) => state.dispatch);
  const sceneState = useGameStore((state) => state.sceneState);
  const setSceneState = useGameStore((state) => state.setSceneState);

  // Initialize default sceneState when entering a session (GameSession has no sceneState field)
  useEffect(() => {
    if (!activeSession || sceneState) return;
    const now = Date.now();
    setSceneState({
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      mode: 'exploration',
      location: activeSession.title,
      description: '',
      flags: {
        dangerLevel: 'none',
        realityStability: 'stable',
        isLit: true,
        isSilent: false,
        hasEscape: true,
      },
      objectives: [],
      threatClocks: [],
      turnNumber: 0,
      createdAt: now,
      updatedAt: now,
    });
  }, [activeSession, sceneState, setSceneState]);

  usePartyChoiceSync(activeSession?.id ?? null);

  useEffect(() => {
    const latestWithActions = [...storyMessages]
      .reverse()
      .find((message) => Array.isArray(message.metadata?.confirmActions) && (message.metadata?.confirmActions as unknown[]).length > 0);

    if (!latestWithActions) {
      setPendingConfirmAction(null);
      setPendingConfirmSourceMessage(null);
      return;
    }

    const confirmActions = latestWithActions.metadata?.confirmActions as AiConfirmAction[];
    const nextAction = confirmActions.find((action) => !dismissedConfirmActionKeys.has(`${latestWithActions.id}:${action.id}`)) ?? null;

    setPendingConfirmAction(nextAction);
    setPendingConfirmSourceMessage(nextAction ? latestWithActions : null);
  }, [storyMessages, dismissedConfirmActionKeys]);

  // Explicit app-flow state machine: login -> menu -> room-setup -> character-setup -> game
  const appStage = computeAppStage({
    hasSupabaseConfig,
    user,
    activeSession,
    pendingSession,
    pendingRoomSetup,
    pendingLibrary,
    pendingSettings,
    pendingLobby,
    pendingCharSheet,
    pendingCharVault,
    pendingCharWizard,
    pendingDmDash,
    pendingBestiary,
  });
  const gateSteps = getGateSteps(appStage);

  const returnToMainMenu = useCallback(() => {
    setPendingRoomSetup(false);
    setPendingLibrary(false);
    setPendingSettings(false);
    setPendingLobby(false);
    setPendingCharSheet(false);
    setPendingCharVault(false);
    setPendingCharWizard(false);
    setPendingDmDash(false);
    setPendingBestiary(false);
    setPendingSession(null);
    setRoomModal(null);
  }, [setPendingSession, setRoomModal]);

  const completeCharacterEntryToLobby = useCallback(
    (session: GameSession, sessionCharacter: Character) => {
      setCharacter(sessionCharacter);
      setCharacterStatus('Character attached to this table');
      setEncounter(session.combatState);
      setPendingSession(session);
      setPendingCharWizard(false);
      setPendingLobby(true);
    },
    [setCharacter, setCharacterStatus, setEncounter, setPendingSession],
  );

  const navigateTo = useCallback(
    (target: 'menu' | 'game' | 'char-sheet' | 'char-vault' | 'char-wizard' | 'dm-dashboard' | 'bestiary' | 'library' | 'settings') => {
      setPendingRoomSetup(false);
      setPendingLibrary(false);
      setPendingSettings(false);
      setPendingLobby(false);
      setPendingCharSheet(false);
      setPendingCharVault(false);
      setPendingCharWizard(false);
      setPendingDmDash(false);
      setPendingBestiary(false);
      setPendingSession(null);
      setRoomModal(null);
      switch (target) {
        case 'char-sheet':
          setPendingCharSheet(true);
          break;
        case 'char-vault':
          setPendingCharVault(true);
          break;
        case 'char-wizard':
          setPendingCharWizard(true);
          break;
        case 'dm-dashboard':
          setPendingDmDash(true);
          break;
        case 'bestiary':
          setPendingBestiary(true);
          break;
        case 'library':
          setPendingLibrary(true);
          break;
        case 'settings':
          setPendingSettings(true);
          break;
        case 'menu':
        case 'game':
        default:
          break;
      }
    },
    [setPendingSession, setRoomModal],
  );

  const openCharacterSheet = useCallback(() => {
    setPendingRoomSetup(false);
    setPendingLibrary(false);
    setPendingSettings(false);
    setPendingLobby(false);
    setPendingCharVault(false);
    setPendingCharWizard(false);
    setPendingDmDash(false);
    setPendingBestiary(false);
    setPendingCharSheet(true);
    setRoomModal(null);
  }, [setRoomModal]);

  const returnFromCharacterSheet = useCallback(() => {
    setPendingCharSheet(false);
    if (!pendingSession) {
      setPendingCharVault(true);
    }
  }, [pendingSession]);

  // Guard: clear pendingSession and pending gate states when user logs out
  useEffect(() => {
    if (!user) {
      if (pendingSession) setPendingSession(null);
      if (pendingRoomSetup) setPendingRoomSetup(false);
      if (pendingLibrary) setPendingLibrary(false);
      if (pendingSettings) setPendingSettings(false);
      if (pendingLobby) setPendingLobby(false);
      if (pendingCharSheet) setPendingCharSheet(false);
      if (pendingCharVault) setPendingCharVault(false);
      if (pendingCharWizard) setPendingCharWizard(false);
      if (pendingDmDash) setPendingDmDash(false);
      if (pendingBestiary) setPendingBestiary(false);
    }
  }, [user, pendingSession, pendingRoomSetup, pendingLibrary, pendingSettings, pendingLobby, pendingCharSheet, pendingCharVault, pendingCharWizard, pendingDmDash, pendingBestiary]);

  const { openingSceneBusy, hasOpeningScene, askAiToOpenScene, askAiForRestSummary } = useAiDm(
    activeSession,
    character,
    encounter,
    user,
    storyMessages,
    setStoryMessages,
  );

  const phaseDefinition = getGamePhaseDefinition(currentPhase);
  const playModeDefinition = getPlayModeDefinition(activeSession?.playMode);
  const themeDefinition = getSessionThemeDefinition(activeSession?.theme.key ?? 'dark_fantasy');
  const isHexploreMode = activeSession?.playMode === 'hexplore';

  const postDiceRoll = useCallback(
    async (roll: DiceRoll) => {
      const mode = roll.mode === 'normal' ? '' : ` with ${roll.mode}`;
      const rollDetails = roll.keptRoll ? `kept ${roll.keptRoll} from ${roll.rolls.join(', ')}` : roll.rolls.join(', ');
      const body = `${character.name} rolled ${roll.label}${mode}: ${roll.notation} = ${roll.total} (${rollDetails}${
        roll.modifier ? `, modifier ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}` : ''
      })`;
      const metadata = {
        kind: 'dice_roll',
        roll,
        character: {
          id: character.id,
          name: character.name,
        },
      };

      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Dice',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const { sendSessionMessage } = await import('./lib/messages');
        const message = await sendSessionMessage(activeSession.id, 'system', 'Dice', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));

        if (roll.type === 'initiative' && encounter?.combatants.length && activeSession.playMode === 'dnd') {
          const combatantId = `pc-${character.id}`;
          const nextEncounter = {
            ...encounter,
            combatants: encounter.combatants.map((combatant) =>
              combatant.id === combatantId ? { ...combatant, initiative: roll.total } : combatant,
            ),
          };
          setEncounter(nextEncounter);
          const updatedSession = await updateSessionCombatState(activeSession.id, nextEncounter);
          setActiveSession(updatedSession);
          setEncounter(updatedSession.combatState);
        }
      } catch (error) {
        const body = error instanceof Error ? error.message : 'Could not post dice roll.';
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body,
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, character, encounter, user],
  );

  const postCombatEvent = useCallback(
    async (body: string, metadata: Record<string, unknown>) => {
      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Combat',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const { sendSessionMessage } = await import('./lib/messages');
        const message = await sendSessionMessage(activeSession.id, 'system', 'Combat', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not post combat event.',
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, user],
  );

  const handleShortRest = useCallback(
    async (hitDiceSpent: number) => {
      const result = dispatchGameEvent({
        id: crypto.randomUUID(),
        type: 'SHORT_REST',
        sessionId: activeSession?.id ?? 'local-session',
        actorId: character.id,
        targetId: character.id,
        createdAt: new Date().toISOString(),
        source: 'user',
        characterId: character.id,
        hitDiceSpent,
      });
      if (result.failed.length || !result.character) {
        throw new Error(result.failed[0] ?? 'Short rest failed.');
      }
      const updatedCharacter = result.character;
      if (hasSupabaseConfig && activeSession && user) {
        await persistCharacter(updatedCharacter);
      } else {
        await saveLocalCharacter(updatedCharacter);
      }

      await postCombatEvent(
        `${character.name} takes a short rest and spends ${hitDiceSpent} hit dice.`,
        {
          kind: 'rest_event',
          restType: 'short',
          hitDiceSpent,
        },
      );
    },
    [activeSession, character, dispatchGameEvent, persistCharacter, postCombatEvent, saveLocalCharacter, user],
  );

  const handleLongRest = useCallback(async () => {
    const result = dispatchGameEvent({
      id: crypto.randomUUID(),
      type: 'LONG_REST',
      sessionId: activeSession?.id ?? 'local-session',
      actorId: character.id,
      targetId: character.id,
      createdAt: new Date().toISOString(),
      source: 'user',
      characterId: character.id,
    });
    if (result.failed.length || !result.character) {
      throw new Error(result.failed[0] ?? 'Long rest failed.');
    }
    const updatedCharacter = result.character;
    if (hasSupabaseConfig && activeSession && user) {
      await persistCharacter(updatedCharacter);
    } else {
      await saveLocalCharacter(updatedCharacter);
    }

    await postCombatEvent(`${character.name} takes a long rest and recovers fully.`, {
      kind: 'rest_event',
      restType: 'long',
    });
  }, [activeSession, character, dispatchGameEvent, persistCharacter, postCombatEvent, saveLocalCharacter, user]);

  const startAdventure = useCallback(
    async (premise: string) => {
      if (phaseBusy || openingSceneBusy) return;

      if (!hasOpeningScene) {
        const opened = await askAiToOpenScene(premise);
        if (!opened) return;
      }

      await changeGamePhase('exploration');
    },
    [askAiToOpenScene, changeGamePhase, hasOpeningScene, openingSceneBusy, phaseBusy],
  );

  const changeEncounter = useCallback(
    async (nextEncounter: EncounterState | null) => {
      setEncounter(nextEncounter);

      if (!activeSession || !user || !supabase || activeSession.playMode !== 'dnd') return;

      try {
        const updatedSession = await updateSessionCombatState(activeSession.id, nextEncounter);
        setActiveSession(updatedSession);
        setEncounter(updatedSession.combatState);
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not sync combat state.',
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, user],
  );

  const applyAiConfirmAction = useCallback(
    async (action: AiConfirmAction, sourceMessage: StoryMessage) => {
      if (action.type === 'phase_change') {
        if (!action.phase) throw new Error('AI action is missing a target phase.');
        await changeGamePhase(action.phase);
        return;
      }

      if (action.type === 'start_combat') {
        const nextEncounter: EncounterState = {
          id: crypto.randomUUID(),
          name: action.encounterName || action.label || 'AI Suggested Encounter',
          round: 1,
          activeIndex: 0,
          isActive: true,
          combatants: [
            {
              id: `pc-${character.id}`,
              name: character.name,
              type: 'player',
              armorClass: character.armorClass,
              hitPoints: character.hitPoints,
              maxHitPoints: character.maxHitPoints,
              tempHitPoints: 0,
              initiative: 0,
              conditions: [],
              deathSaves: { successes: 0, failures: 0 },
            },
          ],
        };
        await changeEncounter(nextEncounter);
        if (currentPhase !== 'combat') {
          await changeGamePhase('combat');
        }
        await postCombatEvent(`Encounter started: ${nextEncounter.name}.`, {
          kind: 'combat_event',
          action: action.type,
          aiAction: action,
          sourceMessageId: sourceMessage.id,
        });
        return;
      }

      if (!encounter) {
        throw new Error('Start an encounter before applying combat actions.');
      }

      let eventText = action.label;
      let nextEncounter = encounter;

      if (action.type === 'next_turn' || action.type === 'previous_turn') {
        const direction = action.type === 'next_turn' ? 1 : -1;
        const nextIndex = encounter.activeIndex + direction;
        const wrappedForward = nextIndex >= encounter.combatants.length;
        const wrappedBackward = nextIndex < 0;
        const activeIndex = wrappedForward
          ? 0
          : wrappedBackward
            ? encounter.combatants.length - 1
            : nextIndex;
        const round = wrappedForward ? encounter.round + 1 : wrappedBackward ? Math.max(1, encounter.round - 1) : encounter.round;
        const activeCombatant = encounter.combatants[activeIndex];
        nextEncounter = { ...encounter, activeIndex, round };
        eventText = `Turn started: ${activeCombatant.name} (Round ${round})`;
      } else {
        const target = findCombatant(encounter.combatants, action);
        if (!target) {
          throw new Error('Could not match the AI action to a combatant.');
        }

        const toGameEvent = (): GameEvent | null => {
          const base = {
            id: crypto.randomUUID(),
            sessionId: activeSession?.id ?? 'local-session',
            actorId: action.targetId ?? character.id,
            targetId: target.id,
            createdAt: new Date().toISOString(),
            source: 'ai' as const,
          };

          if (action.type === 'damage') {
            return {
              ...base,
              type: 'apply_damage',
              amount: Math.max(0, action.amount ?? 0),
            };
          }

          if (action.type === 'healing') {
            return {
              ...base,
              type: 'recover_hp',
              amount: Math.max(0, action.amount ?? 0),
              recoveryKind: 'healing',
            };
          }

          if (action.type === 'add_condition' && action.condition) {
            return {
              ...base,
              type: 'apply_condition',
              condition: action.condition,
            };
          }

          if (action.type === 'remove_condition' && action.condition) {
            return {
              ...base,
              type: 'remove_condition',
              condition: action.condition,
            };
          }

          return null;
        };

        const nextEvent = toGameEvent();
        if (!nextEvent) {
          throw new Error('Unsupported AI combat event.');
        }

        const result = dispatchGameEvent(nextEvent);
        if (result.failed.length > 0) {
          throw new Error(result.failed[0]);
        }
        nextEncounter = useGameStore.getState().combatState ?? encounter;
        const processedCombatant = nextEncounter.combatants.find((combatant) => combatant.id === target.id) ?? target;

        if (action.type === 'damage') {
          eventText = `${target.name} took ${Math.max(0, action.amount ?? 0)} damage. HP ${processedCombatant.hitPoints}/${processedCombatant.maxHitPoints}.`;
        } else if (action.type === 'healing') {
          eventText = `${target.name} healed ${Math.max(0, action.amount ?? 0)}. HP ${processedCombatant.hitPoints}/${processedCombatant.maxHitPoints}.`;
        } else if (action.type === 'add_condition' && action.condition) {
          eventText = `${action.condition} added to ${target.name}.`;
        } else if (action.type === 'remove_condition' && action.condition) {
          eventText = `${action.condition} removed from ${target.name}.`;
        }
      }

      await changeEncounter(nextEncounter);
      await postCombatEvent(eventText, {
        kind: 'combat_event',
        action: action.type,
        aiAction: action,
        sourceMessageId: sourceMessage.id,
      });
    },
    [changeEncounter, changeGamePhase, character, currentPhase, encounter, postCombatEvent],
  );

  const handleAiPanelAction = useCallback(
    async (label: string, prompt: string) => {
      if (!activeSession || !user || !supabase) {
        throw new Error('AI Warden needs an active synced session.');
      }

      setAiPanelBusy(true);
      try {
        const author = user.email?.split('@')[0] || character.name;
        const playerMessage = await sendSessionMessage(activeSession.id, 'player', author, prompt, {
          kind: 'ai_panel_action',
          label,
        });
        setStoryMessages((current) => addUniqueMessage(current, playerMessage));

        const aiMessage = await requestAiDmReply(activeSession.id, character.name, prompt, [...storyMessages, playerMessage], {
          session: activeSession,
          gamePhase: currentPhase,
          character,
          encounter,
          aiMode: 'adventure',
          partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
        });
        setStoryMessages((current) => addUniqueMessage(current, aiMessage));
      } finally {
        setAiPanelBusy(false);
      }
    },
    [activeSession, character, currentPhase, encounter, storyMessages, user],
  );

  const handleAiPanelConfirmAction = useCallback(
    async (action: AiConfirmAction) => {
      if (!pendingConfirmSourceMessage) {
        throw new Error('No source message available for this AI action.');
      }
      await applyAiConfirmAction(action, pendingConfirmSourceMessage);
      setDismissedConfirmActionKeys((current) => new Set(current).add(`${pendingConfirmSourceMessage.id}:${action.id}`));
      setPendingConfirmAction(null);
      setPendingConfirmSourceMessage(null);
    },
    [applyAiConfirmAction, pendingConfirmSourceMessage],
  );

  const handleAiPanelRejectAction = useCallback(() => {
    if (pendingConfirmAction && pendingConfirmSourceMessage) {
      setDismissedConfirmActionKeys((current) => new Set(current).add(`${pendingConfirmSourceMessage.id}:${pendingConfirmAction.id}`));
    }
    setPendingConfirmAction(null);
    setPendingConfirmSourceMessage(null);
  }, [pendingConfirmAction, pendingConfirmSourceMessage]);

  function handleSwitchTable() {
    setPendingRoomSetup(false);
    switchTable();
  }

  async function signOut() {
    await authSignOut();
    handleSwitchTable();
    setPendingRoomSetup(false);
    setPendingSettings(false);
  }

  if (appStage === 'login' || !user) {
    return (
      <main className="fw-login-wrap">
        <AuthPanel loading={authLoading} user={user} />
      </main>
    );
  }

  if (isGateStage(appStage)) {
    const screen = (() => {
      if (appStage === 'menu') {
        return (
          <MainMenu
            user={user}
            roomModal={roomModal}
            onRoomModalChange={setRoomModal}
            onRequestEnterSession={(session) => requestEnterSession(session, user)}
            onRequestLibrary={() => {
              setPendingRoomSetup(false);
              setPendingSession(null);
              setPendingSettings(false);
              setPendingLibrary(true);
            }}
            onRequestSettings={() => {
              setPendingRoomSetup(false);
              setPendingSession(null);
              setPendingLibrary(false);
              setPendingSettings(true);
            }}
            onRequestRoomSetup={() => {
              setPendingLibrary(false);
              setPendingSettings(false);
              setPendingSession(null);
              setRoomModal(null);
              setPendingRoomSetup(true);
            }}
            onRequestLobby={() => {
              returnToMainMenu();
              setPendingLobby(true);
            }}
            onRequestCharSheet={() => {
              returnToMainMenu();
              setPendingCharVault(true);
            }}
            onRequestDmDash={() => {
              returnToMainMenu();
              setPendingDmDash(true);
            }}
            onRequestBestiary={() => {
              returnToMainMenu();
              setPendingBestiary(true);
            }}
            onSignOut={signOut}
          />
        );
      }

      if (appStage === 'library') {
        return (
          <CampaignLibrary
            user={user}
            onBack={returnToMainMenu}
            onEnterSession={(session) => requestEnterSession(session, user)}
          />
        );
      }

      if (appStage === 'settings') {
        return <SettingsPage user={user} onBack={returnToMainMenu} onSignOut={signOut} />;
      }

      if (appStage === 'room-setup') {
        return (
          <RoomSetupPage
            user={user}
            onCreated={(session) => {
              setPendingRoomSetup(false);
              requestEnterSession(session, user);
            }}
            onCancel={returnToMainMenu}
          />
        );
      }

      if (appStage === 'lobby') {
        return (
          <LobbyScreen
            user={user}
            onBack={() => {
              setPendingLobby(false);
            }}
            onEnterGame={() => {
              if (pendingSession) {
                completeCharacterEntry(pendingSession, character);
              }
            }}
          />
        );
      }

      if (appStage === 'char-sheet') {
        return <CharacterSheetPage user={user} onBack={returnFromCharacterSheet} />;
      }

      if (appStage === 'dm-dashboard') {
        return <DMDashboard user={user} onBack={returnToMainMenu} />;
      }

      if (appStage === 'bestiary') {
        return <BestiaryScreen onBack={returnToMainMenu} />;
      }

      if (appStage === 'char-vault') {
        return (
          <CharacterVaultScreen
            user={user}
            onBack={returnToMainMenu}
            onOpenWizard={() => navigateTo('char-wizard')}
            onOpenSheet={openCharacterSheet}
          />
        );
      }

      if (appStage === 'char-wizard') {
        return (
          <CharacterWizardScreen
            user={user}
            session={pendingSession}
            onBack={() => {
              if (pendingSession) {
                setPendingCharWizard(false);
              } else {
                navigateTo('char-vault');
              }
            }}
            onSaved={() => {
              setPendingCharWizard(false);
              setPendingCharVault(true);
            }}
            onBound={(session, sessionCharacter) => {
              completeCharacterEntryToLobby(session, sessionCharacter);
            }}
          />
        );
      }

      if (appStage === 'character-setup' && pendingSession) {
        return (
          <CharacterVaultScreen
            user={user}
            onBack={returnToMainMenu}
            onOpenWizard={() => setPendingCharWizard(true)}
            onOpenSheet={openCharacterSheet}
            session={pendingSession}
            onBound={(session, sessionCharacter) => {
              completeCharacterEntryToLobby(session, sessionCharacter);
            }}
          />
        );
      }

      return (
        <section className="fw-page">
          <article className="fw-card">
            <div className="fw-card-body">
              <p className="fw-eyebrow">Signed in</p>
              <strong>{user?.email ?? 'Warden'}</strong>
              <p className="fw-dim">Select a table to continue</p>
            </div>
          </article>
        </section>
      );
    })();

    return (
      <>
        <div className="fw-bg-atmos" />
        <div className="fw-bg-noise" />
        <div className="fw-app">
          <AppRail
            activeStage={appStage}
            hasActiveSession={Boolean(activeSession)}
            user={user}
            onNavigate={navigateTo}
            onSignOut={signOut}
          />
          <section className="fw-main">
            <Topbar
              stage={appStage}
              user={user}
              onRequestSettings={() => navigateTo('settings')}
              onSignOut={() => void signOut()}
            />
            {screen}
          </section>
        </div>
      </>
    );
  }

  const isSessionHost = Boolean(activeSession?.createdBy && user?.id && activeSession.createdBy === user.id);
  const activeObjectives = (sceneState?.objectives ?? []).filter((objective) => objective.status === 'active');
  const unresolvedObjectives = (sceneState?.objectives ?? []).filter((objective) => objective.status !== 'completed');
  const threatClocks = sceneState?.threatClocks ?? [];

  return (
    <>
      <div className="fw-bg-atmos" />
      <div className="fw-bg-noise" />
      <div className="fw-app">
        <AppRail
          activeStage={appStage}
          hasActiveSession={Boolean(activeSession)}
          user={user}
          onNavigate={navigateTo}
          onSignOut={signOut}
        />
        <section className="fw-main">
          <main className={`fw-game-table ${combatActive ? 'is-combat' : ''}`}>
            <header className="fw-game-banner">
              <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={handleSwitchTable} type="button">
                {Icon('chevL', { size: 11 })} Leave table
              </button>
              <div className="fw-game-banner-title">
                <span className="fw-pill blood">
                  <span className="fw-live-dot" />
                  {combatActive ? 'Combat · Round 3' : 'Live · Session 15'}
                </span>
                <span className="fw-display">The Hollow Crown of Ysavir</span>
                <span className="fw-serif" style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 13 }}>
                  · Act III — The Gilded Tomb
                </span>
              </div>
              <span style={{ flex: 1 }} />
              <button
                className={`fw-btn ${combatActive ? 'fw-btn-blood' : 'fw-btn-ghost'} fw-btn-sm fw-game-encounter-toggle`}
                onClick={() => setCombatActive((current) => !current)}
                type="button"
              >
                {Icon(combatActive ? 'scroll' : 'sword', { size: 12 })}
                {combatActive ? 'Resume story' : 'Run encounter'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[character.name || 'You', 'DM', playModeDefinition.shortLabel, phaseDefinition.label].map((label, index) => (
                  <span
                    className={`fw-avatar sm ${index === 1 ? 'dm' : ''}`}
                    key={label}
                    style={{ marginLeft: index ? -8 : 0 }}
                    title={label}
                  >
                    {label.slice(0, 2).toUpperCase()}
                    <span className="dot" style={{ background: index === 1 ? 'var(--gold)' : 'var(--success)' }} />
                  </span>
                ))}
              </div>
              <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" title="Microphone">
                {Icon('mic', { size: 14 })}
              </button>
              <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" title="Table audio">
                {Icon('volume', { size: 14 })}
              </button>
              <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" title="More table options">
                {Icon('kebab', { size: 14 })}
              </button>
            </header>

            <section className="fw-game-layout">
              <aside className="fw-game-side left">
                <div className="fw-tabs" role="tablist" aria-label="Left table panels">
                  {[
                    { id: 'party', label: 'Party', icon: 'users' },
                    { id: 'character', label: 'You', icon: 'user' },
                    { id: 'inventory', label: 'Inventory', icon: 'bag' },
                    { id: 'quests', label: 'Quests', icon: 'scroll' },
                  ].map((tab) => (
                    <button
                      className={`fw-tab ${leftSidebarTab === tab.id ? 'active' : ''}`}
                      key={tab.id}
                      onClick={() => setLeftSidebarTab(tab.id as LeftSidebarTab)}
                      role="tab"
                      style={{ flex: 1 }}
                      type="button"
                    >
                      {Icon(tab.icon, { size: 11 })}{tab.label}
                    </button>
                  ))}
                </div>

                <div className="fw-game-scroll">
                  <PrototypeLeftPanel character={character} tab={leftSidebarTab} />
                </div>
              </aside>

              <section className="fw-game-center">
                {combatActive ? (
                  <div className="fw-game-combat-pane">
                    <CombatMode
                      activeCharacterId={character.id}
                      encounter={encounter}
                      onDispatchCombatEvent={async (event) => {
                        const result = dispatchGameEvent(event);
                        if (result.failed.length) throw new Error(result.failed.join(', '));
                        await changeEncounter(useGameStore.getState().combatState);
                      }}
                      onExit={() => setCombatActive(false)}
                    />
                  </div>
                ) : (
                  <>
                <header className="fw-scene-head">
                  <div className="fw-scene-card">
                    <div className="fw-scene-thumb">
                      <svg width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
                        <g fill="none" stroke="rgba(214,168,79,0.25)" strokeWidth="0.6">
                          <path d="M0 88 L40 82 L70 76 L100 80 L140 70 L180 78 L200 75 V110 H0 Z" fill="rgba(0,0,0,0.4)" />
                          <path d="M0 70 L30 62 L60 66 L90 55 L130 64 L170 58 L200 60 V70" />
                          <circle cx="100" cy="40" r="14" fill="rgba(214,168,79,0.5)" stroke="rgba(214,168,79,0.6)" />
                          <circle cx="100" cy="40" r="22" stroke="rgba(214,168,79,0.3)" strokeDasharray="2 2" />
                        </g>
                      </svg>
                      <span>SCENE - 0</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Scene</div>
                      <div className="fw-display" style={{ color: 'var(--text)', fontSize: 22, letterSpacing: '0.04em' }}>
                        {activeSession?.title || sceneState?.location || 'Gun'}
                      </div>
                      <p className="fw-serif" style={{ color: 'var(--text-2)', fontSize: 14, fontStyle: 'italic', lineHeight: 1.55, marginTop: 6 }}>
                        Describe your first action to let the DM establish the scene.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <span className="fw-pill dim">Setup</span>
                        <span className="fw-pill dim">0 objectives</span>
                        <span className="fw-pill">{Icon('sparkles', { size: 10 })} 0 clocks</span>
                        <span className="fw-pill blood">Combat possible</span>
                      </div>
                    </div>
                  </div>
                </header>

                <div className="fw-tabs" style={{ paddingInline: 18, marginTop: 4 }}>
                  {[
                    { id: 'story', label: 'Story Log', icon: 'scroll' },
                    { id: 'chat', label: 'Table Chat', icon: 'users' },
                    { id: 'lore', label: 'Lore', icon: 'book' },
                  ].map((tab) => (
                    <button className={`fw-tab ${storyTab === tab.id ? 'active' : ''}`} key={tab.id} onClick={() => setStoryTab(tab.id as typeof storyTab)} type="button">
                      {Icon(tab.icon, { size: 11 })}{tab.label}
                    </button>
                  ))}
                  <span style={{ flex: 1 }} />
                  <span className="fw-mono" style={{ alignSelf: 'center', color: 'var(--text-3)', fontSize: 11 }}>
                    Session 15 · 1h 24m
                  </span>
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" type="button" title="Search log">
                    {Icon('search', { size: 12 })}
                  </button>
                </div>

                <div className="fw-game-scroll">
                  {storyTab === 'story' ? (
                    <PrototypeStoryFeed characterName={character.name || activeSession?.title || 'Gun'} sessionTitle={activeSession?.title} />
                  ) : null}
                  {storyTab === 'chat' ? (
                    <div className="fw-story-empty fw-story-empty-grid">
                      <div>
                        <div className="fw-eyebrow">Table Chat</div>
                        <p className="fw-serif">Party whispers, table calls, and private notes will live here when the new chat system is wired.</p>
                      </div>
                      <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Visual only</button>
                    </div>
                  ) : null}
                  {storyTab === 'lore' ? (
                    <div className="fw-story-empty fw-story-empty-grid">
                      <div>
                        <div className="fw-eyebrow">Lore</div>
                        <p className="fw-serif">{activeSession?.theme.notes || 'Session facts, discovered names, and table canon appear here as the campaign grows.'}</p>
                      </div>
                      <span className="fw-pill dim">Codex pending</span>
                    </div>
                  ) : null}
                </div>

                <div className="fw-action-input">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span className="fw-eyebrow" style={{ alignSelf: 'center', color: 'var(--arcane-bright)', marginRight: 4 }}>
                      {Icon('sparkles', { size: 10 })} Suggested
                    </span>
                    {['Ask what the smoke remembers', 'Move toward the altar', 'Ready a reaction'].map((suggestion) => (
                      <button className="fw-btn fw-btn-ghost fw-btn-sm" key={suggestion} onClick={() => setActionDraft(suggestion)} type="button">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div className="fw-action-box">
                      <div className="fw-action-modes" role="tablist" aria-label="Action mode">
                        {[
                          { id: 'speak', label: 'Speak', icon: 'users' },
                          { id: 'act', label: 'Act', icon: 'sword' },
                          { id: 'aside', label: 'Aside (DM only)', icon: 'eye' },
                        ].map((mode) => (
                          <button
                            className={`fw-btn fw-btn-ghost fw-btn-sm ${actionMode === mode.id ? 'active' : ''}`}
                            key={mode.id}
                            onClick={() => setActionMode(mode.id as typeof actionMode)}
                            type="button"
                          >
                            {Icon(mode.icon, { size: 10 })}{mode.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        onChange={(event) => setActionDraft(event.target.value)}
                        placeholder={
                          actionMode === 'speak'
                            ? 'Speak in character to the table...'
                            : actionMode === 'act'
                              ? 'Describe your action. The Warden will request rolls.'
                              : 'Whisper to the DM only...'
                        }
                        value={actionDraft}
                      />
                    </div>
                    <div className="fw-action-side-tools">
                      <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" title="Roll dice">{Icon('dice', { size: 14 })}</button>
                      <button className="fw-btn fw-btn-icon fw-btn-ghost" type="button" title="Ask AI Warden">{Icon('sparkles', { size: 14 })}</button>
                    </div>
                    <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={!actionDraft.trim()} type="button" onClick={() => setActionDraft('')}>
                      {Icon('send', { size: 13 })} Commit
                    </button>
                  </div>
                </div>
                  </>
                )}
              </section>

              <aside className="fw-game-side right">
                <div className="fw-tabs" role="tablist" aria-label="Right table panels">
                  {[
                    { id: 'dice', label: 'Dice', icon: 'dice' },
                    { id: 'combat', label: 'Combat', icon: 'sword' },
                    { id: 'ai', label: 'AI Warden', icon: 'wand' },
                    { id: 'tools', label: 'Tools', icon: 'cog' },
                  ].map((tab) => (
                    <button
                      className={`fw-tab ${rightSidebarTab === tab.id ? 'active' : ''}`}
                      key={tab.id}
                      onClick={() => setRightSidebarTab(tab.id as RightSidebarTab)}
                      role="tab"
                      style={{ flex: 1, fontSize: 10 }}
                      type="button"
                    >
                      {Icon(tab.icon, { size: 11 })}{tab.label}
                    </button>
                  ))}
                </div>

                <div className="fw-game-scroll">
                  <PrototypeRightPanel onOpenCombat={() => setCombatActive(true)} tab={rightSidebarTab} />
                </div>
              </aside>
            </section>

          </main>
        </section>
      </div>

      {activeSession && user && partyChoiceState.activeChoice ? (
        <PartyChoicePanel
          currentCharacterName={character.name}
          currentPlayerId={user.id}
          isHost={isSessionHost}
          sessionId={activeSession.id}
        />
      ) : null}
    </>
  );
}

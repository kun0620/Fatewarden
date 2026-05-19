import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { CharacterEntryModal } from './components/CharacterEntryModal';
import { MainMenu } from './components/MainMenu';
import { CampaignLibrary } from './components/CampaignLibrary';
import { SettingsPage } from './components/SettingsPage';
import { RoomSetupPage } from './components/RoomSetupPage';
import { LobbyScreen } from './components/LobbyScreen';
import { CharacterSheetPage } from './components/CharacterSheetPage';
import { DMDashboard } from './components/DMDashboard';
import { BestiaryScreen } from './components/BestiaryScreen';
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

type CockpitMode = 'dm' | 'player';
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
      <div className="fw-proto-panel">
        <div className="fw-proto-hero-id">
          <div className="fw-avatar lg dm">{storyInitials(character.name || 'Aedric Vael')}</div>
          <div>
            <div className="fw-display">{character.name || 'Aedric Vael'}</div>
            <p>{character.ancestry || 'Tiefling'} {character.className || 'Warlock'} - Lv {character.level || 7}</p>
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
          ['Pact Slots', 1, 2],
          ['Hit Dice', 5, 7],
          ['Inspiration', 1, 1],
        ].map(([label, current, max]) => (
          <div className="fw-proto-resource" key={String(label)}>
            <div><span>{label}</span><b>{current}/{max}</b></div>
            <div>{Array.from({ length: Number(max) }).map((_, index) => <i className={index < Number(current) ? 'on' : ''} key={index} />)}</div>
          </div>
        ))}
        <div className="fw-proto-section-title">Pact Magic</div>
        {['Eldritch Blast', 'Hex', 'Armor of Agathys', 'Misty Step'].map((spell, index) => (
          <div className="fw-proto-list-row" key={spell}>
            <span>{Icon(index < 2 ? 'flame' : 'sparkles', { size: 13 })}</span>
            <div><strong>{spell}</strong><small>{index < 2 ? 'Ready' : 'Prepared'}</small></div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'inventory') {
    return (
      <div className="fw-proto-panel">
        <div className="fw-proto-panel-head">
          <span>Arsenal & Pack</span>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Sort</button>
        </div>
        <div className="fw-proto-slot-row">
          {['Weapon', 'Armor', 'Focus', 'Quick'].map((slot) => <span key={slot}>{slot}</span>)}
        </div>
        {prototypeInventory.map((item) => (
          <div className="fw-proto-list-row item" key={item.name}>
            <span>{Icon(item.icon, { size: 14 })}</span>
            <div><strong>{item.name}</strong><small>{item.meta}</small></div>
            <em>{item.tag}</em>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'quests') {
    return (
      <div className="fw-proto-panel">
        <div className="fw-proto-panel-head">
          <span>Objectives</span>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Pin</button>
        </div>
        {prototypeQuests.map((quest) => (
          <div className={`fw-proto-quest ${quest.state}`} key={quest.title}>
            <strong>{quest.title}</strong>
            <span>{quest.meta}</span>
          </div>
        ))}
        <div className="fw-proto-scene-note">
          <span>{Icon('map', { size: 14 })}</span>
          <p>The chapel is dim, ash-thick, and listening.</p>
        </div>
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
    return (
      <div className="fw-proto-panel">
        <div className="fw-proto-panel-head">
          <span>Encounter</span>
          <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={onOpenCombat} type="button">Battle map</button>
        </div>
        {['Brass-Spear A', 'Brass-Spear B', 'Censer-Priest'].map((enemy, index) => (
          <div className="fw-proto-list-row combat" key={enemy}>
            <span>{Icon(index === 2 ? 'skull' : 'sword', { size: 14 })}</span>
            <div><strong>{enemy}</strong><small>AC {index === 2 ? 15 : 14} - hostile</small></div>
            <em>{index === 2 ? '22 HP' : '16 HP'}</em>
          </div>
        ))}
        <div className="fw-roll-request compact">
          <div><strong>Next turn</strong><span>Kessra Ironwake has initiative.</span></div>
        </div>
      </div>
    );
  }

  if (tab === 'ai') {
    return (
      <div className="fw-proto-panel">
        <div className="fw-proto-panel-head">
          <span>AI Warden</span>
          <span className="fw-pill gold">On</span>
        </div>
        <div className="fw-proto-control-grid">
          <button className="active" type="button">Balanced</button>
          <button type="button">Strict</button>
          <button type="button">Cinematic</button>
        </div>
        {[
          ['Scene beat', 'Escalate the failing binding.'],
          ['Rules check', 'Ask for Persuasion DC 15.'],
          ['Complication', 'Smoke begins counting backwards.'],
        ].map(([title, body]) => (
          <div className="fw-proto-ai-card" key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
            <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">Queue</button>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'tools' || tab === 'rules') {
    return (
      <div className="fw-proto-panel">
        <div className="fw-proto-panel-head">
          <span>Tools</span>
          <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button">More</button>
        </div>
        {[
          ['Session recap', 'Summarize the last scene'],
          ['Share invite', 'Copy current table code'],
          ['Safety tools', 'Pause, veil, rewind'],
          ['Rules lens', 'Core checks and conditions'],
        ].map(([title, meta]) => (
          <div className="fw-proto-list-row" key={title}>
            <span>{Icon('cog', { size: 13 })}</span>
            <div><strong>{title}</strong><small>{meta}</small></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fw-proto-panel dice">
      <div className="fw-proto-dice-card">
        <span>Last roll - 1d20+3</span>
        <strong>17</strong>
        <em>+3</em>
        <small>20 vs DC 15 - Success</small>
      </div>
      <div className="fw-proto-section-title">Quick Dice</div>
      <div className="fw-proto-dice-grid">
        {['D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100'].map((die) => (
          <button className={die === 'D20' ? 'active' : ''} key={die} type="button">
            <strong>{die}</strong>
            <span>{die === 'D20' ? '1-20' : die === 'D100' ? '1-100' : '1-' + die.slice(1)}</span>
          </button>
        ))}
      </div>
      <div className="fw-proto-section-title">Saved Rolls</div>
      {['Eldritch Blast', 'Hex Damage', 'Persuasion (CHA)', 'Death Save'].map((roll) => (
        <div className="fw-proto-saved-roll" key={roll}>
          <span>{Icon('dice', { size: 11 })}</span>
          <strong>{roll}</strong>
          <em>{roll === 'Hex Damage' ? '1d6' : '1d20'}</em>
        </div>
      ))}
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
  const [cockpitMode, setCockpitMode] = useState<CockpitMode>('dm');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('quest');
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>('party');
  const [rightSidebarTab, setRightSidebarTab] = useState<RightSidebarTab>('dice');
  const [storyTab, setStoryTab] = useState<'story' | 'chat' | 'lore'>('story');
  const [actionDraft, setActionDraft] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingRoomSetup, setPendingRoomSetup] = useState(false);
  const [pendingLibrary, setPendingLibrary] = useState(false);
  const [pendingSettings, setPendingSettings] = useState(false);
  const [pendingLobby, setPendingLobby] = useState(false);
  const [pendingCharSheet, setPendingCharSheet] = useState(false);
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
    setPendingDmDash(false);
    setPendingBestiary(false);
    setPendingSession(null);
    setRoomModal(null);
  }, [setPendingSession, setRoomModal]);

  const navigateTo = useCallback(
    (target: 'menu' | 'game' | 'char-sheet' | 'dm-dashboard' | 'bestiary' | 'library' | 'settings') => {
      setPendingRoomSetup(false);
      setPendingLibrary(false);
      setPendingSettings(false);
      setPendingLobby(false);
      setPendingCharSheet(false);
      setPendingDmDash(false);
      setPendingBestiary(false);
      setPendingSession(null);
      setRoomModal(null);
      switch (target) {
        case 'char-sheet':
          setPendingCharSheet(true);
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

  // Guard: clear pendingSession and pending gate states when user logs out
  useEffect(() => {
    if (!user) {
      if (pendingSession) setPendingSession(null);
      if (pendingRoomSetup) setPendingRoomSetup(false);
      if (pendingLibrary) setPendingLibrary(false);
      if (pendingSettings) setPendingSettings(false);
      if (pendingLobby) setPendingLobby(false);
      if (pendingCharSheet) setPendingCharSheet(false);
      if (pendingDmDash) setPendingDmDash(false);
      if (pendingBestiary) setPendingBestiary(false);
    }
  }, [user, pendingSession, pendingRoomSetup, pendingLibrary, pendingSettings, pendingLobby, pendingCharSheet, pendingDmDash, pendingBestiary]);

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

        const runtimeState: EventRuntimeState = {
          charactersById: {
            [target.id]: combatantToRuntimeCharacter(target),
          },
        };
        const queue = createEventQueueState([nextEvent]);
        const processed = processEventQueue(runtimeState, queue);
        if (processed.failedEvents.length > 0) {
          throw new Error(processed.failedEvents[0].error);
        }
        const processedCharacter = processed.state.charactersById[target.id];
        if (!processedCharacter) {
          throw new Error('Event queue did not return target state.');
        }

        nextEncounter = {
          ...encounter,
          combatants: encounter.combatants.map((combatant) => {
            if (combatant.id !== target.id) return combatant;
            return applyRuntimeCharacterToCombatant(combatant, processedCharacter);
          }),
        };

        if (action.type === 'damage') {
          eventText = `${target.name} took ${Math.max(0, action.amount ?? 0)} damage. HP ${processedCharacter.hitPoints}/${processedCharacter.maxHitPoints}.`;
        } else if (action.type === 'healing') {
          eventText = `${target.name} healed ${Math.max(0, action.amount ?? 0)}. HP ${processedCharacter.hitPoints}/${processedCharacter.maxHitPoints}.`;
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

  function copyJoinCode() {
    if (!activeSession) return;
    void navigator.clipboard?.writeText(activeSession.joinCode);
  }

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
              setPendingCharSheet(true);
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
        return <LobbyScreen user={user} onBack={returnToMainMenu} onEnterGame={() => {}} />;
      }

      if (appStage === 'char-sheet') {
        return <CharacterSheetPage user={user} onBack={returnToMainMenu} />;
      }

      if (appStage === 'dm-dashboard') {
        return <DMDashboard user={user} onBack={returnToMainMenu} />;
      }

      if (appStage === 'bestiary') {
        return <BestiaryScreen onBack={returnToMainMenu} />;
      }

      if (appStage === 'character-setup' && pendingSession) {
        return (
          <CharacterEntryModal
            onCancel={returnToMainMenu}
            onEnter={completeCharacterEntry}
            session={pendingSession}
            user={user}
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
          <main className="fw-game-table">
            <header className="fw-game-banner">
              <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={handleSwitchTable} type="button">
                {Icon('chevL', { size: 11 })} Leave table
              </button>
              <div className="fw-game-banner-title">
                <span className="fw-pill blood">
                  <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} />
                  {hasSupabaseConfig ? 'Live' : 'Local'} - Session
                </span>
                <span className="fw-display">{activeSession?.title ?? 'Adventuring Table'}</span>
                <span className="fw-serif" style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: 13 }}>
                  - {themeDefinition.label}
                </span>
              </div>
              <span style={{ flex: 1 }} />
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
              <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled={!activeSession} onClick={copyJoinCode} type="button" title="Copy join code">
                {Icon('copy', { size: 14 })}
              </button>
              <button className="fw-btn fw-btn-icon fw-btn-ghost" onClick={() => setCockpitMode(cockpitMode === 'dm' ? 'player' : 'dm')} type="button" title="Switch table view">
                {Icon(cockpitMode === 'dm' ? 'wand' : 'user', { size: 14 })}
              </button>
              {hasSupabaseConfig ? (
                <button className="fw-btn fw-btn-icon fw-btn-ghost" onClick={signOut} type="button" title="Sign out">
                  {Icon('logout', { size: 14 })}
                </button>
              ) : null}
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
                      <span>SCENE - {sceneState?.turnNumber ?? 14}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Scene</div>
                      <div className="fw-display" style={{ color: 'var(--text)', fontSize: 22, letterSpacing: '0.04em' }}>
                        {sceneState?.location || activeSession?.title || 'Unknown location'}
                      </div>
                      <p className="fw-serif" style={{ color: 'var(--text-2)', fontSize: 14, fontStyle: 'italic', lineHeight: 1.55, marginTop: 6 }}>
                        {sceneState?.description || 'Describe your first action to let the DM establish the scene.'}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <span className="fw-pill dim">{phaseDefinition.label}</span>
                        <span className="fw-pill dim">{activeObjectives.length} objectives</span>
                        <span className="fw-pill">{Icon('sparkles', { size: 10 })} {threatClocks.length} clocks</span>
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
                  <span className="fw-mono" style={{ alignSelf: 'center', color: 'var(--text-3)', fontSize: 11 }}>Session - {formatLocalTime()}</span>
                </div>

                <div className="fw-game-scroll">
                  {storyTab === 'story' ? (
                    <PrototypeStoryFeed characterName={character.name || 'Aedric Vael'} sessionTitle={activeSession?.title} />
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
                    <textarea
                      onChange={(event) => setActionDraft(event.target.value)}
                      placeholder="Speak in character, describe an action, or whisper to the DM..."
                      value={actionDraft}
                    />
                    <button className="fw-btn fw-btn-gold fw-btn-lg" disabled={!actionDraft.trim()} type="button" onClick={() => setActionDraft('')}>
                      {Icon('send', { size: 13 })} Commit
                    </button>
                  </div>
                </div>
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

        {combatActive ? (
          <div className="fw-overlay" style={{ padding: 0 }}>
            <CombatMode onExit={() => setCombatActive(false)} />
          </div>
        ) : null}
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

import { Backpack, BookOpen, Copy, DoorOpen, Dices, LogOut, MapPin, ScrollText, Shield, Sparkles, Swords, UserRound, Users, Wrench } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { CharacterEntryModal } from './components/CharacterEntryModal';
import { CharacterSheet } from './components/CharacterSheet';
import { CharacterSheetView } from './components/CharacterSheetView';
import { CombatTracker } from './components/CombatTracker';
import { DiceRoller } from './components/DiceRoller';
import { AiDmPanel } from './components/AiDmPanel';
import { MainMenu } from './components/MainMenu';
import { CampaignLibrary } from './components/CampaignLibrary';
import { SettingsPage } from './components/SettingsPage';
import { RoomSetupPage } from './components/RoomSetupPage';
import { GamePhasePanel } from './components/GamePhasePanel';
import { HexHeroBuilder } from './components/HexHeroBuilder';
import { InventoryPanel } from './components/InventoryPanel';
import { MobileDock } from './components/MobileDock';
import { PartyPanel } from './components/PartyPanel';
import { CompanionPanel } from './components/CompanionPanel';
import { PartyChoicePanel } from './components/PartyChoicePanel';
import { SessionLobby, type RoomModal } from './components/SessionLobby';
import { ScenePanel } from './components/ScenePanel';
import { addUniqueMessage, StoryLog } from './components/StoryLog';
import { TableSetupPanel } from './components/TableSetupPanel';
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

function formatLocalTime() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pendingRoomSetup, setPendingRoomSetup] = useState(false);
  const [pendingLibrary, setPendingLibrary] = useState(false);
  const [pendingSettings, setPendingSettings] = useState(false);
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

  // Explicit app-flow state machine: login → menu → room-setup → character-setup → game
  const appStage = computeAppStage({
    hasSupabaseConfig,
    user,
    activeSession,
    pendingSession,
    pendingRoomSetup,
    pendingLibrary,
    pendingSettings,
  });
  const gateSteps = getGateSteps(appStage);

  const returnToMainMenu = useCallback(() => {
    setPendingRoomSetup(false);
    setPendingLibrary(false);
    setPendingSettings(false);
    setPendingSession(null);
    setRoomModal(null);
  }, [setPendingSession, setRoomModal]);

  // Guard: clear pendingSession and pending gate states when user logs out
  useEffect(() => {
    if (!user) {
      if (pendingSession) setPendingSession(null);
      if (pendingRoomSetup) setPendingRoomSetup(false);
      if (pendingLibrary) setPendingLibrary(false);
      if (pendingSettings) setPendingSettings(false);
    }
  }, [user, pendingSession, pendingRoomSetup, pendingLibrary, pendingSettings]);

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

  if (isGateStage(appStage)) {
    if (appStage === 'login') {
      return (
        <main className="fw-gate-shell fw-gate-shell--login">
          <AuthPanel loading={authLoading} user={user} />
        </main>
      );
    }

    if (appStage === 'menu' && user) {
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
          onSignOut={signOut}
        />
      );
    }

    if (appStage === 'library' && user) {
      return (
        <CampaignLibrary
          user={user}
          onBack={returnToMainMenu}
          onEnterSession={(session) => requestEnterSession(session, user)}
        />
      );
    }

    if (appStage === 'settings' && user) {
      return (
        <SettingsPage
          user={user}
          onBack={returnToMainMenu}
          onSignOut={signOut}
        />
      );
    }

    if (appStage === 'room-setup' && user) {
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

    if (appStage === 'character-setup' && pendingSession && user) {
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
      <main className={`fw-gate-shell fw-gate-shell--${appStage}`} data-stage={appStage}>
        <section className="fw-gate-grid">
          <div>
            <article className="fw-gate-account-card">
              <p className="fw-caption">Signed in</p>
              <strong className="fw-body-sm">{user?.email ?? 'Warden'}</strong>
              <small className="fw-caption">Select a table to continue</small>
            </article>
          </div>
        </section>
      </main>
    );
  }

  const isSessionHost = Boolean(activeSession?.createdBy && user?.id && activeSession.createdBy === user.id);
  const activeObjectives = (sceneState?.objectives ?? []).filter((objective) => objective.status === 'active');
  const unresolvedObjectives = (sceneState?.objectives ?? []).filter((objective) => objective.status !== 'completed');
  const threatClocks = sceneState?.threatClocks ?? [];

  return (
    <>
      <main className={`fw-app-shell mode-${cockpitMode} phase-${currentPhase}`}>
        <header className="fw-command-bar">
          <div className="fw-brand-lockup">
            <p className="fw-caption">Fatewarden</p>
            <h1>{activeSession?.title ?? 'Adventuring Table'}</h1>
          </div>
          <div className="fw-mode-switch" aria-label="Cockpit mode">
            <button
              className={cockpitMode === 'dm' ? 'active' : ''}
              onClick={() => setCockpitMode('dm')}
              type="button"
            >
              DM
            </button>
            <button
              className={cockpitMode === 'player' ? 'active' : ''}
              onClick={() => setCockpitMode('player')}
              type="button"
            >
              Player
            </button>
          </div>
          <div className="fw-command-status" aria-label="Table status">
            <span className={`fw-caption ${hasSupabaseConfig ? 'connected' : ''}`}>
              {hasSupabaseConfig ? 'Live' : 'Local'}
            </span>
            <span className="fw-caption">{playModeDefinition.shortLabel}</span>
            <span className="fw-caption">{phaseDefinition.label}</span>
            <span className="fw-caption">{user?.email?.split('@')[0] ?? character.name}</span>
            <div className="fw-game-menu" aria-label="Table menu">
              <button disabled={!activeSession} onClick={copyJoinCode} type="button">
                <Copy size={15} aria-hidden="true" />
                Copy
              </button>
              {hasSupabaseConfig ? (
                <button onClick={handleSwitchTable} type="button">
                  <DoorOpen size={15} aria-hidden="true" />
                  Switch
                </button>
              ) : null}
              {hasSupabaseConfig ? (
                <button onClick={signOut} type="button">
                  <LogOut size={15} aria-hidden="true" />
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <section className="fw-session-banner" aria-label="Current session">
          <div className="fw-session-banner__left">
            <button className="fw-btn fw-btn--ghost fw-btn--sm" onClick={handleSwitchTable} type="button">
              <DoorOpen size={14} aria-hidden="true" />
              Leave table
            </button>
            <div>
              <p className="fw-caption">Live session</p>
              <h2 className="fw-h2">{activeSession?.title ?? 'Adventuring Table'}</h2>
            </div>
          </div>
          <div className="fw-session-banner__chips">
            <span className="fw-cond fw-cond--minor"><span className="fw-cond__dot" />{themeDefinition.label}</span>
            <span className="fw-cond fw-cond--minor"><span className="fw-cond__dot" />{playModeDefinition.shortLabel}</span>
            <span className="fw-cond fw-cond--minor"><span className="fw-cond__dot" />{phaseDefinition.label}</span>
          </div>
        </section>

        <section className="fw-cockpit">
          <aside className="fw-game-rail">
            <div className="fw-zone-tabs" role="tablist" aria-label="Left table panels">
              <button
                className={`fw-zone-tab ${leftSidebarTab === 'party' ? 'active' : ''}`}
                onClick={() => setLeftSidebarTab('party')}
                role="tab"
                type="button"
              >
                <Users size={14} aria-hidden="true" />Party
              </button>
              <button
                className={`fw-zone-tab ${leftSidebarTab === 'character' ? 'active' : ''}`}
                onClick={() => setLeftSidebarTab('character')}
                role="tab"
                type="button"
              >
                <UserRound size={14} aria-hidden="true" />Character
              </button>
              <button
                className={`fw-zone-tab ${leftSidebarTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setLeftSidebarTab('inventory')}
                role="tab"
                type="button"
              >
                <Backpack size={14} aria-hidden="true" />Inventory
              </button>
              <button
                className={`fw-zone-tab ${leftSidebarTab === 'quests' ? 'active' : ''}`}
                onClick={() => setLeftSidebarTab('quests')}
                role="tab"
                type="button"
              >
                <ScrollText size={14} aria-hidden="true" />Quests
              </button>
            </div>

            <div className="fw-zone-panel">
              {leftSidebarTab === 'party' ? (
                <>
                  <PartyPanel activeSession={activeSession} currentCharacter={character} />
                  <CompanionPanel
                    currentUserId={user?.id ?? null}
                    isHost={isSessionHost}
                    sessionId={activeSession?.id ?? null}
                  />
                </>
              ) : null}

              {leftSidebarTab === 'character' ? (
                isHexploreMode ? (
                  <HexHeroBuilder
                    character={character}
                    disabled={hasSupabaseConfig && (!activeSession || !user)}
                    onSave={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
                    status={characterStatus}
                  />
                ) : (
                  <CharacterSheet
                    character={character}
                    disabled={hasSupabaseConfig && (!activeSession || !user)}
                    onOpenFullSheet={() => setIsSheetOpen(true)}
                    onSave={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
                    status={characterStatus}
                  />
                )
              ) : null}

              {leftSidebarTab === 'inventory' ? (
                <InventoryPanel
                  character={character}
                  disabled={hasSupabaseConfig && (!activeSession || !user)}
                  onUpdateCharacter={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
                />
              ) : null}

              {leftSidebarTab === 'quests' ? (
                <>
                  <ScenePanel isSessionHost={isSessionHost} />
                  <section className="fw-panel">
                    <div className="fw-panel__header">
                      <div>
                        <p className="fw-caption">Quests</p>
                        <h2 className="fw-h2">Objectives</h2>
                      </div>
                      <Shield size={20} aria-hidden="true" />
                    </div>
                    <div className="fw-quest-list">
                      {unresolvedObjectives.length ? (
                        unresolvedObjectives.map((objective) => (
                          <article className={`fw-quest-item fw-quest-item--${objective.status}`} key={objective.id}>
                            <span className="fw-cond__dot" />
                            <div>
                              <strong className="fw-body-sm">{objective.description}</strong>
                              <p className="fw-caption">{objective.status === 'failed' ? 'Failed objective' : 'Active objective'}</p>
                            </div>
                          </article>
                        ))
                      ) : (
                        <article className="fw-quest-item fw-quest-item--empty">
                          <div>
                            <strong className="fw-body-sm">No active objectives yet</strong>
                            <p className="fw-caption">Ask AI DM to open a scene and create a mission hook.</p>
                          </div>
                        </article>
                      )}
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </aside>

          <section className={`fw-story ${mobilePanel === 'quest' ? 'active' : ''}`}>
            <header className="fw-scene-strip">
              <div>
                <p className="fw-caption">Current scene</p>
                <h2>{sceneState?.location || activeSession?.title || 'Unknown location'}</h2>
                <p className="fw-body-sm">{sceneState?.description || 'Describe your first action to let the DM establish the scene.'}</p>
              </div>
              <div className="fw-scene-strip__meta">
                <span className="fw-cond fw-cond--minor">
                  <span className="fw-cond__dot" />
                  {phaseDefinition.label}
                </span>
                <span className="fw-cond fw-cond--minor">
                  <span className="fw-cond__dot" />
                  {activeObjectives.length} objectives
                </span>
                <span className="fw-cond fw-cond--minor">
                  <span className="fw-cond__dot" />
                  {threatClocks.length} clocks
                </span>
              </div>
            </header>

            <StoryLog
              activeSession={activeSession}
              character={character}
              characterName={character.name}
              encounter={encounter}
              gamePhase={currentPhase}
              initialMessages={demoMessages}
              messages={storyMessages}
              onConfirmAction={applyAiConfirmAction}
              onMessagesChange={setStoryMessages}
              sessionTitle={activeSession?.title}
              user={user}
            />
          </section>

          <aside className="fw-dock">
            <div className="fw-zone-tabs" role="tablist" aria-label="Right table panels">
              <button
                className={`fw-zone-tab ${rightSidebarTab === 'dice' ? 'active' : ''}`}
                onClick={() => setRightSidebarTab('dice')}
                role="tab"
                type="button"
              >
                <Dices size={14} aria-hidden="true" />Dice
              </button>
              <button
                className={`fw-zone-tab ${rightSidebarTab === 'combat' ? 'active' : ''}`}
                onClick={() => setRightSidebarTab('combat')}
                role="tab"
                type="button"
              >
                <Swords size={14} aria-hidden="true" />Combat
              </button>
              <button
                className={`fw-zone-tab ${rightSidebarTab === 'ai' ? 'active' : ''}`}
                onClick={() => setRightSidebarTab('ai')}
                role="tab"
                type="button"
              >
                <Sparkles size={14} aria-hidden="true" />AI DM
              </button>
              <button
                className={`fw-zone-tab ${rightSidebarTab === 'rules' ? 'active' : ''}`}
                onClick={() => setRightSidebarTab('rules')}
                role="tab"
                type="button"
              >
                <BookOpen size={14} aria-hidden="true" />Rules
              </button>
              <button
                className={`fw-zone-tab ${rightSidebarTab === 'tools' ? 'active' : ''}`}
                onClick={() => setRightSidebarTab('tools')}
                role="tab"
                type="button"
              >
                <Wrench size={14} aria-hidden="true" />Tools
              </button>
            </div>

            <div className="fw-zone-panel">
              {rightSidebarTab === 'dice' ? <DiceRoller character={character} onRoll={postDiceRoll} /> : null}

              {rightSidebarTab === 'combat' ? (
                <CombatTracker
                  character={character}
                  encounter={encounter}
                  onCombatEvent={postCombatEvent}
                  onEncounterChange={changeEncounter}
                  onRequestPhaseChange={changeGamePhase}
                />
              ) : null}

              {rightSidebarTab === 'ai' ? (
                <>
                  <AiDmPanel
                    busy={aiPanelBusy || openingSceneBusy}
                    pendingConfirmAction={pendingConfirmAction ?? null}
                    onAiAction={handleAiPanelAction}
                    onConfirmAction={handleAiPanelConfirmAction}
                    onRejectAction={handleAiPanelRejectAction}
                  />
                </>
              ) : null}

              {rightSidebarTab === 'rules' ? (
                <section className="fw-panel">
                  <div className="fw-panel__header">
                    <div>
                      <p className="fw-caption">Rules</p>
                      <h2 className="fw-h2">Reference</h2>
                    </div>
                    <BookOpen size={22} aria-hidden="true" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)' }}>
                    {[playModeDefinition.shortLabel, themeDefinition.label, 'SRD 5.1',
                      ...(activeSession?.rules.enabledModules ?? ['core', 'combat', 'conditions'])
                    ].map((label) => (
                      <span className="fw-cond fw-cond--minor" key={label}>
                        <span className="fw-cond__dot" />{label}
                      </span>
                    ))}
                  </div>
                  <p className="fw-body" style={{ padding: '0 var(--sp-4) var(--sp-4)', fontSize: 'var(--fs-caption)', color: 'var(--ink-300)' }}>
                    {activeSession?.theme.notes
                      ? `${themeDefinition.label}: ${activeSession.theme.notes}`
                      : activeSession?.rules.houseRules ||
                      (activeSession?.playMode === 'hexplore'
                        ? 'HEXplore mode is ready as a table mode.'
                        : 'Core formulas only. Longer rules text stays outside the app.')}
                  </p>
                </section>
              ) : null}

              {rightSidebarTab === 'tools' ? (
                <section className="fw-panel">
                  <div className="fw-panel__header">
                    <div>
                      <p className="fw-caption">Session tools</p>
                      <h2 className="fw-h2">Table Utilities</h2>
                    </div>
                    <Wrench size={20} aria-hidden="true" />
                  </div>
                  <div className="fw-room-actions" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                    <button className="fw-btn fw-btn--ghost fw-btn--sm" disabled={!activeSession} onClick={copyJoinCode} type="button">
                      <Copy size={14} aria-hidden="true" />
                      Copy join code
                    </button>
                    {hasSupabaseConfig ? (
                      <button className="fw-btn fw-btn--ghost fw-btn--sm" onClick={handleSwitchTable} type="button">
                        <DoorOpen size={14} aria-hidden="true" />
                        Switch table
                      </button>
                    ) : null}
                    {hasSupabaseConfig ? (
                      <button className="fw-btn fw-btn--ghost fw-btn--sm" onClick={signOut} type="button">
                        <LogOut size={14} aria-hidden="true" />
                        Sign out
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>

          <MobileDock
            activeSession={activeSession}
            character={character}
            currentCharacter={character}
            encounter={encounter}
            hasSupabaseConfig={hasSupabaseConfig}
            isHost={isSessionHost}
            mobilePanel={mobilePanel as 'party' | 'inventory' | 'map'}
            user={user}
            onCombatEvent={postCombatEvent}
            onEncounterChange={changeEncounter}
            onRequestPhaseChange={changeGamePhase}
            onUpdateCharacter={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
          />
        </section>

        <nav className="fw-mobile-dock" aria-label="Mobile cockpit panels">
          <button
            className={mobilePanel === 'quest' ? 'active' : ''}
            onClick={() => setMobilePanel('quest')}
            type="button"
          >
            <ScrollText size={18} aria-hidden="true" />
            Quest
          </button>
          <button
            className={mobilePanel === 'party' ? 'active' : ''}
            onClick={() => setMobilePanel('party')}
            type="button"
          >
            <Users size={18} aria-hidden="true" />
            Party
          </button>
          <button
            className={mobilePanel === 'inventory' ? 'active' : ''}
            onClick={() => setMobilePanel('inventory')}
            type="button"
          >
            <Backpack size={18} aria-hidden="true" />
            Inventory
          </button>
          <button
            className={mobilePanel === 'map' ? 'active' : ''}
            onClick={() => setMobilePanel('map')}
            type="button"
          >
            <MapPin size={18} aria-hidden="true" />
            Map
          </button>
        </nav>

        {isSheetOpen && !isHexploreMode ? (
          <CharacterSheetView
            character={character}
            disabled={hasSupabaseConfig && (!activeSession || !user)}
            onClose={() => setIsSheetOpen(false)}
            onSave={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
            status={characterStatus}
          />
        ) : null}
      </main>

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

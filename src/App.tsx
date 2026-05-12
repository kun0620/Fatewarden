import { BookOpen, Copy, DoorOpen, Dices, LogOut, MapPin, ScrollText, Shield, Swords, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { CharacterEntryModal } from './components/CharacterEntryModal';
import { CharacterSheet } from './components/CharacterSheet';
import { CharacterSheetView } from './components/CharacterSheetView';
import { CombatTracker } from './components/CombatTracker';
import { DiceRoller } from './components/DiceRoller';
import { GamePhasePanel } from './components/GamePhasePanel';
import { HexHeroBuilder } from './components/HexHeroBuilder';
import { PartyPanel } from './components/PartyPanel';
import { CompanionPanel } from './components/CompanionPanel';
import { SessionLobby, type RoomModal } from './components/SessionLobby';
import { ScenePanel } from './components/ScenePanel';
import { addUniqueMessage, StoryLog } from './components/StoryLog';
import { TableSetupPanel } from './components/TableSetupPanel';
import { demoCharacter, demoMessages } from './data/demo';
import { loadCharacter, saveCharacter } from './lib/characters';
import { applyLongRest, applyShortRest } from './engine/character/rest';
import { createEventQueueState, processEventQueue, type EventRuntimeState } from './engine/events/eventQueue';
import type { GameEvent } from './engine/events/types';
import { getGamePhaseDefinition } from './lib/gamePhases';
import { createEmptyInventory } from './lib/inventory';
import { requestAiDmReply, sendSessionMessage } from './lib/messages';
import { getPlayModeDefinition } from './lib/playModes';
import { getSessionThemeDefinition } from './lib/sessionThemes';
import { subscribeToSessionUpdates, updateSessionCombatState, updateSessionPhase } from './lib/sessions';
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
type MobilePanel = 'story' | 'scene' | 'party' | 'sheet';

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

function hasSceneFlow(messages: StoryMessage[]) {
  return messages.some((message) => {
    const kind = message.metadata?.kind;
    return (kind === 'scene_opening' || kind === 'scene_objective') && Boolean(message.metadata?.scene);
  });
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
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [pendingSession, setPendingSession] = useState<GameSession | null>(null);
  const [roomModal, setRoomModal] = useState<RoomModal>(null);
  const [character, setCharacter] = useState<Character>(demoCharacter);
  const [characterStatus, setCharacterStatus] = useState('');
  const [storyMessages, setStoryMessages] = useState<StoryMessage[]>(hasSupabaseConfig ? [] : demoMessages);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const [localPhase, setLocalPhase] = useState<GamePhase>('setup');
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [openingSceneBusy, setOpeningSceneBusy] = useState(false);
  const [cockpitMode, setCockpitMode] = useState<CockpitMode>('dm');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('story');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const user: User | null = authSession?.user ?? null;

  useEffect(() => {
    if (!supabase) return;

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
      if (!session) {
        setActiveSession(null);
        setPendingSession(null);
        setRoomModal(null);
        setCharacter(demoCharacter);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const selectSession = useCallback((session: GameSession) => {
    setPendingSession(null);
    setActiveSession(session);
    setEncounter(session.combatState);
  }, []);

  const requestEnterSession = useCallback(
    async (session: GameSession) => {
      if (!user || !supabase) {
        selectSession(session);
        return;
      }

      setCharacterStatus('Checking table character');
      try {
        const existingCharacter = await loadCharacter(session.id, user);
        setCharacter(existingCharacter);
        setCharacterStatus('Saved to this table');
        setRoomModal(null);
        selectSession(session);
      } catch (error) {
        setRoomModal(null);
        setPendingSession(session);
        setCharacterStatus(error instanceof Error ? error.message : 'Choose a character for this table.');
      }
    },
    [selectSession, user],
  );

  const completeCharacterEntry = useCallback(
    (session: GameSession, sessionCharacter: Character) => {
      setCharacter(sessionCharacter);
      setCharacterStatus('Character attached to this table');
      selectSession(session);
    },
    [selectSession],
  );

  const currentPhase = activeSession?.phase ?? localPhase;
  const phaseDefinition = getGamePhaseDefinition(currentPhase);
  const playModeDefinition = getPlayModeDefinition(activeSession?.playMode);
  const themeDefinition = getSessionThemeDefinition(activeSession?.theme.key ?? 'dark_fantasy');
  const isHexploreMode = activeSession?.playMode === 'hexplore';
  const hasOpeningScene = hasSceneFlow(storyMessages);

  useEffect(() => {
    if (!activeSession || !user || !supabase) {
      setCharacter(demoCharacter);
      setCharacterStatus(hasSupabaseConfig ? 'Choose a table to edit.' : 'Local demo character.');
      return;
    }

    let alive = true;
    setCharacterStatus('Loading character');
    loadCharacter(activeSession.id, user)
      .then((row) => {
        if (!alive) return;
        setCharacter(row);
        setCharacterStatus('Saved to this table');
      })
      .catch((error: Error) => {
        if (!alive) return;
        setCharacter(demoCharacter);
        setCharacterStatus(error.message);
      });

    return () => {
      alive = false;
    };
  }, [activeSession, user]);

  useEffect(() => {
    if (!activeSession || !supabase || !user) return;

    const client = supabase;
    const channel = subscribeToSessionUpdates(activeSession.id, (nextSession) => {
      setActiveSession((current) => (current?.id === nextSession.id ? nextSession : current));
      setEncounter(nextSession.combatState);
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeSession?.id, user]);

  const persistCharacter = useCallback(
    async (nextCharacter: Character) => {
      if (!activeSession || !user) return;

      setCharacterStatus('Saving character');
      const saved = await saveCharacter(nextCharacter, activeSession.id, user);
      setCharacter(saved);
      setCharacterStatus('Character saved');
    },
    [activeSession, user],
  );

  const saveLocalCharacter = useCallback(async (nextCharacter: Character) => {
    setCharacter(nextCharacter);
    setCharacterStatus('Local character updated');
  }, []);

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

  const postPhaseEvent = useCallback(
    async (phase: GamePhase) => {
      const definition = getGamePhaseDefinition(phase);
      const body = `Game phase changed to ${definition.label}.`;
      const metadata = {
        kind: 'phase_event',
        phase,
        label: definition.label,
      };

      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Game Flow',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const message = await sendSessionMessage(activeSession.id, 'system', 'Game Flow', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not post phase event.',
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, user],
  );

  const askAiToOpenScene = useCallback(
    async (premise: string) => {
      if (openingSceneBusy) return false;
      const trimmedPremise = premise.trim();
      const prompt = [
        'เริ่มการผจญภัยของโต๊ะ DnD นี้แบบ AI Dungeon Master ภาษาไทย',
        trimmedPremise
          ? `Premise จากโต๊ะ: ${trimmedPremise}`
          : 'ถ้าไม่มี premise ให้สร้าง opening scene ที่เล่นต่อได้ทันทีจาก theme ของห้อง',
        'ใช้สไตล์ dark fantasy / cosmic horror / mystery / psychological pressure แบบ dangerous but fair',
        'สร้าง scene, atmosphere, current danger, objective, tactical context และ choices ตามสถานการณ์จริง',
        'choices ต้องไม่เป็น generic และจำนวนเลือกตามสถานการณ์ 2-6 ข้อ ส่วน UI จะเติม “ทำอย่างอื่น...” เอง',
        'อย่าเปลี่ยน HP, condition, turn, phase, inventory หรือ encounter state เอง ถ้าจำเป็นให้เสนอ events เพื่อให้ UI confirm',
      ].join('\n');

      if (!activeSession || !user || !supabase) {
        setOpeningSceneBusy(true);
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'dm',
            author: 'Dungeon Master',
            body: trimmedPremise
              ? `ฉากเปิดเริ่มจาก: ${trimmedPremise}`
              : 'หมอกเย็นคลี่ตัวเหนือถนนหินเก่า โต๊ะพร้อมแล้วสำหรับการผจญภัยแรก',
            createdAt: formatLocalTime(),
            metadata: {
              kind: 'scene_opening',
              scene: {
                title: 'Opening Scene',
                location: trimmedPremise || 'A shadowed frontier road',
                objective: 'เลือกการกระทำแรกของปาร์ตี้',
                hook: 'มีบางอย่างผิดปกติรอให้ค้นพบ',
                nextActions: ['Investigate', 'Talk', 'Travel', 'Roll Skill'],
              },
            },
          }),
        );
        setOpeningSceneBusy(false);
        return true;
      }

      setOpeningSceneBusy(true);
      try {
        const message = await requestAiDmReply(activeSession.id, character.name, prompt, storyMessages, {
          session: activeSession,
          gamePhase: 'setup',
          character,
          encounter,
          aiMode: 'adventure',
          partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
        });
        setStoryMessages((current) => addUniqueMessage(current, message));
        return true;
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not ask AI DM to open the scene.',
            createdAt: formatLocalTime(),
          }),
        );
        return false;
      } finally {
        setOpeningSceneBusy(false);
      }
    },
    [activeSession, character, encounter, openingSceneBusy, storyMessages, user],
  );

  const askAiForRestSummary = useCallback(async () => {
    if (openingSceneBusy || !activeSession || !user || !supabase) return;

    setOpeningSceneBusy(true);
    try {
      const message = await requestAiDmReply(
        activeSession.id,
        character.name,
        [
          'สรุปช่วงพักของ session นี้เป็นภาษาไทย',
          'ให้มีเหตุการณ์สำคัญ consequence, unresolved threat, และ next hook',
          'อย่าเปลี่ยน HP, condition, inventory, phase หรือ encounter state เอง',
        ].join('\n'),
        storyMessages,
        {
          session: activeSession,
          gamePhase: 'rest',
          character,
          encounter,
          aiMode: 'adventure',
          partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
        },
      );
      setStoryMessages((current) =>
        addUniqueMessage(current, {
          ...message,
          metadata: {
            ...message.metadata,
            kind: 'rest_summary',
          },
        }),
      );
    } catch (error) {
      setStoryMessages((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: error instanceof Error ? error.message : 'Could not ask AI DM for a recap.',
          createdAt: formatLocalTime(),
        }),
      );
    } finally {
      setOpeningSceneBusy(false);
    }
  }, [activeSession, character, encounter, openingSceneBusy, storyMessages, user]);

  const handleShortRest = useCallback(
    async (hitDiceSpent: number) => {
      const updatedCharacter = applyShortRest(character, hitDiceSpent);
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
    [activeSession, character, persistCharacter, postCombatEvent, saveLocalCharacter, user],
  );

  const handleLongRest = useCallback(async () => {
    const updatedCharacter = applyLongRest(character);
    if (hasSupabaseConfig && activeSession && user) {
      await persistCharacter(updatedCharacter);
    } else {
      await saveLocalCharacter(updatedCharacter);
    }

    await postCombatEvent(`${character.name} takes a long rest and recovers fully.`, {
      kind: 'rest_event',
      restType: 'long',
    });
  }, [activeSession, character, persistCharacter, postCombatEvent, saveLocalCharacter, user]);

  const changeGamePhase = useCallback(
    async (nextPhase: GamePhase) => {
      if (nextPhase === currentPhase || phaseBusy) return;

      setPhaseBusy(true);
      try {
        if (activeSession && user && supabase) {
          const updatedSession = await updateSessionPhase(activeSession.id, nextPhase);
          setActiveSession((current) =>
            current?.id === updatedSession.id
              ? { ...updatedSession, combatState: updatedSession.combatState ?? current.combatState }
              : updatedSession,
          );
        } else {
          setLocalPhase(nextPhase);
        }
        await postPhaseEvent(nextPhase);
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not change game phase.',
            createdAt: formatLocalTime(),
          }),
        );
      } finally {
        setPhaseBusy(false);
      }
    },
    [activeSession, currentPhase, phaseBusy, postPhaseEvent, user],
  );

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

  function copyJoinCode() {
    if (!activeSession) return;
    void navigator.clipboard?.writeText(activeSession.joinCode);
  }

  function switchTable() {
    setActiveSession(null);
    setPendingSession(null);
    setRoomModal(null);
    setEncounter(null);
    setLocalPhase('setup');
    setIsSheetOpen(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActiveSession(null);
    setPendingSession(null);
    setRoomModal(null);
    setEncounter(null);
    setLocalPhase('setup');
    setIsSheetOpen(false);
    setCharacter(demoCharacter);
  }

  if (hasSupabaseConfig && (!user || !activeSession)) {
    return (
      <main className="fw-gate-shell">
        <section className="fw-gate-hero">
          <div className="fw-gate-copy">
            <div className="fw-gate-brand-mark" aria-hidden="true">
              <span>FW</span>
            </div>
            <p className="fw-caption">Fatewarden Web Table</p>
            <h1>Gather the party before the veil opens.</h1>
            <p className="fw-body">
              Create or join a room first. Fatewarden will ask each player to choose or create a character before
              entering the live DnD cockpit.
            </p>
            <div className="fw-gate-flow" aria-label="Entry flow">
              <span className={user ? 'complete' : 'active'}>
                <span className="fw-caption">1. Sign in</span>
              </span>
              <span className={user ? 'active' : ''}>
                <span className="fw-caption">2. Table</span>
              </span>
              <span><span className="fw-caption">3. Character</span></span>
              <span><span className="fw-caption">4. Play</span></span>
            </div>
          </div>
          <div className="fw-gate-status">
            <div className="fw-gate-status-card primary">
              <span className="fw-caption">Access</span>
              <strong className="fw-body-sm">{user ? 'Signed in' : 'Auth required'}</strong>
              <small className="fw-caption">{user?.email ?? 'Use your table account'}</small>
            </div>
            <div className="fw-gate-status-card">
              <span className="fw-caption">Ruleset</span>
              <strong className="fw-body-sm">SRD 5.1</strong>
              <small className="fw-caption">Core / Combat / Conditions</small>
            </div>
            <div className="fw-gate-status-card">
              <span className="fw-caption">Modes</span>
              <strong className="fw-body-sm">DnD first</strong>
              <small className="fw-caption">HEXplore parked for later</small>
            </div>
          </div>
        </section>

        <section className={`fw-gate-grid ${user ? '' : 'auth-only'}`}>
          <div>
            <AuthPanel loading={authLoading} user={user} />
          </div>
          {user ? (
            <SessionLobby
              onRequestEnterSession={requestEnterSession}
              onRoomModalChange={setRoomModal}
              onSignOut={signOut}
              roomModal={roomModal}
              user={user}
            />
          ) : null}
        </section>

        {pendingSession && user ? (
          <CharacterEntryModal
            onCancel={() => setPendingSession(null)}
            onEnter={completeCharacterEntry}
            session={pendingSession}
            user={user}
          />
        ) : null}
      </main>
    );
  }

  const isSessionHost = Boolean(activeSession?.createdBy && user?.id && activeSession.createdBy === user.id);

  return (
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
              <button onClick={switchTable} type="button">
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

      <nav className="fw-mobile-dock" aria-label="Mobile cockpit panels">
        <button
          className={mobilePanel === 'story' ? 'active' : ''}
          onClick={() => setMobilePanel('story')}
          type="button"
        >
          <ScrollText size={18} aria-hidden="true" />
          Story
        </button>
        <button
          className={mobilePanel === 'scene' ? 'active' : ''}
          onClick={() => setMobilePanel('scene')}
          type="button"
        >
          <MapPin size={18} aria-hidden="true" />
          Scene
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
          className={mobilePanel === 'sheet' ? 'active' : ''}
          onClick={() => setMobilePanel('sheet')}
          type="button"
        >
          <Shield size={18} aria-hidden="true" />
          {isHexploreMode ? 'Hero' : 'Sheet'}
        </button>
      </nav>

      <section className="fw-cockpit">
        {/* ── Left rail (desktop) ─────────────────────────── */}
        <aside className="fw-rail">
          {currentPhase === 'setup' || currentPhase === 'rest' ? (
            <TableSetupPanel
              activeSession={activeSession}
              busy={phaseBusy || openingSceneBusy}
              character={character}
              characterStatus={characterStatus}
              disabled={hasSupabaseConfig && (!activeSession || !user)}
              encounter={encounter}
              hasOpeningScene={hasOpeningScene}
              onAskOpeningScene={askAiToOpenScene}
              onAskRestSummary={askAiForRestSummary}
              onApplyLongRest={handleLongRest}
              onApplyShortRest={handleShortRest}
              onStartExploration={startAdventure}
              phase={currentPhase}
            />
          ) : null}
          <GamePhasePanel
            busy={phaseBusy}
            disabled={hasSupabaseConfig && (!activeSession || !user)}
            onChangePhase={changeGamePhase}
            phase={currentPhase}
          />
          <ScenePanel isSessionHost={isSessionHost} />
          <PartyPanel activeSession={activeSession} currentCharacter={character} />
          <CompanionPanel
            currentUserId={user?.id ?? null}
            isHost={isSessionHost}
            sessionId={activeSession?.id ?? null}
          />
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
        </aside>

        {/* ── Story log (center / mobile story tab) ───────── */}
        <section className={`fw-story ${mobilePanel === 'story' ? 'active' : ''}`}>
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

        {/* ── Right dock (desktop) / Sheet tab (mobile) ───── */}
        <aside className={`fw-dock ${mobilePanel === 'sheet' ? 'active' : ''}`}>
          {isHexploreMode ? (
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
          )}
          <DiceRoller character={character} onRoll={postDiceRoll} />
          <CombatTracker
            character={character}
            encounter={encounter}
            onCombatEvent={postCombatEvent}
            onEncounterChange={changeEncounter}
            onRequestPhaseChange={changeGamePhase}
          />
        </aside>

        {/* ── Scene tab (mobile only) ──────────────────────── */}
        <div className={`fw-dock__scene ${mobilePanel === 'scene' ? 'active' : ''}`}>
          {currentPhase === 'setup' || currentPhase === 'rest' ? (
            <TableSetupPanel
              activeSession={activeSession}
              busy={phaseBusy || openingSceneBusy}
              character={character}
              characterStatus={characterStatus}
              disabled={hasSupabaseConfig && (!activeSession || !user)}
              encounter={encounter}
              hasOpeningScene={hasOpeningScene}
              onAskOpeningScene={askAiToOpenScene}
              onAskRestSummary={askAiForRestSummary}
              onApplyLongRest={handleLongRest}
              onApplyShortRest={handleShortRest}
              onStartExploration={startAdventure}
              phase={currentPhase}
            />
          ) : null}
          <GamePhasePanel
            busy={phaseBusy}
            disabled={hasSupabaseConfig && (!activeSession || !user)}
            onChangePhase={changeGamePhase}
            phase={currentPhase}
          />
          <ScenePanel isSessionHost={isSessionHost} />
        </div>

        {/* ── Party tab (mobile only) ──────────────────────── */}
        <div className={`fw-dock__party ${mobilePanel === 'party' ? 'active' : ''}`}>
          <PartyPanel activeSession={activeSession} currentCharacter={character} />
          <CompanionPanel
            currentUserId={user?.id ?? null}
            isHost={isSessionHost}
            sessionId={activeSession?.id ?? null}
          />
        </div>
      </section>

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
  );
}

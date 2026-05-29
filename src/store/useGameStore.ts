import { create } from 'zustand';
import { createEventQueueState, processEventQueue, type EventRuntimeState } from '../engine/events/eventQueue';
import { addParticipant, type CombatParticipant, type CombatState as EngineCombatState } from '../engine/combat';
import { applyLongRest, applyShortRest } from '../engine/character/rest';
import { addObjective, getSceneContext as buildSceneContext, type SceneState } from '../engine/scene';
import type { SceneObjective } from '../engine/scene/sceneTypes';
import type { RaceRuntime } from '../engine/races/raceRuntime';
import type { PartyChoice, PartyChoiceState } from '../engine/party/partyChoiceTypes';
import type { CompanionSheet, CompanionState } from '../engine/companion/companionTypes';
import { addEntry, removeEntry } from '../engine/journal/journalEngine';
import type { JournalEntry, JournalState } from '../engine/journal/journalTypes';
import { adjustAffinity as adjustAffinityEngine } from '../engine/relationship/relationshipEngine';
import type { RelationshipState } from '../engine/relationship/relationshipTypes';
import { generateRun } from '../engine/run/mapGenerator';
import {
  addGold as addRunGold,
  addRelic as addRunRelic,
  completeNode as completeRunNode,
  selectNode as selectRunNode,
  spendGold as spendRunGold,
  type NodeResult,
} from '../engine/run/runEngine';
import { wardenRunFoes, type RunEnemy } from '../data/enemies';
import { WARDEN_RUN_RELICS } from '../data/relics';
import { classes as CLASSES } from '../data/classes';
import { SPELLS } from '../data/spells';
import { supabase } from '../lib/supabase';
import type { NodeType, PermanentProgress, RunCombatant, RunInitEntry, RunRelic, RunSkill, RunState } from '../engine/run/runTypes';
import {
  processPartyChoiceCreated,
  processPartyChoiceResolved,
  processPartyVoteCast,
} from '../engine/events/processors/partyChoiceProcessor';
import {
  processCompanionAction,
  processCompanionDismiss,
  processCompanionLoyaltyChange,
  processCompanionSummon,
} from '../engine/events/processors/companionProcessor';
import {
  processObjectiveUpdate,
  processSceneTransition,
  processThreatClockAdvance,
} from '../engine/events/processors/sceneProcessor';
import {
  processCombatAddParticipant,
  processCombatAdjustDeathSave,
  processCombatAdvanceTurn,
  processCombatApplyCondition,
  processCombatApplyDamage,
  processCombatAttack,
  processCombatCreateEncounter,
  processCombatEndEncounter,
  processCombatExpireConditions,
  processCombatMove,
  processCombatRecoverHp,
  processCombatRemoveCondition,
  processCombatRollDeathSave,
  processCombatRollInitiative,
  processCombatSetAiBehavior,
  processCombatSetInitiative,
  processCombatSetTempHp,
  processCombatSortInitiative,
  processCombatUseAction,
} from '../engine/events/processors/combatProcessor';
import { processCastSpell, processConcentrationEnd } from '../engine/events/processors/spellProcessor';
import type {
  CastSpellEvent,
  ConcentrationEndEvent,
  ConcentrationSaveCheckEvent,
  ConcentrationStartEvent,
  GameEvent,
} from '../engine/events/types';
import type { Character, Combatant, EncounterState, GamePhase, GameSession, Inventory, SessionMember, VaultCharacter } from '../types';

type DispatchResult = {
  character: Character | null;
  appliedCount: number;
  failed: string[];
};

type RunPosition = 1 | 2 | 3 | 4;

type StartRunInput = {
  partyIds: string[];
  positions: Record<string, RunPosition>;
  startingRelic?: string;
  sessionId?: string;
};

type GameMode = 'lobby' | 'warden_run';

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  waitMs: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      void fn(...args);
    }, waitMs);
  };
}

const saveRunState = debounce(async (sessionId: string, runState: RunState | null) => {
  if (!sessionId || sessionId === 'local-run' || !supabase) return;
  const { error } = await supabase
    .from('sessions')
    .update({ run_state: runState })
    .eq('id', sessionId);

  if (error) {
    console.warn('Could not save Warden run state', error);
  }
}, 1000);

async function saveRunStateImmediate(sessionId: string, runState: RunState | null) {
  console.log('[SAVE IMMEDIATE]', {
    sessionId,
    hasRunState: Boolean(runState),
    hasSupabase: Boolean(supabase),
  });

  if (!sessionId || sessionId === 'local-run' || !supabase) return;
  const { error } = await supabase
    .from('sessions')
    .update({ run_state: runState })
    .eq('id', sessionId);

  console.log('[SAVE RESULT]', { error });

  if (error) {
    console.warn('Could not save Warden run state', error);
  }
}

function persistRunState(gameMode: GameMode, runState: RunState | null) {
  if (gameMode !== 'warden_run' || !runState) return;
  void saveRunState(runState.sessionId, runState);
}

type GameStoreState = {
  combatState: EncounterState | null;
  sceneState: SceneState | null;
  companionState: CompanionState;
  partyChoiceState: PartyChoiceState;
  journalState: JournalState;
  relationshipState: RelationshipState;
  runState: RunState | null;
  gameMode: GameMode;
  activeSession: GameSession | null;
  sessionMembers: SessionMember[];
  currentUserId: string | null;
  vaultCharacters: VaultCharacter[];
  permanentProgress: PermanentProgress;
  activeCharacter: Character | null;
  classRuntime: Character['systemData']['classRuntime'] | null;
  raceRuntime: RaceRuntime | null;
  inventory: Inventory | null;
  partyChoiceAiResponder: ((input: string) => void | Promise<void>) | null;
  requestedGamePhase: GamePhase | null;
  clearRequestedGamePhase: () => void;
  setCombatState: (combatState: EncounterState | null) => void;
  setSceneState: (sceneState: SceneState | null) => void;
  addCompanion: (companion: CompanionSheet) => void;
  removeCompanion: (companionId: string) => void;
  updateCompanion: (companion: CompanionSheet) => void;
  setActivePartyChoice: (choice: PartyChoice) => void;
  clearActivePartyChoice: () => void;
  setPartyChoiceAiResponder: (responder: ((input: string) => void | Promise<void>) | null) => void;
  setActiveCharacter: (character: Character | null) => void;
  setGameMode: (mode: GameMode) => void;
  setRuntimeSession: (session: GameSession | null) => void;
  setRuntimeSessionMembers: (members: SessionMember[]) => void;
  setCurrentUserId: (userId: string | null) => void;
  setVaultCharacters: (characters: VaultCharacter[]) => void;
  setPermanentProgress: (progress: PermanentProgress) => void;
  getSceneContext: () => ReturnType<typeof buildSceneContext> | null;
  addJournalEntry: (entry: JournalEntry) => void;
  removeJournalEntry: (entryId: string) => void;
  adjustAffinity: (characterId: string, npcId: string, npcName: string, delta: number, reason: string) => void;
  startRun: (
    inputOrPartyIds: StartRunInput | string[],
    positions?: Record<string, RunPosition>,
    sessionId?: string,
  ) => void;
  selectNode: (nodeId: string) => { error?: string };
  completeNode: (nodeId: string, result: NodeResult) => void;
  addRunGold: (amount: number) => void;
  spendRunGold: (amount: number) => { error?: string };
  addRunRelic: (relic: RunRelic) => void;
  endRun: (victory: boolean) => void;
  advanceRunTurn: () => void;
  applyRunPartyHp: (characterId: string, delta: number) => void;
  applyRunAllPartyHp: (delta: number) => void;
  eventMeta: (characterId: string) => {
    id: string;
    sessionId: string;
    actorId: string;
    targetId: string;
    createdAt: string;
    source: 'user';
  };
  dispatch: (event: GameEvent) => DispatchResult;
};

function nowIso() {
  return new Date().toISOString();
}

function mapRaceRuntime(character: Character | null): RaceRuntime | null {
  if (!character) return null;
  const runtime = character.systemData.raceRuntime as RaceRuntime | undefined;
  return runtime ?? null;
}

function mapClassRuntime(character: Character | null): Character['systemData']['classRuntime'] | null {
  if (!character) return null;
  return character.systemData.classRuntime ?? null;
}

function mapInventory(character: Character | null): Inventory | null {
  if (!character) return null;
  return character.inventory;
}

function buildCharacterRuntimeState(character: Character): EventRuntimeState {
  return {
    charactersById: {
      [character.id]: character,
    },
  };
}

function toEngineCombatState(encounter: EncounterState): EngineCombatState {
  return {
    id: encounter.id,
    name: encounter.name,
    roomId: undefined,
    phase: encounter.isActive ? 'active' : 'setup',
    participants: encounter.combatants.map((combatant, index) => ({
      id: combatant.id,
      name: combatant.name,
      type: combatant.type === 'player' ? 'player' : 'monster',
      initiativeScore: combatant.initiative,
      dexScore: 10,
      armorClass: combatant.armorClass,
      hitPoints: combatant.hitPoints,
      maxHitPoints: combatant.maxHitPoints,
      tempHitPoints: combatant.tempHitPoints,
      speed: 30,
      conditions: [...combatant.conditions],
      status: combatant.hitPoints <= 0 ? 'unconscious' : 'active',
      joinedOrder: index,
    })),
    initiativeOrder: encounter.combatants.map((combatant) => combatant.id),
    turn: {
      round: encounter.round,
      turnIndex: encounter.activeIndex,
      activeParticipantId: encounter.combatants[encounter.activeIndex]?.id ?? null,
      hasStarted: encounter.isActive,
    },
    createdAt: new Date().toISOString(),
    startedAt: encounter.isActive ? new Date().toISOString() : null,
    endedAt: null,
  };
}

function toEncounterState(combat: EngineCombatState): EncounterState {
  const order = combat.initiativeOrder.length
    ? combat.initiativeOrder
    : combat.participants.map((participant) => participant.id);
  const orderedParticipants = order
    .map((id) => combat.participants.find((participant) => participant.id === id) ?? null)
    .filter((participant): participant is EngineCombatState['participants'][number] => participant !== null);

  const combatants: Combatant[] = orderedParticipants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    type: participant.type === 'monster' ? 'enemy' : 'player',
    armorClass: participant.armorClass,
    hitPoints: participant.hitPoints,
    maxHitPoints: participant.maxHitPoints,
    tempHitPoints: participant.tempHitPoints,
    initiative: participant.initiativeScore ?? 0,
    conditions: [...participant.conditions],
    deathSaves: { successes: 0, failures: 0 },
  }));

  return {
    id: combat.id,
    name: combat.name,
    round: combat.turn.round,
    activeIndex: Math.max(
      0,
      combatatsLengthSafeIndex(combatants, combat.turn.activeParticipantId, combat.turn.turnIndex),
    ),
    isActive: combat.phase === 'active',
    combatants,
  };
}

function combatatsLengthSafeIndex(combatants: Combatant[], activeParticipantId: string | null, turnIndex: number) {
  if (!combatants.length) return 0;
  if (activeParticipantId) {
    const byId = combatants.findIndex((combatant) => combatant.id === activeParticipantId);
    if (byId >= 0) return byId;
  }
  return Math.max(0, Math.min(turnIndex, combatants.length - 1));
}

function companionToParticipant(companion: CompanionSheet): CombatParticipant {
  const dexScore = companion.characterSnapshot.abilities.dex ?? 10;
  return {
    id: companion.id,
    characterId: companion.id,
    name: companion.name,
    type: 'companion',
    initiativeScore: null,
    dexScore,
    armorClass: companion.characterSnapshot.armorClass,
    hitPoints: companion.characterSnapshot.hitPoints,
    maxHitPoints: companion.characterSnapshot.maxHitPoints,
    tempHitPoints: 0,
    speed: companion.characterSnapshot.speed,
    resistances: [],
    conditions: [...companion.characterSnapshot.conditions],
    status: companion.characterSnapshot.hitPoints <= 0 ? 'unconscious' : 'active',
    joinedOrder: 0,
  };
}

const defaultPermanentProgress: PermanentProgress = {
  userId: 'local',
  wardenPoints: 0,
  totalPoints: 0,
  unlockedClasses: [],
  unlockedRaces: [],
  unlockedRelics: [],
  unlockedItems: [],
  passiveBonuses: {
    startingGold: 10,
    startingHpBonus: 5,
    startingItems: 0,
    shopDiscount: 0,
  },
  runsCompleted: 0,
  runsAttempted: 0,
  bestFloor: 0,
};

function normalizeStartRunInput(
  inputOrPartyIds: StartRunInput | string[],
  positions?: Record<string, RunPosition>,
  sessionId?: string,
): StartRunInput {
  if (Array.isArray(inputOrPartyIds)) {
    return {
      partyIds: inputOrPartyIds,
      positions: positions ?? {},
      sessionId,
    };
  }

  return inputOrPartyIds;
}

function getWeaponDamage(character: Character): string {
  const equippedWeapon = character.inventory.items.find((item) => item.equipped && item.weapon);
  if (equippedWeapon?.weapon?.damageDice) return equippedWeapon.weapon.damageDice;

  const classDamage: Record<string, string> = {
    fighter: '1d8',
    barbarian: '1d12',
    rogue: '1d6',
    monk: '1d6',
    ranger: '1d8',
    paladin: '1d8',
    wizard: '1d4',
    sorcerer: '1d4',
    warlock: '1d6',
    cleric: '1d6',
    druid: '1d6',
    bard: '1d6',
  };

  return classDamage[character.className?.toLowerCase() ?? ''] ?? '1d6';
}

function buildRunSkills(character: VaultCharacter): RunSkill[] {
  const baseSkills: RunSkill[] = [
    {
      id: 'attack',
      name: 'Attack',
      kind: 'attack',
      cost: 0,
      dmg: getWeaponDamage(character),
      targets: [1, 2],
      melee: true,
    },
  ];

  const classData = CLASSES.find((classDefinition) => classDefinition.id === character.className?.toLowerCase());
  const classSkills: RunSkill[] = (classData?.features ?? [])
    .filter((feature) => feature.level <= character.level)
    .slice(0, 2)
    .map((feature) => ({
      id: feature.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      name: feature.name,
      kind: 'util',
      cost: feature.recoveryType === 'long' ? 2 : 1,
      val: feature.description,
      self: true,
      desc: feature.description,
    }));

  const spellIds = character.spellsKnown?.length ? character.spellsKnown : character.spells;
  const spellSkills: RunSkill[] = spellIds.slice(0, 3).map((spellId) => {
    const spell = SPELLS.find((item) => item.id === spellId);
    const spellLevel = spell?.level ?? 1;

    return {
      id: spell?.id ?? spellId,
      name: spell?.name ?? spellId,
      kind: spell?.damage ? 'attack' : spell?.school === 'abjuration' ? 'buff' : 'util',
      cost: spellLevel,
      dmg: spell?.damage?.dice,
      slots: spellLevel === 0 ? 1 : character.spellSlots[spellLevel]?.max ?? 0,
      used: spellLevel === 0 ? 0 : character.spellSlots[spellLevel]?.used ?? 0,
      targets: spell?.damage ? [1, 2, 3, 4] : undefined,
      melee: spell?.attackType === 'melee',
      desc: spell?.description,
    };
  });

  return [...baseSkills, ...classSkills, ...spellSkills].slice(0, 4);
}

function characterToRunCombatant(character: VaultCharacter, position: RunPosition, index: number, hpBonus: number): RunCombatant {
  const baseMaxHp = character.maxHitPoints ?? 10;
  const baseCurrentHp = character.hitPoints > 0 ? character.hitPoints : baseMaxHp;
  const maxHp = Math.max(1, baseMaxHp + hpBonus);
  const currentHp = Math.min(maxHp, Math.max(1, baseCurrentHp + hpBonus));

  return {
    id: character.id,
    name: character.name?.trim() || `${character.className ?? 'Warden'} ${character.level ?? 1}`,
    className: character.className,
    portrait: character.portraitUrl || character.className.toLowerCase(),
    color: index === 0 ? '#D6B25E' : '#9B5DE5',
    hp: currentHp,
    hpMax: maxHp,
    block: 0,
    pos: position,
    you: index === 0,
    down: currentHp <= 0,
    conds: character.activeConditions.map((condition) => ({
      k: condition,
      kind: 'debuff',
    })),
    skills: buildRunSkills(character),
  };
}

function selectFoePool(nodeType: NodeType): RunEnemy[] {
  if (nodeType === 'boss') {
    return wardenRunFoes.filter((foe) => foe.boss || foe.behavior === 'boss');
  }

  const nonBossFoes = wardenRunFoes.filter((foe) => !foe.boss && foe.behavior !== 'boss');
  if (nodeType === 'elite') {
    const eliteFoes = nonBossFoes.filter((foe) => foe.hp >= 38 || foe.behavior === 'defensive' || foe.behavior === 'caster');
    return eliteFoes.length ? eliteFoes : nonBossFoes;
  }

  return nonBossFoes.length ? nonBossFoes : wardenRunFoes;
}

function buildRunFoes(nodeType: NodeType, floor: number): RunCombatant[] {
  const pool = selectFoePool(nodeType);
  const count = nodeType === 'boss' ? 1 : Math.min(2 + Math.floor(floor / 2), 4, pool.length);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((foe, index) => {
    const scaledHp = Math.max(1, (foe.hpMax ?? foe.hp) + (floor - 1) * 5);

    return {
      id: `foe-${foe.id}-${index}`,
      name: foe.name,
      className: foe.behavior,
      portrait: foe.portrait ?? 'foe',
      color: foe.color ?? '#8B1538',
      hp: scaledHp,
      hpMax: scaledHp,
      block: 0,
      pos: Math.min(4, index + 1) as RunPosition,
      you: false,
      down: false,
      boss: foe.boss || foe.behavior === 'boss',
      conds: foe.conds ?? foe.conditions.map((condition) => ({ k: condition, kind: 'debuff' })),
      skills: foe.attacks.map((attack) => ({
        id: attack.id,
        name: attack.name,
        kind: 'attack',
        cost: 1,
        dmg: attack.damage,
        targets: [1, 2, 3, 4],
        melee: attack.type === 'melee',
        desc: `+${attack.bonus} to hit`,
      })),
      intent: foe.intent ?? { kind: 'attack', val: foe.attacks[0]?.damage ?? 'Attack', target: 'front' },
    };
  });
}

function rollRunInitiative(party: RunCombatant[], foes: RunCombatant[]): RunInitEntry[] {
  const entries: RunInitEntry[] = [
    ...party.map((combatant) => ({
      id: combatant.id,
      side: 'ally' as const,
      init: Math.floor(Math.random() * 20) + 1,
      name: combatant.name,
      portrait: combatant.portrait,
      color: combatant.color,
      down: combatant.down,
    })),
    ...foes.map((combatant) => ({
      id: combatant.id,
      side: 'foe' as const,
      init: Math.floor(Math.random() * 20) + 1,
      name: combatant.name,
      portrait: combatant.portrait,
      color: combatant.color,
      down: combatant.down,
    })),
  ].sort((a, b) => b.init - a.init);

  return entries.map((entry, index) => ({
    ...entry,
    now: index === 0,
    done: false,
  }));
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  combatState: null,
  sceneState: null,
  companionState: {
    companions: [],
  },
  partyChoiceState: {
    activeChoice: null,
    history: [],
  },
  journalState: { entries: [] },
  relationshipState: { records: [] },
  runState: null,
  gameMode: 'lobby',
  activeSession: null,
  sessionMembers: [],
  currentUserId: null,
  vaultCharacters: [],
  permanentProgress: defaultPermanentProgress,
  activeCharacter: null,
  classRuntime: null,
  raceRuntime: null,
  inventory: null,
  partyChoiceAiResponder: null,
  requestedGamePhase: null,
  clearRequestedGamePhase: () => set({ requestedGamePhase: null }),
  setCombatState: (combatState) => set({ combatState }),
  setSceneState: (sceneState) => set({ sceneState }),
  addCompanion: (companion) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.some((item) => item.id === companion.id)
          ? state.companionState.companions
          : [...state.companionState.companions, companion],
      },
    })),
  removeCompanion: (companionId) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.filter((item) => item.id !== companionId),
      },
    })),
  updateCompanion: (companion) =>
    set((state) => ({
      companionState: {
        companions: state.companionState.companions.map((item) =>
          item.id === companion.id ? companion : item,
        ),
      },
    })),
  setActivePartyChoice: (choice) =>
    set((state) => ({
      partyChoiceState: {
        ...state.partyChoiceState,
        activeChoice: choice,
      },
    })),
  clearActivePartyChoice: () =>
    set((state) => ({
      partyChoiceState: {
        ...state.partyChoiceState,
        activeChoice: null,
      },
    })),
  setPartyChoiceAiResponder: (responder) => set({ partyChoiceAiResponder: responder }),
  addJournalEntry: (entry) =>
    set((state) => ({ journalState: addEntry(state.journalState, entry) })),
  removeJournalEntry: (entryId) =>
    set((state) => ({ journalState: removeEntry(state.journalState, entryId) })),
  adjustAffinity: (characterId, npcId, npcName, delta, reason) =>
    set((state) => ({
      relationshipState: adjustAffinityEngine(state.relationshipState, characterId, npcId, npcName, delta, reason),
    })),
  setGameMode: (mode) => set({ gameMode: mode }),
  setRuntimeSession: (session) => set({ activeSession: session }),
  setRuntimeSessionMembers: (members) => set({ sessionMembers: members }),
  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  setVaultCharacters: (characters) => set({ vaultCharacters: characters }),
  setPermanentProgress: (progress) => set({ permanentProgress: progress }),
  startRun: (inputOrPartyIds, positions, sessionId) => {
    const gameMode = get().gameMode;
    const activeSession = get().activeSession;
    let nextRunState: RunState | null = null;
    set((state) => {
      const input = normalizeStartRunInput(inputOrPartyIds, positions, sessionId);
      const runSessionId = activeSession?.id ?? input.sessionId ?? crypto.randomUUID();
      const run = generateRun(runSessionId, 3, activeSession?.difficulty);
      const passiveBonuses = state.permanentProgress.passiveBonuses;
      const selectedCharacters = input.partyIds
        .map((id) => state.vaultCharacters.find((character) => character.id === id) ?? null)
        .filter((character): character is VaultCharacter => character !== null);
      const party = selectedCharacters.map((character, index) => {
        const fallbackPosition = Math.min(4, index + 1) as RunPosition;
        return characterToRunCombatant(
          character,
          input.positions[character.id] ?? fallbackPosition,
          index,
          passiveBonuses.startingHpBonus,
        );
      });
      const startingRelic = input.startingRelic
        ? WARDEN_RUN_RELICS.find((relic) => relic.id === input.startingRelic)
        : undefined;
      nextRunState = {
        ...run,
        partyCharacterIds: [...input.partyIds],
        partyPositions: { ...input.positions },
        gold: run.gold + passiveBonuses.startingGold,
        relics: startingRelic ? [startingRelic, ...run.relics] : run.relics,
        party,
      };

      return {
        runState: nextRunState,
      };
    });
    if (activeSession?.id && nextRunState) {
      void saveRunStateImmediate(activeSession.id, nextRunState);
      return;
    }
    persistRunState(gameMode, nextRunState);
  },
  selectNode: (nodeId) => {
    const current = get().runState;
    if (!current) return { error: 'No active run.' };
    const next = selectRunNode(current, nodeId);
    if ('error' in next) return next;
    const currentFloor = next.floors[next.currentFloor - 1];
    const currentNode = currentFloor?.nodes.find((node) => node.id === nodeId);

    if (currentNode && ['combat', 'elite', 'boss'].includes(currentNode.type)) {
      const foes = buildRunFoes(currentNode.type, next.currentFloor);
      const party = next.party ?? [];
      const nextRunState = {
        ...next,
        foes,
        initiativeOrder: rollRunInitiative(party, foes),
      };
      set({ runState: nextRunState });
      persistRunState(get().gameMode, nextRunState);
      return {};
    }

    const nextRunState = {
      ...next,
      foes: [],
      initiativeOrder: [],
    };
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
    return {};
  },
  completeNode: (nodeId, result) => {
    const current = get().runState;
    if (!current) return;
    const nextRunState = completeRunNode(current, nodeId, result);
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  addRunGold: (amount) => {
    const current = get().runState;
    if (!current) return;
    const nextRunState = addRunGold(current, amount);
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  spendRunGold: (amount) => {
    const current = get().runState;
    if (!current) return { error: 'No active run.' };
    const next = spendRunGold(current, amount);
    if ('error' in next) return next;
    set({ runState: next });
    persistRunState(get().gameMode, next);
    return {};
  },
  addRunRelic: (relic) => {
    const current = get().runState;
    if (!current) return;
    const nextRunState = addRunRelic(current, relic);
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  endRun: (victory) => {
    const current = get().runState;
    if (!current) return;
    const nextRunState: RunState = {
      ...current,
      status: victory ? 'victory' : 'defeat',
      endedAt: new Date().toISOString(),
    };
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  applyRunPartyHp: (characterId, delta) => {
    const { runState } = get();
    if (!runState?.party) return;
    const nextParty = runState.party.map((p) => {
      if (p.id !== characterId) return p;
      const newHp = Math.max(0, Math.min(p.hpMax, p.hp + delta));
      return { ...p, hp: newHp, down: newHp <= 0 };
    });
    const nextRunState = { ...runState, party: nextParty };
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  applyRunAllPartyHp: (delta) => {
    const { runState } = get();
    if (!runState?.party) return;
    const nextParty = runState.party.map((p) => {
      if (p.down) return p;
      const newHp = Math.max(0, Math.min(p.hpMax, p.hp + delta));
      return { ...p, hp: newHp, down: newHp <= 0 };
    });
    const nextRunState = { ...runState, party: nextParty };
    set({ runState: nextRunState });
    persistRunState(get().gameMode, nextRunState);
  },
  advanceRunTurn: () => {
    set((state) => {
      const { runState } = state;
      if (!runState) return {};
      const order = runState.initiativeOrder;
      if (!order?.length) return {};

      const currentIdx = order.findIndex((e) => e.now);
      const nextOrder = order.map((e) => ({ ...e, now: false }));

      let nextIdx = (currentIdx + 1) % order.length;
      let attempts = 0;
      while (attempts < order.length) {
        const nextEntry = order[nextIdx];
        const partyActor = runState.party?.find((p) => p.id === nextEntry.id);
        const foeActor = runState.foes?.find((f) => f.id === nextEntry.id);
        const isDead =
          (partyActor && (partyActor.hp <= 0 || partyActor.down)) ||
          (foeActor && (foeActor.hp <= 0 || foeActor.down)) ||
          runState.deadCharacterIds?.includes(nextEntry.id);
        if (!isDead) break;
        nextIdx = (nextIdx + 1) % order.length;
        attempts++;
      }

      nextOrder[nextIdx] = { ...nextOrder[nextIdx], now: true };

      return {
        runState: {
          ...runState,
          initiativeOrder: nextOrder,
        },
      };
    });
  },
  setActiveCharacter: (character) =>
    set({
      activeCharacter: character,
      classRuntime: mapClassRuntime(character),
      raceRuntime: mapRaceRuntime(character),
      inventory: mapInventory(character),
    }),
  getSceneContext: () => {
    const sceneState = get().sceneState;
    if (!sceneState) return null;
    return buildSceneContext(sceneState);
  },
  eventMeta: (characterId: string) => ({
    id: crypto.randomUUID(),
    sessionId: 'local',
    actorId: characterId,
    targetId: characterId,
    createdAt: nowIso(),
    source: 'user',
  }),
  dispatch: (event) => {
    if (event.type === 'CAST_SPELL') {
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const result = processCastSpell(currentCharacter, event as CastSpellEvent);
      set({
        activeCharacter: result.character,
        classRuntime: mapClassRuntime(result.character),
        raceRuntime: mapRaceRuntime(result.character),
        inventory: mapInventory(result.character),
      });
      result.sideEffects.forEach((sideEffect) => {
        void get().dispatch(sideEffect as GameEvent);
      });
      const failed = result.sideEffects
        .map((sideEffect) => (sideEffect as { error?: string }).error)
        .filter((error): error is string => Boolean(error));
      return { character: result.character, appliedCount: failed.length ? 0 : 1, failed };
    }

    if (event.type === 'CONCENTRATION_START') {
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const concentrationEvent = event as ConcentrationStartEvent;
      const nextCharacter = {
        ...currentCharacter,
        systemData: {
          ...currentCharacter.systemData,
          activeConcentration: {
            spellId: concentrationEvent.spellId,
            duration: concentrationEvent.duration,
            startedAt: new Date().toISOString(),
          },
        },
      };
      set({
        activeCharacter: nextCharacter,
        classRuntime: mapClassRuntime(nextCharacter),
        raceRuntime: mapRaceRuntime(nextCharacter),
        inventory: mapInventory(nextCharacter),
      });
      return { character: nextCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'CONCENTRATION_END') {
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const nextCharacter = processConcentrationEnd(currentCharacter, event as ConcentrationEndEvent);
      set({
        activeCharacter: nextCharacter,
        classRuntime: mapClassRuntime(nextCharacter),
        raceRuntime: mapRaceRuntime(nextCharacter),
        inventory: mapInventory(nextCharacter),
      });
      return { character: nextCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'CONCENTRATION_SAVE_CHECK') {
      const concentrationEvent = event as ConcentrationSaveCheckEvent;
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter?.systemData.activeConcentration) {
        return { character: currentCharacter, appliedCount: 0, failed: [] };
      }
      if (concentrationEvent.characterId !== currentCharacter.id) {
        return { character: currentCharacter, appliedCount: 0, failed: [] };
      }

      const conModifier = Math.floor(((currentCharacter.abilities.con ?? 10) - 10) / 2);
      const saveBonus = currentCharacter.systemData.featBonuses?.savingThrows?.con ?? 0;
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + conModifier + saveBonus;

      if (total < concentrationEvent.dc) {
        void get().dispatch({
          id: crypto.randomUUID(),
          type: 'CONCENTRATION_END',
          sessionId: concentrationEvent.sessionId,
          actorId: concentrationEvent.actorId,
          targetId: concentrationEvent.targetId,
          createdAt: new Date().toISOString(),
          source: 'system',
          characterId: concentrationEvent.characterId,
          reason: 'damage',
        });
      }

      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_CREATE_ENCOUNTER') {
      const result = processCombatCreateEncounter(event, {});
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to create encounter.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ADD_PARTICIPANT') {
      const activeCharacter = get().activeCharacter;
      if (!activeCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const result = processCombatAddParticipant(get().combatState, event, activeCharacter, {});
      if (!result.applied) {
        return { character: activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to add participant.'] };
      }
      get().setCombatState(result.combatState);
      return { character: activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_SET_INITIATIVE') {
      const result = processCombatSetInitiative(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to set initiative.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_SORT_INITIATIVE') {
      const activeCharacter = get().activeCharacter;
      if (!activeCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const result = processCombatSortInitiative(get().combatState, activeCharacter);
      if (!result.applied) {
        return { character: activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to sort initiative.'] };
      }
      get().setCombatState(result.combatState);
      return { character: activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ROLL_INITIATIVE') {
      const result = processCombatRollInitiative(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to roll initiative.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ADVANCE_TURN') {
      const activeCharacter = get().activeCharacter;
      if (!activeCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      const runtimeCharactersById = activeCharacter ? { [activeCharacter.id]: activeCharacter } : {};
      const result = processCombatAdvanceTurn(
        get().combatState,
        event,
        activeCharacter,
        runtimeCharactersById,
        get().companionState,
        (emittedEvent) => {
          void get().dispatch(emittedEvent);
        },
      );
      if (!result.applied) {
        return { character: activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to advance turn.'] };
      }
      get().setCombatState(result.combatState);
      return { character: activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_USE_ACTION') {
      const result = processCombatUseAction(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to use action.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_MOVE') {
      const result = processCombatMove(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to move combatant.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ATTACK') {
      const result = processCombatAttack(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to resolve attack.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_SET_TEMP_HP') {
      const result = processCombatSetTempHp(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to set temp HP.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ADJUST_DEATH_SAVE') {
      const result = processCombatAdjustDeathSave(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to adjust death save.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_ROLL_DEATH_SAVE') {
      const result = processCombatRollDeathSave(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to roll death save.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_SET_AI_BEHAVIOR') {
      const result = processCombatSetAiBehavior(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to set AI behavior.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_EXPIRE_CONDITIONS') {
      const result = processCombatExpireConditions(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to expire conditions.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_END_ENCOUNTER') {
      const result = processCombatEndEncounter(get().combatState, event);
      if (!result.applied) {
        return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to end encounter.'] };
      }
      get().setCombatState(result.combatState);
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'SHORT_REST') {
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      if (event.characterId !== currentCharacter.id) {
        return { character: currentCharacter, appliedCount: 0, failed: ['SHORT_REST characterId does not match active character.'] };
      }

      const nextCharacter = applyShortRest(currentCharacter, event.hitDiceSpent);
      set({
        activeCharacter: nextCharacter,
        classRuntime: mapClassRuntime(nextCharacter),
        raceRuntime: mapRaceRuntime(nextCharacter),
        inventory: mapInventory(nextCharacter),
      });
      return { character: nextCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'LONG_REST') {
      const currentCharacter = get().activeCharacter;
      if (!currentCharacter) {
        return { character: null, appliedCount: 0, failed: ['No active character in runtime store.'] };
      }
      if (event.characterId !== currentCharacter.id) {
        return { character: currentCharacter, appliedCount: 0, failed: ['LONG_REST characterId does not match active character.'] };
      }

      const nextCharacter = applyLongRest(currentCharacter);
      set({
        activeCharacter: nextCharacter,
        classRuntime: mapClassRuntime(nextCharacter),
        raceRuntime: mapRaceRuntime(nextCharacter),
        inventory: mapInventory(nextCharacter),
      });
      return { character: nextCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'apply_damage' || event.type === 'recover_hp' || event.type === 'apply_condition' || event.type === 'remove_condition') {
      const combatState = get().combatState;
      if (combatState && event.targetId) {
        const target = combatState.combatants.find((combatant) => combatant.id === event.targetId);
        if (target) {
          const result =
            event.type === 'apply_damage'
              ? processCombatApplyDamage(combatState, target.id, event.amount, event.damageType, event.isCritical, event.bypassTempHp)
              : event.type === 'recover_hp'
                ? processCombatRecoverHp(combatState, target.id, event.amount, event.recoveryKind)
                : event.type === 'apply_condition'
                  ? processCombatApplyCondition(combatState, target.id, event.condition, event.durationRounds, event.saveEnds)
                  : processCombatRemoveCondition(combatState, target.id, event.condition);
          if (!result.applied) {
            return { character: get().activeCharacter, appliedCount: 0, failed: [result.error ?? 'Failed to update combat target.'] };
          }
          get().setCombatState(result.combatState);
          const activeCharacter = get().activeCharacter;
          if (
            event.type === 'apply_damage' &&
            event.amount > 0 &&
            target.type === 'player' &&
            target.characterId &&
            activeCharacter?.id === target.characterId &&
            activeCharacter.systemData.activeConcentration
          ) {
            void get().dispatch({
              id: crypto.randomUUID(),
              type: 'CONCENTRATION_SAVE_CHECK',
              sessionId: event.sessionId,
              actorId: event.actorId,
              targetId: target.id,
              createdAt: new Date().toISOString(),
              source: 'system',
              characterId: target.characterId,
              dc: Math.max(10, Math.floor(event.amount / 2)),
              damage: event.amount,
            });
          }
          return { character: get().activeCharacter, appliedCount: 1, failed: [] };
        }
      }
    }

    if (event.type === 'COMPANION_SUMMON') {
      const currentCompanionState = get().companionState;
      const result = processCompanionSummon(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to summon companion.'],
        };
      }

      get().addCompanion(event.companion);

      const currentCombat = get().combatState;
      if (currentCombat) {
        const withCompanion = addParticipant(
          toEngineCombatState(currentCombat),
          companionToParticipant(event.companion),
          {},
        );
        get().setCombatState(toEncounterState(withCompanion));
      }

      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_DISMISS') {
      const currentCompanionState = get().companionState;
      const result = processCompanionDismiss(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to dismiss companion.'],
        };
      }
      get().removeCompanion(event.companionId);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_LOYALTY_CHANGE') {
      const currentCompanionState = get().companionState;
      const result = processCompanionLoyaltyChange(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to update companion loyalty.'],
        };
      }
      const updated = result.state.companions.find((companion) => companion.id === event.companionId);
      if (updated) {
        get().updateCompanion(updated);
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'COMPANION_ACTION') {
      const currentCompanionState = get().companionState;
      const result = processCompanionAction(currentCompanionState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to resolve companion action.'],
        };
      }
      const updated = result.state.companions.find((companion) => companion.id === event.companionId);
      if (updated) {
        get().updateCompanion(updated);
      }
      if (result.emittedEvents.length) {
        result.emittedEvents.forEach((emitted) => {
          void get().dispatch(emitted);
        });
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1 + result.emittedEvents.length,
        failed: [],
      };
    }

    if (event.type === 'PARTY_CHOICE_CREATED') {
      const partyState = get().partyChoiceState;
      const result = processPartyChoiceCreated(partyState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to create party choice.'],
        };
      }
      get().setActivePartyChoice(result.state.activeChoice as PartyChoice);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'PARTY_VOTE_CAST') {
      const partyState = get().partyChoiceState;
      const currentVotes = partyState.activeChoice?.votes.length ?? 0;
      const playerCount = Math.max(currentVotes + 1, 1);
      const result = processPartyVoteCast(partyState, event, playerCount);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to cast party vote.'],
        };
      }
      if (result.state.activeChoice) {
        get().setActivePartyChoice(result.state.activeChoice);
      }
      if (result.emittedEvents.length) {
        result.emittedEvents.forEach((emitted) => {
          void get().dispatch(emitted);
        });
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1 + result.emittedEvents.length,
        failed: [],
      };
    }

    if (event.type === 'PARTY_CHOICE_RESOLVED') {
      const partyState = get().partyChoiceState;
      const result = processPartyChoiceResolved(partyState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to resolve party choice.'],
        };
      }
      set({ partyChoiceState: result.state });
      const responder = get().partyChoiceAiResponder;
      if (responder) {
        void responder(`Party selected option: ${event.resolvedChoiceId}`);
      }
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'SCENE_TRANSITION') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processSceneTransition(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to transition scene.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'SCENE_OBJECTIVE_UPDATE') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processObjectiveUpdate(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to update objective.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'THREAT_CLOCK_ADVANCE') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: ['No active scene in runtime store.'],
        };
      }
      const result = processThreatClockAdvance(sceneState, event);
      if (!result.applied) {
        return {
          character: get().activeCharacter,
          appliedCount: 0,
          failed: [result.error ?? 'Failed to advance threat clock.'],
        };
      }
      get().setSceneState(result.scene);
      return {
        character: get().activeCharacter,
        appliedCount: 1,
        failed: [],
      };
    }

    if (event.type === 'GAME_PHASE_CHANGE') {
      set({ requestedGamePhase: event.phase });
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'COMBAT_REVERT_TURN') {
      return get().dispatch({
        id: event.id,
        type: 'COMBAT_ADVANCE_TURN',
        sessionId: event.sessionId,
        actorId: event.actorId,
        targetId: event.targetId,
        createdAt: event.createdAt,
        source: event.source,
        direction: -1,
      });
    }

    if (event.type === 'ADD_OBJECTIVE') {
      const sceneState = get().sceneState;
      if (!sceneState) {
        return { character: get().activeCharacter, appliedCount: 0, failed: ['No active scene for ADD_OBJECTIVE.'] };
      }
      const newObjective: SceneObjective = {
        id: crypto.randomUUID(),
        description: event.description,
        status: 'active',
        isHidden: false,
      };
      set({ sceneState: addObjective(sceneState, newObjective) });
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'CHANGE_RELATIONSHIP') {
      get().adjustAffinity(event.characterId, event.npcId, event.npcName, event.delta, event.reason ?? '');
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    if (event.type === 'ADD_JOURNAL_ENTRY') {
      get().addJournalEntry({
        id: crypto.randomUUID(),
        sessionId: event.sessionId,
        characterId: event.characterId,
        type: event.entryType,
        title: event.title,
        content: event.content,
        tags: [],
        createdAt: Date.now(),
      });
      return { character: get().activeCharacter, appliedCount: 1, failed: [] };
    }

    const currentCharacter = get().activeCharacter;
    if (!currentCharacter) {
      return {
        character: null,
        appliedCount: 0,
        failed: ['No active character in runtime store.'],
      };
    }

    const runtimeState = buildCharacterRuntimeState(currentCharacter);
    const queue = createEventQueueState([event]);
    const processed = processEventQueue(runtimeState, queue);
    const nextCharacter = processed.state.charactersById[currentCharacter.id] ?? currentCharacter;

    set({
      activeCharacter: nextCharacter,
      classRuntime: mapClassRuntime(nextCharacter),
      raceRuntime: mapRaceRuntime(nextCharacter),
      inventory: mapInventory(nextCharacter),
    });

    return {
      character: nextCharacter,
      appliedCount: processed.appliedEvents.length,
      failed: processed.failedEvents.map((item) => item.error),
    };
  },
}));

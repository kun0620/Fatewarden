import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { Field, Seg, Toggle } from './ui/Primitives';
import { useGameStore } from '../store/useGameStore';
import { InventoryPanel } from './InventoryPanel';
import { RunContent } from './Run/RunContent';
import { getSpell, SPELLS } from '../data/spells';
import { rollDice as rollFormula } from '../engine/dice/dice';
import { performAbilityCheck, performAttackRoll, performSavingThrow, performSkillCheck } from '../engine/dice/rollEngine';
import type { GameEvent } from '../engine/events/types';
import { abilityLabels, abilityModifier, initiativeModifier, savingThrowModifier, skillAbilityMap, skillModifier } from '../lib/rules';
import type { AbilityKey, AiChoice, AiConfirmAction, AiDmRequestMode, AiSuggestedRoll, Character, EncounterState, GameSession, RollMode, SessionMember, StoryMessage } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type LeftTab   = 'party' | 'char' | 'bag' | 'quests';
type RightTab  = 'dice' | 'combat' | 'ai' | 'tools';
type StoryTab  = 'story' | 'chat' | 'lore';
type ActionMode = 'speak' | 'act' | 'aside';

interface DiceResult {
  id?: string;
  die: string;
  label?: string;
  value: number;
  bonus: string;
  target?: number;
  total?: number;
  rolls?: number[];
  kind: 'crit' | 'success' | 'fumble' | 'failure';
}

interface PendingChange {
  kind: string;
  target?: string;
  amount?: number | string;
  source?: string;
  item?: string;
  by?: string;
  from?: string;
  aiProposed?: boolean;
}

export interface GameTableProps {
  user: User;
  activeSession: GameSession;
  character: Character | null;
  sessionMembers?: SessionMember[];
  messages: StoryMessage[];
  onLeave: () => void;
  onSendMessage?: (text: string, mode: ActionMode) => Promise<void>;
  onDiceRoll?: (result: DiceResult) => void;
  onUpdateCharacter?: (character: Character) => void | Promise<void>;
  onCombatChange?: (change: PendingChange) => void;
  onAskAiAction?: (text: string, mode: ActionMode, requestMode?: AiDmRequestMode) => Promise<void>;
  onConfirmAiAction?: (action: AiConfirmAction, message: StoryMessage) => Promise<void> | void;
  onSpellCast?: (spellId: string, slotLevel: number) => void;
  aiIsProcessing?: boolean;
  combatMode?: boolean;
  onToggleCombat?: (active: boolean) => void;
  /** Slot for CombatModeView (STEP 5 will provide this) */
  combatView?: React.ReactNode;
}

// ─── Helper: Convert character to party member display ───────────────────────

function charToPartyMember(char: Character, member?: SessionMember): PartyMember {
  return {
    id: member?.id ?? char.id,
    characterId: char.id,
    playerId: member?.playerId,
    name: char.name,
    cls: char.className,
    lvl: char.level,
    hp: char.hitPoints,
    hpMax: char.maxHitPoints,
    ac: char.armorClass,
    conditions: [...char.activeConditions],
    status: member?.status ?? 'online',
    color: '#7C3AED',
    initials: char.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(),
  };
}

function memberLabel(member: SessionMember, currentCharacter: Character | null) {
  if (currentCharacter && member.characterId === currentCharacter.id) return currentCharacter.name;
  const shortId = member.playerId.slice(0, 6).toUpperCase();
  return member.role === 'host' ? `Host ${shortId}` : `Player ${shortId}`;
}

function combatantMatchesMember(combatant: EncounterState['combatants'][number], member: SessionMember, character: Character | null) {
  if (member.characterId && (combatant.id === member.characterId || combatant.id === `pc-${member.characterId}` || combatant.id.includes(member.characterId))) return true;
  if (character && member.characterId === character.id && (combatant.id === character.id || combatant.name === character.name)) return true;
  return false;
}

function buildPartyMembers(
  character: Character | null,
  members: SessionMember[] | undefined,
  combatState: EncounterState | null,
  currentUserId: string,
): PartyMember[] {
  const activeMembers = (members ?? []).filter((member) => member.status !== 'kicked');
  if (!activeMembers.length) return character ? [charToPartyMember(character)] : [];

  return activeMembers.map((member) => {
    const isYou = member.playerId === currentUserId;
    const base = character && (member.characterId === character.id || isYou)
      ? charToPartyMember(character, member)
      : {
          id: member.id,
          characterId: member.characterId,
          playerId: member.playerId,
          name: memberLabel(member, character),
          cls: member.role === 'host' ? 'Host' : 'Player',
          lvl: 1,
          hp: 0,
          hpMax: 0,
          ac: 0,
          conditions: [],
          status: member.status,
          color: member.role === 'host' ? '#D6A84F' : '#7C3AED',
          initials: memberLabel(member, character).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        };
    const combatant = combatState?.combatants.find((nextCombatant) => combatantMatchesMember(nextCombatant, member, character));
    if (!combatant) return { ...base, you: isYou, down: base.hpMax > 0 && base.hp <= 0 };
    return {
      ...base,
      hp: combatant.hitPoints,
      hpMax: combatant.maxHitPoints,
      ac: combatant.armorClass,
      conditions: [...combatant.conditions],
      down: combatant.hitPoints <= 0,
      you: isYou,
    };
  });
}

interface SavedRoll {
  id: string;
  name: string;
  detail: string;
  icon: string;
  bonus: number;
  blood?: boolean;
}

interface QuestPanelItem {
  id: string;
  title: string;
  detail?: string;
  source: 'Scene' | 'Journal';
  status: 'active' | 'completed' | 'failed';
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function classifyRoll(sides: number, total: number): DiceResult['kind'] {
  if (sides === 20 && total === 20) return 'crit';
  if (sides === 20 && total === 1) return 'fumble';
  return 'success';
}

function rollQuickDie(sides: number): { total: number; rolls: number[] } {
  if (sides === 100) {
    const tens = rollFormula('1d10').rolls[0];
    const ones = rollFormula('1d10').rolls[0];
    const normalizedTens = tens === 10 ? 0 : tens;
    const normalizedOnes = ones === 10 ? 0 : ones;
    const total = normalizedTens === 0 && normalizedOnes === 0 ? 100 : normalizedTens * 10 + normalizedOnes;
    return { total, rolls: [tens, ones] };
  }

  const rolled = rollFormula(`1d${sides}`);
  return { total: rolled.subtotal, rolls: [...rolled.rolls] };
}

function buildSavedRolls(character: Character | null): SavedRoll[] {
  if (!character) return [];
  const proficiencyBonus = character.systemData.derivedStats?.proficiencyBonus
    ?? character.systemData.proficiencyBonus as number | undefined
    ?? Math.ceil(character.level / 4) + 1;
  const abilityMod = Math.max(
    Math.floor((character.abilities.str - 10) / 2),
    Math.floor((character.abilities.dex - 10) / 2),
  );
  const equippedWeapons = character.inventory.items
    .filter((item) => item.equipped && item.weapon)
    .slice(0, 3)
    .map<SavedRoll>((item) => ({
      id: `weapon-${item.id}`,
      name: item.name,
      detail: `Attack ${signed(abilityMod + proficiencyBonus)}`,
      icon: 'sword',
      bonus: abilityMod + proficiencyBonus,
    }));
  const spells = (character.spellsKnown?.length ? character.spellsKnown : character.spells)
    .slice(0, Math.max(0, 3 - equippedWeapons.length))
    .map<SavedRoll>((spell) => ({
      id: `spell-${spell}`,
      name: spell,
      detail: `Spell attack ${signed(character.systemData.derivedStats?.spellAttackBonus ?? proficiencyBonus)}`,
      icon: 'flame',
      bonus: character.systemData.derivedStats?.spellAttackBonus ?? proficiencyBonus,
    }));

  return [...equippedWeapons, ...spells];
}

type AiSuggestion = {
  message: StoryMessage;
  action: AiConfirmAction;
};

function normalizeMessageChoice(choice: unknown, index: number): AiChoice | null {
  if (typeof choice === 'string') {
    return {
      number: index + 1,
      label: choice,
      prompt: choice,
      intent: 'custom',
    };
  }

  if (!choice || typeof choice !== 'object') return null;
  const record = choice as Record<string, unknown>;
  const label = typeof record.label === 'string' ? record.label : '';
  const prompt = typeof record.prompt === 'string' ? record.prompt : label;
  if (!label && !prompt) return null;

  return {
    number: typeof record.number === 'number' ? record.number : index + 1,
    label: label || prompt,
    prompt,
    intent: typeof record.intent === 'string' ? (record.intent as AiChoice['intent']) : 'custom',
    suggestedRoll: record.suggestedRoll as AiChoice['suggestedRoll'],
  };
}

function getMessageChoices(message: StoryMessage): AiChoice[] {
  const choices = message.metadata?.choices;
  if (Array.isArray(choices)) {
    return choices
      .map((choice, index) => normalizeMessageChoice(choice, index))
      .filter((choice): choice is AiChoice => Boolean(choice))
      .slice(0, 4);
  }

  const scene = message.metadata?.scene;
  if (scene && typeof scene === 'object') {
    const nextActions = (scene as Record<string, unknown>).nextActions;
    if (Array.isArray(nextActions)) {
      return nextActions
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 4)
        .map((item, index) => ({
          number: index + 1,
          label: item,
          prompt: item,
          intent: 'custom',
        }));
    }
  }

  return [];
}

function getMessageSuggestedRoll(message: StoryMessage): AiSuggestedRoll | null {
  const suggestedRoll = message.metadata?.suggestedRoll;
  if (!suggestedRoll || typeof suggestedRoll !== 'object') return null;
  return suggestedRoll as AiSuggestedRoll;
}

function normalizeSuggestedSkill(skill?: string) {
  if (!skill) return undefined;
  return Object.keys(skillAbilityMap).find((knownSkill) => knownSkill.toLowerCase() === skill.toLowerCase()) ?? skill;
}

function resolveSuggestedAbility(suggestedRoll: AiSuggestedRoll): AbilityKey {
  const skill = normalizeSuggestedSkill(suggestedRoll.skill);
  if (suggestedRoll.ability) return suggestedRoll.ability;
  if (skill && skillAbilityMap[skill]) return skillAbilityMap[skill];
  return 'wis';
}

function resolveSuggestedModifier(character: Character, suggestedRoll: AiSuggestedRoll) {
  const skill = normalizeSuggestedSkill(suggestedRoll.skill);
  const ability = resolveSuggestedAbility(suggestedRoll);
  if (suggestedRoll.type === 'initiative') return initiativeModifier(character);
  if (suggestedRoll.type === 'save') return savingThrowModifier(character, ability);
  if (skill) return skillModifier(character, skill);
  return abilityModifier(character.abilities[ability]);
}

function resolveSuggestedRollMode(suggestedRoll: AiSuggestedRoll): RollMode {
  return suggestedRoll.mode === 'advantage' || suggestedRoll.mode === 'disadvantage' ? suggestedRoll.mode : 'normal';
}

function formatSuggestedRollTitle(suggestedRoll: AiSuggestedRoll) {
  const skill = normalizeSuggestedSkill(suggestedRoll.skill);
  const ability = resolveSuggestedAbility(suggestedRoll);
  const base = suggestedRoll.label
    ?? (skill
      ? `${skill} Check`
      : suggestedRoll.type === 'save'
      ? `${abilityLabels[ability]} Save`
      : suggestedRoll.type === 'initiative'
      ? 'Initiative'
      : suggestedRoll.type === 'attack'
      ? 'Attack Roll'
      : `${abilityLabels[ability]} Check`);
  return suggestedRoll.dc ? `${base} · DC ${suggestedRoll.dc}` : base;
}

function rollSuggestedCheck(character: Character, suggestedRoll: AiSuggestedRoll): DiceResult {
  const modifier = resolveSuggestedModifier(character, suggestedRoll);
  const mode = resolveSuggestedRollMode(suggestedRoll);
  const rollContext = {
    abilityModifier: modifier,
    proficiencyBonus: 0,
    isProficient: false,
    advantageState: mode,
  };
  const result = suggestedRoll.type === 'save'
    ? performSavingThrow(rollContext)
    : suggestedRoll.type === 'attack'
    ? performAttackRoll(rollContext)
    : suggestedRoll.type === 'ability' || suggestedRoll.type === 'initiative' || !suggestedRoll.skill
    ? performAbilityCheck(rollContext)
    : performSkillCheck(rollContext);
  const total = result.outcome.total;
  return {
    die: mode === 'normal' ? '1d20' : `1d20 ${mode}`,
    label: formatSuggestedRollTitle(suggestedRoll),
    value: result.keptRoll ?? result.outcome.natural ?? total,
    bonus: signed(result.modifierTotal),
    target: suggestedRoll.dc,
    total,
    rolls: [...result.dice.rolls],
    kind: result.outcome.isCriticalSuccess
      ? 'crit'
      : result.outcome.isCriticalFailure
      ? 'fumble'
      : suggestedRoll.dc && total < suggestedRoll.dc
      ? 'failure'
      : 'success',
  };
}

function formatDiceResultPrompt(result: DiceResult, suggestedRoll: AiSuggestedRoll) {
  const outcome = suggestedRoll.dc
    ? result.total && result.total >= suggestedRoll.dc
      ? 'success'
      : 'failure'
    : 'rolled';
  return [
    `Dice result: ${result.label ?? 'Suggested roll'}`,
    `Roll: ${result.die} ${result.bonus} = ${result.total ?? result.value}`,
    suggestedRoll.dc ? `DC: ${suggestedRoll.dc} (${outcome})` : undefined,
    suggestedRoll.reason ? `Reason: ${suggestedRoll.reason}` : undefined,
    'Narrate the outcome and propose any canon state changes as confirmable events.',
  ].filter(Boolean).join('\n');
}

function getSuggestedActions(messages: StoryMessage[]): string[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const actions = getMessageChoices(messages[index]);
    if (actions.length) return actions.map((action) => action.prompt);
  }
  return [];
}

function getLatestAiSuggestion(messages: StoryMessage[], dismissedIds: Set<string>): AiSuggestion | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const actions = message.metadata?.confirmActions;
    if (!Array.isArray(actions)) continue;
    const confirmedIds = new Set(
      Array.isArray(message.metadata?.confirmedActions)
        ? (message.metadata.confirmedActions as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
    );
    const action = (actions as AiConfirmAction[]).find((item) => {
      const key = `${message.id}:${item.id}`;
      return !dismissedIds.has(key) && !confirmedIds.has(item.id);
    });
    if (action) return { message, action };
  }
  return null;
}

function getMessageConfirmActions(message: StoryMessage, dismissedIds: Set<string>) {
  const actions = message.metadata?.confirmActions;
  if (!Array.isArray(actions)) return [];
  const confirmedIds = new Set(
    Array.isArray(message.metadata?.confirmedActions)
      ? (message.metadata.confirmedActions as unknown[]).filter((value): value is string => typeof value === 'string')
      : [],
  );
  return (actions as AiConfirmAction[]).filter((action) => {
    const key = `${message.id}:${action.id}`;
    return !dismissedIds.has(key) && !confirmedIds.has(action.id);
  });
}

function getStoryKind(message: StoryMessage) {
  return typeof message.metadata?.kind === 'string' ? message.metadata.kind : message.speaker;
}

function matchesStoryTab(tab: StoryTab, message: StoryMessage) {
  if (tab === 'story') return true;
  const kind = getStoryKind(message);
  const mode = typeof message.metadata?.mode === 'string' ? message.metadata.mode : '';
  if (tab === 'chat') {
    return message.speaker === 'player' || kind === 'player_action' || mode === 'speak' || mode === 'aside';
  }
  return Boolean(
    message.metadata?.scene ||
    kind === 'scene_opening' ||
    kind === 'scene_objective' ||
    kind === 'dm_prompt' ||
    kind === 'rest_summary',
  );
}

function getStoryTabEmptyText(tab: StoryTab) {
  if (tab === 'chat') return 'No table chat yet.';
  if (tab === 'lore') return 'No lore or scene notes yet.';
  return 'No story messages yet.';
}

function formatStoryTime(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed);
}

function buildQuestItems(
  sceneState: ReturnType<typeof useGameStore.getState>['sceneState'],
  journalEntries: ReturnType<typeof useGameStore.getState>['journalState']['entries'],
): QuestPanelItem[] {
  const sceneObjectives = (sceneState?.objectives ?? [])
    .filter((objective) => !objective.isHidden)
    .map<QuestPanelItem>((objective) => ({
      id: `objective-${objective.id}`,
      title: objective.description,
      source: 'Scene',
      status: objective.status,
    }));

  const journalQuests = journalEntries
    .filter((entry) => entry.type === 'quest_update')
    .map<QuestPanelItem>((entry) => {
      const lowerTags = entry.tags.map((tag) => tag.toLowerCase());
      const completed = lowerTags.some((tag) => tag === 'completed' || tag === 'complete' || tag === 'done');
      const failed = lowerTags.some((tag) => tag === 'failed' || tag === 'failure');
      return {
        id: `journal-${entry.id}`,
        title: entry.title,
        detail: entry.content,
        source: 'Journal',
        status: failed ? 'failed' : completed ? 'completed' : 'active',
      };
    });

  return [...sceneObjectives, ...journalQuests];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GameTable({
  user,
  activeSession,
  character,
  sessionMembers,
  messages,
  onLeave,
  onSendMessage,
  onDiceRoll,
  onUpdateCharacter,
  onCombatChange,
  onAskAiAction,
  onConfirmAiAction,
  onSpellCast,
  aiIsProcessing = false,
  combatMode = false,
  onToggleCombat,
  combatView,
}: GameTableProps) {
  const { sceneState, combatState, journalState, activeCharacter, setActiveCharacter, dispatch, eventMeta, gameMode, runState } = useGameStore();
  const tableCharacter = character ?? activeCharacter;

  const [leftTab,      setLeftTab]      = useState<LeftTab>('party');
  const [rightTab,     setRightTab]     = useState<RightTab>('dice');
  const [storyTab,     setStoryTab]     = useState<StoryTab>('story');
  const [actionDraft,  setActionDraft]  = useState('');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [diceResult,   setDiceResult]   = useState<DiceResult | null>(null);
  const [rollHistory, setRollHistory] = useState<DiceResult[]>([]);
  const [rolling, setRolling] = useState(false);
  const [aiOn,    setAiOn]    = useState(true);
  const [aiTone,  setAiTone]  = useState('Balanced');
  const [aiStrict, setAiStrict] = useState('Standard');
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [dismissedAiSuggestionIds, setDismissedAiSuggestionIds] = useState<Set<string>>(() => new Set());
  const [busyConfirmActionId, setBusyConfirmActionId] = useState<string | null>(null);

  const storyRef = useRef<HTMLDivElement>(null);

  const handleChange = (change: PendingChange) => {
    onCombatChange?.(change);
    setPendingChange(change);
  };

  const handleEndConcentration = () => {
    if (!tableCharacter) return;

    setActiveCharacter(tableCharacter);
    const result = dispatch({
      ...eventMeta(tableCharacter.id),
      type: 'CONCENTRATION_END',
      characterId: tableCharacter.id,
      reason: 'manual',
    });

    if (result.character) {
      setActiveCharacter(result.character);
      void onUpdateCharacter?.(result.character);
    }
  };

  const recordRoll = (result: DiceResult) => {
    const nextResult = { ...result, id: result.id ?? crypto.randomUUID() };
    setDiceResult(nextResult);
    setRollHistory((current) => [nextResult, ...current].slice(0, 5));
    onDiceRoll?.(nextResult);
  };

  const rollDie = (sides = 20, label?: string) => {
    setRolling(true);
    setTimeout(() => {
      const rolled = rollQuickDie(sides);
      const result: DiceResult = {
        die: `1d${sides}`,
        label: label ?? `d${sides}`,
        value: rolled.total,
        bonus: '',
        total: rolled.total,
        rolls: rolled.rolls,
        kind: classifyRoll(sides, rolled.total),
      };
      recordRoll(result);
      setRolling(false);
    }, 450);
  };

  const rollSaved = (savedRoll: SavedRoll) => {
    setRolling(true);
    setTimeout(() => {
      const result = performAttackRoll({
        abilityModifier: savedRoll.bonus,
        proficiencyBonus: 0,
        isProficient: false,
      });
      recordRoll({
        die: '1d20',
        label: savedRoll.name,
        value: result.keptRoll ?? result.outcome.natural ?? result.outcome.total,
        bonus: signed(savedRoll.bonus),
        target: 10,
        total: result.outcome.total,
        rolls: [...result.dice.rolls],
        kind: result.outcome.isCriticalSuccess
          ? 'crit'
          : result.outcome.isCriticalFailure
          ? 'fumble'
          : result.outcome.total >= 10
          ? 'success'
          : 'failure',
      });
      setRolling(false);
    }, 450);
  };

  const handleSend = async (mode: ActionMode) => {
    if (!actionDraft.trim()) return;
    const body = actionDraft;
    if (onAskAiAction) {
      await onAskAiAction(body, mode);
    } else {
      await onSendMessage?.(body, mode);
    }
    setActionDraft('');
  };
  const handleChoiceSelect = async (choice: AiChoice) => {
    const prompt = choice.prompt || choice.label;
    if (!prompt.trim()) return;
    setActionDraft(prompt);
    if (onAskAiAction) {
      await onAskAiAction(prompt, 'act');
    } else {
      await onSendMessage?.(prompt, 'act');
    }
    setActionDraft('');
  };
  const handleSuggestedRoll = async (message: StoryMessage, suggestedRoll: AiSuggestedRoll) => {
    if (!tableCharacter) return;
    setRolling(true);
    window.setTimeout(() => {
      void (async () => {
        try {
          const result = rollSuggestedCheck(tableCharacter, suggestedRoll);
          recordRoll(result);
          if (onAskAiAction) {
            await onAskAiAction(`${formatDiceResultPrompt(result, suggestedRoll)}\nSource message: ${message.id ?? 'latest AI roll request'}`, 'act', 'dice_result');
          } else {
            await onSendMessage?.(`${formatDiceResultPrompt(result, suggestedRoll)}\nSource message: ${message.id ?? 'latest AI roll request'}`, 'act');
          }
        } finally {
          setRolling(false);
        }
      })();
    }, 450);
  };
  const handleConfirmAiSuggestion = async (action: AiConfirmAction, message: StoryMessage) => {
    const suggestionId = `${message.id}:${action.id}`;
    setBusyConfirmActionId(suggestionId);
    try {
      await onConfirmAiAction?.(action, message);
      setDismissedAiSuggestionIds((current) => new Set(current).add(suggestionId));
    } finally {
      setBusyConfirmActionId(null);
    }
  };
  const handleDismissAiSuggestion = (action: AiConfirmAction, message: StoryMessage) => {
    setDismissedAiSuggestionIds((current) => new Set(current).add(`${message.id}:${action.id}`));
  };
  const handleSpendResource = async (resourceId: string, amount = 1) => {
    if (!tableCharacter) return;
    const event: GameEvent = {
      ...eventMeta(tableCharacter.id),
      type: 'SPEND_RESOURCE',
      characterId: tableCharacter.id,
      resourceId,
      amount,
    };
    const result = dispatch(event);
    if (result.character) {
      await onUpdateCharacter?.(result.character);
    }
  };
  const suggestedActions = getSuggestedActions(messages);
  const latestAiSuggestion = getLatestAiSuggestion(messages, dismissedAiSuggestionIds);
  const visibleStoryMessages = messages.filter((message) => matchesStoryTab(storyTab, message));
  const partyMembers = buildPartyMembers(tableCharacter, sessionMembers, combatState, user.id);
  const questItems = buildQuestItems(sceneState, journalState.entries);
  const visibleRightTabs = ([
    { id: 'dice',   label: 'Dice',      icon: 'dice'   },
    { id: 'combat', label: 'Combat',    icon: 'sword'  },
    { id: 'ai',     label: 'AI Warden', icon: 'wand'   },
    { id: 'tools',  label: 'Tools',     icon: 'cog'    },
  ] as { id: RightTab; label: string; icon: string }[]).filter((tab) => (
    gameMode !== 'warden_run' || tab.id !== 'ai'
  ));

  useEffect(() => {
    if (gameMode === 'warden_run' && rightTab === 'ai') {
      setRightTab('dice');
    }
  }, [gameMode, rightTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Session Banner */}
      <GtSessionBanner
        session={activeSession}
        combatMode={combatMode}
        onToggleCombat={() => onToggleCombat?.(!combatMode)}
        onLeave={onLeave}
        party={partyMembers}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr 320px',
        flex: 1,
        minHeight: 0,
        gap: 0,
        borderTop: '1px solid var(--border-soft)',
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          borderRight: '1px solid var(--border-soft)',
          background: 'linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {([
              { id: 'party',  label: 'Party',     icon: 'users'  },
              { id: 'char',   label: 'You',        icon: 'user'   },
              { id: 'bag',    label: 'Inventory',  icon: 'bag'    },
              { id: 'quests', label: 'Quests',     icon: 'scroll' },
            ] as { id: LeftTab; label: string; icon: string }[]).map(t => (
              <button
                key={t.id}
                type="button"
                className={'fw-tab ' + (leftTab === t.id ? 'active' : '')}
                onClick={() => setLeftTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 8px', flex: 1, justifyContent: 'center' }}
              >
                {Icon(t.icon, { size: 11 })} {t.label}
              </button>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {leftTab === 'party'  && <GtPartyPanel party={partyMembers} hasSessionMembers={Boolean(sessionMembers?.length)} />}
            {leftTab === 'char'   && (
              <GtCharPanel
                character={tableCharacter}
                onEndConcentration={handleEndConcentration}
                onSpendResource={handleSpendResource}
                onSpellCast={onSpellCast}
              />
            )}
            {leftTab === 'bag'    && (tableCharacter
              ? <InventoryPanel character={tableCharacter} onUpdateCharacter={onUpdateCharacter ?? ((nextCharacter) => setActiveCharacter(nextCharacter))} />
              : <GtInventoryStub onUse={handleChange} />
            )}
            {leftTab === 'quests' && <GtQuestsPanel quests={questItems} />}
          </div>
        </aside>

        {/* ── CENTER ── */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'linear-gradient(180deg, rgba(20,17,29,0.2), rgba(11,10,16,0))',
        }}>
          {combatMode && combatView ? combatView : gameMode === 'warden_run' ? <RunContent /> : (
            <>
              <GtSceneHeader sceneState={sceneState} />

              {/* Story tabs */}
              <div className="fw-tabs" style={{ paddingInline: 18, marginTop: 4 }}>
                {([
                  { id: 'story', label: 'Story Log',   icon: 'scroll' },
                  { id: 'chat',  label: 'Table Chat',  icon: 'users'  },
                  { id: 'lore',  label: 'Lore',        icon: 'book'   },
                ] as { id: StoryTab; label: string; icon: string }[]).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={'fw-tab ' + (storyTab === t.id ? 'active' : '')}
                    onClick={() => setStoryTab(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {Icon(t.icon, { size: 11 })} {t.label}
                  </button>
                ))}
                <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBlock: 4 }}>
                  {activeSession?.title && (
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {activeSession.title} · ongoing
                  </span>
                )}
                  <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled title="Story search is not wired yet." type="button">
                    {Icon('search', { size: 12 })}
                  </button>
                </div>
              </div>

              {/* Story log */}
              <div ref={storyRef} className="fw-scroll" style={{ flex: 1, padding: '18px 28px', minHeight: 0 }}>
                {messages.length === 0 ? (
                  <GtOnboardingCard
                    onAskAi={async () => {
                      const prompt = 'เริ่มการผจญภัย: เปิดฉากแรกให้สั้น กระชับ มีบรรยากาศ เป้าหมายแรก และทางเลือกถัดไป';
                      if (onAskAiAction) {
                        await onAskAiAction(prompt, 'act');
                      } else {
                        await onSendMessage?.(prompt, 'act');
                      }
                    }}
                    onSetScene={() => setShowSceneModal(true)}
                  />
                ) : visibleStoryMessages.length === 0 ? (
                  <GtEmptyStoryTab label={getStoryTabEmptyText(storyTab)} />
                ) : visibleStoryMessages.map((msg, i) => (
                  <GtStoryEntry
                    key={msg.id ?? i}
                    message={msg}
                    character={tableCharacter}
                    rolling={rolling}
                    onChoiceSelect={handleChoiceSelect}
                    onSuggestedRoll={handleSuggestedRoll}
                    dismissedSuggestionIds={dismissedAiSuggestionIds}
                    busyConfirmActionId={busyConfirmActionId}
                    onConfirmAction={handleConfirmAiSuggestion}
                    onDismissAction={handleDismissAiSuggestion}
                  />
                ))}
                {diceResult && <GtRollRequest dice={diceResult} onRoll={() => rollDie(20)} rolling={rolling} />}
              </div>

              <GtActionInput
                value={actionDraft}
                setValue={setActionDraft}
                suggestions={suggestedActions}
                onCommitSuggestion={async (suggestion, mode) => {
                  setActionDraft(suggestion);
                  if (onAskAiAction) {
                    await onAskAiAction(suggestion, mode);
                  } else {
                    await onSendMessage?.(suggestion, mode);
                  }
                  setActionDraft('');
                }}
                onSend={handleSend}
                onRollDice={() => rollDie(20)}
                busy={aiIsProcessing}
              />
            </>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside style={{
          borderLeft: '1px solid var(--border-soft)',
          background: 'linear-gradient(180deg, rgba(20,17,29,0.5), rgba(11,10,16,0.2))',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div className="fw-tabs" style={{ paddingInline: 8 }}>
            {visibleRightTabs.map(t => (
              <button
                key={t.id}
                type="button"
                className={'fw-tab ' + (rightTab === t.id ? 'active' : '')}
                onClick={() => setRightTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 6px', flex: 1, justifyContent: 'center', fontSize: 10 }}
              >
                {Icon(t.icon, { size: 11 })} {t.label}
              </button>
            ))}
          </div>

          <div className="fw-scroll" style={{ flex: 1, padding: 14 }}>
            {rightTab === 'dice'   && (
              <GtDicePanel
                character={tableCharacter}
                history={rollHistory}
                result={diceResult}
                onRoll={rollDie}
                onSavedRoll={rollSaved}
                rolling={rolling}
              />
            )}
            {rightTab === 'combat' && <GtCombatPanel encounter={combatState} />}
            {rightTab === 'ai'     && (
              <GtAIDMPanel
                latestSuggestion={latestAiSuggestion}
                on={aiOn}
                onAcceptSuggestion={handleConfirmAiSuggestion}
                onAskAiAction={onAskAiAction}
                onDismissSuggestion={(id) => setDismissedAiSuggestionIds((current) => new Set(current).add(id))}
                setOn={setAiOn}
                tone={aiTone}
                setTone={setAiTone}
                strict={aiStrict}
                setStrict={setAiStrict}
              />
            )}
            {rightTab === 'tools'  && <GtToolsPanel />}
          </div>
        </aside>
      </div>

      {gameMode === 'warden_run' && runState && (
        <div className="wr-status-strip">
          <span className="fw-caption">
            FLOOR {runState.currentFloor} / {runState.floors.length}
          </span>
          <span className="fw-caption fw-mono">
            ⬡ {runState.gold}
          </span>
          <span className="fw-caption">
            ◈ {runState.relics?.length ?? 0} RELICS
          </span>
        </div>
      )}

      {pendingChange && (
        <GtConfirmModal change={pendingChange} onClose={() => setPendingChange(null)} />
      )}
      {showSceneModal && (
        <GtManualSceneModal
          sessionId={sceneState?.sessionId ?? activeSession.id}
          actorId={tableCharacter?.id ?? user.id}
          onClose={() => setShowSceneModal(false)}
        />
      )}
    </div>
  );
}

// ─── Session Banner ───────────────────────────────────────────────────────────

interface SessionBannerProps {
  session: GameSession;
  combatMode: boolean;
  onToggleCombat: () => void;
  onLeave: () => void;
  party: PartyMember[];
}

function GtSessionBanner({ session, combatMode, onToggleCombat, onLeave, party }: SessionBannerProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px',
      background: combatMode
        ? 'linear-gradient(180deg, rgba(153,27,27,0.10), transparent)'
        : 'linear-gradient(180deg, rgba(124,58,237,0.05), transparent)',
      borderBottom: '1px solid var(--border-soft)',
      transition: 'background 0.3s',
    }}>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={onLeave}>
        {Icon('chevL', { size: 11 })} Leave table
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {combatMode ? (
          <span className="fw-pill blood" style={{ animation: 'fw-glow-pulse 2s infinite' }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Combat · Active
          </span>
        ) : (
          <span className="fw-pill blood">
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Live
          </span>
        )}
        <span className="fw-display" style={{ fontSize: 14, letterSpacing: '0.08em', color: 'var(--text)' }}>
          {session?.title ?? 'Untitled Session'}
        </span>
        {session?.theme?.tone && (
          <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--text-3)', fontSize: 13 }}>
            · {session.theme.tone}
          </span>
        )}
      </div>

      <span style={{ flex: 1 }} />

      <button
        className={'fw-btn ' + (combatMode ? 'fw-btn-blood' : 'fw-btn-ghost') + ' fw-btn-sm'}
        onClick={onToggleCombat}
      >
        {Icon(combatMode ? 'scroll' : 'sword', { size: 12 })} {combatMode ? 'Resume story' : 'Run encounter'}
      </button>

      <div style={{ display: 'flex', marginRight: 4, marginLeft: 8 }}>
        {party.slice(0, 4).map((p: PartyMember, i: number) => (
          <div
            key={p.id}
            className={'fw-avatar sm ' + (p.you ? 'dm' : '')}
            style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.color}33, #15101f)`, position: 'relative' }}
          >
            {p.initials}
            <span className="dot" style={{ background: p.down ? 'var(--blood)' : p.you ? 'var(--gold)' : 'var(--success)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled title="Voice controls are not wired yet." type="button">{Icon('mic',    { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled title="Audio controls are not wired yet." type="button">{Icon('volume', { size: 14 })}</button>
        <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled title="Table menu is not wired yet." type="button">{Icon('kebab',  { size: 14 })}</button>
      </div>
    </div>
  );
}

// ─── Left: Party Panel ────────────────────────────────────────────────────────

interface PartyMember {
  id: string; characterId?: string; playerId?: string; name: string; cls: string; lvl: number;
  hp: number; hpMax: number; ac: number;
  conditions: string[]; status: SessionMember['status'];
  you?: boolean; down?: boolean; color: string; initials: string;
}

function GtPartyPanel({ party, hasSessionMembers }: { party: PartyMember[]; hasSessionMembers: boolean }) {
  if (!party.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Party</div>
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
          Solo session
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 2 }}>Party</div>
      {!hasSessionMembers && (
        <div className="fw-pill" style={{ alignSelf: 'flex-start' }}>Solo session</div>
      )}
      {party.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: 'flex', gap: 10, padding: 10,
            background: p.you ? 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))' : 'var(--surface)',
            border: '1px solid ' + (p.you ? 'rgba(214,168,79,0.4)' : p.down ? 'rgba(153,27,27,0.4)' : 'var(--border-soft)'),
            borderRadius: 8, position: 'relative', opacity: p.down ? 0.85 : 1,
          }}
        >
          {i === 0 && <span style={{ position: 'absolute', left: -1, top: 8, bottom: 8, width: 2, background: 'var(--gold)', borderRadius: 2 }} />}
          <div className="fw-avatar" style={{ background: `linear-gradient(135deg, ${p.color}33, #15101f)`, borderColor: p.down ? 'var(--blood)' : 'var(--border)' }}>
            {p.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{p.name}</div>
              {p.you  && <span className="fw-pill gold"  style={{ padding: '0 6px', fontSize: 9 }}>You</span>}
              <span className={`fw-pill ${p.status === 'online' ? '' : 'blood'}`} style={{ padding: '0 6px', fontSize: 9 }}>{p.status}</span>
              {p.down && <span className="fw-pill blood" style={{ padding: '0 6px', fontSize: 9 }}>Down</span>}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{p.cls} · Lv {p.lvl}</div>
            <div className="fw-stat-bar" style={{ marginTop: 6 }}>
              <span className="lbl">HP</span>
              <div className="fw-bar hp bar"><i style={{ width: p.hpMax > 0 ? `${Math.max(0, Math.min(100, (p.hp / p.hpMax) * 100))}%` : '0%' }} /></div>
              <span className="num">{p.hpMax > 0 ? `${p.hp}/${p.hpMax}` : '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
              <span>AC <b style={{ color: 'var(--text)' }}>{p.ac || '—'}</b></span>
              {p.down && <span style={{ color: 'var(--blood-bright)' }}>Death saves pending</span>}
            </div>
            {p.conditions.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {p.conditions.map((condition) => (
                  <span className="fw-pill blood" key={condition} style={{ padding: '0 6px', fontSize: 9 }}>{condition}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Left: Character Panel ────────────────────────────────────────────────────

function GtCharPanel({
  character,
  onEndConcentration,
  onSpendResource,
  onSpellCast,
}: {
  character: Character | null;
  onEndConcentration: () => void;
  onSpendResource: (resourceId: string, amount?: number) => Promise<void> | void;
  onSpellCast?: (spellId: string, slotLevel: number) => void;
}) {
  if (!character) {
    return (
      <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
        No character selected
      </div>
    );
  }
  const name     = character.name;
  const cls      = character.className;
  const lvl      = character.level;
  const race     = character.race || character.ancestry;
  const hp       = character.hitPoints;
  const hpMax    = character.maxHitPoints;
  const ac       = character.armorClass;
  const spells = character.spellsKnown?.length ? character.spellsKnown : character.spells;
  const spellSlots = Object.entries(character.spellSlots ?? {})
    .map(([level, slot]) => ({ level: Number(level), used: slot.used, max: slot.max }))
    .filter((slot) => slot.max > 0)
    .sort((a, b) => a.level - b.level);
  const resources = character.systemData.classRuntime?.resources ?? [];
  const activeConcentration = character.systemData.activeConcentration;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="fw-avatar lg" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), #15101f)', borderColor: 'var(--gold-deep)' }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 15, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{race} {cls} · Lv {lvl}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { lbl: 'HP', val: `${hp} / ${hpMax}`, tone: 'hp' },
          { lbl: 'AC', val: String(ac) },
          { lbl: 'SPD', val: '30 ft' },
        ].map(s => (
          <div key={s.lbl} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: 6, textAlign: 'center' }}>
            <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{s.lbl}</div>
            <div className="fw-display" style={{ fontSize: 14, color: s.tone === 'hp' ? 'var(--blood-bright)' : 'var(--gold-bright)', lineHeight: 1.1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {activeConcentration && (
        <div className="fw-field">
          <span className="fw-caption">CONCENTRATING</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="fw-pill blood">
              {getSpell(activeConcentration.spellId)?.name ?? activeConcentration.spellId}
            </span>
            <button
              className="fw-btn fw-btn--ghost fw-btn--sm"
              onClick={onEndConcentration}
              type="button"
            >
              End
            </button>
          </div>
        </div>
      )}

      <GtResourceList resources={resources} onSpend={onSpendResource} />
      <GtSpellList spells={spells} slots={spellSlots} onSpellCast={onSpellCast} />
    </div>
  );
}

function GtResourceList({
  resources,
  onSpend,
}: {
  resources: NonNullable<Character['systemData']['classRuntime']>['resources'];
  onSpend: (resourceId: string, amount?: number) => Promise<void> | void;
}) {
  if (!resources.length) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Resources</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>No class resources</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Resources</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resources.map((resource) => {
          const pct = resource.max > 0 ? Math.max(0, Math.min(100, (resource.current / resource.max) * 100)) : 0;
          return (
            <div key={resource.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{resource.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{resource.recoveryType} rest</div>
                </div>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gold-bright)' }}>{resource.current}/{resource.max}</span>
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  disabled={resource.current <= 0}
                  onClick={() => void onSpend(resource.id, 1)}
                  type="button"
                >
                  Use
                </button>
              </div>
              <div className="fw-bar hp bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeSpellId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function resolveSpellData(value: string) {
  const normalized = normalizeSpellId(value);
  return getSpell(value) ?? getSpell(normalized) ?? SPELLS.find((spell) => spell.name.toLowerCase() === value.trim().toLowerCase());
}

function GtSpellList({
  spells,
  slots,
  onSpellCast,
}: {
  spells: string[];
  slots: Array<{ level: number; used: number; max: number }>;
  onSpellCast?: (spellId: string, slotLevel: number) => void;
}) {
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({});

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Spells</div>
      {slots.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {slots.map((slot) => (
            <span className="fw-pill" key={slot.level}>
              L{slot.level} {Math.max(0, slot.max - slot.used)}/{slot.max}
            </span>
          ))}
        </div>
      )}
      {spells.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>No spells known</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {spells.slice(0, 6).map((spell) => {
            const spellData = resolveSpellData(spell);
            const spellId = spellData?.id ?? normalizeSpellId(spell);
            const isCantrip = spellData?.level === 0;
            const availableSlots = spellData
              ? slots.filter((slot) => slot.level >= spellData.level && slot.used < slot.max).map((slot) => slot.level)
              : [];
            const selectedSlot = availableSlots.includes(selectedSlots[spellId])
              ? selectedSlots[spellId]
              : availableSlots[0] ?? spellData?.level ?? 1;
            const disabled = !spellData || (!isCantrip && availableSlots.length === 0);

            return (
              <div key={spell} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
                <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center', width: 18 }}>{Icon('sparkles', { size: 12 })}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text)' }}>{spellData?.name ?? spell}</span>
                {!isCantrip && spellData ? (
                  <select
                    className="fw-select"
                    value={selectedSlot}
                    onChange={(event) => setSelectedSlots((current) => ({ ...current, [spellId]: Number(event.target.value) }))}
                    style={{ width: 82, height: 28, fontSize: 11 }}
                  >
                    {availableSlots.map((level) => (
                      <option key={level} value={level}>Lv.{level}</option>
                    ))}
                  </select>
                ) : null}
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  disabled={disabled}
                  onClick={() => onSpellCast?.(spellId, isCantrip ? 0 : selectedSlot)}
                  title={!spellData ? 'Spell data not found.' : disabled ? 'No slots remaining' : undefined}
                  type="button"
                >
                  {isCantrip ? 'Use' : 'Cast'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Left: Inventory Stub (STEP 4 will replace this) ─────────────────────────

interface InventoryItem {
  id: string;
  n: string;
  tag: string;
  icon: string;
  action?: boolean;
}

function GtInventoryStub({ onUse, items }: { onUse: (c: PendingChange) => void; items?: InventoryItem[] }) {
  const displayItems = items ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Inventory</div>
      {displayItems.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>No items</div>
      ) : (
        displayItems.map(it => (
        <div key={it.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center', width: 24 }}>{Icon(it.icon, { size: 13 })}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text)' }}>{it.n}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{it.tag}</div>
          </div>
          {it.action && (
            <button className="fw-btn fw-btn-gold fw-btn-sm"
              onClick={() => onUse({ kind: 'use-item', item: it.n, amount: it.tag })}
              style={{ fontSize: 10.5, padding: '3px 8px' }}>
              Use
            </button>
          )}
        </div>
      )))}
    </div>
  );
}

// ─── Left: Quests Panel ───────────────────────────────────────────────────────

function GtQuestsPanel({ quests }: { quests: QuestPanelItem[] }) {
  const active = quests.filter((quest) => quest.status === 'active');
  const completed = quests.filter((quest) => quest.status === 'completed' || quest.status === 'failed');

  if (!quests.length) {
    return (
      <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
        No active objectives
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <GtQuestGroup title="Active" quests={active} />
      <GtQuestGroup title="Completed" quests={completed} muted />
    </div>
  );
}

function GtQuestGroup({ title, quests, muted = false }: { title: string; quests: QuestPanelItem[]; muted?: boolean }) {
  if (!quests.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fw-eyebrow">{title}</div>
      {quests.map((quest) => {
        const done = quest.status === 'completed';
        const failed = quest.status === 'failed';
        return (
          <div key={quest.id} style={{
            background: muted ? 'var(--surface)' : 'linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))',
            border: '1px solid ' + (muted ? 'var(--border-soft)' : 'rgba(214,168,79,0.3)'),
            borderRadius: 8,
            padding: 12,
            opacity: muted ? 0.82 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: quest.detail ? 6 : 0 }}>
              <span className={`fw-pill ${failed ? 'blood' : done ? 'gold' : 'dim'}`}>{quest.source}</span>
              <div className="fw-display" style={{
                fontSize: 13,
                color: failed ? 'var(--blood-bright)' : done ? 'var(--text-3)' : 'var(--text)',
                textDecoration: done ? 'line-through' : 'none',
              }}>
                {quest.title}
              </div>
            </div>
            {quest.detail && (
              <p className="fw-serif" style={{ margin: 0, color: 'var(--text-3)', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' }}>
                {quest.detail}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Center: Scene Header ─────────────────────────────────────────────────────

function GtSceneHeader({ sceneState }: { sceneState: { location?: string; description?: string; objectives?: { id: string }[]; threatClocks?: { id: string }[] } | null }) {
  const location       = sceneState?.location;
  const desc           = sceneState?.description;
  const objectiveCount = sceneState?.objectives?.length ?? 0;
  const clockCount     = sceneState?.threatClocks?.length ?? 0;

  return (
    <div style={{ padding: '18px 28px 0', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        {/* Scene thumbnail */}
        <div style={{ width: 200, height: 110, borderRadius: 8, background: 'linear-gradient(135deg, #1d1828, #06050b)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 35% 30%, rgba(214,168,79,0.32), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.3), transparent 65%)' }} />
          <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="rgba(214,168,79,0.25)" strokeWidth="0.6">
              <path d="M0 88 L40 82 L70 76 L100 80 L140 70 L180 78 L200 75 V110 H0 Z" fill="rgba(0,0,0,0.4)" />
              <circle cx="100" cy="40" r="14" fill="rgba(214,168,79,0.5)" stroke="rgba(214,168,79,0.6)" />
            </g>
          </svg>
          {sceneState && (
            <span style={{ position: 'absolute', left: 8, top: 8, fontSize: 10, color: 'var(--gold-bright)', fontFamily: 'var(--f-mono)', textShadow: '0 0 6px rgba(0,0,0,0.8)' }}>SCENE</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Scene</div>
          <div className="fw-display" style={{ fontSize: 22, color: location ? 'var(--text)' : 'var(--text-4)', letterSpacing: '0.04em' }}>
            {location ?? '—'}
          </div>
          {desc && (
            <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 6, fontStyle: 'italic' }}>{desc}</p>
          )}
          {(objectiveCount > 0 || clockCount > 0) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {objectiveCount > 0 && (
                <span className="fw-pill">{Icon('scroll', { size: 10 })} {objectiveCount} {objectiveCount === 1 ? 'objective' : 'objectives'}</span>
              )}
              {clockCount > 0 && (
                <span className="fw-pill blood">{Icon('alert', { size: 10 })} {clockCount} {clockCount === 1 ? 'clock' : 'clocks'}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Center: Story Entry ──────────────────────────────────────────────────────

function GtStoryEntry({
  message,
  character,
  rolling,
  dismissedSuggestionIds,
  busyConfirmActionId,
  onChoiceSelect,
  onSuggestedRoll,
  onConfirmAction,
  onDismissAction,
}: {
  message: StoryMessage;
  character: Character | null;
  rolling: boolean;
  dismissedSuggestionIds: Set<string>;
  busyConfirmActionId: string | null;
  onChoiceSelect?: (choice: AiChoice, message: StoryMessage) => void | Promise<void>;
  onSuggestedRoll?: (message: StoryMessage, suggestedRoll: AiSuggestedRoll) => void | Promise<void>;
  onConfirmAction?: (action: AiConfirmAction, message: StoryMessage) => void | Promise<void>;
  onDismissAction?: (action: AiConfirmAction, message: StoryMessage) => void;
}) {
  const kind = getStoryKind(message);
  const mode = typeof message.metadata?.mode === 'string' ? message.metadata.mode : '';
  const time = formatStoryTime(message.createdAt);
  const isDm = message.speaker === 'dm' || kind === 'ai_dm_reply' || kind === 'dm_prompt' || kind === 'scene_opening' || kind === 'scene_objective';
  const isSystem = message.speaker === 'system' && !isDm;
  const author = message.author || (isDm ? 'Dungeon Master' : isSystem ? 'System' : 'Player');
  const choices = getMessageChoices(message);
  const suggestedRoll = getMessageSuggestedRoll(message);
  const confirmActions = getMessageConfirmActions(message, dismissedSuggestionIds);

  if (isDm) {
    return (
      <div className="fw-fade" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <div className="fw-avatar dm" style={{ background: 'linear-gradient(135deg, rgba(214,168,79,0.3), #15101f)' }}>DM</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="fw-display" style={{ fontSize: 11.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}>{author}</span>
            {time && <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>{time}</span>}
          </div>
          <p className="fw-serif" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.6 }}>{message.body}</p>
          {suggestedRoll && (
            <GtSuggestedRollBanner
              character={character}
              rolling={rolling}
              suggestedRoll={suggestedRoll}
              onRoll={() => void onSuggestedRoll?.(message, suggestedRoll)}
            />
          )}
          {confirmActions.length > 0 && (
            <GtMessageConfirmActions
              actions={confirmActions}
              busyConfirmActionId={busyConfirmActionId}
              message={message}
              onConfirmAction={onConfirmAction}
              onDismissAction={onDismissAction}
            />
          )}
          {choices.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {choices.map((choice, index) => (
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  key={`${message.id}:${choice.number}:${choice.label}`}
                  onClick={() => void onChoiceSelect?.(choice, message)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }}
                  type="button"
                >
                  <span className="fw-pill">{String.fromCharCode(65 + index)}</span>
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fw-fade" style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
      <div className="fw-avatar sm" style={{ background: 'linear-gradient(135deg, rgba(168,162,158,0.3), #15101f)' }}>
        {author.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
          <b style={{ color: 'var(--text-2)' }}>{author}</b>
          {mode && <> · {mode}</>}
          {!mode && <> · {isSystem ? 'system' : 'action'}</>}
          {time && <> · {time}</>}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{message.body}</p>
      </div>
    </div>
  );
}

function GtEmptyStoryTab({ label }: { label: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', fontSize: 14 }}>
      {label}
    </div>
  );
}

// ─── Center: Roll Request ─────────────────────────────────────────────────────

function GtSuggestedRollBanner({
  character,
  rolling,
  suggestedRoll,
  onRoll,
}: {
  character: Character | null;
  rolling: boolean;
  suggestedRoll: AiSuggestedRoll;
  onRoll: () => void;
}) {
  const modifier = character ? resolveSuggestedModifier(character, suggestedRoll) : 0;
  return (
    <div className="fw-fade" style={{ padding: 14, marginTop: 10, marginBottom: 10, background: 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))', border: '1px solid rgba(214,168,79,0.4)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--gold)' }}>{Icon('dice', { size: 16 })}</span>
        <div style={{ flex: 1 }}>
          <div className="fw-eyebrow" style={{ color: 'var(--gold-bright)' }}>DM REQUESTS</div>
          <div className="fw-h3" style={{ fontSize: 13 }}>{formatSuggestedRollTitle(suggestedRoll)}</div>
          {suggestedRoll.reason && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{suggestedRoll.reason}</div>
          )}
        </div>
        <button className="fw-btn fw-btn-gold" disabled={!character || rolling} onClick={onRoll} title={!character ? 'Choose a character before rolling.' : undefined} type="button">
          <svg className={'fw-d20 ' + (rolling ? 'rolling' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8.5 5v8L12 21 3.5 16V8z"/><path d="M12 3v18M3.5 8L20.5 16M20.5 8L3.5 16"/>
          </svg>
          Roll d20{signed(modifier)}
        </button>
      </div>
    </div>
  );
}

function GtMessageConfirmActions({
  actions,
  busyConfirmActionId,
  message,
  onConfirmAction,
  onDismissAction,
}: {
  actions: AiConfirmAction[];
  busyConfirmActionId: string | null;
  message: StoryMessage;
  onConfirmAction?: (action: AiConfirmAction, message: StoryMessage) => void | Promise<void>;
  onDismissAction?: (action: AiConfirmAction, message: StoryMessage) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10, marginBottom: 10 }}>
      {actions.map((action) => {
        const suggestionId = `${message.id}:${action.id}`;
        const busy = busyConfirmActionId === suggestionId;
        return (
          <div key={suggestionId} style={{ padding: 12, background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 8 }}>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>AI Warden Suggests</div>
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{action.label}</div>
            {action.note && (
              <div className="fw-serif" style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{action.note}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
              <button
                className="fw-btn fw-btn-gold fw-btn-sm"
                disabled={busy || !onConfirmAction}
                onClick={() => void onConfirmAction?.(action, message)}
                title={!onConfirmAction ? 'AI action handler is not available.' : undefined}
                type="button"
                style={{ justifyContent: 'center' }}
              >
                {Icon('check', { size: 11 })} {busy ? 'Applying...' : 'Accept as canon'}
              </button>
              <button
                className="fw-btn fw-btn-ghost fw-btn-sm"
                disabled={busy}
                onClick={() => onDismissAction?.(action, message)}
                type="button"
                style={{ justifyContent: 'center' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GtRollRequest({ dice, onRoll, rolling }: { dice: DiceResult; onRoll: () => void; rolling: boolean }) {
  return (
    <div className="fw-fade" style={{ padding: 14, marginBottom: 18, background: 'linear-gradient(180deg, rgba(214,168,79,0.07), rgba(214,168,79,0.01))', border: '1px solid rgba(214,168,79,0.4)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--gold)' }}>{Icon('dice', { size: 16 })}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>
            <b style={{ color: 'var(--gold-bright)' }}>DM requests:</b> Charisma (Persuasion)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>
            {dice.die} {dice.bonus} · DC {dice.target}
          </div>
        </div>
        <button className="fw-btn fw-btn-gold" onClick={onRoll}>
          <svg className={'fw-d20 ' + (rolling ? 'rolling' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8.5 5v8L12 21 3.5 16V8z"/><path d="M12 3v18M3.5 8L20.5 16M20.5 8L3.5 16"/>
          </svg>
          Roll {dice.die}{dice.bonus}
        </button>
        <button className="fw-btn fw-btn-ghost" disabled title="Advantage mode is not wired to the dice roller yet." type="button">Adv</button>
        <button className="fw-btn fw-btn-ghost" disabled title="Disadvantage mode is not wired to the dice roller yet." type="button">Dis</button>
      </div>
    </div>
  );
}

// ─── Center: Action Input ─────────────────────────────────────────────────────

interface ActionInputProps {
  value: string;
  setValue: (v: string) => void;
  suggestions: string[];
  onCommitSuggestion: (suggestion: string, mode: ActionMode) => Promise<void> | void;
  onSend: (mode: ActionMode) => void;
  onRollDice: () => void;
  busy?: boolean;
}

function GtActionInput({ value, setValue, suggestions, onCommitSuggestion, onSend, onRollDice, busy = false }: ActionInputProps) {
  const [mode, setMode] = useState<ActionMode>('speak');

  const placeholder = mode === 'speak'
    ? 'Speak — in character to the table…'
    : mode === 'act'
    ? 'Describe your action. The Warden will request rolls.'
    : 'Whisper to the DM only…';

  return (
    <div style={{ borderTop: '1px solid var(--border-soft)', padding: 16, background: 'linear-gradient(180deg, rgba(11,10,16,0), rgba(11,10,16,0.5))' }}>
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="fw-eyebrow" style={{ alignSelf: 'center', marginRight: 4, color: 'var(--arcane-bright)' }}>
            {Icon('sparkles', { size: 10 })} Suggested
          </span>
          {suggestions.map((s, i) => (
            <button key={i} className="fw-btn fw-btn-ghost fw-btn-sm" style={{ fontSize: 11.5, padding: '4px 10px', borderColor: 'rgba(124,58,237,0.3)', color: 'var(--text-2)' }}
              onClick={() => void onCommitSuggestion(s, mode)}
              type="button">
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          {/* Mode buttons */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {([
              { id: 'speak', label: 'Speak',         icon: 'users' },
              { id: 'act',   label: 'Act',            icon: 'sword' },
              { id: 'aside', label: 'Aside (DM only)', icon: 'eye'  },
            ] as { id: ActionMode; label: string; icon: string }[]).map(t => (
              <button key={t.id} onClick={() => setMode(t.id)} type="button"
                className="fw-btn fw-btn-ghost fw-btn-sm"
                style={{ padding: '3px 8px', fontSize: 11, color: mode === t.id ? 'var(--gold-bright)' : 'var(--text-3)', borderColor: mode === t.id ? 'var(--gold-deep)' : 'transparent', background: mode === t.id ? 'rgba(214,168,79,0.08)' : 'transparent' }}>
                {Icon(t.icon, { size: 10 })} {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend(mode); }}
            placeholder={placeholder}
            rows={2}
            style={{ width: '100%', background: 'transparent', border: 0, outline: 0, resize: 'none', color: 'var(--text)', fontFamily: 'var(--f-serif)', fontSize: 15, lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="fw-btn fw-btn-icon fw-btn-ghost" onClick={onRollDice} type="button">{Icon('dice', { size: 14 })}</button>
          <button className="fw-btn fw-btn-icon fw-btn-ghost" disabled={!suggestions[0]} onClick={() => suggestions[0] && setValue(suggestions[0])} title={suggestions[0] ? 'Insert latest AI suggestion.' : 'No AI suggestion available.'} type="button">{Icon('sparkles', { size: 14 })}</button>
        </div>
        <button className="fw-btn fw-btn-gold fw-btn-lg" style={{ height: '100%' }} onClick={() => onSend(mode)} type="button" disabled={busy}>
          {busy ? <>{Icon('loader', { size: 13 })} Warden...</> : <>{Icon('send', { size: 13 })} Commit</>}
        </button>
      </div>
    </div>
  );
}

// ─── Right: Dice Panel ────────────────────────────────────────────────────────

const DICE_FACES = [
  { n: 'd4',   v: 4  }, { n: 'd6',   v: 6  }, { n: 'd8',  v: 8  },
  { n: 'd10',  v: 10 }, { n: 'd12',  v: 12 },
  { n: 'd20',  v: 20, primary: true },
  { n: 'd100', v: 100 },
];

function GtDicePanel({
  character,
  history,
  result,
  onRoll,
  onSavedRoll,
  rolling,
}: {
  character: Character | null;
  history: DiceResult[];
  result: DiceResult | null;
  onRoll: (sides: number, label?: string) => void;
  onSavedRoll: (roll: SavedRoll) => void;
  rolling: boolean;
}) {
  const colorByKind = (k: DiceResult['kind']) =>
    k === 'crit' ? 'var(--gold-bright)' : k === 'fumble' ? 'var(--blood-bright)' : 'var(--text)';
  const labelByKind = (k: DiceResult['kind']) =>
    k === 'crit' ? 'Critical.' : k === 'success' ? 'Success.' : k === 'fumble' ? 'Fumble.' : 'Failure.';
  const total = result?.total ?? ((result?.value ?? 0) + (Number.parseInt(result?.bonus ?? '0', 10) || 0));
  const savedRolls = buildSavedRolls(character);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Last roll display */}
      {result ? (
        <div style={{ background: 'var(--bg-deep)', border: '1px solid ' + (result.kind === 'crit' ? 'var(--gold)' : result.kind === 'success' ? 'var(--gold-deep)' : 'var(--border)'), borderRadius: 10, padding: 18, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: result.kind === 'crit' ? '0 0 30px -6px rgba(214,168,79,0.5)' : 'none' }}>
          {result.kind === 'crit' && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(214,168,79,0.18), transparent 70%)' }} />}
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Last Roll · {result.label ?? result.die}{result.bonus}</div>
          <div className={'fw-display ' + (rolling ? 'fw-die-shake' : '')} style={{ fontSize: 56, lineHeight: 1, color: colorByKind(result.kind) }}>
            {result.value}
            {result.bonus && <span style={{ fontSize: 22, color: 'var(--text-3)' }}> {result.bonus}</span>}
          </div>
          <div style={{ marginTop: 4, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            {result.target ? `= ${total} vs DC ${result.target}` : `= ${total}`}
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: colorByKind(result.kind) }}>
            {labelByKind(result.kind)}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: 18, textAlign: 'center' }}>
          <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Last Roll</div>
          <div className="fw-display" style={{ fontSize: 28, color: 'var(--text-4)' }}>—</div>
          <div className="fw-serif" style={{ marginTop: 6, fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
            No rolls yet.
          </div>
        </div>
      )}

      {/* Quick dice grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="fw-eyebrow">Quick Dice</span>
          <div className="fw-seg">
            {['Normal', 'Adv', 'Dis'].map(o => (
              <button key={o} className="fw-seg-btn" disabled={o !== 'Normal'} title={o === 'Normal' ? undefined : 'Advantage modes are not wired yet.'} type="button">{o}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {DICE_FACES.map(d => (
            <button key={d.n} disabled={rolling} onClick={() => onRoll(d.v, d.n)} type="button"
              className="fw-btn"
              style={{ padding: '12px 0', justifyContent: 'center', flexDirection: 'column', gap: 0, background: d.primary ? 'linear-gradient(180deg, #2A1F3D, #15101f)' : 'var(--surface-2)', borderColor: d.primary ? 'var(--gold-deep)' : 'var(--border-soft)', color: d.primary ? 'var(--gold-bright)' : 'var(--text-2)', boxShadow: d.primary ? '0 0 16px -4px rgba(214,168,79,0.3)' : 'none' }}>
              <span className="fw-display" style={{ fontSize: 16, letterSpacing: '0.06em' }}>{d.n}</span>
              <span style={{ fontSize: 9, color: 'var(--text-4)', fontFamily: 'var(--f-mono)' }}>1–{d.v}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved rolls */}
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Saved Rolls</div>
        {savedRolls.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '8px 2px' }}>No saved rolls yet</div>
        ) : savedRolls.map((r) => (
          <button key={r.id} className="fw-btn fw-btn-ghost" disabled={rolling} onClick={() => onSavedRoll(r)} type="button" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: r.blood ? 'var(--blood-bright)' : 'var(--gold)' }}>{Icon(r.icon, { size: 12 })}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{r.name}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{r.detail}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Recent Rolls</div>
        {history.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '8px 2px' }}>No recent rolls</div>
        ) : history.map((roll) => (
          <div key={roll.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 6, marginBottom: 4 }}>
            <span className="fw-mono" style={{ color: colorByKind(roll.kind), fontSize: 12, width: 34 }}>{roll.total ?? roll.value}</span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{roll.label ?? roll.die}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>{roll.die}{roll.bonus}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right: Combat Panel ──────────────────────────────────────────────────────

interface CombatPanelProps {
  encounter: EncounterState | null;
}

function GtCombatPanel({ encounter }: CombatPanelProps) {
  if (!encounter) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div className="fw-eyebrow" style={{ marginBottom: 8 }}>No Active Combat</div>
        <p className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>
          Start an encounter from the banner to begin tracking initiative.
        </p>
      </div>
    );
  }

  const activeEncounter = encounter;
  const combatants = activeEncounter.combatants ?? [];
  const activeIdx  = activeEncounter.activeIndex ?? 0;
  const round      = activeEncounter.round ?? 1;
  const activeCombatant = combatants[activeIdx] ?? combatants[0];
  const standingCount = combatants.filter((c) => c.hitPoints > 0).length;
  const injuredCount = combatants.filter((c) => c.hitPoints > 0 && c.hitPoints < c.maxHitPoints).length;
  const defeatedCount = combatants.filter((c) => c.hitPoints <= 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="fw-pill blood">
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'currentColor' }} /> Round {round}
        </span>
        <span style={{ flex: 1 }} />
        <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled title="Use the main combat view to advance turns." type="button">{Icon('chevR', { size: 12 })}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[
          { label: 'Active', value: standingCount },
          { label: 'Injured', value: injuredCount },
          { label: 'Down', value: defeatedCount },
        ].map((item) => (
          <div key={item.label} style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 6, textAlign: 'center' }}>
            <div className="fw-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{item.label}</div>
            <div className="fw-display" style={{ fontSize: 14, color: 'var(--gold-bright)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {activeCombatant && (
        <div style={{ padding: '8px 10px', background: 'rgba(214,168,79,0.06)', border: '1px solid rgba(214,168,79,0.24)', borderRadius: 6 }}>
          <div className="fw-eyebrow" style={{ marginBottom: 4 }}>Current Turn</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{activeCombatant.name}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>
              HP {activeCombatant.hitPoints}/{activeCombatant.maxHitPoints}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {combatants.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: i === activeIdx ? 'linear-gradient(90deg, rgba(153,27,27,0.18), transparent)' : 'var(--surface)', border: '1px solid ' + (i === activeIdx ? 'var(--blood)' : 'var(--border-soft)'), borderRadius: 6, position: 'relative' }}>
            {i === activeIdx && <span style={{ position: 'absolute', left: -1, top: 6, bottom: 6, width: 2, background: 'var(--blood-bright)', borderRadius: 2 }} />}
            <span className="fw-mono" style={{ width: 24, fontSize: 13, color: 'var(--gold-bright)', textAlign: 'center' }}>{c.initiative}</span>
            <span style={{ width: 8, height: 8, borderRadius: 50, background: c.type === 'player' ? 'var(--success)' : 'var(--blood-bright)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>{c.name}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{c.hitPoints}/{c.maxHitPoints}</span>
            {i === activeIdx && <span style={{ color: 'var(--blood-bright)', fontSize: 10 }}>NOW</span>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button className="fw-btn fw-btn-blood" disabled title="Use the main combat view to apply damage." style={{ justifyContent: 'center' }} type="button">
          {Icon('minus', { size: 12 })} Damage
        </button>
        <button className="fw-btn fw-btn-ghost" disabled title="Use the main combat view to heal." style={{ justifyContent: 'center' }} type="button">
          {Icon('heart', { size: 12 })} Heal
        </button>
        <button className="fw-btn fw-btn-ghost" disabled title="Condition picker is not wired yet." type="button" style={{ justifyContent: 'center' }}>{Icon('sparkles', { size: 12 })} Condition</button>
        <button className="fw-btn fw-btn-ghost" disabled title="NPC creation is not wired yet." type="button" style={{ justifyContent: 'center' }}>{Icon('plus',     { size: 12 })} NPC</button>
      </div>

      <button className="fw-btn fw-btn-gold" disabled title="Use the main combat view to end the turn." type="button" style={{ justifyContent: 'center' }}>
        End Turn {Icon('chevR', { size: 12 })}
      </button>
    </div>
  );
}

// ─── Right: AI DM Panel ───────────────────────────────────────────────────────

interface AIDMPanelProps {
  latestSuggestion: AiSuggestion | null;
  on: boolean; setOn: (v: boolean) => void;
  tone: string; setTone: (v: string) => void;
  strict: string; setStrict: (v: string) => void;
  onAcceptSuggestion: (action: AiConfirmAction, message: StoryMessage) => Promise<void> | void;
  onAskAiAction?: (text: string, mode: ActionMode, requestMode?: AiDmRequestMode) => Promise<void>;
  onDismissSuggestion: (id: string) => void;
}

function GtAIDMPanel({
  latestSuggestion,
  on,
  setOn,
  tone,
  setTone,
  strict,
  setStrict,
  onAcceptSuggestion,
  onAskAiAction,
  onDismissSuggestion,
}: AIDMPanelProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const runAiAction = async (label: string, prompt: string) => {
    if (!on || !onAskAiAction) return;
    setBusyAction(label);
    try {
      await onAskAiAction(prompt, 'act');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 50, background: 'rgba(124,58,237,0.18)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
          {Icon('wand', { size: 14 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 12.5, color: 'var(--text)' }}>AI Warden</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>
            {on ? 'Assistant · awaits the DM.' : 'Off.'}
          </div>
        </div>
        <Toggle on={on} onChange={setOn} />
      </div>

      <Field label="Tone">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          {['Balanced', 'Grim', 'Heroic', 'Mystery'].map(t => (
            <button key={t} onClick={() => setTone(t)}
              className={'fw-btn ' + (tone === t ? '' : 'fw-btn-ghost') + ' fw-btn-sm'}
              style={{ justifyContent: 'center', borderColor: tone === t ? 'var(--gold-deep)' : undefined, color: tone === t ? 'var(--gold-bright)' : undefined, background: tone === t ? 'rgba(214,168,79,0.08)' : undefined }}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Rule Strictness">
        <Seg value={strict} onChange={setStrict} options={['Casual', 'Standard', 'Hardcore']} />
      </Field>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Warden Actions</div>
        {[
          { icon: 'sparkles', name: 'Generate Scene',       desc: 'From recent log + chosen tone.', prompt: `Generate the next scene using a ${tone.toLowerCase()} tone and ${strict.toLowerCase()} rules strictness.` },
          { icon: 'alert',    name: 'Suggest Consequence',  desc: 'Outcome of last action.', prompt: `Suggest a fair consequence for the latest player action using ${strict.toLowerCase()} rules strictness.` },
          { icon: 'book',     name: 'Ask Rules',            desc: 'RAW citation. No state change.', prompt: 'Answer the most relevant rules question for the current situation without changing game state.' },
          { icon: 'users',    name: 'Voice NPC',            desc: 'Speak as the scene NPC.', prompt: `Continue as the most relevant NPC in the current scene with a ${tone.toLowerCase()} tone.` },
          { icon: 'map',      name: 'Random Encounter',     desc: 'By current region.', prompt: 'Suggest a random encounter appropriate to the current scene. Include confirmable events only if needed.' },
        ].map(a => (
          <button key={a.name} className="fw-btn fw-btn-ghost" disabled={!on || !onAskAiAction || busyAction !== null} onClick={() => void runAiAction(a.name, a.prompt)} title={!on ? 'AI Warden is off.' : !onAskAiAction ? 'AI action handler is not available.' : undefined} type="button"
            style={{ width: '100%', padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left', borderColor: 'rgba(124,58,237,0.25)', marginBottom: 4 }}>
            <span style={{ color: 'var(--arcane-bright)' }}>{Icon(a.icon, { size: 12 })}</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{a.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {latestSuggestion && (
        <GtAiSuggestionCard
          busy={busyAction !== null}
          suggestion={latestSuggestion}
          onAccept={onAcceptSuggestion}
          onDismiss={onDismissSuggestion}
          onResuggest={async (text) => {
            if (!onAskAiAction) return;
            setBusyAction('Re-suggest');
            try {
              await onAskAiAction(text, 'act');
            } finally {
              setBusyAction(null);
            }
          }}
        />
      )}

      <div style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic', fontFamily: 'var(--f-serif)', lineHeight: 1.5, paddingInline: 4 }}>
        The Warden suggests. It never commits damage, conditions, death, or inventory loss without your approval.
      </div>
    </div>
  );
}

function GtAiSuggestionCard({
  busy,
  suggestion,
  onAccept,
  onDismiss,
  onResuggest,
}: {
  busy: boolean;
  suggestion: AiSuggestion;
  onAccept: (action: AiConfirmAction, message: StoryMessage) => Promise<void> | void;
  onDismiss: (id: string) => void;
  onResuggest: (text: string) => Promise<void> | void;
}) {
  const { action, message } = suggestion;
  const suggestionId = `${message.id}:${action.id}`;
  const isConfirmed = (
    Array.isArray(message.metadata?.confirmedActions)
      ? (message.metadata.confirmedActions as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
  ).includes(action.id);

  return (
    <div style={{ padding: 12, background: 'linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 8 }}>
      <div className="fw-eyebrow" style={{ marginBottom: 6 }}>AI Warden Suggests</div>
      <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{action.label}</div>
      {action.note && (
        <div className="fw-serif" style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{action.note}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
        <button
          className="fw-btn fw-btn-gold fw-btn-sm"
          disabled={busy || isConfirmed}
          onClick={() => { if (!isConfirmed) void onAccept(action, message); }}
          type="button"
          style={{ justifyContent: 'center', opacity: isConfirmed ? 0.6 : undefined }}
          title={isConfirmed ? 'Already applied.' : undefined}
        >
          {Icon('check', { size: 11 })} {isConfirmed ? 'Applied' : 'Accept as canon'}
        </button>
        <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={busy} onClick={() => void onResuggest(`Re-suggest this event with a safer alternative: ${action.label}`)} type="button" style={{ justifyContent: 'center' }}>
          {Icon('sparkles', { size: 11 })} Re-suggest
        </button>
      </div>
      <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={busy} onClick={() => onDismiss(suggestionId)} type="button" style={{ justifyContent: 'center', width: '100%', marginTop: 6 }}>
        Dismiss
      </button>
    </div>
  );
}

// ─── Right: Tools Panel ───────────────────────────────────────────────────────

function GtToolsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Session Tools</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { icon: 'pause',  label: 'Pause'    },
            { icon: 'scroll', label: 'Recap'    },
            { icon: 'bell',   label: 'Bell'     },
            { icon: 'bag',    label: 'Loot'     },
            { icon: 'map',    label: 'Map'      },
            { icon: 'layers', label: 'Handouts' },
          ].map(t => (
            <button key={t.label} className="fw-btn fw-btn-ghost" disabled title="Session tool is not wired yet." type="button" style={{ flexDirection: 'column', padding: '10px 6px', gap: 4 }}>
              <span style={{ color: 'var(--gold)' }}>{Icon(t.icon, { size: 14 })}</span>
              <span style={{ fontSize: 11 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Rules · Conditions</div>
        <input className="fw-input" placeholder="Search rules, spells, conditions…" />
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { n: 'Prone',         t: 'Disadv on attack. Melee atks vs prone gain adv.'   },
            { n: 'Concentration', t: 'DC 10 or half damage CON save.'                    },
            { n: 'Unconscious',   t: 'Drops what holds. Auto-fails STR / DEX saves.'     },
          ].map((r, i) => (
            <div key={i} style={{ padding: 8, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 5 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{r.n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{r.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Center: Onboarding Card (empty feed) ────────────────────────────────────

interface OnboardingCardProps {
  onAskAi: () => Promise<void>;
  onSetScene: () => void;
}

function GtOnboardingCard({ onAskAi, onSetScene }: OnboardingCardProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleAskAi() {
    setBusy(true);
    try { await onAskAi(); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%', padding: '40px 0' }}>
      <div style={{ maxWidth: 400, width: '100%', background: 'linear-gradient(180deg, rgba(214,168,79,0.06), rgba(214,168,79,0.01))', border: '1px solid rgba(214,168,79,0.25)', borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🕯</div>
        <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '0.06em', marginBottom: 6 }}>The table is set</div>
        <p className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 24 }}>
          The candles burn. Choose how to begin the adventure.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="fw-btn fw-btn-gold fw-btn-lg"
            disabled={busy}
            onClick={() => void handleAskAi()}
            style={{ justifyContent: 'center' }}
            type="button"
          >
            {Icon('sparkles', { size: 13 })} Ask AI to open the scene
          </button>
          <button
            className="fw-btn fw-btn-ghost"
            onClick={onSetScene}
            style={{ justifyContent: 'center' }}
            type="button"
          >
            {Icon('map', { size: 13 })} Set scene manually
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Scene Modal ───────────────────────────────────────────────────────

const SCENE_MODES = ['exploration', 'social', 'horror', 'rest', 'combat', 'transition'] as const;
type ManualSceneMode = typeof SCENE_MODES[number];

interface ManualSceneModalProps {
  sessionId: string;
  actorId: string;
  onClose: () => void;
}

function GtManualSceneModal({ sessionId, actorId, onClose }: ManualSceneModalProps) {
  const dispatch  = useGameStore((s) => s.dispatch);
  const eventMeta = useGameStore((s) => s.eventMeta);
  const [location, setLocation] = React.useState('');
  const [mode,     setMode]     = React.useState<ManualSceneMode>('exploration');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim()) return;
    dispatch({
      ...eventMeta(actorId),
      type: 'SCENE_TRANSITION',
      sessionId,
      newMode: mode,
      newLocation: location.trim(),
      newDescription: '',
    });
    onClose();
  }

  return (
    <div className="fw-overlay">
      <div className="fw-modal">
        <div className="fw-modal-head" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="fw-display" style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-bright)', flex: 1 }}>Set Scene</span>
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose} type="button">{Icon('x', { size: 12 })}</button>
        </div>
        <form onSubmit={submit}>
          <div className="fw-modal-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Location</div>
              <input
                autoFocus
                className="fw-input"
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. The Gilded Tomb, Dark Forest Crossroads…"
                value={location}
              />
            </div>
            <div>
              <div className="fw-eyebrow" style={{ marginBottom: 6 }}>Mood</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {SCENE_MODES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={'fw-btn fw-btn-sm ' + (mode === m ? '' : 'fw-btn-ghost')}
                    style={{ justifyContent: 'center', textTransform: 'capitalize', borderColor: mode === m ? 'var(--gold-deep)' : undefined, color: mode === m ? 'var(--gold-bright)' : undefined, background: mode === m ? 'rgba(214,168,79,0.08)' : undefined }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="fw-modal-foot">
            <button className="fw-btn fw-btn-ghost" onClick={onClose} type="button">Cancel</button>
            <button className="fw-btn fw-btn-gold" disabled={!location.trim()} type="submit">
              {Icon('check', { size: 12 })} Begin scene
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function GtConfirmModal({ change, onClose }: { change: PendingChange; onClose: () => void }) {
  const isDamage = change.kind === 'damage';
  const isHeal   = change.kind === 'heal';

  return (
    <div className="fw-overlay">
      <div className={'fw-modal ' + (isDamage ? '' : 'gold')}>
        <div className="fw-modal-head" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 50, background: isDamage ? 'rgba(153,27,27,0.18)' : 'rgba(214,168,79,0.15)', border: '1px solid ' + (isDamage ? 'var(--blood)' : 'var(--gold-deep)'), display: 'grid', placeItems: 'center', color: isDamage ? '#FCA5A5' : 'var(--gold-bright)' }}>
            {Icon(isDamage ? 'alert' : isHeal ? 'heart' : 'bag', { size: 14 })}
          </span>
          <div className="fw-display" style={{ fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDamage ? '#FCA5A5' : 'var(--gold-bright)' }}>
            {isDamage ? 'Confirm Damage' : isHeal ? 'Confirm Healing' : 'Confirm Action'}
          </div>
          <span style={{ flex: 1 }} />
          <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" onClick={onClose}>{Icon('x', { size: 12 })}</button>
        </div>
        <div className="fw-modal-body" style={{ padding: '14px 16px' }}>
          <p className="fw-serif" style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55, fontStyle: 'italic' }}>
            {isDamage && <><b style={{ color: 'var(--text)' }}>{change.target}</b> takes <b style={{ color: '#FCA5A5' }}>{change.amount}</b> damage. Source: <i>{change.source}</i>.</>}
            {isHeal   && <><b style={{ color: 'var(--text)' }}>{change.target}</b> recovers <b style={{ color: 'var(--gold-bright)' }}>{change.amount}</b> HP from <i>{change.source}</i>.</>}
            {!isDamage && !isHeal && <>{change.kind}: {JSON.stringify(change)}</>}
          </p>
          {change.aiProposed && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--arcane-bright)', fontFamily: 'var(--f-serif)', fontStyle: 'italic', display: 'flex', gap: 6, alignItems: 'center' }}>
              {Icon('wand', { size: 12 })} Proposed by the AI Warden — your approval finalizes it.
            </div>
          )}
        </div>
        <div className="fw-modal-foot">
          <button className="fw-btn fw-btn-ghost" onClick={onClose}>Reject</button>
          <button className={'fw-btn ' + (isDamage ? 'fw-btn-blood' : 'fw-btn-gold')} onClick={onClose}>
            {Icon('check', { size: 12 })} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

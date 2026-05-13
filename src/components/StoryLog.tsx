import { Bot, Radio, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { getGamePhaseDefinition } from '../lib/gamePhases';
import {
  abilityLabels,
  abilityModifier,
  buildNotation,
  formatModifier,
  initiativeModifier,
  resolveRoll,
  savingThrowModifier,
  skillAbilityMap,
  skillModifier,
} from '../lib/rules';
import {
  loadSessionMessages,
  requestAiDmReply,
  sendSessionMessage,
  subscribeToSessionMessages,
} from '../lib/messages';
import { createPartyChoiceInDb } from '../lib/partyChoices';
import { createPartyChoice } from '../engine/party/partyChoiceEngine';
import { useGameStore } from '../store/useGameStore';
import { Tooltip } from './ui/Tooltip';
import type {
  AbilityKey,
  AiChoice,
  AiConfirmAction,
  AiSuggestedRoll,
  Character,
  DiceRoll,
  EncounterState,
  GamePhase,
  GameSession,
  RollMode,
  RollType,
  SceneFlow,
  StoryMessage,
} from '../types';

type AiDmMode = 'auto' | 'assist' | 'off';

type StoryLogProps = {
  activeSession: GameSession | null;
  character: Character;
  characterName: string;
  encounter: EncounterState | null;
  initialMessages: StoryMessage[];
  messages: StoryMessage[];
  onMessagesChange: (messages: StoryMessage[] | ((current: StoryMessage[]) => StoryMessage[])) => void;
  onConfirmAction?: (action: AiConfirmAction, message: StoryMessage) => Promise<void> | void;
  gamePhase: GamePhase;
  sessionTitle?: string;
  user: User | null;
};

export function addUniqueMessage(messages: StoryMessage[], next: StoryMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next];
}

function localMessage(body: string): StoryMessage {
  return {
    id: crypto.randomUUID(),
    speaker: 'player',
    author: 'Player',
    body,
    createdAt: new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date()),
  };
}

function getMessageKind(message: StoryMessage) {
  const kind = message.metadata?.kind;
  if (
    kind === 'dice_roll' ||
    kind === 'combat_event' ||
    kind === 'phase_event' ||
    kind === 'ai_dm_reply' ||
    kind === 'scene_opening' ||
    kind === 'scene_objective' ||
    kind === 'dm_prompt' ||
    kind === 'rest_summary' ||
    kind === 'ai_pending' ||
    kind === 'ai_error'
  ) {
    return kind;
  }
  return message.speaker;
}

function getMsgVariant(kind: ReturnType<typeof getMessageKind>, speaker: string): string {
  if (kind === 'scene_opening' || kind === 'scene_objective') return 'fw-msg--scene';
  if (speaker === 'dm' || kind === 'ai_dm_reply' || kind === 'dm_prompt') return 'fw-msg--dm';
  if (speaker === 'player') return 'fw-msg--player';
  return 'fw-msg--system';
}

function getSceneFlow(message: StoryMessage): SceneFlow | null {
  const scene = message.metadata?.scene;
  if (!scene || typeof scene !== 'object') return null;
  return scene as SceneFlow;
}

function getLatestSceneFlow(messages: StoryMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const scene = getSceneFlow(messages[index]);
    if (scene) return scene;
  }

  return null;
}

function getConfirmActions(message: StoryMessage): AiConfirmAction[] {
  const actions = message.metadata?.confirmActions;
  return Array.isArray(actions) ? (actions as AiConfirmAction[]) : [];
}

function getAiChoices(message: StoryMessage): AiChoice[] {
  const choices = message.metadata?.choices;
  if (!Array.isArray(choices)) return [];
  const normalized = (choices as AiChoice[]).filter((choice) => choice.label && choice.prompt).slice(0, 6);
  return [
    ...normalized.map((choice, index) => ({ ...choice, number: index + 1 })),
    {
      number: normalized.length + 1,
      label: 'ทำอย่างอื่น...',
      prompt: '',
      intent: 'custom',
      isCustom: true,
    },
  ];
}

function isSuggestedRoll(value: unknown): value is AiSuggestedRoll {
  return Boolean(value && typeof value === 'object' && ('required' in value || 'type' in value || 'skill' in value || 'ability' in value));
}

function getSuggestedRoll(message: StoryMessage): AiSuggestedRoll | string | null {
  const roll = message.metadata?.suggestedRoll ?? message.metadata?.suggested_roll;
  if (typeof roll === 'string' && roll.trim()) return roll.trim();
  if (isSuggestedRoll(roll)) return roll;
  return null;
}

function formatChoiceRoll(value: AiChoice['suggestedRoll']) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const skill = value.skill ? ` (${value.skill})` : '';
  const ability = value.ability ? abilityLabels[value.ability] : value.type ?? 'Roll';
  const dc = value.dc ? ` DC ${value.dc}` : '';
  return `${ability}${skill}${dc}`;
}

function formatSuggestedRoll(roll: AiSuggestedRoll | string) {
  if (typeof roll === 'string') return roll;
  const skill = roll.skill ? ` (${roll.skill})` : '';
  const ability = roll.ability ? abilityLabels[roll.ability] : roll.type ?? 'Roll';
  const dc = roll.dc ? ` DC ${roll.dc}` : '';
  return roll.label || `Roll ${ability}${skill}${dc}`;
}

function normalizeAbility(value?: AbilityKey): AbilityKey {
  return value && abilityLabels[value] ? value : 'wis';
}

function buildSuggestedDiceRoll(character: Character, suggestedRoll: AiSuggestedRoll): DiceRoll {
  const ability = normalizeAbility(suggestedRoll.ability);
  const mode: RollMode = suggestedRoll.mode ?? 'normal';
  let modifier = abilityModifier(character.abilities[ability]);
  let type: RollType = 'free';
  let skill: string | undefined;
  let label = suggestedRoll.label || formatSuggestedRoll(suggestedRoll);

  if (suggestedRoll.type === 'skill' || suggestedRoll.skill) {
    skill = suggestedRoll.skill && skillAbilityMap[suggestedRoll.skill] ? suggestedRoll.skill : 'Perception';
    modifier = skillModifier(character, skill);
    type = 'skill';
    label = suggestedRoll.label || `${skill} check${suggestedRoll.dc ? ` DC ${suggestedRoll.dc}` : ''}`;
  } else if (suggestedRoll.type === 'save') {
    modifier = savingThrowModifier(character, ability);
    type = 'save';
    label = suggestedRoll.label || `${abilityLabels[ability]} save${suggestedRoll.dc ? ` DC ${suggestedRoll.dc}` : ''}`;
  } else if (suggestedRoll.type === 'initiative') {
    modifier = initiativeModifier(character);
    type = 'initiative';
    label = suggestedRoll.label || 'Initiative';
  }

  const notation = buildNotation(1, 20, modifier, mode);
  const resolved = resolveRoll({
    count: 1,
    sides: 20,
    modifier,
    mode,
    notation,
    label,
  });

  return {
    notation,
    total: resolved.total,
    rolls: resolved.rolls,
    modifier,
    mode,
    type,
    label,
    ability,
    skill,
    keptRoll: resolved.keptRoll,
    droppedRolls: resolved.droppedRolls,
  };
}

function renderMetadata(
  message: StoryMessage,
  activeSession: GameSession | null,
  currentUserId: string | null,
  dispatchGameEvent?: ReturnType<typeof useGameStore.getState>['dispatch'],
  eventMetaBuilder?: ReturnType<typeof useGameStore.getState>['eventMeta'],
  onConfirmAction?: (action: AiConfirmAction, message: StoryMessage) => Promise<void> | void,
  appliedActions = new Set<string>(),
  markActionApplied?: (key: string) => void,
  onMessagesChange?: (messages: StoryMessage[] | ((current: StoryMessage[]) => StoryMessage[])) => void,
  onChoiceSelect?: (choice: AiChoice, message: StoryMessage) => void,
  onSuggestedRoll?: (roll: AiSuggestedRoll | string, message: StoryMessage) => void,
  selectedChoices = new Set<string>(),
  completedRolls = new Set<string>(),
  choicesDisabled = false,
) {
  if (message.metadata?.kind === 'dice_roll') {
    const roll = message.metadata.roll as
      | {
          label?: string;
          notation?: string;
          total?: number;
          mode?: string;
          keptRoll?: number;
          rolls?: number[];
        }
      | undefined;
    if (!roll) return null;

    return (
      <div className="fw-roll" data-result={roll.total === 20 ? 'crit' : roll.total === 1 ? 'fumble' : undefined}>
        <div>
          <div className="fw-roll__formula">{roll.label ?? 'Dice roll'}</div>
          <div className="fw-roll__break">
            {roll.notation}{roll.mode && roll.mode !== 'normal' ? ` · ${roll.mode}` : ''}
            {roll.keptRoll ? ` · kept ${roll.keptRoll}` : ''}
          </div>
        </div>
        <span className="fw-roll__total">{roll.total}</span>
      </div>
    );
  }

  if (message.metadata?.kind === 'combat_event') {
    const action = typeof message.metadata.action === 'string' ? message.metadata.action : 'combat';
    const amount = typeof message.metadata.amount === 'number' ? message.metadata.amount : null;
    return (
      <div className="fw-roll">
        <div>
          <div className="fw-roll__formula">{action.replaceAll('_', ' ')}</div>
          <div className="fw-roll__break">Combat state change requires table confirmation.</div>
        </div>
        {amount !== null ? <span className="fw-roll__total">{amount}</span> : null}
      </div>
    );
  }

  if (
    message.metadata?.kind === 'scene_opening' ||
    message.metadata?.kind === 'scene_objective' ||
    message.metadata?.kind === 'dm_prompt'
  ) {
    const scene = getSceneFlow(message);
    if (!scene) return null;
    const choices = getAiChoices(message);
    const suggestedRoll = getSuggestedRoll(message);
    const actions = choices.length ? [] : Array.isArray(scene.nextActions) ? scene.nextActions.filter(Boolean).slice(0, 4) : [];
    const confirmActions = getConfirmActions(message);
    const rollKey = `${message.id}:suggested-roll`;

    return (
      <>
        {suggestedRoll ? (
          <button
            className="fw-roll"
            disabled={choicesDisabled || completedRolls.has(rollKey) || typeof suggestedRoll === 'string'}
            onClick={() => onSuggestedRoll?.(suggestedRoll, message)}
            type="button"
          >
            <div>
              <div className="fw-roll__formula">Suggested roll</div>
              <div className="fw-roll__break">
                {formatSuggestedRoll(suggestedRoll)}
                {typeof suggestedRoll !== 'string' && suggestedRoll.reason ? ` · ${suggestedRoll.reason}` : ''}
              </div>
            </div>
            <span className="fw-roll__total">?</span>
          </button>
        ) : null}
        {choices.length ? (
          message.metadata?.partyMode === true ? (
            <div className="fw-choices">
              <div className="fw-choices__prompt">Party Decision</div>
              <p className="fw-body-sm">การตัดสินใจนี้เปิดโหวตทั้งปาร์ตี้ก่อนเดินเรื่องต่อ</p>
              <button
                className="fw-btn fw-btn--secondary"
                disabled={choicesDisabled || !activeSession || !currentUserId || !dispatchGameEvent}
                onClick={async () => {
                  if (!activeSession || !currentUserId || !dispatchGameEvent || !eventMetaBuilder) return;
                  const base = createPartyChoice(
                    activeSession.id,
                    message.id,
                    message.body,
                    choices.filter((choice) => !choice.isCustom),
                    'majority',
                  );
                  const choice = {
                    ...base,
                    status: 'voting' as const,
                  };
                  await createPartyChoiceInDb(choice);
                  const meta = eventMetaBuilder(currentUserId);
                  dispatchGameEvent({
                    ...meta,
                    type: 'PARTY_CHOICE_CREATED',
                    sessionId: activeSession.id,
                    choice,
                  });
                }}
                type="button"
              >
                Open Party Vote
              </button>
            </div>
          ) : (
            <div className="fw-choices" aria-label="AI suggested choices">
              <div className="fw-choices__prompt">เลือกการกระทำ</div>
              {choices.map((choice) => {
                const selectedKey = `${message.id}:${choice.number}`;
                return (
                  <button
                    className="fw-choice"
                    data-selected={selectedChoices.has(selectedKey) ? 'true' : undefined}
                    disabled={choicesDisabled || selectedChoices.has(selectedKey)}
                    key={selectedKey}
                    onClick={() => onChoiceSelect?.(choice, message)}
                    type="button"
                  >
                    <span className="fw-choice__letter">{choice.number}</span>
                    {choice.label}
                    {choice.suggestedRoll ? (
                      <span className="fw-choice__votes">{formatChoiceRoll(choice.suggestedRoll)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )
        ) : actions.length ? (
          <div className="scene-action-list">
            {actions.map((action) => (
              <span key={action}>{action}</span>
            ))}
          </div>
        ) : null}
        {confirmActions.length ? (
          <div className="fw-choices">
            {confirmActions.map((action) => (
              <div className="fw-roll" key={action.id}>
                <div>
                  <div className="fw-roll__formula">{action.type.replaceAll('_', ' ')}</div>
                  <div className="fw-roll__break">{action.label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <span className="fw-roll__total" style={{ fontSize: '1.25rem' }}>
                    {action.amount ?? action.condition ?? action.phase ?? action.encounterName ?? 'Apply'}
                  </span>
                  <button
                    className="fw-btn fw-btn--secondary"
                    disabled={!onConfirmAction || appliedActions.has(`${message.id}:${action.id}`)}
                    onClick={async () => {
                      try {
                        await onConfirmAction?.(action, message);
                        markActionApplied?.(`${message.id}:${action.id}`);
                      } catch (error) {
                        onMessagesChange?.((current) =>
                          addUniqueMessage(current, {
                            id: crypto.randomUUID(),
                            speaker: 'system',
                            author: 'Table',
                            body: error instanceof Error ? error.message : 'Could not apply AI action.',
                            createdAt: new Intl.DateTimeFormat('en', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }).format(new Date()),
                          }),
                        );
                      }
                    }}
                    type="button"
                  >
                    {appliedActions.has(`${message.id}:${action.id}`) ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  const actions = getConfirmActions(message);
  const choices = getAiChoices(message);
  const suggestedRoll = getSuggestedRoll(message);
  if (actions.length || choices.length || suggestedRoll) {
    const rollKey = `${message.id}:suggested-roll`;
    return (
      <>
        {suggestedRoll ? (
          <button
            className="fw-roll"
            disabled={choicesDisabled || completedRolls.has(rollKey) || typeof suggestedRoll === 'string'}
            onClick={() => onSuggestedRoll?.(suggestedRoll, message)}
            type="button"
          >
            <div>
              <div className="fw-roll__formula">Suggested roll</div>
              <div className="fw-roll__break">
                {formatSuggestedRoll(suggestedRoll)}
                {typeof suggestedRoll !== 'string' && suggestedRoll.reason ? ` · ${suggestedRoll.reason}` : ''}
              </div>
            </div>
            <span className="fw-roll__total">?</span>
          </button>
        ) : null}
        {choices.length ? (
          message.metadata?.partyMode === true ? (
            <div className="fw-choices">
              <div className="fw-choices__prompt">Party Decision</div>
              <p className="fw-body-sm">การตัดสินใจนี้เปิดโหวตทั้งปาร์ตี้ก่อนเดินเรื่องต่อ</p>
              <button
                className="fw-btn fw-btn--secondary"
                disabled={choicesDisabled || !activeSession || !currentUserId || !dispatchGameEvent}
                onClick={async () => {
                  if (!activeSession || !currentUserId || !dispatchGameEvent || !eventMetaBuilder) return;
                  const base = createPartyChoice(
                    activeSession.id,
                    message.id,
                    message.body,
                    choices.filter((choice) => !choice.isCustom),
                    'majority',
                  );
                  const choice = {
                    ...base,
                    status: 'voting' as const,
                  };
                  await createPartyChoiceInDb(choice);
                  const meta = eventMetaBuilder(currentUserId);
                  dispatchGameEvent({
                    ...meta,
                    type: 'PARTY_CHOICE_CREATED',
                    sessionId: activeSession.id,
                    choice,
                  });
                }}
                type="button"
              >
                Open Party Vote
              </button>
            </div>
          ) : (
            <div className="fw-choices" aria-label="AI suggested choices">
              <div className="fw-choices__prompt">เลือกการกระทำ</div>
              {choices.map((choice) => {
                const selectedKey = `${message.id}:${choice.number}`;
                return (
                  <button
                    className="fw-choice"
                    data-selected={selectedChoices.has(selectedKey) ? 'true' : undefined}
                    disabled={choicesDisabled || selectedChoices.has(selectedKey)}
                    key={selectedKey}
                    onClick={() => onChoiceSelect?.(choice, message)}
                    type="button"
                  >
                    <span className="fw-choice__letter">{choice.number}</span>
                    {choice.label}
                    {choice.suggestedRoll ? (
                      <span className="fw-choice__votes">{formatChoiceRoll(choice.suggestedRoll)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )
        ) : null}
        {actions.length ? (
          <div className="fw-choices">
            {actions.map((action) => (
              <div className="fw-roll" key={action.id}>
                <div>
                  <div className="fw-roll__formula">{action.type.replaceAll('_', ' ')}</div>
                  <div className="fw-roll__break">{action.label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <span className="fw-roll__total" style={{ fontSize: '1.25rem' }}>
                    {action.amount ?? action.condition ?? action.phase ?? action.encounterName ?? 'Apply'}
                  </span>
                  <button
                    className="fw-btn fw-btn--secondary"
                    disabled={!onConfirmAction || appliedActions.has(`${message.id}:${action.id}`)}
                    onClick={async () => {
                      try {
                        await onConfirmAction?.(action, message);
                        markActionApplied?.(`${message.id}:${action.id}`);
                      } catch (error) {
                        onMessagesChange?.((current) =>
                          addUniqueMessage(current, {
                            id: crypto.randomUUID(),
                            speaker: 'system',
                            author: 'Table',
                            body: error instanceof Error ? error.message : 'Could not apply AI action.',
                            createdAt: new Intl.DateTimeFormat('en', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }).format(new Date()),
                          }),
                        );
                      }
                    }}
                    type="button"
                  >
                    {appliedActions.has(`${message.id}:${action.id}`) ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  if (message.metadata?.kind === 'phase_event') {
    const phase = getGamePhaseDefinition(message.metadata.phase);
    return (
      <div className="fw-roll">
        <div>
          <div className="fw-roll__formula">Phase changed</div>
          <div className="fw-roll__break">{phase.description}</div>
        </div>
        <span className="fw-roll__total" style={{ fontSize: '1rem', letterSpacing: '0.06em' }}>{phase.shortLabel}</span>
      </div>
    );
  }

  return null;
}

function getDefaultAiMode(_gamePhase: GamePhase): AiDmMode {
  return 'auto';
}

function makeLocalAiMessage(kind: 'ai_pending' | 'ai_error', body: string, retryPrompt?: string): StoryMessage {
  return {
    id: `${kind}-${crypto.randomUUID()}`,
    speaker: kind === 'ai_pending' ? 'dm' : 'system',
    author: kind === 'ai_pending' ? 'Dungeon Master' : 'AI DM',
    body,
    createdAt: new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date()),
    metadata: {
      kind,
      retryPrompt,
    },
  };
}

export function StoryLog({
  activeSession,
  character,
  characterName,
  encounter,
  initialMessages,
  messages,
  onMessagesChange,
  onConfirmAction,
  gamePhase,
  sessionTitle,
  user,
}: StoryLogProps) {
  const dispatchGameEvent = useGameStore((state) => state.dispatch);
  const eventMetaBuilder = useGameStore((state) => state.eventMeta);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState(hasSupabaseConfig ? 'Choose a table' : 'Local demo');
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState<AiDmMode>(() => getDefaultAiMode(gamePhase));
  const [customChoicePrompt, setCustomChoicePrompt] = useState('');
  const [pendingAiMessage, setPendingAiMessage] = useState<StoryMessage | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<StoryMessage | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [completedRolls, setCompletedRolls] = useState<Set<string>>(new Set());
  const customChoiceInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  function markActionApplied(key: string) {
    setAppliedActions((current) => new Set(current).add(key));
  }

  function toggleExpanded(messageId: string) {
    setExpandedMessages((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  useEffect(() => {
    setAiMode(getDefaultAiMode(gamePhase));
    setPendingAiMessage(null);
    setAiErrorMessage(null);
  }, [gamePhase]);

  useEffect(() => {
    if (!activeSession || !supabase || !user) {
      onMessagesChange(hasSupabaseConfig ? [] : initialMessages);
      setStatus(hasSupabaseConfig ? 'Choose a table' : 'Local demo');
      return;
    }

    const client = supabase;
    let alive = true;
    setStatus('Loading log');
    loadSessionMessages(activeSession.id)
      .then((rows) => {
        if (!alive) return;
        onMessagesChange(rows);
        setStatus('Realtime live');
      })
      .catch((error: Error) => {
        if (!alive) return;
        onMessagesChange([]);
        setStatus(error.message);
      });

    const channel = subscribeToSessionMessages(activeSession.id, (message) => {
      onMessagesChange((current) => addUniqueMessage(current, message));
    });

    return () => {
      alive = false;
      void client.removeChannel(channel);
    };
  }, [activeSession, initialMessages, onMessagesChange, user]);

  async function askAiForMessage(body: string, latestMessages: StoryMessage[]) {
    if (!activeSession || !user || !supabase) return;

    setStatus('AI DM thinking');
    setPendingAiMessage(makeLocalAiMessage('ai_pending', 'AI DM กำลังอ่านสถานการณ์และเตรียมคำตอบ...'));
    setAiErrorMessage(null);

    try {
      const message = await requestAiDmReply(activeSession.id, characterName, body, latestMessages, {
        session: activeSession,
        gamePhase,
        character,
        encounter,
        aiMode: 'adventure',
        latestScene: getLatestSceneFlow(latestMessages),
        partySummary: `${character.name}, level ${character.level} ${character.ancestry} ${character.className}`,
      });
      onMessagesChange((current) => addUniqueMessage(current, message));
      setStatus('Realtime live');
    } catch (error) {
      const errorBody = error instanceof Error ? error.message : 'AI DM could not reply.';
      setAiErrorMessage(makeLocalAiMessage('ai_error', errorBody, body));
      setStatus('AI needs attention');
    } finally {
      setPendingAiMessage(null);
    }
  }

  async function sendMessage(shouldAskAi: boolean) {
    const body = draft.trim();
    if (!body) return;

    setDraft('');

    if (!activeSession || !user || !supabase) {
      onMessagesChange((current) => [...current, localMessage(body)]);
      return;
    }

    setBusy(true);
    try {
      const author = user.email?.split('@')[0] || characterName;
      const playerMessage = await sendSessionMessage(activeSession.id, 'player', author, body);
      onMessagesChange((current) => addUniqueMessage(current, playerMessage));

      if (shouldAskAi) {
        await askAiForMessage(body, [...messages, playerMessage]);
      }
    } catch (error) {
      const body = error instanceof Error ? error.message : 'Could not send message.';
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body,
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        }),
      );
      setStatus('Needs attention');
    } finally {
      setBusy(false);
    }
  }

  async function chooseAiOption(choice: AiChoice, sourceMessage: StoryMessage) {
    const selectedKey = `${sourceMessage.id}:${choice.number}`;
    if (busy || selectedChoices.has(selectedKey)) return;

    if (choice.isCustom) {
      setCustomChoicePrompt('');
      window.requestAnimationFrame(() => customChoiceInputRef.current?.focus());
      return;
    }

    const body = `เลือก ${choice.number}: ${choice.prompt || choice.label}`;
    setSelectedChoices((current) => new Set(current).add(selectedKey));

    if (!activeSession || !user || !supabase) {
      onMessagesChange((current) => [...current, localMessage(body)]);
      return;
    }

    setBusy(true);
    try {
      const author = user.email?.split('@')[0] || characterName;
      const playerMessage = await sendSessionMessage(activeSession.id, 'player', author, body, {
        kind: 'ai_choice',
        choice,
        sourceMessageId: sourceMessage.id,
      });
      const latestMessages = [...messages, playerMessage];
      onMessagesChange((current) => addUniqueMessage(current, playerMessage));
      await askAiForMessage(body, latestMessages);
    } catch (error) {
      setSelectedChoices((current) => {
        const next = new Set(current);
        next.delete(selectedKey);
        return next;
      });
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: error instanceof Error ? error.message : 'Could not use that choice.',
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        }),
      );
      setStatus('Needs attention');
    } finally {
      setBusy(false);
    }
  }

  async function submitCustomChoice(event: FormEvent) {
    event.preventDefault();
    const body = customChoicePrompt.trim();
    if (!body || busy) return;

    setCustomChoicePrompt('');

    if (!activeSession || !user || !supabase) {
      onMessagesChange((current) => [...current, localMessage(body)]);
      return;
    }

    setBusy(true);
    try {
      const author = user.email?.split('@')[0] || characterName;
      const playerMessage = await sendSessionMessage(activeSession.id, 'player', author, body, {
        kind: 'custom_choice',
      });
      const latestMessages = [...messages, playerMessage];
      onMessagesChange((current) => addUniqueMessage(current, playerMessage));
      await askAiForMessage(body, latestMessages);
    } catch (error) {
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: error instanceof Error ? error.message : 'Could not send custom action.',
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        }),
      );
      setStatus('Needs attention');
    } finally {
      setBusy(false);
    }
  }

  async function rollSuggestedAction(suggestedRoll: AiSuggestedRoll | string, sourceMessage: StoryMessage) {
    if (busy || typeof suggestedRoll === 'string') return;
    const rollKey = `${sourceMessage.id}:suggested-roll`;
    if (completedRolls.has(rollKey)) return;

    const roll = buildSuggestedDiceRoll(character, suggestedRoll);
    const rollDetails = roll.keptRoll ? `kept ${roll.keptRoll} from ${roll.rolls.join(', ')}` : roll.rolls.join(', ');
    const dcText = suggestedRoll.dc ? ` vs DC ${suggestedRoll.dc}` : '';
    const body = `${character.name} rolled ${roll.label}${dcText}: ${roll.notation} = ${roll.total} (${rollDetails}${
      roll.modifier ? `, modifier ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}` : ''
    })`;
    const metadata = {
      kind: 'dice_roll',
      roll,
      suggestedRoll,
      sourceMessageId: sourceMessage.id,
      character: {
        id: character.id,
        name: character.name,
      },
    };

    setCompletedRolls((current) => new Set(current).add(rollKey));

    if (!activeSession || !user || !supabase) {
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Dice',
          body,
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
          metadata,
        }),
      );
      return;
    }

    setBusy(true);
    try {
      const diceMessage = await sendSessionMessage(activeSession.id, 'system', 'Dice', body, metadata);
      const latestMessages = [...messages, diceMessage];
      onMessagesChange((current) => addUniqueMessage(current, diceMessage));
      await askAiForMessage(
        `ผลการทอย: ${body}\nจงบรรยายผลตาม success/partial/failure ถ้ามี DC และเสนอทางเลือกถัดไป`,
        latestMessages,
      );
    } catch (error) {
      setCompletedRolls((current) => {
        const next = new Set(current);
        next.delete(rollKey);
        return next;
      });
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: error instanceof Error ? error.message : 'Could not roll the suggested check.',
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    await sendMessage(aiMode === 'auto');
  }

  async function retryAiReply(prompt: string) {
    if (!prompt || !activeSession || busy) return;
    setBusy(true);
    try {
      await askAiForMessage(prompt, messages);
    } finally {
      setBusy(false);
    }
  }

  async function openSceneFromEmptyState() {
    if (busy) return;
    const prompt = 'เริ่มการผจญภัย: เปิดฉากแรกให้สั้น กระชับ มีบรรยากาศ เป้าหมายแรก และทางเลือกถัดไป';
    if (!activeSession || !user || !supabase) {
      onMessagesChange((current) =>
        addUniqueMessage(current, {
          id: crypto.randomUUID(),
          speaker: 'system',
          author: 'Table',
          body: 'เชื่อมต่อโต๊ะก่อน แล้วกด Ask AI to Open Scene อีกครั้ง',
          createdAt: new Intl.DateTimeFormat('en', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()),
        }),
      );
      return;
    }
    setBusy(true);
    try {
      await askAiForMessage(prompt, messages);
    } finally {
      setBusy(false);
    }
  }

  const visibleMessages = [
    ...messages,
    ...(pendingAiMessage ? [pendingAiMessage] : []),
    ...(aiErrorMessage ? [aiErrorMessage] : []),
  ];

  return (
    <section className="fw-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Session</p>
          <h2 className="fw-h2">{sessionTitle ?? 'Story Log'}</h2>
        </div>
        <span className="fw-caption">
          <Radio size={13} aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="fw-log">
        {visibleMessages.length === 0 ? (
          <article className="fw-msg fw-msg--system" style={{ margin: 'auto', maxWidth: '640px' }}>
            <div className="fw-msg__meta">
              <span className="fw-msg__who">Guide</span>
            </div>
            <h3 className="fw-h3" style={{ margin: 0 }}>เริ่มต้นการผจญภัย</h3>
            <p className="fw-msg__body">เลือกจุดเริ่มต้นอย่างใดอย่างหนึ่ง แล้วระบบจะพาคุณเข้าสู่ฉากแรกทันที</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <button
                className="fw-btn fw-btn--primary fw-btn--lg"
                disabled={busy}
                onClick={() => void openSceneFromEmptyState()}
                type="button"
              >
                Ask AI to Open Scene
              </button>
              <button
                className="fw-btn fw-btn--ghost"
                disabled={Boolean(character.name.trim() && character.className.trim() && character.ancestry.trim())}
                type="button"
              >
                เลือกตัวละครก่อน
              </button>
              <button
                className="fw-btn fw-btn--ghost"
                onClick={() => composerInputRef.current?.focus()}
                type="button"
              >
                พิมพ์ action เองด้านล่าง
              </button>
            </div>
          </article>
        ) : visibleMessages.map((message) => {
          const kind = getMessageKind(message);
          const isLong = message.body.length > 260;
          const expanded = expandedMessages.has(message.id);
          const body = isLong && !expanded ? `${message.body.slice(0, 260).trim()}...` : message.body;
          const retryPrompt =
            typeof message.metadata?.retryPrompt === 'string' ? message.metadata.retryPrompt : '';

          return (
            <article className={`fw-msg ${getMsgVariant(kind, message.speaker)}`} key={message.id}>
              <div className="fw-msg__meta">
                <span className="fw-msg__who">{message.author}</span>
                <span className="fw-msg__tag">{kind.toString().replace('_', ' ')}</span>
                <time>{message.createdAt}</time>
              </div>
              {kind === 'ai_pending' ? (
                <span className="fw-thinking">
                  <span className="fw-thinking__dot" />
                  <span className="fw-thinking__dot" style={{ animationDelay: '0.3s' }} />
                  <span className="fw-thinking__dot" style={{ animationDelay: '0.6s' }} />
                  AI DM กำลังคิด
                </span>
              ) : (
                <p className="fw-msg__body">{body}</p>
              )}
              {isLong ? (
                <button className="fw-btn fw-btn--ghost" onClick={() => toggleExpanded(message.id)} type="button">
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              ) : null}
              {renderMetadata(
                message,
                activeSession,
                user?.id ?? null,
                dispatchGameEvent,
                eventMetaBuilder,
                onConfirmAction,
                appliedActions,
                markActionApplied,
                onMessagesChange,
                chooseAiOption,
                rollSuggestedAction,
                selectedChoices,
                completedRolls,
                busy,
              )}
              {message.metadata?.kind === 'ai_error' && retryPrompt ? (
                <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={() => retryAiReply(retryPrompt)} type="button">
                  Try again
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="fw-composer-shell">
        <div className="fw-composer-controls">
          <Bot size={16} aria-hidden="true" />
          <div className="fw-ai-mode-switch" aria-label="AI DM mode">
            {(['auto', 'assist', 'off'] as AiDmMode[]).map((mode) => (
              <button
                className={`fw-btn fw-btn--ghost${aiMode === mode ? ' fw-btn--primary' : ''}`}
                disabled={!activeSession || busy}
                key={mode}
                onClick={() => setAiMode(mode)}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
          <span className="fw-caption">
            {aiMode === 'auto'
              ? 'AI replies after each message'
              : aiMode === 'assist'
                ? 'Use Ask AI when you want guidance'
                : 'AI will stay silent'}
          </span>
          <div className="fw-caption" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Tooltip label="Difficulty Class — ค่าที่ต้องทอยให้ถึง">DC</Tooltip>
            <Tooltip label="ลำดับการตี — ทอย d20 + DEX">Initiative</Tooltip>
            <Tooltip label="ความชำนาญ — เพิ่มโบนัสตามเลเวล">Proficiency</Tooltip>
          </div>
        </div>

        <form className="fw-composer-form" onSubmit={submitMessage}>
          <input
            className="fw-input"
            aria-label="Player action"
            disabled={busy}
            ref={composerInputRef}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              activeSession || !hasSupabaseConfig
                ? getGamePhaseDefinition(gamePhase).composerPlaceholder
                : 'Create or join a table to send messages...'
            }
            value={draft}
          />
          {aiMode === 'assist' ? (
            <button
              aria-label="Ask AI DM"
              className="fw-btn fw-btn--ghost"
              disabled={busy || (!activeSession && hasSupabaseConfig) || !draft.trim()}
              onClick={() => void sendMessage(true)}
              type="button"
            >
              <Bot size={18} aria-hidden="true" />
            </button>
          ) : null}
          <button className="fw-btn fw-btn--primary" aria-label="Send message" disabled={busy || (!activeSession && hasSupabaseConfig)} type="submit">
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
        <form className="custom-choice-form" onSubmit={submitCustomChoice}>
          <input
            className="fw-input"
            aria-label="Custom action"
            disabled={busy || (!activeSession && hasSupabaseConfig)}
            ref={customChoiceInputRef}
            onChange={(event) => setCustomChoicePrompt(event.target.value)}
            placeholder="ทำอย่างอื่น... พิมพ์สิ่งที่อยากทำเอง"
            value={customChoicePrompt}
          />
          <button className="fw-btn" disabled={busy || !customChoicePrompt.trim() || (!activeSession && hasSupabaseConfig)} type="submit">
            ส่ง
          </button>
        </form>
      </div>
    </section>
  );
}

import { Bot, Radio, Send } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import { getGamePhaseDefinition } from '../lib/gamePhases';
import {
  loadSessionMessages,
  requestAiDmReply,
  sendSessionMessage,
  subscribeToSessionMessages,
} from '../lib/messages';
import type { Character, EncounterState, GamePhase, GameSession, StoryMessage } from '../types';

type StoryLogProps = {
  activeSession: GameSession | null;
  character: Character;
  characterName: string;
  encounter: EncounterState | null;
  initialMessages: StoryMessage[];
  messages: StoryMessage[];
  onMessagesChange: (messages: StoryMessage[] | ((current: StoryMessage[]) => StoryMessage[])) => void;
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
  if (kind === 'dice_roll' || kind === 'combat_event' || kind === 'phase_event') return kind;
  return message.speaker;
}

function renderMetadata(message: StoryMessage) {
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
      <div className="event-card dice-event">
        <span>{roll.label ?? 'Dice roll'}</span>
        <strong>{roll.total}</strong>
        <small>
          {roll.notation}
          {roll.mode && roll.mode !== 'normal' ? ` · ${roll.mode}` : ''}
          {roll.keptRoll ? ` · kept ${roll.keptRoll}` : ''}
        </small>
      </div>
    );
  }

  if (message.metadata?.kind === 'combat_event') {
    const action = typeof message.metadata.action === 'string' ? message.metadata.action : 'combat';
    const amount = typeof message.metadata.amount === 'number' ? message.metadata.amount : null;
    return (
      <div className="event-card combat-event">
        <span>{action.replaceAll('_', ' ')}</span>
        {amount !== null ? <strong>{amount}</strong> : null}
        <small>Combat state change requires table confirmation.</small>
      </div>
    );
  }

  if (message.metadata?.kind === 'phase_event') {
    const phase = getGamePhaseDefinition(message.metadata.phase);
    return (
      <div className="event-card phase-event">
        <span>Phase changed</span>
        <strong>{phase.shortLabel}</strong>
        <small>{phase.description}</small>
      </div>
    );
  }

  return null;
}

export function StoryLog({
  activeSession,
  character,
  characterName,
  encounter,
  initialMessages,
  messages,
  onMessagesChange,
  gamePhase,
  sessionTitle,
  user,
}: StoryLogProps) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState(hasSupabaseConfig ? 'Choose a table' : 'Local demo');
  const [busy, setBusy] = useState(false);
  const [aiDmEnabled, setAiDmEnabled] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

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
    if (!activeSession || !supabase || !user) {
      onMessagesChange(initialMessages);
      setStatus(hasSupabaseConfig ? 'Choose a table' : 'Local demo');
      return;
    }

    const client = supabase;
    let alive = true;
    setStatus('Loading log');
    loadSessionMessages(activeSession.id)
      .then((rows) => {
        if (!alive) return;
        onMessagesChange(rows.length ? rows : initialMessages);
        setStatus('Realtime live');
      })
      .catch((error: Error) => {
        if (!alive) return;
        onMessagesChange(initialMessages);
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

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
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

      if (aiDmEnabled) {
        setStatus('AI DM thinking');
        await requestAiDmReply(activeSession.id, characterName, body, [...messages, playerMessage], {
          session: activeSession,
          gamePhase,
          character,
          encounter,
        });
        setStatus('Realtime live');
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
    }
    setBusy(false);
  }

  return (
    <section className="panel story-panel">
      <div className="story-header">
        <div>
          <p className="eyebrow">Session</p>
          <h2>{sessionTitle ?? 'Story Log'}</h2>
          <span>Shared table timeline</span>
        </div>
        <span className="live-dot">
          <Radio size={13} aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="messages">
        {messages.map((message) => {
          const isLong = message.body.length > 260;
          const expanded = expandedMessages.has(message.id);
          const body = isLong && !expanded ? `${message.body.slice(0, 260).trim()}...` : message.body;

          return (
            <article className={`message ${message.speaker} ${getMessageKind(message)}`} key={message.id}>
              <div className="message-marker" aria-hidden="true">
                {message.author.slice(0, 1).toUpperCase()}
              </div>
              <div className="message-content">
                <div className="message-meta">
                  <span className="message-author">{message.author}</span>
                  <span className="message-badge">{getMessageKind(message).toString().replace('_', ' ')}</span>
                  <time>{message.createdAt}</time>
                </div>
                <p className={isLong && !expanded ? 'message-body collapsed' : 'message-body'}>{body}</p>
                {isLong ? (
                  <button className="message-expand" onClick={() => toggleExpanded(message.id)} type="button">
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                ) : null}
                {renderMetadata(message)}
              </div>
            </article>
          );
        })}
      </div>

      <div className="composer-shell">
        <label className="ai-toggle">
          <input
            checked={aiDmEnabled}
            disabled={!activeSession || busy}
            onChange={(event) => setAiDmEnabled(event.target.checked)}
            type="checkbox"
          />
          <Bot size={16} aria-hidden="true" />
          AI DM
        </label>

        <form className="message-form" onSubmit={submitMessage}>
          <input
            aria-label="Player action"
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              activeSession || !hasSupabaseConfig
                ? getGamePhaseDefinition(gamePhase).composerPlaceholder
                : 'Create or join a table to send messages...'
            }
            value={draft}
          />
          <button aria-label="Send message" disabled={busy || (!activeSession && hasSupabaseConfig)} type="submit">
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}

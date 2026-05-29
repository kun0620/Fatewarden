import { useMemo, useState } from 'react';
import type { AiConfirmAction } from '../types';
import { Icon } from './ui/Icons';

type Tone = 'Balanced' | 'Grim' | 'Heroic' | 'Mystery';
type Strictness = 'Casual' | 'Standard' | 'Hardcore';

type AiDmPanelProps = {
  busy?: boolean;
  pendingConfirmAction?: AiConfirmAction | null;
  onAiAction: (label: string, prompt: string) => Promise<void>;
  onConfirmAction?: (action: AiConfirmAction) => Promise<void>;
  onRejectAction?: () => void;
};

const WARDEN_ACTIONS = [
  {
    icon: 'sparkles',
    name: 'Generate Scene',
    desc: 'From recent log + chosen tone.',
    prompt: (tone: Tone) => `Generate a vivid scene description. Tone: ${tone}.`,
  },
  {
    icon: 'alert',
    name: 'Suggest Consequence',
    desc: 'Outcome of last action.',
    prompt: () => 'Suggest a narrative consequence for the last player action.',
  },
  {
    icon: 'book',
    name: 'Ask Rules',
    desc: 'RAW citation. No state change.',
    prompt: () => 'Look up relevant rules for the current situation. Cite rules directly. Do not modify any game state.',
  },
  {
    icon: 'users',
    name: 'Voice NPC',
    desc: 'Speak as an NPC in the scene.',
    prompt: () => 'Speak in character as the most relevant NPC in the current scene.',
  },
  {
    icon: 'map',
    name: 'Roll Random Encounter',
    desc: 'By region.',
    prompt: () => 'Generate a random encounter appropriate for the current region and situation.',
  },
] as const;

function describeConfirmAction(action: AiConfirmAction): string {
  const target = action.targetName || action.targetId || 'Target';
  if (action.type === 'damage') return `${target} takes ${action.amount ?? 0} damage from AI Warden.`;
  if (action.type === 'healing') return `${target} heals ${action.amount ?? 0} HP.`;
  if (action.type === 'add_condition') return `${target} gains condition: ${action.condition ?? 'Unknown condition'}.`;
  if (action.type === 'remove_condition') return `${target} loses condition: ${action.condition ?? 'Unknown condition'}.`;
  if (action.type === 'phase_change') return `Scene transitions to: ${action.phase ?? 'unknown phase'}.`;
  return action.note || action.label || JSON.stringify(action);
}

export function AiDmPanel({
  busy = false,
  pendingConfirmAction = null,
  onAiAction,
  onConfirmAction,
  onRejectAction,
}: AiDmPanelProps) {
  const [aiOn, setAiOn] = useState(true);
  const [tone, setTone] = useState<Tone>('Balanced');
  const [strictness, setStrictness] = useState<Strictness>('Standard');
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const toneButtons: Tone[] = ['Balanced', 'Grim', 'Heroic', 'Mystery'];
  const strictnessButtons: Strictness[] = ['Casual', 'Standard', 'Hardcore'];

  const proposalText = useMemo(() => {
    if (!pendingConfirmAction) return '';
    return describeConfirmAction(pendingConfirmAction);
  }, [pendingConfirmAction]);

  async function handleAiAction(label: string, prompt: string) {
    if (!aiOn || busy) return;
    setAiError(null);
    try {
      await onAiAction(label, `[Tone: ${tone}] [Strictness: ${strictness}] ${prompt}`);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    }
  }

  async function handleConfirm(action: AiConfirmAction) {
    if (!onConfirmAction || confirmBusy) return;
    setAiError(null);
    setConfirmBusy(true);
    try {
      await onConfirmAction(action);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not apply AI proposal.');
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <section className="fw-panel">
      <div
        style={{
          margin: 'var(--sp-3)',
          padding: 'var(--sp-3)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(124,58,237,0.4)',
          background: 'linear-gradient(180deg, rgba(124,58,237,0.2), rgba(17,12,29,0.9))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(124,58,237,0.3)',
                border: '1px solid rgba(124,58,237,0.5)',
              }}
            >
              {Icon('wand', { size: 16 })}
            </span>
            <div>
              <p className="fw-display" style={{ margin: 0, fontSize: '12.5px' }}>
                AI Warden
              </p>
              <p className="fw-serif" style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                {aiOn ? 'Assistant · awaits the DM.' : 'Off.'}
              </p>
            </div>
          </div>

          <button type="button" className={`fw-toggle ${aiOn ? 'on' : ''}`} onClick={() => setAiOn((value) => !value)} aria-label="Toggle AI Warden" />
        </div>
      </div>

      <div className="fw-field" style={{ padding: '0 var(--sp-3)' }}>
        <label className="fw-label">Tone</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
          {toneButtons.map((option) => (
            <button
              key={option}
              type="button"
              className="fw-btn fw-btn-ghost fw-btn--sm"
              onClick={() => setTone(option)}
              style={
                tone === option
                  ? {
                      borderColor: 'var(--gold-deep)',
                      color: 'var(--gold-bright)',
                      background: 'rgba(214,168,79,0.08)',
                    }
                  : undefined
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="fw-field" style={{ padding: 'var(--sp-3)' }}>
        <label className="fw-label">Rule Strictness</label>
        <div className="fw-seg" role="tablist" aria-label="Rule strictness">
          {strictnessButtons.map((option) => (
            <button
              key={option}
              className={`fw-seg-btn ${strictness === option ? 'active' : ''}`}
              onClick={() => setStrictness(option)}
              role="tab"
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 var(--sp-3) var(--sp-3)' }}>
        <p className="fw-eyebrow">Warden Actions</p>
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          {WARDEN_ACTIONS.map((action) => (
            <button
              key={action.name}
              className="fw-btn fw-btn-ghost"
              disabled={busy || !aiOn}
              onClick={() => void handleAiAction(action.name, action.prompt(tone))}
              type="button"
              style={{ justifyContent: 'space-between', textAlign: 'left' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                {Icon(action.icon, { size: 14 })}
                {action.name}
              </span>
              <span className="fw-caption" style={{ color: 'var(--text-3)' }}>
                {action.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {busy ? (
        <div
          style={{
            margin: '0 var(--sp-3) var(--sp-3)',
            padding: 'var(--sp-3)',
            border: '1px solid rgba(124,58,237,0.4)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
          }}
        >
          <span className="fw-rune-spin" style={{ display: 'inline-flex' }}>
            {Icon('sparkles', { size: 14 })}
          </span>
          <span className="fw-body-sm">The Warden is thinking...</span>
        </div>
      ) : null}

      {aiError ? (
        <div
          style={{
            margin: '0 var(--sp-3) var(--sp-3)',
            padding: 'var(--sp-3)',
            border: '1px solid rgba(153,27,27,0.45)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(153,27,27,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            color: '#fca5a5',
          }}
        >
          {Icon('alert', { size: 14 })}
          <span className="fw-body-sm">{aiError}</span>
        </div>
      ) : null}

      {pendingConfirmAction ? (
        <div
          style={{
            margin: '0 var(--sp-3) var(--sp-3)',
            padding: 'var(--sp-3)',
            border: '1px solid rgba(214,168,79,0.45)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(20,17,29,0.9)',
          }}
        >
          <p className="fw-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            {Icon('alert', { size: 12 })}Pending Confirmation
          </p>
          <p className="fw-serif" style={{ margin: 'var(--sp-2) 0 var(--sp-3)', fontStyle: 'italic' }}>
            The Warden proposes: {proposalText}
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              className="fw-btn fw-btn-gold fw-btn--sm"
              disabled={confirmBusy}
              onClick={() => void handleConfirm(pendingConfirmAction)}
              type="button"
            >
              {Icon('check', { size: 12 })}Confirm
            </button>
            <button className="fw-btn fw-btn-ghost fw-btn--sm" onClick={onRejectAction} type="button">
              {Icon('x', { size: 12 })}Reject
            </button>
          </div>
        </div>
      ) : null}

      <p className="fw-serif" style={{ margin: '0 var(--sp-3) var(--sp-3)', color: 'var(--text-4)', fontStyle: 'italic' }}>
        The Warden suggests. It never commits damage, conditions, death, or inventory loss without your approval.
      </p>
    </section>
  );
}


import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { applyLevelUp, getLevelUpChoices } from '../lib/characterProgression';
import type { Character, LevelUpChoice } from '../types';

type LevelUpModalProps = {
  character: Character;
  open: boolean;
  onCancel: () => void;
  onConfirm: (updatedCharacter: Character, choices: LevelUpChoice[]) => Promise<void> | void;
};

function updateChoice(choices: LevelUpChoice[], type: LevelUpChoice['type'], selected: string) {
  return choices.map((choice) => (choice.type === type ? { ...choice, selected } : choice));
}

export function LevelUpModal({ character, open, onCancel, onConfirm }: LevelUpModalProps) {
  const baseChoices = useMemo(() => getLevelUpChoices(character), [character]);
  const [choices, setChoices] = useState<LevelUpChoice[]>(baseChoices);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChoices(baseChoices);
  }, [baseChoices]);

  if (!open) return null;

  async function confirmLevelUp() {
    setBusy(true);
    const updated = applyLevelUp(character, choices);
    await onConfirm(updated, choices);
    setBusy(false);
  }

  const nextLevel = Math.min(character.level + 1, 20);
  const confirmDisabledReason = busy
    ? 'Level up is being applied.'
    : !choices.length
      ? 'No level up choices are available yet.'
      : 'Apply level up changes.';

  return (
    <div className="fw-backdrop levelup-backdrop" role="presentation">
      <section aria-modal="true" className="fw-modal levelup-modal" role="dialog">
        <div className="fw-modal__header levelup-modal__header">
          <div className="levelup-headline">
            <p className="fw-caption">Ascension</p>
            <h2 className="levelup-title">✦ LEVEL {nextLevel} ATTAINED ✦</h2>
            <p className="levelup-subtitle">
              {character.name} grows in power.
            </p>
            <small className="levelup-meta">
              {character.ancestry} {character.className}
            </small>
          </div>
          <button aria-label="Close level up modal" className="fw-btn fw-btn--icon" disabled={busy} onClick={onCancel} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="levelup-steps">
          <article className="levelup-step-card">
            <p className="fw-caption">1. Features Gained</p>
            <p className="levelup-step-text">Choose the new feature package for this level.</p>
          </article>
          <article className="levelup-step-card">
            <p className="fw-caption">2. HP Increase</p>
            <p className="levelup-step-text">Pick how vitality grows with this ascension.</p>
          </article>
          <article className="levelup-step-card">
            <p className="fw-caption">3. Class Choices</p>
            <p className="levelup-step-text">Resolve spells, ability score, or feature variants.</p>
          </article>
        </div>

        <div className="levelup-fields">
          {choices.map((choice) => (
            <div className="fw-field" key={choice.type}>
              <label className="fw-field__label">
                {choice.type === 'hp' ? 'HP Growth' : choice.type === 'feature' ? 'New Features' : choice.type === 'spell' ? 'Spell Choice' : 'Ability Score'}
              </label>
              <select
                className="fw-select"
                disabled={busy}
                onChange={(event) => setChoices((current) => updateChoice(current, choice.type, event.target.value))}
                value={choice.selected ?? choice.options[0] ?? ''}
              >
                {choice.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="levelup-actions">
          <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="fw-btn fw-btn-gold"
            disabled={busy || !choices.length}
            onClick={() => void confirmLevelUp()}
            title={confirmDisabledReason}
            type="button"
          >
            <Sparkles aria-hidden="true" size={16} />
            {busy ? 'Applying...' : 'Seal the Ascension'}
          </button>
        </div>
      </section>
    </div>
  );
}

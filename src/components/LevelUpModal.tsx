import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { applyLevelUp, getLevelUpChoices } from '../lib/characterProgression';
import type { Character, LevelUpChoice } from '../types';

type LevelUpModalProps = {
  character: Character;
  open: boolean;
  onCancel: () => void;
  onConfirm: (updatedCharacter: Character) => Promise<void> | void;
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
    await onConfirm(updated);
    setBusy(false);
  }

  return (
    <div className="fw-backdrop" role="presentation">
      <section aria-modal="true" className="fw-modal" role="dialog">
        <div className="fw-modal__header">
          <div>
            <p className="fw-caption">Level Up</p>
            <h2 className="fw-h2">
              {character.name} to Level {Math.min(character.level + 1, 20)}
            </h2>
            <small>
              {character.ancestry} {character.className}
            </small>
          </div>
          <button aria-label="Close level up modal" className="fw-btn fw-btn--icon" disabled={busy} onClick={onCancel} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
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

        <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
          <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="fw-btn fw-btn--primary" disabled={busy || !choices.length} onClick={() => void confirmLevelUp()} type="button">
            <Sparkles aria-hidden="true" size={16} />
            {busy ? 'Applying...' : 'Confirm Level Up'}
          </button>
        </div>
      </section>
    </div>
  );
}

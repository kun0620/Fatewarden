import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { FEATS } from '../data/feats';
import type { Feat } from '../data/feats';
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

function formatAsiLabel(option: string): string {
  if (option.toLowerCase().startsWith('feat')) return 'Feat';
  return option
    .split(',')
    .map((part) => {
      const [ability, bonus] = part.trim().split('+');
      return `${ability.toUpperCase()} +${bonus}`;
    })
    .join(' · ');
}

function formatSpellLabel(option: string): string {
  return option.replace(/^learn spell:\s*/i, '');
}

function meetPrereq(feat: Feat, char: Character): boolean {
  if (!feat.prerequisite) return true;
  const p = feat.prerequisite;
  if (p.minLevel && char.level < p.minLevel) return false;
  if (p.ability) {
    const val = char.abilities[p.ability.key as keyof typeof char.abilities];
    if ((val ?? 0) < p.ability.min) return false;
  }
  if (p.spellcasting) {
    const casters = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'];
    if (!casters.includes(char.className?.toLowerCase() ?? '')) return false;
  }
  if (p.proficiency) {
    const needed = p.proficiency.toLowerCase();
    if (!char.proficiencies?.some((prof) => prof.toLowerCase() === needed)) return false;
  }
  return true;
}

function formatPrerequisite(feat: Feat): string | undefined {
  const prerequisite = feat.prerequisite;
  if (!prerequisite) return undefined;
  const parts: string[] = [];
  if (prerequisite.minLevel) parts.push(`Level ${prerequisite.minLevel}+`);
  if (prerequisite.ability) parts.push(`${prerequisite.ability.key.toUpperCase()} ${prerequisite.ability.min}+`);
  if (prerequisite.proficiency) parts.push(`Proficiency: ${prerequisite.proficiency}`);
  if (prerequisite.spellcasting) parts.push('Spellcasting');
  if (prerequisite.armor) parts.push(`Armor: ${prerequisite.armor}`);
  return parts.join(' · ');
}

function ChoiceCard({
  label,
  selected,
  onClick,
  accent,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  accent?: 'gold' | 'arcane';
}) {
  const borderColor = selected
    ? accent === 'arcane'
      ? 'var(--arcane)'
      : 'var(--gold)'
    : 'var(--border-soft)';
  const bg = selected
    ? accent === 'arcane'
      ? 'rgba(124,58,237,0.12)'
      : 'rgba(214,168,79,0.10)'
    : 'var(--bg-deep)';
  const textColor = selected
    ? accent === 'arcane'
      ? 'var(--arcane-bright)'
      : 'var(--gold-bright)'
    : 'var(--text-2)';

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '10px 14px',
        border: `1px solid ${borderColor}`,
        borderRadius: 7,
        background: bg,
        color: textColor,
        fontSize: 13,
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: selected ? `0 0 8px ${accent === 'arcane' ? 'rgba(124,58,237,0.25)' : 'rgba(214,168,79,0.2)'}` : 'none',
      }}
    >
      {selected && (
        <span style={{ marginRight: 6, fontSize: 10 }}>✦</span>
      )}
      {label}
    </button>
  );
}

export function LevelUpModal({ character, open, onCancel, onConfirm }: LevelUpModalProps) {
  const baseChoices = useMemo(() => getLevelUpChoices(character), [character]);
  const [choices, setChoices] = useState<LevelUpChoice[]>(baseChoices);
  const [busy, setBusy] = useState(false);
  const [asiMode, setAsiMode] = useState<'ability' | 'feat'>('ability');
  const [featSearch, setFeatSearch] = useState('');
  const [selectedFeatId, setSelectedFeatId] = useState<string | undefined>();

  useEffect(() => {
    setChoices(baseChoices);
    setAsiMode(baseChoices.some((choice) => choice.type === 'ability_score') ? 'ability' : 'feat');
    setFeatSearch('');
    setSelectedFeatId(undefined);
  }, [baseChoices]);

  async function confirmLevelUp() {
    setBusy(true);
    const effectiveChoices = asiMode === 'feat'
      ? choices.map((choice) => {
          if (choice.type === 'ability_score') return { ...choice, selected: 'Feat (table rule)' };
          if (choice.type === 'feat') return { ...choice, selected: selectedFeatId };
          return choice;
        })
      : choices;
    const updated = applyLevelUp(character, effectiveChoices);
    const updatedWithFeat = asiMode === 'feat' && selectedFeatId
      ? {
          ...updated,
          feats: Array.from(new Set([...(updated.feats ?? character.feats ?? []), selectedFeatId])),
        }
      : updated;
    await onConfirm(updatedWithFeat, effectiveChoices);
    setBusy(false);
  }

  const nextLevel = Math.min(character.level + 1, 20);

  const featureChoice = choices.find((c) => c.type === 'feature');
  const hpChoice = choices.find((c) => c.type === 'hp');
  const asiChoice = choices.find((c) => c.type === 'ability_score');
  const featChoice = choices.find((c) => c.type === 'feat');
  const subclassChoice = choices.find((c) => c.type === 'subclass');
  const spellChoice = choices.find((c) => c.type === 'spell');
  const canChooseFeat = Boolean(asiChoice || featChoice);
  const searchableFeats = useMemo(() => {
    const query = featSearch.trim().toLowerCase();
    const owned = new Set(character.feats ?? []);
    return FEATS
      .filter((feat) => !owned.has(feat.id))
      .filter((feat) => meetPrereq(feat, character))
      .filter((feat) => {
        if (!query) return true;
        return [
          feat.name,
          feat.id,
          feat.category,
          feat.source,
          feat.description,
          ...feat.benefits,
        ].some((text) => text.toLowerCase().includes(query));
      });
  }, [character, featSearch]);

  function select(type: LevelUpChoice['type'], value: string) {
    setChoices((current) => updateChoice(current, type, value));
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <section
        aria-modal="true"
        className="fw-modal"
        role="dialog"
        style={{ maxWidth: 560, width: '100%', padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 28px 20px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(214,168,79,0.14), transparent 70%)',
          borderBottom: '1px solid var(--border-soft)',
          position: 'relative',
        }}>
          <button
            aria-label="Close level up modal"
            className="fw-btn fw-btn--icon"
            disabled={busy}
            onClick={onCancel}
            type="button"
            style={{ position: 'absolute', top: 16, right: 16 }}
          >
            <X aria-hidden="true" size={18} />
          </button>
          <p className="fw-eyebrow" style={{ color: 'var(--gold)', marginBottom: 6, fontSize: 10, letterSpacing: '0.15em' }}>
            Ascension
          </p>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 34, color: 'var(--text)', lineHeight: 1, margin: 0, letterSpacing: '0.06em' }}>
            Level <span style={{ color: 'var(--gold-bright)' }}>{nextLevel}</span>
          </h2>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-3)', marginTop: 6 }}>
            {character.name} · {character.ancestry} {character.className}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1, overflowY: 'auto' }}>

          {/* Features gained */}
          {featureChoice && featureChoice.options.length > 0 && (
            <div>
              <p className="fw-eyebrow" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 10, letterSpacing: '0.12em' }}>
                Features Gained
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {featureChoice.options.map((feat) => (
                  <div
                    key={feat}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid rgba(214,168,79,0.25)',
                      borderRadius: 6,
                      background: 'rgba(214,168,79,0.05)',
                      fontSize: 13,
                      color: 'var(--text-2)',
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                    }}
                  >
                    <span style={{ color: 'var(--gold)', marginRight: 8 }}>✦</span>{feat}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HP choice */}
          {hpChoice && (
            <div>
              <p className="fw-eyebrow" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 10, letterSpacing: '0.12em' }}>
                HP Growth
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {hpChoice.options.map((option) => (
                  <ChoiceCard
                    key={option}
                    accent="gold"
                    label={option}
                    onClick={() => select('hp', option)}
                    selected={(hpChoice.selected ?? hpChoice.options[0]) === option}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Subclass choice */}
          {subclassChoice && (
            <div>
              <p className="fw-eyebrow" style={{ fontSize: 10, color: 'var(--arcane-bright)', marginBottom: 10, letterSpacing: '0.12em' }}>
                Subclass
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subclassChoice.options.map((option) => (
                  <ChoiceCard
                    key={option}
                    accent="arcane"
                    label={option}
                    onClick={() => select('subclass', option)}
                    selected={(subclassChoice.selected ?? subclassChoice.options[0]) === option}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ASI choice */}
          {canChooseFeat && (
            <div>
              <p className="fw-eyebrow" style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 10, letterSpacing: '0.12em' }}>
                Ability Score Improvement
              </p>
              <div className="fw-segmented" style={{ marginBottom: 12 }}>
                <button
                  className={asiMode === 'ability' ? 'active' : ''}
                  disabled={!asiChoice}
                  onClick={() => setAsiMode('ability')}
                  type="button"
                >
                  Ability Scores
                </button>
                <button
                  className={asiMode === 'feat' ? 'active' : ''}
                  onClick={() => setAsiMode('feat')}
                  type="button"
                >
                  Choose a Feat
                </button>
              </div>
              {asiMode === 'ability' && asiChoice && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {asiChoice.options.map((option) => (
                    <ChoiceCard
                      key={option}
                      accent="gold"
                      label={formatAsiLabel(option)}
                      onClick={() => select('ability_score', option)}
                      selected={(asiChoice.selected ?? '') === option}
                    />
                  ))}
                </div>
              )}
              {asiMode === 'feat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    className="fw-input"
                    onChange={(event) => setFeatSearch(event.target.value)}
                    placeholder="Search feats..."
                    type="search"
                    value={featSearch}
                  />
                  {searchableFeats.length === 0 ? (
                    <div className="fw-empty">No feats match this character.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {searchableFeats.map((feat) => {
                        const selected = selectedFeatId === feat.id;
                        const prerequisite = formatPrerequisite(feat);
                        return (
                          <button
                            className="fw-card"
                            key={feat.id}
                            onClick={() => setSelectedFeatId(feat.id)}
                            style={{
                              borderColor: selected ? 'var(--gold)' : 'var(--border-soft)',
                              boxShadow: selected ? '0 0 8px rgba(214,168,79,0.2)' : 'none',
                              cursor: 'pointer',
                              display: 'block',
                              padding: 12,
                              textAlign: 'left',
                              width: '100%',
                            }}
                            type="button"
                          >
                            <div style={{ alignItems: 'center', display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 6 }}>
                              <strong style={{ color: selected ? 'var(--gold-bright)' : 'var(--text)', fontSize: 14 }}>{feat.name}</strong>
                              <span style={{ display: 'flex', gap: 6 }}>
                                <span className="fw-pill gold">{feat.category}</span>
                                <span className="fw-pill dim">{feat.source}</span>
                              </span>
                            </div>
                            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '0 0 8px' }}>{feat.description}</p>
                            {prerequisite && (
                              <p className="fw-eyebrow" style={{ color: 'var(--arcane-bright)', fontSize: 9, margin: '0 0 8px' }}>
                                {prerequisite}
                              </p>
                            )}
                            <ul style={{ color: 'var(--text-2)', fontSize: 12, margin: 0, paddingLeft: 18 }}>
                              {feat.benefits.map((benefit) => (
                                <li key={benefit}>{benefit}</li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spell choice */}
          {spellChoice && (
            <div>
              <p className="fw-eyebrow" style={{ fontSize: 10, color: 'var(--arcane-bright)', marginBottom: 10, letterSpacing: '0.12em' }}>
                Spell
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {spellChoice.options.map((option) => (
                  <ChoiceCard
                    key={option}
                    accent="arcane"
                    label={formatSpellLabel(option)}
                    onClick={() => select('spell', option)}
                    selected={(spellChoice.selected ?? spellChoice.options[0]) === option}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          background: 'var(--surface)',
        }}>
          <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="fw-btn fw-btn-gold"
            disabled={busy || !choices.length || (asiMode === 'feat' && !selectedFeatId)}
            onClick={() => void confirmLevelUp()}
            type="button"
          >
            <Sparkles aria-hidden="true" size={15} />
            {busy ? 'Applying...' : 'Seal the Ascension'}
          </button>
        </div>
      </section>
    </div>
  );
}

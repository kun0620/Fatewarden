import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { attachVaultCharacterToSession, listVaultCharacters } from '../../lib/characters';
import type { Character, GameSession, VaultCharacter } from '../../types';
import { PortraitArt, WIcon } from './runVisuals';

interface BindCharacterScreenProps {
  user: User | null;
  session: GameSession;
  onBack: () => void;
  onBound: (session: GameSession, character: Character) => void;
  onOpenWizard: () => void;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function colorForClass(className: string) {
  const colors: Record<string, string> = {
    Barbarian: '#EF4444',
    Bard: '#F59E0B',
    Cleric: '#C72D2D',
    Druid: '#4ADE80',
    Fighter: '#D6A84F',
    Monk: '#06B6D4',
    Paladin: '#D6A84F',
    Ranger: '#4ADE80',
    Rogue: '#22C55E',
    Sorcerer: '#8B5CF6',
    Warlock: '#7C3AED',
    Wizard: '#A8A29E',
  };

  return colors[className] ?? '#7C3AED';
}

function pactFor(character: VaultCharacter) {
  return character.background
    || character.personality?.traits?.slice(0, 24)
    || character.backstory?.slice(0, 24)
    || 'Unsworn Pact';
}

export function BindCharacterScreen({
  user,
  session,
  onBack,
  onBound,
  onOpenWizard,
}: BindCharacterScreenProps) {
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    listVaultCharacters(user)
      .then((rows) => {
        if (cancelled) return;
        setCharacters(rows);
        setPicked((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your wardens.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selected = useMemo(
    () => characters.find((character) => character.id === picked) ?? null,
    [characters, picked],
  );

  async function handleBind() {
    if (!user || !selected || binding) return;
    setBinding(true);
    setError('');

    try {
      const attached = await attachVaultCharacterToSession(selected.id, session.id, user);
      onBound(session, attached);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not bind this warden.');
    } finally {
      setBinding(false);
    }
  }

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-scene">
        <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="wr-btn wr-btn-ghost wr-btn-sm" disabled={binding} onClick={onBack} type="button">
              {WIcon('chevL', { size: 11 })} Back to lobby
            </button>
            <div className="wr-eyebrow">Bind Character - choose your warden</div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div className="wr-eyebrow" style={{ color: 'var(--wr-violet-bright)' }}>Pact-Binding</div>
            <h1
              style={{
                fontFamily: 'var(--wr-f-head)',
                fontSize: 28,
                letterSpacing: '0.14em',
                color: 'var(--wr-bone)',
                margin: '4px 0 0',
              }}
            >
              Choose Your Warden
            </h1>
            <div className="wr-rule" style={{ maxWidth: 280, margin: '10px auto 14px' }}>
              <span className="wr-rule-diamond" />
            </div>
            <div style={{ fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', color: 'var(--wr-text-2)', fontSize: 14 }}>
              Once bound, a warden carries every wound and every relic of this run.
            </div>
          </div>

          {error ? (
            <p className="wr-field-hint" style={{ color: 'var(--wr-blood-bright)', margin: '16px 0 0', textAlign: 'center' }}>
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="wr-panel" style={{ marginTop: 24, padding: 36, textAlign: 'center' }}>
              <div className="wr-eyebrow">Opening the vault...</div>
            </div>
          ) : characters.length === 0 ? (
            <div className="wr-panel" style={{ marginTop: 24, padding: 36, textAlign: 'center' }}>
              <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>No wardens bound to this account</div>
              <p style={{ color: 'var(--wr-text-2)', fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', margin: '10px 0 18px' }}>
                Forge a warden before sealing the pact.
              </p>
              <button className="wr-btn wr-btn-gold" onClick={onOpenWizard} type="button">
                Forge New Warden {WIcon('arrowR', { size: 12 })}
              </button>
            </div>
          ) : (
            <>
              <div className="wr-bind-grid">
                {characters.map((character, index) => {
                  const isSelected = character.id === picked;
                  const isWounded = character.hitPoints < character.maxHitPoints;
                  return (
                    <button
                      className={`wr-bind-card ${isSelected ? 'selected' : ''} ${isWounded ? 'wounded' : ''}`}
                      disabled={binding}
                      key={character.id}
                      onClick={() => setPicked(character.id)}
                      type="button"
                    >
                      <div className="wr-corn tl" />
                      <div className="wr-corn tr" />
                      <div className="wr-corn bl" />
                      <div className="wr-corn br" />
                      <div className="wr-bind-portrait">
                        <PortraitArt kind={getInitials(character.name) || character.id} color={colorForClass(character.className)} />
                        {index === 0 ? (
                          <span className="wr-chip gold" style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, padding: '1px 6px' }}>
                            Last Bound
                          </span>
                        ) : null}
                        {isWounded ? (
                          <span className="wr-chip blood" style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, padding: '1px 6px' }}>
                            Wounded
                          </span>
                        ) : null}
                      </div>
                      <div className="wr-bind-name">{character.name}</div>
                      <div className="wr-bind-class">{character.className} - Lv {character.level}</div>
                      <div className="wr-bind-stats">
                        <span>{WIcon('heart', { size: 10 })} {character.hitPoints} HP</span>
                        <span style={{ color: 'var(--wr-violet-bright)' }}>{WIcon('rune', { size: 10 })} {pactFor(character)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="wr-bind-foot">
                <div style={{ flex: 1 }}>
                  <div className="wr-eyebrow">Bound to</div>
                  <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 18, color: 'var(--wr-bone)', letterSpacing: '0.10em', marginTop: 2 }}>
                    {selected?.name ?? 'No Warden Selected'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>
                    {selected ? `${selected.className} - Lv ${selected.level} - ${selected.hitPoints} HP - ${pactFor(selected)}` : 'Choose a warden to bind.'}
                  </div>
                </div>
                <button className="wr-btn wr-btn-ghost" disabled={binding} onClick={onBack} type="button">Cancel</button>
                <button className="wr-btn wr-btn-violet wr-btn-lg" disabled={!selected || binding} onClick={handleBind} type="button">
                  {WIcon('rune', { size: 14 })} {binding ? 'Binding...' : 'Bind Pact'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default BindCharacterScreen;

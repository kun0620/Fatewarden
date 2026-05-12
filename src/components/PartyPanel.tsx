import { RefreshCw, Shield, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { listSessionCharacters } from '../lib/characters';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Character, GameSession } from '../types';

type PartyPanelProps = {
  activeSession: GameSession | null;
  currentCharacter: Character;
};

export function PartyPanel({ activeSession, currentCharacter }: PartyPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([currentCharacter]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadParty = useCallback(async () => {
    if (!activeSession || !supabase) {
      setCharacters([currentCharacter]);
      setMessage(hasSupabaseConfig ? 'Enter a table to see the party.' : 'Local demo party.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const rows = await listSessionCharacters(activeSession.id);
      setCharacters(rows.length ? rows : [currentCharacter]);
      setMessage(rows.length > 1 ? `${rows.length} characters in this room.` : 'Only your character is visible.');
    } catch (error) {
      setCharacters([currentCharacter]);
      setMessage(error instanceof Error ? error.message : 'Could not load party.');
    }
    setLoading(false);
  }, [activeSession, currentCharacter]);

  useEffect(() => {
    void loadParty();
  }, [loadParty]);

  useEffect(() => {
    if (!activeSession || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(`party:${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `session_id=eq.${activeSession.id}`,
        },
        () => {
          void loadParty();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeSession, loadParty]);

  return (
    <section className="fw-panel party-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Room</p>
          <h2 className="fw-h2">Party</h2>
        </div>
        <button aria-label="Refresh party" className="fw-btn fw-btn--icon" disabled={loading} onClick={loadParty} type="button">
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {characters.map((character) => (
          <article
            className={character.id === currentCharacter.id ? 'fw-card fw-card--elevated active' : 'fw-card'}
            key={character.id}
            style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', padding: 'var(--sp-3)' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {character.portraitUrl ? (
                <img alt={`${character.name} portrait`} src={character.portraitUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Users size={18} aria-hidden="true" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{character.name}</strong>
                <small>{character.id === currentCharacter.id ? 'You' : 'Member'}</small>
              </div>
              <span className="fw-caption">
                Lv {character.level} {character.ancestry} {character.className}
              </span>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-1)' }}>
                <span className="fw-caption">
                  HP {character.hitPoints}/{character.maxHitPoints}
                </span>
                <span className="fw-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                  <Shield size={13} aria-hidden="true" />
                  AC {character.armorClass}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="fw-caption">{message}</p> : null}
    </section>
  );
}

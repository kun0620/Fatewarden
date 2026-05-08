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
    <section className="panel party-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Room</p>
          <h2>Party</h2>
        </div>
        <button aria-label="Refresh party" className="icon-button" disabled={loading} onClick={loadParty} type="button">
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="party-list">
        {characters.map((character) => (
          <article className={character.id === currentCharacter.id ? 'party-card active' : 'party-card'} key={character.id}>
            <div className="party-avatar">
              {character.portraitUrl ? (
                <img alt={`${character.name} portrait`} src={character.portraitUrl} />
              ) : (
                <Users size={18} aria-hidden="true" />
              )}
            </div>
            <div className="party-details">
              <div className="party-name-row">
                <strong>{character.name}</strong>
                <small>{character.id === currentCharacter.id ? 'You' : 'Member'}</small>
              </div>
              <span>
                Lv {character.level} {character.ancestry} {character.className}
              </span>
              <div className="party-stats">
                <span>
                  HP {character.hitPoints}/{character.maxHitPoints}
                </span>
                <span>
                  <Shield size={13} aria-hidden="true" />
                  AC {character.armorClass}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}

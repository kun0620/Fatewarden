import { useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { loadCharacter, saveCharacter } from '../lib/characters';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Character, GameSession } from '../types';

export function useCharacterSync(
  activeSession: GameSession | null,
  user: User | null,
  onCharacterLoad: (character: Character) => void,
  onStatusChange: (status: string) => void,
) {
  useEffect(() => {
    if (!activeSession || !user || !supabase) {
      onCharacterLoad(demoCharacter);
      onStatusChange(hasSupabaseConfig ? 'Choose a table to edit.' : 'Local demo character.');
      return;
    }

    let alive = true;
    onStatusChange('Loading character');
    loadCharacter(activeSession.id, user)
      .then((row) => {
        if (!alive) return;
        onCharacterLoad(row);
        onStatusChange('Saved to this table');
      })
      .catch((error: Error) => {
        if (!alive) return;
        onCharacterLoad(demoCharacter);
        onStatusChange(error.message);
      });

    return () => {
      alive = false;
    };
  }, [activeSession, user, onCharacterLoad, onStatusChange]);

  const persistCharacter = useCallback(
    async (nextCharacter: Character) => {
      if (!activeSession || !user) return;

      onStatusChange('Saving character');
      const saved = await saveCharacter(nextCharacter, activeSession.id, user);
      onCharacterLoad(saved);
      onStatusChange('Character saved');
    },
    [activeSession, user, onCharacterLoad, onStatusChange],
  );

  const saveLocalCharacter = useCallback(
    async (nextCharacter: Character) => {
      onCharacterLoad(nextCharacter);
      onStatusChange('Local character updated');
    },
    [onCharacterLoad, onStatusChange],
  );

  return {
    persistCharacter,
    saveLocalCharacter,
  };
}

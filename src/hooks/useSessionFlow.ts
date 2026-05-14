import { useCallback, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { demoCharacter } from '../data/demo';
import { loadCharacter } from '../lib/characters';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Character, GameSession, EncounterState } from '../types';
import type { RoomModal } from '../components/SessionLobby';

export function useSessionFlow() {
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [pendingSession, setPendingSession] = useState<GameSession | null>(null);
  const [roomModal, setRoomModal] = useState<RoomModal>(null);
  const [characterStatus, setCharacterStatus] = useState('');
  const [character, setCharacter] = useState<Character>(demoCharacter);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);

  const selectSession = useCallback((session: GameSession) => {
    setPendingSession(null);
    setActiveSession(session);
    setEncounter(session.combatState);
  }, []);

  const requestEnterSession = useCallback(
    async (session: GameSession, user: User | null) => {
      if (!user || !supabase) {
        selectSession(session);
        return;
      }

      setCharacterStatus('Checking table character');
      try {
        const existingCharacter = await loadCharacter(session.id, user);
        setCharacter(existingCharacter);
        setCharacterStatus('Saved to this table');
        setRoomModal(null);
        selectSession(session);
      } catch (error) {
        setRoomModal(null);
        setPendingSession(session);
        setCharacterStatus(error instanceof Error ? error.message : 'Choose a character for this table.');
      }
    },
    [selectSession],
  );

  const completeCharacterEntry = useCallback(
    (session: GameSession, sessionCharacter: Character) => {
      setCharacter(sessionCharacter);
      setCharacterStatus('Character attached to this table');
      selectSession(session);
    },
    [selectSession],
  );

  const switchTable = useCallback(() => {
    setActiveSession(null);
    setPendingSession(null);
    setRoomModal(null);
    setEncounter(null);
  }, []);

  return {
    activeSession,
    setActiveSession,
    pendingSession,
    setPendingSession,
    roomModal,
    setRoomModal,
    characterStatus,
    setCharacterStatus,
    character,
    setCharacter,
    encounter,
    setEncounter,
    selectSession,
    requestEnterSession,
    completeCharacterEntry,
    switchTable,
  };
}

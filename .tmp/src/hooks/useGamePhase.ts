import { useCallback, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { addUniqueMessage } from '../components/StoryLog';
import { getGamePhaseDefinition } from '../lib/gamePhases';
import { sendSessionMessage } from '../lib/messages';
import { updateSessionPhase } from '../lib/sessions';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { GamePhase, GameSession, StoryMessage } from '../types';

function formatLocalTime() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function useGamePhase(
  activeSession: GameSession | null,
  user: User | null,
  localPhase: GamePhase,
  onLocalPhaseChange: (phase: GamePhase) => void,
  onSessionUpdate: (session: GameSession) => void,
  onMessagesChange: (fn: (current: StoryMessage[]) => StoryMessage[]) => void,
) {
  const [phaseBusy, setPhaseBusy] = useState(false);

  const currentPhase = activeSession?.phase ?? localPhase;

  const changeGamePhase = useCallback(
    async (nextPhase: GamePhase) => {
      if (nextPhase === currentPhase || phaseBusy) return;

      setPhaseBusy(true);
      try {
        if (activeSession && user && supabase) {
          const updatedSession = await updateSessionPhase(activeSession.id, nextPhase);
          onSessionUpdate(updatedSession);
        } else {
          onLocalPhaseChange(nextPhase);
        }

        const definition = getGamePhaseDefinition(nextPhase);
        const body = `Game phase changed to ${definition.label}.`;
        const metadata = {
          kind: 'phase_event',
          phase: nextPhase,
          label: definition.label,
        };

        if (!activeSession || !user || !supabase) {
          onMessagesChange((current) =>
            addUniqueMessage(current, {
              id: crypto.randomUUID(),
              speaker: 'system',
              author: 'Game Flow',
              body,
              createdAt: formatLocalTime(),
              metadata,
            }),
          );
          return;
        }

        const message = await sendSessionMessage(activeSession.id, 'system', 'Game Flow', body, metadata);
        onMessagesChange((current) => addUniqueMessage(current, message));
      } catch (error) {
        onMessagesChange((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not change game phase.',
            createdAt: formatLocalTime(),
          }),
        );
      } finally {
        setPhaseBusy(false);
      }
    },
    [activeSession, currentPhase, phaseBusy, user, onLocalPhaseChange, onSessionUpdate, onMessagesChange],
  );

  return {
    currentPhase,
    phaseBusy,
    changeGamePhase,
  };
}

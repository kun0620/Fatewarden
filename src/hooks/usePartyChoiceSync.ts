import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getActivePartyChoice, subscribeToPartyChoice } from '../lib/partyChoices';
import { useGameStore } from '../store/useGameStore';

function nowIso() {
  return new Date().toISOString();
}

export function usePartyChoiceSync(sessionId: string | null) {
  const dispatch = useGameStore((state) => state.dispatch);
  const setActivePartyChoice = useGameStore((state) => state.setActivePartyChoice);
  const eventMeta = useGameStore((state) => state.eventMeta);
  const activeCharacter = useGameStore((state) => state.activeCharacter);

  const processedVoteKeys = useRef<Set<string>>(new Set());
  const activeChoiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const actorId = activeCharacter?.id ?? 'system';

    const syncChoice = async () => {
      const choice = await getActivePartyChoice(sessionId);
      if (cancelled || !choice) return;

      const baseMeta = eventMeta(actorId);

      if (activeChoiceIdRef.current !== choice.id) {
        activeChoiceIdRef.current = choice.id;
        processedVoteKeys.current.clear();
        dispatch({
          ...baseMeta,
          createdAt: nowIso(),
          sessionId,
          type: 'PARTY_CHOICE_CREATED',
          choice,
        });
      } else {
        setActivePartyChoice(choice);
      }

      for (const vote of choice.votes) {
        const voteKey = `${choice.id}:${vote.playerId}:${vote.choiceId}:${vote.votedAt}`;
        if (processedVoteKeys.current.has(voteKey)) continue;
        processedVoteKeys.current.add(voteKey);
        dispatch({
          ...baseMeta,
          createdAt: nowIso(),
          sessionId,
          type: 'PARTY_VOTE_CAST',
          choiceId: choice.id,
          playerId: vote.playerId,
          characterName: vote.characterName,
          selectedOptionId: vote.choiceId,
        });
      }

      if (choice.status === 'resolved' && choice.resolvedChoiceId) {
        dispatch({
          ...baseMeta,
          createdAt: nowIso(),
          sessionId,
          type: 'PARTY_CHOICE_RESOLVED',
          choiceId: choice.id,
          resolvedChoiceId: choice.resolvedChoiceId,
        });
      }
    };

    void syncChoice();
    channel = subscribeToPartyChoice(sessionId, () => {
      void syncChoice();
    });

    return () => {
      cancelled = true;
      void channel?.unsubscribe();
    };
  }, [activeCharacter?.id, dispatch, eventMeta, sessionId, setActivePartyChoice]);
}

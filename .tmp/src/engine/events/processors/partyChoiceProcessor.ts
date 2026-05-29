import {
  canResolve,
  castVote,
  resolveChoice,
} from '../../party/partyChoiceEngine';
import type { PartyChoiceState } from '../../party/partyChoiceTypes';
import type {
  GameEvent,
  PartyChoiceCreatedEvent,
  PartyChoiceResolvedEvent,
  PartyVoteCastEvent,
} from '../types';

export type PartyChoiceEventResult = {
  state: PartyChoiceState;
  applied: boolean;
  emittedEvents: GameEvent[];
  error?: string;
};

function buildResolvedEventFromVote(event: PartyVoteCastEvent, resolvedChoiceId: string): PartyChoiceResolvedEvent {
  return {
    id: crypto.randomUUID(),
    type: 'PARTY_CHOICE_RESOLVED',
    sessionId: event.sessionId,
    actorId: event.actorId,
    targetId: event.targetId,
    createdAt: new Date().toISOString(),
    source: event.source ?? 'system',
    correlationId: event.correlationId,
    choiceId: event.choiceId,
    resolvedChoiceId,
  };
}

export function processPartyChoiceCreated(state: PartyChoiceState, event: PartyChoiceCreatedEvent): PartyChoiceEventResult {
  return {
    state: {
      ...state,
      activeChoice: event.choice,
    },
    applied: true,
    emittedEvents: [],
  };
}

export function processPartyVoteCast(
  state: PartyChoiceState,
  event: PartyVoteCastEvent,
  playerCount: number,
): PartyChoiceEventResult {
  const currentChoice = state.activeChoice;
  if (!currentChoice) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: 'No active party choice',
    };
  }

  if (currentChoice.id !== event.choiceId) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Active party choice mismatch: ${event.choiceId}`,
    };
  }

  const voted = castVote(currentChoice, event.playerId, event.characterName, event.selectedOptionId);
  if (!voted) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: 'Vote rejected',
    };
  }

  const nextState: PartyChoiceState = {
    ...state,
    activeChoice: voted,
  };

  if (!canResolve(voted, playerCount)) {
    return {
      state: nextState,
      applied: true,
      emittedEvents: [],
    };
  }

  const resolved = resolveChoice(voted, playerCount);
  if (!resolved.resolvedChoiceId) {
    return {
      state: nextState,
      applied: true,
      emittedEvents: [],
    };
  }

  const resolvedEvent = buildResolvedEventFromVote(event, resolved.resolvedChoiceId);
  return {
    state: {
      ...state,
      activeChoice: resolved,
    },
    applied: true,
    emittedEvents: [resolvedEvent],
  };
}

export function processPartyChoiceResolved(state: PartyChoiceState, event: PartyChoiceResolvedEvent): PartyChoiceEventResult {
  const currentChoice = state.activeChoice;
  if (!currentChoice) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: 'No active party choice',
    };
  }

  if (currentChoice.id !== event.choiceId) {
    return {
      state,
      applied: false,
      emittedEvents: [],
      error: `Active party choice mismatch: ${event.choiceId}`,
    };
  }

  const resolvedChoice = {
    ...currentChoice,
    status: 'resolved' as const,
    resolvedChoiceId: event.resolvedChoiceId,
  };

  return {
    state: {
      activeChoice: null,
      history: [...state.history, resolvedChoice],
    },
    applied: true,
    emittedEvents: [],
  };
}

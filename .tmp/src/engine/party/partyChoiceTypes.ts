import type { AiChoice } from '../../types';

export type PartyChoiceStatus = 'pending' | 'voting' | 'resolved' | 'expired';

export type PartyVote = {
  playerId: string;
  characterName: string;
  choiceId: string;
  votedAt: number;
};

export type PartyChoice = {
  id: string;
  sessionId: string;
  sourceMessageId: string;
  prompt: string;
  options: AiChoice[];
  votes: PartyVote[];
  status: PartyChoiceStatus;
  resolutionPolicy: 'majority' | 'unanimous' | 'host';
  resolvedChoiceId?: string;
  expiresAt?: number;
  createdAt: number;
};

export type PartyChoiceState = {
  activeChoice: PartyChoice | null;
  history: PartyChoice[];
};

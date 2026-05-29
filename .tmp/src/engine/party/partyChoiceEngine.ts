import type { AiChoice } from '../../types';
import type { PartyChoice, PartyVote } from './partyChoiceTypes';

type ResolutionPolicy = PartyChoice['resolutionPolicy'];

function nowTs() {
  return Date.now();
}

function hasOption(choice: PartyChoice, choiceId: string) {
  return choice.options.some((option) => option.number.toString() === choiceId || option.label === choiceId);
}

function normalizeChoiceId(choice: PartyChoice, choiceId: string) {
  const byNumber = choice.options.find((option) => option.number.toString() === choiceId);
  if (byNumber) return byNumber.number.toString();
  const byLabel = choice.options.find((option) => option.label === choiceId);
  if (byLabel) return byLabel.number.toString();
  return choiceId;
}

function tallyVotes(votes: PartyVote[]) {
  const tally = new Map<string, { count: number; voters: string[] }>();
  votes.forEach((vote) => {
    const current = tally.get(vote.choiceId);
    if (current) {
      current.count += 1;
      current.voters.push(vote.characterName);
      return;
    }
    tally.set(vote.choiceId, { count: 1, voters: [vote.characterName] });
  });
  return tally;
}

function getMajorityWinner(votes: PartyVote[]) {
  const tally = tallyVotes(votes);
  const ranked = Array.from(tally.entries())
    .map(([choiceId, value]) => ({ choiceId, ...value }))
    .sort((a, b) => b.count - a.count);

  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[0].count === ranked[1].count) return null;
  return ranked[0].choiceId;
}

function getUnanimousWinner(votes: PartyVote[], playerCount: number) {
  if (playerCount <= 0) return null;
  if (votes.length < playerCount) return null;
  const first = votes[0]?.choiceId;
  if (!first) return null;
  return votes.every((vote) => vote.choiceId === first) ? first : null;
}

function getPolicyWinner(choice: PartyChoice, playerCount: number, policy: ResolutionPolicy) {
  if (!choice.votes.length) return null;
  if (policy === 'majority') return getMajorityWinner(choice.votes);
  if (policy === 'unanimous') return getUnanimousWinner(choice.votes, playerCount);
  if (policy === 'host') return choice.votes[0].choiceId;
  return null;
}

export function createPartyChoice(
  sessionId: string,
  sourceMessageId: string,
  prompt: string,
  options: AiChoice[],
  policy: ResolutionPolicy,
  expiresInMs?: number,
): PartyChoice {
  const createdAt = nowTs();
  const expiresAt = typeof expiresInMs === 'number' && expiresInMs > 0 ? createdAt + expiresInMs : undefined;
  return {
    id: crypto.randomUUID(),
    sessionId,
    sourceMessageId,
    prompt: prompt.trim(),
    options: [...options],
    votes: [],
    status: 'pending',
    resolutionPolicy: policy,
    resolvedChoiceId: undefined,
    expiresAt,
    createdAt,
  };
}

export function castVote(
  choice: PartyChoice,
  playerId: string,
  characterName: string,
  choiceId: string,
): PartyChoice | null {
  if (choice.status !== 'pending' && choice.status !== 'voting') return null;
  if (choice.votes.some((vote) => vote.playerId === playerId)) return null;
  if (!hasOption(choice, choiceId)) return null;

  const normalizedChoiceId = normalizeChoiceId(choice, choiceId);
  const nextVote: PartyVote = {
    playerId,
    characterName: characterName.trim() || 'Unknown',
    choiceId: normalizedChoiceId,
    votedAt: nowTs(),
  };

  return {
    ...choice,
    status: 'voting',
    votes: [...choice.votes, nextVote],
  };
}

export function canResolve(choice: PartyChoice, playerCount: number): boolean {
  if (choice.status === 'resolved' || choice.status === 'expired') return true;
  if (!choice.votes.length) return false;

  if (choice.resolutionPolicy === 'host') {
    return choice.votes.length > 0;
  }

  if (choice.resolutionPolicy === 'majority') {
    const winner = getMajorityWinner(choice.votes);
    return Boolean(winner);
  }

  if (choice.resolutionPolicy === 'unanimous') {
    return Boolean(getUnanimousWinner(choice.votes, playerCount));
  }

  return false;
}

export function resolveChoice(choice: PartyChoice, playerCount: number): PartyChoice {
  if (choice.status === 'resolved') return choice;
  const winner = getPolicyWinner(choice, playerCount, choice.resolutionPolicy);
  if (!winner) return choice;

  return {
    ...choice,
    status: 'resolved',
    resolvedChoiceId: winner,
  };
}

export function checkExpiry(choice: PartyChoice): PartyChoice {
  if (!choice.expiresAt || nowTs() <= choice.expiresAt || choice.status === 'resolved' || choice.status === 'expired') {
    return choice;
  }

  const majorityWinner = getMajorityWinner(choice.votes);
  const fallbackWinner = choice.options[0] ? choice.options[0].number.toString() : undefined;
  const winner = majorityWinner ?? fallbackWinner;

  return {
    ...choice,
    status: 'expired',
    resolvedChoiceId: winner,
  };
}

export function getVoteSummary(choice: PartyChoice) {
  return Array.from(tallyVotes(choice.votes).entries())
    .map(([choiceId, value]) => ({
      choiceId,
      count: value.count,
      voters: value.voters,
    }))
    .sort((a, b) => b.count - a.count);
}

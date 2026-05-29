import type { RunVote, RunVoteOption } from '../../types';

export type VoteResolutionReason = 'majority' | 'timeout' | 'random';

export interface CreateVoteInput {
  id?: string;
  sessionId: string;
  type: RunVote['type'];
  options: RunVoteOption[];
  timeoutAt: string;
  createdAt?: string;
}

function randomIndex(length: number) {
  if (length <= 1) return 0;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % length;
}

function pickRandomOption(options: RunVoteOption[]) {
  return options[randomIndex(options.length)]?.id ?? null;
}

export function createVote(input: CreateVoteInput): RunVote {
  return {
    id: input.id ?? crypto.randomUUID(),
    sessionId: input.sessionId,
    type: input.type,
    options: input.options.map((option) => ({ ...option })),
    votes: {},
    timeoutAt: input.timeoutAt,
    status: 'open',
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function castVote(vote: RunVote, userId: string, optionId: string): RunVote {
  if (vote.status !== 'open') return vote;
  if (!vote.options.some((option) => option.id === optionId)) return vote;

  return {
    ...vote,
    votes: {
      ...vote.votes,
      [userId]: optionId,
    },
  };
}

export function resolveVote(
  vote: RunVote,
  reason: VoteResolutionReason = 'majority',
): RunVote {
  if (vote.status === 'resolved') return vote;

  const optionIds = new Set(vote.options.map((option) => option.id));
  const validVotes = Object.values(vote.votes).filter((optionId) => optionIds.has(optionId));
  const resolved = validVotes.length > 0
    ? resolveVotedOption(validVotes)
    : { optionId: pickRandomOption(vote.options), tied: true };
  const resolvedBy = reason === 'timeout'
    ? 'timeout'
    : resolved.tied
      ? 'random'
      : 'majority';

  return {
    ...vote,
    status: 'resolved',
    result: resolved.optionId ?? undefined,
    resolvedBy,
  };
}

export function isVoteExpired(vote: Pick<RunVote, 'timeoutAt'>, now: Date = new Date()) {
  return Date.parse(vote.timeoutAt) <= now.getTime();
}

function resolveVotedOption(votes: string[]) {
  const counts = new Map<string, number>();
  for (const optionId of votes) {
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  const maxVotes = Math.max(...counts.values());
  const leaders = Array.from(counts.entries())
    .filter(([, count]) => count === maxVotes)
    .map(([optionId]) => optionId);

  return {
    optionId: leaders[randomIndex(leaders.length)] ?? null,
    tied: leaders.length > 1,
  };
}

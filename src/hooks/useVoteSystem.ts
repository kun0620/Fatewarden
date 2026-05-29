import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { castVote, createVote, isVoteExpired, resolveVote } from '../engine/run/voteEngine';
import type { RunNode } from '../engine/run/runTypes';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import type { RunVote, RunVoteOption } from '../types';

type RunVoteRow = {
  id: string;
  session_id: string;
  type: string;
  options: unknown;
  votes: unknown;
  timeout_at: string;
  status: string;
  result: string | null;
  resolved_by: string | null;
  created_at: string;
};

type VoteStatus = 'idle' | 'syncing' | 'error';

const RUN_VOTE_SELECT = 'id,session_id,type,options,votes,timeout_at,status,result,resolved_by,created_at';
const DEFAULT_TIMEOUT_MS = 30_000;

function isRunVoteType(value: string): value is RunVote['type'] {
  return value === 'node' || value === 'event' || value === 'rest' || value === 'treasure' || value === 'shop';
}

function isResolvedBy(value: string | null): RunVote['resolvedBy'] | undefined {
  if (value === 'majority' || value === 'host' || value === 'timeout' || value === 'random') return value;
  return undefined;
}

function mapVoteOptions(value: unknown): RunVoteOption[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const option = item as Record<string, unknown>;
    if (typeof option.id !== 'string' || typeof option.label !== 'string') return [];

    return [{
      id: option.id,
      label: option.label,
      icon: typeof option.icon === 'string' ? option.icon : undefined,
      nodeId: typeof option.nodeId === 'string' ? option.nodeId : undefined,
      choiceId: typeof option.choiceId === 'string' ? option.choiceId : undefined,
    }];
  });
}

function mapVoteRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((votes, [userId, optionId]) => {
    if (typeof optionId === 'string') votes[userId] = optionId;
    return votes;
  }, {});
}

function isRunVoteRow(value: unknown): value is RunVoteRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.session_id === 'string' &&
    typeof row.type === 'string' &&
    typeof row.timeout_at === 'string' &&
    typeof row.status === 'string' &&
    typeof row.created_at === 'string'
  );
}

function mapRunVote(row: RunVoteRow): RunVote | null {
  if (!isRunVoteType(row.type)) return null;
  const status = row.status === 'resolved' ? 'resolved' : 'open';

  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    options: mapVoteOptions(row.options),
    votes: mapVoteRecord(row.votes),
    timeoutAt: row.timeout_at,
    status,
    result: row.result ?? undefined,
    resolvedBy: isResolvedBy(row.resolved_by),
    createdAt: row.created_at,
  };
}

function toRunVotePayload(vote: RunVote) {
  return {
    id: vote.id,
    session_id: vote.sessionId,
    type: vote.type,
    options: vote.options,
    votes: vote.votes,
    timeout_at: vote.timeoutAt,
    status: vote.status,
    result: vote.result ?? null,
    resolved_by: vote.resolvedBy ?? null,
    created_at: vote.createdAt,
  };
}

function toNodeOption(node: RunNode): RunVoteOption {
  return {
    id: node.id,
    nodeId: node.id,
    label: node.label ?? node.type,
    icon: node.icon,
  };
}

export function useVoteSystem() {
  const activeSession = useGameStore((state) => state.activeSession);
  const currentUserId = useGameStore((state) => state.currentUserId);
  const runState = useGameStore((state) => state.runState);
  const selectNode = useGameStore((state) => state.selectNode);

  const [activeVote, setActiveVote] = useState<RunVote | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [status, setStatus] = useState<VoteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const resolvedVoteIds = useRef<Set<string>>(new Set());
  const activeVoteRef = useRef<RunVote | null>(null);

  const isHost = Boolean(activeSession && currentUserId && (activeSession.hostId ?? activeSession.createdBy) === currentUserId);

  useEffect(() => {
    activeVoteRef.current = activeVote;
  }, [activeVote]);

  const handleVoteResult = useCallback((vote: RunVote) => {
    if (vote.status !== 'resolved' || !vote.result || resolvedVoteIds.current.has(vote.id)) return;
    resolvedVoteIds.current.add(vote.id);

    if (vote.type === 'node') {
      const option = vote.options.find((item) => item.id === vote.result);
      const nodeId = option?.nodeId ?? vote.result;
      const result = selectNode(nodeId);
      if (result.error) setError(result.error);
    }
  }, [selectNode]);

  const persistResolvedVote = useCallback(async (vote: RunVote) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error: updateError } = await supabase
      .from('run_votes')
      .update({
        votes: vote.votes,
        status: vote.status,
        result: vote.result ?? null,
        resolved_by: vote.resolvedBy ?? null,
      })
      .eq('id', vote.id)
      .select(RUN_VOTE_SELECT)
      .single();

    if (updateError) throw updateError;
    const mapped = mapRunVote(data as RunVoteRow);
    if (mapped) {
      setActiveVote(mapped.status === 'open' ? mapped : null);
      handleVoteResult(mapped);
    }
  }, [handleVoteResult]);

  const handleTimeout = useCallback(async () => {
    const vote = activeVoteRef.current;
    if (!vote || vote.status !== 'open' || !isHost || !isVoteExpired(vote)) return;

    setStatus('syncing');
    setError(null);
    try {
      await persistResolvedVote(resolveVote(vote, 'timeout'));
      setStatus('idle');
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Failed to resolve vote.');
      setStatus('error');
    }
  }, [isHost, persistResolvedVote]);

  const createNodeVote = useCallback(async (nodesOrIds?: RunNode[] | string[], timeoutMs = DEFAULT_TIMEOUT_MS) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!activeSession || !runState) throw new Error('No active Warden run.');
    if (!isHost) throw new Error('Only the host can create a vote.');

    const activeFloor = runState.floors.find((floor) => floor.floorNumber === runState.currentFloor) ?? null;
    const availableNodes = activeFloor?.nodes.filter((node) => node.status === 'available') ?? [];
    let requestedNodes: RunNode[];
    if (!nodesOrIds) {
      requestedNodes = availableNodes;
    } else if (nodesOrIds.every((item): item is RunNode => typeof item === 'object')) {
      requestedNodes = nodesOrIds;
    } else {
      const requestedIds = new Set(nodesOrIds);
      requestedNodes = availableNodes.filter((node) => requestedIds.has(node.id));
    }
    const options = requestedNodes.filter((node) => node.status === 'available').map(toNodeOption);

    if (!options.length) throw new Error('No available nodes to vote on.');

    const vote = createVote({
      sessionId: activeSession.id,
      type: 'node',
      options,
      timeoutAt: new Date(Date.now() + timeoutMs).toISOString(),
    });

    setStatus('syncing');
    setError(null);
    const { data, error: insertError } = await supabase
      .from('run_votes')
      .insert(toRunVotePayload(vote))
      .select(RUN_VOTE_SELECT)
      .single();

    if (insertError) {
      setStatus('error');
      setError(insertError.message);
      throw insertError;
    }

    const mapped = mapRunVote(data as RunVoteRow);
    setActiveVote(mapped);
    setStatus('idle');
    return mapped;
  }, [activeSession, isHost, runState]);

  const castMyVote = useCallback(async (optionId: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!currentUserId) throw new Error('No current user.');
    const vote = activeVoteRef.current;
    if (!vote) throw new Error('No active vote.');

    const nextVote = castVote(vote, currentUserId, optionId);
    setStatus('syncing');
    setError(null);

    const { data, error: updateError } = await supabase
      .from('run_votes')
      .update({ votes: nextVote.votes })
      .eq('id', vote.id)
      .eq('status', 'open')
      .select(RUN_VOTE_SELECT)
      .single();

    if (updateError) {
      setStatus('error');
      setError(updateError.message);
      throw updateError;
    }

    const mapped = mapRunVote(data as RunVoteRow);
    setActiveVote(mapped);
    setStatus('idle');
    return mapped;
  }, [currentUserId]);

  const hostOverride = useCallback(async (optionId: string) => {
    const vote = activeVoteRef.current;
    if (!vote) throw new Error('No active vote.');
    if (!isHost) throw new Error('Only the host can override a vote.');
    if (!vote.options.some((option) => option.id === optionId)) throw new Error('Invalid vote option.');

    const resolved: RunVote = {
      ...vote,
      status: 'resolved',
      result: optionId,
      resolvedBy: 'host',
    };

    setStatus('syncing');
    setError(null);
    try {
      await persistResolvedVote(resolved);
      setStatus('idle');
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Failed to override vote.');
      setStatus('error');
      throw unknownError;
    }
  }, [isHost, persistResolvedVote]);

  useEffect(() => {
    if (!activeSession?.id || !supabase) {
      setActiveVote(null);
      return;
    }

    const client = supabase;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const syncOpenVote = async () => {
      const { data, error: fetchError } = await client
        .from('run_votes')
        .select(RUN_VOTE_SELECT)
        .eq('session_id', activeSession.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setStatus('error');
        return;
      }

      setActiveVote(data ? mapRunVote(data as RunVoteRow) : null);
    };

    void syncOpenVote();
    channel = client
      .channel(`run-votes:${activeSession.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'run_votes', filter: `session_id=eq.${activeSession.id}` },
        (payload: RealtimePostgresChangesPayload<RunVoteRow>) => {
          const nextVote = 'new' in payload && isRunVoteRow(payload.new) ? mapRunVote(payload.new) : null;
          if (!nextVote) return;
          setActiveVote(nextVote.status === 'open' ? nextVote : null);
          handleVoteResult(nextVote);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void channel?.unsubscribe();
    };
  }, [activeSession?.id, handleVoteResult]);

  useEffect(() => {
    if (!activeVote) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const nextSeconds = Math.max(0, Math.ceil((Date.parse(activeVote.timeoutAt) - Date.now()) / 1000));
      setSecondsLeft(nextSeconds);
      if (nextSeconds === 0) {
        void handleTimeout();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeVote, handleTimeout]);

  return {
    activeVote,
    secondsLeft,
    timeLeft: secondsLeft,
    status,
    error,
    isHost,
    myVote: currentUserId && activeVote ? activeVote.votes[currentUserId] : undefined,
    createNodeVote,
    castMyVote,
    hostOverride,
    handleTimeout,
    handleVoteResult,
  };
}

export default useVoteSystem;

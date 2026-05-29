import { useEffect, useMemo, useState } from 'react';
import { castVoteInDb } from '../lib/partyChoices';
import { useGameStore } from '../store/useGameStore';
import { getVoteSummary } from '../engine/party/partyChoiceEngine';

type PartyChoicePanelProps = {
  sessionId: string | null;
  currentPlayerId: string;
  currentCharacterName: string;
  isHost: boolean;
};

const optionColors = ['#7c3aed', '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4'];
const optionIcons = ['🜂', '🜄', '🜁', '🜃', '✦', '☽'];

function formatCountdown(msLeft: number) {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function PartyChoicePanel({ sessionId, currentPlayerId, currentCharacterName, isHost }: PartyChoicePanelProps) {
  const partyChoiceState = useGameStore((state) => state.partyChoiceState);
  const eventMeta = useGameStore((state) => state.eventMeta);
  const dispatch = useGameStore((state) => state.dispatch);
  const clearActivePartyChoice = useGameStore((state) => state.clearActivePartyChoice);

  const activeChoice = partyChoiceState.activeChoice;
  const [now, setNow] = useState(Date.now());
  const [showResolvedFanfare, setShowResolvedFanfare] = useState(false);
  const [voteStatus, setVoteStatus] = useState<'idle' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    if (!activeChoice?.expiresAt) return;
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, [activeChoice?.expiresAt]);

  useEffect(() => {
    if (!activeChoice || activeChoice.status !== 'resolved') return;
    setShowResolvedFanfare(true);
    const timeout = globalThis.setTimeout(() => {
      setShowResolvedFanfare(false);
      clearActivePartyChoice();
    }, 3000);
    return () => globalThis.clearTimeout(timeout);
  }, [activeChoice, clearActivePartyChoice]);

  const currentVote = useMemo(() => {
    if (!activeChoice) return null;
    return activeChoice.votes.find((vote) => vote.playerId === currentPlayerId) ?? null;
  }, [activeChoice, currentPlayerId]);

  const summary = useMemo(() => (activeChoice ? getVoteSummary(activeChoice) : []), [activeChoice]);
  const totalVotes = activeChoice?.votes.length ?? 0;
  const msLeft = activeChoice?.expiresAt ? activeChoice.expiresAt - now : null;

  if (!activeChoice) return null;
  const choice = activeChoice;

  const baseMeta = eventMeta(currentPlayerId);

  const summaryByChoice = new Map(summary.map((item) => [item.choiceId, item]));
  const winnerOption = choice.resolvedChoiceId
    ? choice.options.find((option) => option.number.toString() === choice.resolvedChoiceId)
    : null;

  async function handleVote(selectedOptionId: string) {
    setVoteStatus('idle');
    const result = dispatch({
      ...baseMeta,
      type: 'PARTY_VOTE_CAST',
      sessionId: choice.sessionId,
      choiceId: choice.id,
      playerId: currentPlayerId,
      characterName: currentCharacterName,
      selectedOptionId,
    });

    if (result.failed.length) return;
    try {
      await castVoteInDb(choice.sessionId, choice.id, currentPlayerId, currentCharacterName, selectedOptionId);
      setVoteStatus('sent');
      globalThis.setTimeout(() => setVoteStatus('idle'), 1000);
    } catch {
      setVoteStatus('failed');
    }
  }

  function handleForceResolve() {
    const ranked = getVoteSummary(choice);
    const winner = ranked[0]?.choiceId ?? choice.options[0]?.number.toString();
    if (!winner) return;

    dispatch({
      ...baseMeta,
      type: 'PARTY_CHOICE_RESOLVED',
      sessionId: choice.sessionId,
      choiceId: choice.id,
      resolvedChoiceId: winner,
    });
  }

  return (
    <div className="fw-backdrop" role="dialog" aria-modal="true">
      <section className="fw-modal fw-party-vote">
        <div className="fw-modal__header fw-party-vote__header">
          <h2 className="fw-party-vote__title">Fatewarden</h2>
          <p className="fw-party-vote__subtitle">A choice that will echo through history...</p>
          <h3 className="fw-h2 fw-party-vote__prompt">{choice.prompt}</h3>
          <div className="fw-divider--ornamental">
            <span className="fw-divider--ornamental__glyph" />
          </div>
        </div>

        <div className="fw-choices fw-party-vote__choices">
          {choice.options.map((option) => {
            const choiceId = option.number.toString();
            const group = summaryByChoice.get(choiceId);
            const isCurrentVote = currentVote?.choiceId === choiceId;
            const count = group?.count ?? 0;
            const width = totalVotes > 0 ? `${(count / totalVotes) * 100}%` : '0%';
            return (
              <button
                className="fw-choice fw-party-vote__choice"
                data-selected={isCurrentVote ? 'true' : undefined}
                disabled={Boolean(currentVote) || choice.status === 'resolved'}
                key={choiceId}
                onClick={() => handleVote(choiceId)}
                type="button"
              >
                <span className="fw-choice__letter">{String.fromCharCode(64 + option.number)}</span>
                <span className="fw-party-vote__choice-main">
                  <span className="fw-party-vote__choice-title">{option.label}</span>
                  <span className="fw-party-vote__choice-meter">
                    <span
                      className="fw-party-vote__choice-fill"
                      style={{ width, background: optionColors[(option.number - 1) % optionColors.length] }}
                    />
                  </span>
                  <span className="fw-party-vote__choice-voters">
                    <span className="fw-party-vote__choice-icon">{optionIcons[(option.number - 1) % optionIcons.length]}</span>
                    <span>{count} vote{count === 1 ? '' : 's'}</span>
                    {group?.voters.length ? <span>· {group.voters.join(', ')}</span> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <footer className="fw-party-vote__footer">
          <div className="fw-party-vote__policy">
            <span className="fw-caption">Policy</span>
            <span className="fw-cond fw-cond--minor">{choice.resolutionPolicy}</span>
          </div>
          <div className="fw-party-vote__status">
            {msLeft !== null ? <span className="fw-party-vote__countdown">{formatCountdown(msLeft)}</span> : null}
            {currentVote && choice.status !== 'resolved' ? (
              voteStatus === 'failed' ? (
                <p className="fw-caption fw-party-vote__error">Sync failed — retrying...</p>
              ) : voteStatus === 'sent' ? (
                <p className="fw-caption">Vote sent</p>
              ) : (
                <p className="fw-caption">Waiting for others...</p>
              )
            ) : (
              <p className="fw-caption">
                {choice.status === 'resolved' ? 'Choice resolved' : 'Awaiting votes'}
              </p>
            )}
          </div>
        </footer>

        {showResolvedFanfare && winnerOption ? (
          <div className="fw-toast fw-toast--success fw-party-vote__fanfare">
            <strong>Resolved: {winnerOption.label}</strong>
          </div>
        ) : null}

        {isHost ? (
          <div className="fw-modal__footer fw-party-vote__controls">
            <button className="fw-btn fw-btn--secondary" type="button" onClick={handleForceResolve}>Force Resolve</button>
            <button className="fw-btn fw-btn--ghost" type="button" onClick={clearActivePartyChoice}>Cancel Choice</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

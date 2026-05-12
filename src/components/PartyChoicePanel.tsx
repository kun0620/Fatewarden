import { useEffect, useMemo, useState } from 'react';
import { castVoteInDb } from '../lib/partyChoices';
import { usePartyChoiceSync } from '../hooks/usePartyChoiceSync';
import { useGameStore } from '../store/useGameStore';
import { getVoteSummary } from '../engine/party/partyChoiceEngine';

type PartyChoicePanelProps = {
  sessionId: string | null;
  currentPlayerId: string;
  currentCharacterName: string;
  isHost: boolean;
};

const optionColors = ['#7c3aed', '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4'];

function formatCountdown(msLeft: number) {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function PartyChoicePanel({ sessionId, currentPlayerId, currentCharacterName, isHost }: PartyChoicePanelProps) {
  usePartyChoiceSync(sessionId);

  const partyChoiceState = useGameStore((state) => state.partyChoiceState);
  const eventMeta = useGameStore((state) => state.eventMeta);
  const dispatch = useGameStore((state) => state.dispatch);
  const clearActivePartyChoice = useGameStore((state) => state.clearActivePartyChoice);

  const activeChoice = partyChoiceState.activeChoice;
  const [now, setNow] = useState(Date.now());
  const [showResolvedFanfare, setShowResolvedFanfare] = useState(false);

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
    await castVoteInDb(choice.sessionId, choice.id, currentPlayerId, currentCharacterName, selectedOptionId);
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
    <div className="modal-overlay party-choice-overlay" role="dialog" aria-modal="true">
      <section className="modal-card party-choice-modal">
        <header className="party-choice-header">
          <span className="phase-chip">Policy: {choice.resolutionPolicy}</span>
          {msLeft !== null ? <span className="phase-chip">Time left: {formatCountdown(msLeft)}</span> : null}
        </header>

        <h2 className="party-choice-prompt">{choice.prompt}</h2>

        <div className="party-choice-summary-bar" aria-label="Vote summary">
          {choice.options.map((option, index) => {
            const choiceId = option.number.toString();
            const count = summaryByChoice.get(choiceId)?.count ?? 0;
            const width = totalVotes > 0 ? `${(count / totalVotes) * 100}%` : '0%';
            return (
              <span
                key={choiceId}
                className="party-choice-summary-segment"
                style={{ width, background: optionColors[index % optionColors.length] }}
                title={`${option.label}: ${count}`}
              />
            );
          })}
        </div>

        <div className="party-choice-options">
          {choice.options.map((option, index) => {
            const choiceId = option.number.toString();
            const group = summaryByChoice.get(choiceId);
            const isCurrentVote = currentVote?.choiceId === choiceId;
            return (
              <button
                key={choiceId}
                type="button"
                className={isCurrentVote ? 'party-choice-option active' : 'party-choice-option'}
                disabled={Boolean(currentVote) || choice.status === 'resolved'}
                onClick={() => handleVote(choiceId)}
              >
                <div className="party-choice-option-top">
                  <strong>{option.number}. {option.label}</strong>
                  <span>{group?.count ?? 0} vote(s)</span>
                </div>
                {group?.voters?.length ? <small>{group.voters.join(', ')}</small> : <small>No votes yet</small>}
              </button>
            );
          })}
        </div>

        {currentVote && choice.status !== 'resolved' ? (
          <p className="form-message">Waiting for others...</p>
        ) : null}

        {showResolvedFanfare && winnerOption ? (
          <div className="party-choice-fanfare">
            <strong>Resolved: {winnerOption.label}</strong>
          </div>
        ) : null}

        {isHost ? (
          <footer className="modal-actions">
            <button type="button" onClick={handleForceResolve}>Force Resolve</button>
            <button type="button" onClick={clearActivePartyChoice}>Cancel Choice</button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

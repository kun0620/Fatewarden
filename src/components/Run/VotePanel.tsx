import { Check, Crown, Sparkles } from 'lucide-react';
import type { PresencePlayer } from '../../hooks/useRunPresence';
import type { RunVote, RunVoteOption } from '../../types';

interface VotePanelProps {
  vote: RunVote;
  players: PresencePlayer[];
  currentUserId: string;
  isHost: boolean;
  timeLeft: number;
  onVote: (optionId: string) => void;
  onOverride: (optionId: string) => void;
}

function tallyVotes(vote: RunVote) {
  return vote.options.reduce<Record<string, number>>((tally, option) => {
    tally[option.id] = Object.values(vote.votes).filter((optionId) => optionId === option.id).length;
    return tally;
  }, {});
}

function getLeadingOptionIds(vote: RunVote) {
  const tally = tallyVotes(vote);
  const maxVotes = Math.max(0, ...Object.values(tally));
  if (maxVotes === 0) return new Set<string>();
  return new Set(Object.entries(tally).filter(([, count]) => count === maxVotes).map(([optionId]) => optionId));
}

function optionLabel(vote: RunVote, optionId: string | undefined) {
  if (!optionId) return null;
  return vote.options.find((option) => option.id === optionId)?.label ?? null;
}

function optionBlurb(option: RunVoteOption) {
  if ('blurb' in option && typeof option.blurb === 'string') return option.blurb;
  return undefined;
}

function VoteIcon({ option }: { option: RunVoteOption }) {
  if (option.icon) return <span className="wr-vote-card-icon">{option.icon}</span>;
  return <Sparkles size={16} strokeWidth={1.7} aria-hidden="true" />;
}

export function VotePanel({
  vote,
  players,
  currentUserId,
  isHost,
  timeLeft,
  onVote,
  onOverride,
}: VotePanelProps) {
  const myVote = vote.votes[currentUserId];
  const voteTally = tallyVotes(vote);
  const leadingIds = getLeadingOptionIds(vote);
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / 30) * 100));
  const isResolved = vote.status === 'resolved';
  const title = vote.type === 'node' ? 'WHERE SHALL WE VENTURE?' : 'THE PARTY DELIBERATES';

  return (
    <div className="wr-vote-overlay" role="dialog" aria-modal="false" aria-labelledby="wr-vote-title">
      <section className={`wr-vote-shell${isResolved ? ' resolved' : ''}`}>
        <div className="wr-corn wr-corn--tl" />
        <div className="wr-corn wr-corn--tr" />
        <div className="wr-corn wr-corn--bl" />
        <div className="wr-corn wr-corn--br" />

        <header className="wr-vote-panel-head">
          <div>
            <p className="wr-eyebrow">THE PARTY DECIDES</p>
            <h2 id="wr-vote-title">{title}</h2>
          </div>
          <div className="wr-vote-timer-row">
            <span className="wr-vote-timer">{Math.max(0, timeLeft)}s</span>
            <div className="wr-vote-timer-bar" aria-hidden="true">
              <div
                className={timeLeft < 10 ? 'wr-vote-timer-fill--urgent' : ''}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        </header>

        <div className="wr-vote-options">
          {vote.options.map((option) => {
            const isSelected = myVote === option.id;
            const isLeading = leadingIds.has(option.id);
            const isWinner = isResolved && vote.result === option.id;
            const blurb = optionBlurb(option);
            const playersWhoVotedThis = players.filter((player) => vote.votes[player.userId] === option.id);
            const classes = [
              'wr-vote-option',
              isSelected ? 'wr-vote-option--selected' : '',
              isLeading ? 'wr-vote-option--leading' : '',
              isWinner ? 'wr-vote-option--winner' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={option.id}
                className={classes}
                type="button"
                disabled={isResolved}
                onClick={() => onVote(option.id)}
              >
                <span className="wr-vote-ic">
                  <VoteIcon option={option} />
                </span>
                <span className="wr-vote-body">
                  <span className="wr-vote-name">{option.label}</span>
                  {blurb && <span className="wr-vote-blurb">{blurb}</span>}
                </span>
                <span className="wr-vote-voters">
                  {playersWhoVotedThis.map((player) => (
                    <span key={player.userId} className="wr-voter-pip" title={player.displayName}>
                      {player.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="wr-vote-tally">
                  <span className="wr-vote-tally-num">{voteTally[option.id] ?? 0}</span>
                  <span className="wr-vote-tally-of">/{players.length}</span>
                </span>
                {isSelected && <Check className="wr-vote-option-check" size={14} strokeWidth={2.2} aria-label="Your vote" />}
              </button>
            );
          })}
        </div>

        <footer className="wr-vote-panel-foot">
          <span>{isResolved ? `Winner: ${optionLabel(vote, vote.result) ?? 'Random path'}` : `Auto-resolves in ${Math.max(0, timeLeft)}s`}</span>
          {isHost && !isResolved && (
            <div className="wr-vote-override">
              <Crown size={13} strokeWidth={1.8} aria-hidden="true" />
              {vote.options.map((option) => (
                <button key={option.id} className="wr-btn wr-btn-ghost wr-btn-sm" type="button" onClick={() => onOverride(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}

export default VotePanel;

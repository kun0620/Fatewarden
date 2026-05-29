import { useRunPresence } from '../../hooks/useRunPresence';

export function PresenceStrip() {
  const { players } = useRunPresence();
  const entries = Object.values(players);

  if (entries.length <= 1) return null;

  return (
    <div className="wr-presence-strip">
      {entries.map((player) => (
        <div
          key={player.userId}
          className="wr-presence-player"
          title={player.displayName}
        >
          <div className="wr-presence-avatar">
            {player.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className={`wr-presence-dot wr-presence-dot--${player.status}`} />
          <span className="wr-presence-name">{player.displayName}</span>
        </div>
      ))}
    </div>
  );
}

export default PresenceStrip;

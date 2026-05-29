import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createGameSession } from '../../lib/sessions';
import type { GameSession, RoomVisibility, RunDifficulty } from '../../types';
import { WIcon } from './runVisuals';

type PartySize = 1 | 2 | 3 | 4;

interface DifficultyCard {
  id: RunDifficulty;
  name: string;
  tagline: string;
  color: 'good' | 'violet' | 'blood';
  icon: string;
  perks: string[];
}

interface CreateRoomScreenProps {
  user: User;
  onCreated: (session: GameSession) => void;
  onCancel: () => void;
}

const DIFFICULTIES: DifficultyCard[] = [
  {
    id: 'apprentice',
    name: 'Apprentice',
    tagline: 'Forgiving. Recommended for new wardens.',
    color: 'good',
    icon: 'sparkles',
    perks: [
      '-25% foe HP',
      '+1 revive token',
      'Map shows all node intents',
    ],
  },
  {
    id: 'warden',
    name: 'Warden',
    tagline: 'The standard descent. Tuned for four.',
    color: 'violet',
    icon: 'shield',
    perks: [
      'Default tuning',
      '1 revive token',
      'Elites announce intent',
    ],
  },
  {
    id: 'nightmare',
    name: 'Nightmare',
    tagline: 'Brutal. Random curses each floor.',
    color: 'blood',
    icon: 'skull',
    perks: [
      '+30% foe HP',
      '0 revive tokens',
      'Hidden node intents',
    ],
  },
];

const VISIBILITY_OPTIONS: Array<{ id: RoomVisibility; label: string; hint: string }> = [
  { id: 'public', label: 'Public', hint: 'Anyone in the directory can join.' },
  { id: 'invite_code', label: 'Invite Code', hint: 'Only those with the room code or share link can join.' },
  { id: 'private', label: 'Private', hint: 'Locked. You invite specific wardens by handle.' },
];

export function CreateRoomScreen({ user, onCreated, onCancel }: CreateRoomScreenProps) {
  const [roomName, setRoomName] = useState('');
  const [partySize, setPartySize] = useState<PartySize>(4);
  const [visibility, setVisibility] = useState<RoomVisibility>('invite_code');
  const [difficulty, setDifficulty] = useState<RunDifficulty>('warden');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const visibilityHint = VISIBILITY_OPTIONS.find((option) => option.id === visibility)?.hint ?? '';

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const session = await createGameSession({
        title: roomName.trim() || 'A New Descent',
        playMode: 'warden_run',
        themeKey: 'dark_fantasy',
        themeNotes: '',
        ruleStrictness: 'standard',
        partySize,
        visibility,
        difficulty,
        houseRules: '',
      }, user);

      onCreated({
        ...session,
        difficulty,
        partySize,
        maxPlayers: partySize,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the doors.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-scene">
        <div className="wr-scene-inner" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="wr-btn wr-btn-ghost wr-btn-sm" disabled={loading} onClick={onCancel} type="button">
              {WIcon('chevL', { size: 11 })} Back
            </button>
            <div className="wr-eyebrow">Create Room - step 1 of 3</div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>Open the Doors</div>
            <h1
              className="wr-event-banner-title-h2"
              style={{
                fontFamily: 'var(--wr-f-head)',
                fontSize: 30,
                letterSpacing: '0.14em',
                color: 'var(--wr-bone)',
                marginTop: 4,
              }}
            >
              A New Descent
            </h1>
            <div className="wr-rule" style={{ maxWidth: 280, margin: '12px auto 20px' }}>
              <span className="wr-rule-diamond" />
            </div>
          </div>

          <div className="wr-form-grid">
            <div className="wr-field">
              <label className="wr-eyebrow" htmlFor="wr-room-name">Room Name</label>
              <input
                className="wr-input"
                disabled={loading}
                id="wr-room-name"
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Name your descent..."
                value={roomName}
              />
            </div>

            <div className="wr-field">
              <label className="wr-eyebrow">Mode</label>
              <div className="wr-input wr-input-static">
                <span style={{ color: 'var(--wr-violet-bright)' }}>{WIcon('shield', { size: 14 })}</span>
                <span style={{ flex: 1, color: 'var(--wr-bone)', fontFamily: 'var(--wr-f-head)', letterSpacing: '0.08em' }}>
                  Warden&apos;s Run
                </span>
                <span style={{ color: 'var(--wr-text-3)', fontSize: 11, fontStyle: 'italic' }}>Co-op roguelite</span>
              </div>
            </div>

            <div className="wr-field">
              <label className="wr-eyebrow">Party Size</label>
              <div className="wr-seg">
                {([1, 2, 3, 4] as const).map((size) => (
                  <button
                    className={`wr-seg-btn ${partySize === size ? 'active' : ''}`}
                    disabled={loading}
                    key={size}
                    onClick={() => setPartySize(size)}
                    type="button"
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="wr-field-hint">
                {partySize === 1
                  ? 'Solo. AI fills the remaining seats - they fight, you choose.'
                  : `${partySize} wardens. The descent scales to your line.`}
              </div>
            </div>

            <div className="wr-field">
              <label className="wr-eyebrow">Visibility</label>
              <div className="wr-seg">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    className={`wr-seg-btn ${visibility === option.id ? 'active' : ''}`}
                    disabled={loading}
                    key={option.id}
                    onClick={() => setVisibility(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="wr-field-hint">{visibilityHint}</div>
            </div>

            <div className="wr-field" style={{ gridColumn: 'span 2' }}>
              <label className="wr-eyebrow">Difficulty</label>
              <div className="wr-diff-grid">
                {DIFFICULTIES.map((item) => (
                  <button
                    className={`wr-diff-card ${item.color} ${difficulty === item.id ? 'selected' : ''}`}
                    disabled={loading}
                    key={item.id}
                    onClick={() => setDifficulty(item.id)}
                    type="button"
                  >
                    <div className="wr-diff-mark">{WIcon(item.icon, { size: 18 })}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wr-diff-title">{item.name}</div>
                      <div className="wr-diff-desc">{item.tagline}</div>
                      <ul className="wr-diff-mods">
                        {item.perks.map((perk) => <li key={perk}>{perk}</li>)}
                      </ul>
                    </div>
                    <span className={`wr-diff-check ${difficulty === item.id ? 'on' : ''}`}>
                      {WIcon('check', { size: 11 })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="wr-field-hint" style={{ color: 'var(--wr-blood-bright)', marginTop: 12 }}>{error}</p> : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="wr-btn wr-btn-ghost" disabled={loading} onClick={onCancel} type="button">Cancel</button>
            <button className="wr-btn wr-btn-violet wr-btn-lg" disabled={loading} onClick={handleSubmit} type="button">
              {loading ? 'Opening...' : 'Open the Doors'} {WIcon('arrowR', { size: 14 })}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CreateRoomScreen;

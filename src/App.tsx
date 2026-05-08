import { BookOpen, Copy, DoorOpen, Dices, LogOut, ScrollText, Shield, Swords } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { CharacterSheet } from './components/CharacterSheet';
import { CharacterSheetView } from './components/CharacterSheetView';
import { CombatTracker } from './components/CombatTracker';
import { DiceRoller } from './components/DiceRoller';
import { GamePhasePanel } from './components/GamePhasePanel';
import { PartyPanel } from './components/PartyPanel';
import { SessionLobby } from './components/SessionLobby';
import { addUniqueMessage, StoryLog } from './components/StoryLog';
import { demoCharacter, demoMessages } from './data/demo';
import { loadCharacter, saveCharacter } from './lib/characters';
import { getGamePhaseDefinition } from './lib/gamePhases';
import { sendSessionMessage } from './lib/messages';
import { subscribeToSessionUpdates, updateSessionPhase } from './lib/sessions';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import type { Character, DiceRoll, EncounterState, GamePhase, GameSession, StoryMessage } from './types';

type CockpitMode = 'dm' | 'player';
type MobilePanel = 'story' | 'character' | 'dice' | 'combat';

function formatLocalTime() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function App() {
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [character, setCharacter] = useState<Character>(demoCharacter);
  const [characterStatus, setCharacterStatus] = useState('');
  const [storyMessages, setStoryMessages] = useState<StoryMessage[]>(demoMessages);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const [localPhase, setLocalPhase] = useState<GamePhase>('setup');
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [cockpitMode, setCockpitMode] = useState<CockpitMode>('dm');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('story');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
      setAuthLoading(false);
      if (!session) {
        setActiveSession(null);
        setCharacter(demoCharacter);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const selectSession = useCallback((session: GameSession) => {
    setActiveSession(session);
    setEncounter(null);
  }, []);

  const user: User | null = authSession?.user ?? null;
  const currentPhase = activeSession?.phase ?? localPhase;
  const phaseDefinition = getGamePhaseDefinition(currentPhase);

  useEffect(() => {
    if (!activeSession || !user || !supabase) {
      setCharacter(demoCharacter);
      setCharacterStatus(hasSupabaseConfig ? 'Choose a table to edit.' : 'Local demo character.');
      return;
    }

    let alive = true;
    setCharacterStatus('Loading character');
    loadCharacter(activeSession.id, user)
      .then((row) => {
        if (!alive) return;
        setCharacter(row);
        setCharacterStatus('Saved to this table');
      })
      .catch((error: Error) => {
        if (!alive) return;
        setCharacter(demoCharacter);
        setCharacterStatus(error.message);
      });

    return () => {
      alive = false;
    };
  }, [activeSession, user]);

  useEffect(() => {
    if (!activeSession || !supabase || !user) return;

    const client = supabase;
    const channel = subscribeToSessionUpdates(activeSession.id, (nextSession) => {
      setActiveSession((current) => (current?.id === nextSession.id ? nextSession : current));
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [activeSession?.id, user]);

  const persistCharacter = useCallback(
    async (nextCharacter: Character) => {
      if (!activeSession || !user) return;

      setCharacterStatus('Saving character');
      const saved = await saveCharacter(nextCharacter, activeSession.id, user);
      setCharacter(saved);
      setCharacterStatus('Character saved');
    },
    [activeSession, user],
  );

  const saveLocalCharacter = useCallback(async (nextCharacter: Character) => {
    setCharacter(nextCharacter);
    setCharacterStatus('Local character updated');
  }, []);

  const postDiceRoll = useCallback(
    async (roll: DiceRoll) => {
      const mode = roll.mode === 'normal' ? '' : ` with ${roll.mode}`;
      const rollDetails = roll.keptRoll ? `kept ${roll.keptRoll} from ${roll.rolls.join(', ')}` : roll.rolls.join(', ');
      const body = `${character.name} rolled ${roll.label}${mode}: ${roll.notation} = ${roll.total} (${rollDetails}${
        roll.modifier ? `, modifier ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}` : ''
      })`;
      const metadata = {
        kind: 'dice_roll',
        roll,
        character: {
          id: character.id,
          name: character.name,
        },
      };

      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Dice',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const message = await sendSessionMessage(activeSession.id, 'system', 'Dice', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));
      } catch (error) {
        const body = error instanceof Error ? error.message : 'Could not post dice roll.';
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body,
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, character, user],
  );

  const postCombatEvent = useCallback(
    async (body: string, metadata: Record<string, unknown>) => {
      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Combat',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const message = await sendSessionMessage(activeSession.id, 'system', 'Combat', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not post combat event.',
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, user],
  );

  const postPhaseEvent = useCallback(
    async (phase: GamePhase) => {
      const definition = getGamePhaseDefinition(phase);
      const body = `Game phase changed to ${definition.label}.`;
      const metadata = {
        kind: 'phase_event',
        phase,
        label: definition.label,
      };

      if (!activeSession || !user || !supabase) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Game Flow',
            body,
            createdAt: formatLocalTime(),
            metadata,
          }),
        );
        return;
      }

      try {
        const message = await sendSessionMessage(activeSession.id, 'system', 'Game Flow', body, metadata);
        setStoryMessages((current) => addUniqueMessage(current, message));
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not post phase event.',
            createdAt: formatLocalTime(),
          }),
        );
      }
    },
    [activeSession, user],
  );

  const changeGamePhase = useCallback(
    async (nextPhase: GamePhase) => {
      if (nextPhase === currentPhase || phaseBusy) return;

      setPhaseBusy(true);
      try {
        if (activeSession && user && supabase) {
          const updatedSession = await updateSessionPhase(activeSession.id, nextPhase);
          setActiveSession(updatedSession);
        } else {
          setLocalPhase(nextPhase);
        }
        await postPhaseEvent(nextPhase);
      } catch (error) {
        setStoryMessages((current) =>
          addUniqueMessage(current, {
            id: crypto.randomUUID(),
            speaker: 'system',
            author: 'Table',
            body: error instanceof Error ? error.message : 'Could not change game phase.',
            createdAt: formatLocalTime(),
          }),
        );
      } finally {
        setPhaseBusy(false);
      }
    },
    [activeSession, currentPhase, phaseBusy, postPhaseEvent, user],
  );

  function copyJoinCode() {
    if (!activeSession) return;
    void navigator.clipboard?.writeText(activeSession.joinCode);
  }

  function switchTable() {
    setActiveSession(null);
    setEncounter(null);
    setLocalPhase('setup');
    setIsSheetOpen(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActiveSession(null);
    setEncounter(null);
    setLocalPhase('setup');
    setIsSheetOpen(false);
    setCharacter(demoCharacter);
  }

  if (hasSupabaseConfig && (!user || !activeSession)) {
    return (
      <main className="app-shell gate-shell">
        <section className="gate-hero">
          <div className="gate-copy">
            <p className="eyebrow">Fatewarden</p>
            <h1>Choose Your Table</h1>
            <p>
              Sign in, create a campaign table, or join with a code before entering the DM cockpit.
            </p>
          </div>
          <div className="gate-status">
            <span className={user ? 'status connected' : 'status'}>{user ? 'Signed in' : 'Auth required'}</span>
            <span className="status">SRD 5.1</span>
            <span className="status">Core / Combat / Conditions</span>
          </div>
        </section>

        <section className="gate-grid">
          <AuthPanel loading={authLoading} user={user} />
          <SessionLobby activeSession={activeSession} onSelectSession={selectSession} user={user} />
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell mode-${cockpitMode} phase-${currentPhase}`}>
      <header className="command-bar">
        <div className="brand-lockup">
          <p className="eyebrow">Fatewarden</p>
          <h1>{activeSession?.title ?? 'Adventuring Table'}</h1>
          <span>{cockpitMode === 'dm' ? 'DM Cockpit' : 'Player Focus'} · {phaseDefinition.label}</span>
        </div>
        <div className="mode-switch" aria-label="Cockpit mode">
          <button
            className={cockpitMode === 'dm' ? 'active' : ''}
            onClick={() => setCockpitMode('dm')}
            type="button"
          >
            DM
          </button>
          <button
            className={cockpitMode === 'player' ? 'active' : ''}
            onClick={() => setCockpitMode('player')}
            type="button"
          >
            Player
          </button>
        </div>
        <div className="command-status" aria-label="Table status">
          <span className={hasSupabaseConfig ? 'status connected' : 'status'}>
            {hasSupabaseConfig ? 'Live Supabase' : 'Local demo'}
          </span>
          <span className="status phase-chip">{phaseDefinition.label}</span>
          <span className="status">{activeSession?.joinCode ? `Code ${activeSession.joinCode}` : 'No table'}</span>
          <span className="status character-status-chip">{user?.email?.split('@')[0] ?? character.name}</span>
          <div className="game-menu" aria-label="Table menu">
            <button disabled={!activeSession} onClick={copyJoinCode} type="button">
              <Copy size={15} aria-hidden="true" />
              Copy
            </button>
            {hasSupabaseConfig ? (
              <button onClick={switchTable} type="button">
                <DoorOpen size={15} aria-hidden="true" />
                Switch
              </button>
            ) : null}
            {hasSupabaseConfig ? (
              <button onClick={signOut} type="button">
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="mobile-dock" aria-label="Mobile cockpit panels">
        <button
          className={mobilePanel === 'story' ? 'active' : ''}
          onClick={() => setMobilePanel('story')}
          type="button"
        >
          <ScrollText size={16} aria-hidden="true" />
          Story
        </button>
        <button
          className={mobilePanel === 'character' ? 'active' : ''}
          onClick={() => setMobilePanel('character')}
          type="button"
        >
          <Shield size={16} aria-hidden="true" />
          Sheet
        </button>
        <button
          className={mobilePanel === 'dice' ? 'active' : ''}
          onClick={() => setMobilePanel('dice')}
          type="button"
        >
          <Dices size={16} aria-hidden="true" />
          Dice
        </button>
        <button
          className={mobilePanel === 'combat' ? 'active' : ''}
          onClick={() => setMobilePanel('combat')}
          type="button"
        >
          <Swords size={16} aria-hidden="true" />
          Combat
        </button>
      </nav>

      <section className="cockpit-layout">
        <aside className="table-rail">
          <GamePhasePanel
            busy={phaseBusy}
            disabled={hasSupabaseConfig && (!activeSession || !user)}
            onChangePhase={changeGamePhase}
            phase={currentPhase}
          />
          <PartyPanel activeSession={activeSession} currentCharacter={character} />
          <section className="panel rules-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Rules</p>
                <h2>Reference</h2>
              </div>
              <BookOpen size={22} aria-hidden="true" />
            </div>
            <div className="rules-grid">
              <span>SRD 5.1</span>
              {(activeSession?.rules.enabledModules ?? ['core', 'combat', 'conditions']).map((module) => (
                <span key={module}>{module}</span>
              ))}
            </div>
            <p className="rules-note">
              {activeSession?.rules.houseRules || 'Core formulas only. Longer rules text stays outside the app.'}
            </p>
          </section>
        </aside>

        <section className={`story-zone mobile-panel ${mobilePanel === 'story' ? 'active' : ''}`}>
          <StoryLog
            activeSession={activeSession}
            character={character}
            characterName={character.name}
            encounter={encounter}
            gamePhase={currentPhase}
            initialMessages={demoMessages}
            messages={storyMessages}
            onMessagesChange={setStoryMessages}
            sessionTitle={activeSession?.title}
            user={user}
          />
        </section>

        <aside className="tool-dock">
          <div className={`mobile-panel ${mobilePanel === 'character' ? 'active' : ''}`}>
            <CharacterSheet
              character={character}
              disabled={hasSupabaseConfig && (!activeSession || !user)}
              onOpenFullSheet={() => setIsSheetOpen(true)}
              onSave={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
              status={characterStatus}
            />
          </div>
          <div className={`mobile-panel ${mobilePanel === 'dice' ? 'active' : ''}`}>
            <DiceRoller character={character} onRoll={postDiceRoll} />
          </div>
          <div className={`mobile-panel ${mobilePanel === 'combat' ? 'active' : ''}`}>
            <CombatTracker
              character={character}
              encounter={encounter}
              onCombatEvent={postCombatEvent}
              onEncounterChange={setEncounter}
              onRequestPhaseChange={changeGamePhase}
            />
          </div>
        </aside>
      </section>

      {isSheetOpen ? (
        <CharacterSheetView
          character={character}
          disabled={hasSupabaseConfig && (!activeSession || !user)}
          onClose={() => setIsSheetOpen(false)}
          onSave={hasSupabaseConfig ? persistCharacter : saveLocalCharacter}
          status={characterStatus}
        />
      ) : null}
    </main>
  );
}

import { CheckCircle2, Circle, MapPin, ShieldAlert, Skull, TriangleAlert, XCircle } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { SceneMode, SceneState } from '../engine/scene';

type ScenePanelProps = {
  isSessionHost: boolean;
};

const modeLabel: Record<SceneMode, string> = {
  exploration: 'Exploration',
  combat: 'Combat',
  social: 'Social',
  rest: 'Rest',
  horror: 'Horror',
  transition: 'Transition',
};

const dangerClassByLevel: Record<SceneState['flags']['dangerLevel'], string> = {
  none: 'danger-none',
  low: 'danger-low',
  medium: 'danger-medium',
  high: 'danger-high',
  extreme: 'danger-extreme',
};

function clampClockPercent(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function threatBarColor(percent: number) {
  if (percent >= 85) return '#ef4444';
  if (percent >= 65) return '#f97316';
  if (percent >= 40) return '#facc15';
  if (percent >= 20) return '#84cc16';
  return '#64748b';
}

export function ScenePanel({ isSessionHost }: ScenePanelProps) {
  const sceneState = useGameStore((state) => state.sceneState);
  const activeCharacter = useGameStore((state) => state.activeCharacter);
  const eventMetaFactory = useGameStore((state) => state.eventMeta);
  const dispatch = useGameStore((state) => state.dispatch);

  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);

  const [transitionMode, setTransitionMode] = useState<SceneMode>('exploration');
  const [transitionLocation, setTransitionLocation] = useState('');
  const [transitionDescription, setTransitionDescription] = useState('');
  const [objectiveText, setObjectiveText] = useState('');
  const [selectedClockId, setSelectedClockId] = useState('');
  const [clockAmount, setClockAmount] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  const sessionId = sceneState?.sessionId ?? 'local';

  const meta = useMemo(() => {
    const actorId = activeCharacter?.id ?? 'system';
    return eventMetaFactory(actorId);
  }, [activeCharacter?.id, eventMetaFactory]);

  function runDispatch(event: Parameters<typeof dispatch>[0]) {
    const result = dispatch(event);
    if (result.failed.length) {
      setErrorMessage(result.failed.join(' '));
      return false;
    }
    setErrorMessage('');
    return true;
  }

  function submitTransition(event: FormEvent) {
    event.preventDefault();
    if (!sceneState) return;

    const ok = runDispatch({
      ...meta,
      type: 'SCENE_TRANSITION',
      sessionId,
      newMode: transitionMode,
      newLocation: transitionLocation.trim() || sceneState.location,
      newDescription: transitionDescription.trim() || sceneState.description,
    });
    if (ok) {
      setShowTransitionModal(false);
      setTransitionDescription('');
      setTransitionLocation('');
    }
  }

  function submitAddObjective(event: FormEvent) {
    event.preventDefault();
    if (!sceneState) return;
    const text = objectiveText.trim();
    if (!text) return;

    const objectiveId = crypto.randomUUID();
    const okTransition = runDispatch({
      ...meta,
      type: 'SCENE_TRANSITION',
      sessionId,
      newMode: sceneState.mode,
      newLocation: sceneState.location,
      newDescription: sceneState.description,
    });
    if (!okTransition) return;

    // temporary objective add via scene transition metadata pattern is not supported in event union yet.
    // keep objective creation as no-op until explicit SCENE_OBJECTIVE_ADD event exists.
    setErrorMessage('Objective add event is pending schema support (SCENE_OBJECTIVE_ADD).');
    setObjectiveText('');
    setShowObjectiveModal(false);
    void objectiveId;
  }

  function submitAdvanceClock(event: FormEvent) {
    event.preventDefault();
    if (!sceneState || !selectedClockId) return;

    const ok = runDispatch({
      ...meta,
      type: 'THREAT_CLOCK_ADVANCE',
      sessionId,
      clockId: selectedClockId,
      amount: Math.max(1, Math.trunc(clockAmount)),
    });
    if (ok) {
      setShowClockModal(false);
    }
  }

  if (!sceneState) {
    return (
      <section className="panel scene-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Scene</p>
            <h2>No scene</h2>
          </div>
          <MapPin size={20} aria-hidden="true" />
        </div>
        <p className="phase-description">ยังไม่มี scene state ใน runtime store</p>
      </section>
    );
  }

  return (
    <section className="panel scene-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scene</p>
          <h2>{sceneState.location}</h2>
        </div>
        <span className="phase-chip">{modeLabel[sceneState.mode]}</span>
      </div>

      <div className="setup-status-strip">
        <span className={`setup-status ${dangerClassByLevel[sceneState.flags.dangerLevel]}`}>
          <ShieldAlert size={14} aria-hidden="true" />
          Danger: {sceneState.flags.dangerLevel}
        </span>
        <span className="setup-status">
          <TriangleAlert size={14} aria-hidden="true" />
          Reality: {sceneState.flags.realityStability}
        </span>
      </div>

      <div className="scene-section">
        <h3>Objectives</h3>
        {sceneState.objectives.length ? (
          <ul className="scene-objective-list">
            {sceneState.objectives.map((objective) => (
              <li key={objective.id}>
                {objective.status === 'completed' ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
                {objective.status === 'failed' ? <XCircle size={14} aria-hidden="true" /> : null}
                {objective.status === 'active' ? <Circle size={14} aria-hidden="true" /> : null}
                <span>{objective.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="phase-description">No objectives yet.</p>
        )}
      </div>

      <div className="scene-section">
        <h3>Threat Clocks</h3>
        {sceneState.threatClocks.length ? (
          <div className="scene-clock-list">
            {sceneState.threatClocks.map((clock) => {
              const percent = clampClockPercent(clock.current, clock.max);
              const color = threatBarColor(percent);
              return (
                <article className="scene-clock-item" key={clock.id}>
                  <div className="scene-clock-header">
                    <strong>{clock.name}</strong>
                    <span>
                      {clock.current}/{clock.max}
                    </span>
                  </div>
                  <div className="scene-clock-track" aria-label={`${clock.name} ${clock.current}/${clock.max}`}>
                    <span className="scene-clock-fill" style={{ width: `${percent}%`, backgroundColor: color }} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="phase-description">No threat clocks yet.</p>
        )}
      </div>

      {isSessionHost ? (
        <div className="phase-grid">
          <button type="button" onClick={() => setShowTransitionModal(true)}>Transition Scene</button>
          <button type="button" onClick={() => setShowObjectiveModal(true)}>Add Objective</button>
          <button type="button" onClick={() => setShowClockModal(true)} disabled={!sceneState.threatClocks.length}>
            Advance Clock
          </button>
        </div>
      ) : null}

      {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

      {showTransitionModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={submitTransition}>
            <h3>Transition Scene</h3>
            <label>
              Mode
              <select value={transitionMode} onChange={(event) => setTransitionMode(event.target.value as SceneMode)}>
                {(Object.keys(modeLabel) as SceneMode[]).map((mode) => (
                  <option key={mode} value={mode}>{modeLabel[mode]}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input value={transitionLocation} onChange={(event) => setTransitionLocation(event.target.value)} />
            </label>
            <label>
              Description
              <textarea rows={3} value={transitionDescription} onChange={(event) => setTransitionDescription(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowTransitionModal(false)}>Cancel</button>
              <button type="submit">Apply</button>
            </div>
          </form>
        </div>
      ) : null}

      {showObjectiveModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={submitAddObjective}>
            <h3>Add Objective</h3>
            <label>
              Objective text
              <input value={objectiveText} onChange={(event) => setObjectiveText(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowObjectiveModal(false)}>Cancel</button>
              <button type="submit">Add</button>
            </div>
          </form>
        </div>
      ) : null}

      {showClockModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={submitAdvanceClock}>
            <h3>Advance Clock</h3>
            <label>
              Clock
              <select value={selectedClockId} onChange={(event) => setSelectedClockId(event.target.value)}>
                <option value="">Select a clock</option>
                {sceneState.threatClocks.map((clock) => (
                  <option key={clock.id} value={clock.id}>{clock.name}</option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                min={1}
                step={1}
                type="number"
                value={clockAmount}
                onChange={(event) => setClockAmount(Number(event.target.value) || 1)}
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowClockModal(false)}>Cancel</button>
              <button type="submit">
                <Skull size={14} aria-hidden="true" />
                Advance
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

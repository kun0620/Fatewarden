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

function hpState(percent: number): 'full' | 'mid' | 'low' | 'bleed' {
  if (percent > 60) return 'full';
  if (percent > 30) return 'mid';
  if (percent > 10) return 'low';
  return 'bleed';
}

export function ScenePanel({ isSessionHost }: ScenePanelProps) {
  const sceneState = useGameStore((state) => state.sceneState);
  const activeCharacter = useGameStore((state) => state.activeCharacter);
  const eventMetaFactory = useGameStore((state) => state.eventMeta);
  const dispatch = useGameStore((state) => state.dispatch);

  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);

  const [transitionMode, setTransitionMode] = useState<SceneMode>('exploration');
  const [transitionLocation, setTransitionLocation] = useState('');
  const [transitionDescription, setTransitionDescription] = useState('');
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
      <section className="fw-panel">
        <div className="fw-panel__header">
          <div>
            <p className="fw-caption">Scene</p>
            <h2 className="fw-h2">No scene</h2>
          </div>
          <MapPin size={20} aria-hidden="true" />
        </div>
        <p className="fw-body">ยังไม่มี scene state ใน runtime store</p>
      </section>
    );
  }

  return (
    <section className="fw-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Scene</p>
          <h2 className="fw-h2">{sceneState.location}</h2>
        </div>
        <span className="fw-caption">{modeLabel[sceneState.mode]}</span>
      </div>

      <div>
        <span className={`fw-caption ${dangerClassByLevel[sceneState.flags.dangerLevel]}`}>
          <ShieldAlert size={14} aria-hidden="true" />
          Danger: {sceneState.flags.dangerLevel}
        </span>
        <span className="fw-caption">
          <TriangleAlert size={14} aria-hidden="true" />
          Reality: {sceneState.flags.realityStability}
        </span>
      </div>

      <div>
        <p className="fw-caption">Objectives</p>
        {sceneState.objectives.length ? (
          <ul>
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
          <p className="fw-body">No objectives yet.</p>
        )}
      </div>

      <div>
        <p className="fw-caption">Threat Clocks</p>
        {sceneState.threatClocks.length ? (
          <div>
            {sceneState.threatClocks.map((clock) => {
              const percent = clampClockPercent(clock.current, clock.max);
              return (
                <article key={clock.id}>
                  <div>
                    <strong>{clock.name}</strong>
                    <span>
                      {clock.current}/{clock.max}
                    </span>
                  </div>
                  <div
                    className="fw-hp"
                    data-state={hpState(percent)}
                    aria-label={`${clock.name} ${clock.current}/${clock.max}`}
                  >
                    <div className="fw-hp__fill" style={{ width: `${percent}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="fw-body">No threat clocks yet.</p>
        )}
      </div>

      {isSessionHost ? (
        <div>
          <button className="fw-btn fw-btn--ghost" type="button" onClick={() => setShowTransitionModal(true)}>Transition Scene</button>
          <button
            className="fw-btn fw-btn--ghost"
            disabled
            title="Coming soon"
            type="button"
          >
            Add Objective
          </button>
          <button className="fw-btn fw-btn--ghost" type="button" onClick={() => setShowClockModal(true)} disabled={!sceneState.threatClocks.length}>
            Advance Clock
          </button>
        </div>
      ) : null}

      {errorMessage ? <p className="fw-caption">{errorMessage}</p> : null}

      {showTransitionModal ? (
        <div className="fw-backdrop" role="dialog" aria-modal="true">
          <form className="fw-modal" onSubmit={submitTransition}>
            <div className="fw-modal__header">
              <h2 className="fw-modal__title">Transition Scene</h2>
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Mode</label>
              <select className="fw-select" value={transitionMode} onChange={(event) => setTransitionMode(event.target.value as SceneMode)}>
                {(Object.keys(modeLabel) as SceneMode[]).map((mode) => (
                  <option key={mode} value={mode}>{modeLabel[mode]}</option>
                ))}
              </select>
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Location</label>
              <input className="fw-input" value={transitionLocation} onChange={(event) => setTransitionLocation(event.target.value)} />
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Description</label>
              <textarea className="fw-input" rows={3} value={transitionDescription} onChange={(event) => setTransitionDescription(event.target.value)} />
            </div>
            <div className="fw-modal__footer">
              <button className="fw-btn fw-btn--ghost" type="button" onClick={() => setShowTransitionModal(false)}>Cancel</button>
              <button className="fw-btn fw-btn--primary" type="submit">Apply</button>
            </div>
          </form>
        </div>
      ) : null}

      {showClockModal ? (
        <div className="fw-backdrop" role="dialog" aria-modal="true">
          <form className="fw-modal" onSubmit={submitAdvanceClock}>
            <div className="fw-modal__header">
              <h2 className="fw-modal__title">Advance Clock</h2>
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Clock</label>
              <select className="fw-select" value={selectedClockId} onChange={(event) => setSelectedClockId(event.target.value)}>
                <option value="">Select a clock</option>
                {sceneState.threatClocks.map((clock) => (
                  <option key={clock.id} value={clock.id}>{clock.name}</option>
                ))}
              </select>
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Amount</label>
              <input
                className="fw-input"
                min={1}
                step={1}
                type="number"
                value={clockAmount}
                onChange={(event) => setClockAmount(Number(event.target.value) || 1)}
              />
            </div>
            <div className="fw-modal__footer">
              <button className="fw-btn fw-btn--ghost" type="button" onClick={() => setShowClockModal(false)}>Cancel</button>
              <button className="fw-btn fw-btn--primary" type="submit">
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

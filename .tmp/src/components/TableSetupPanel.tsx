import { CheckCircle2, Circle, Compass, Sparkles, Swords } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { getGamePhaseDefinition } from '../lib/gamePhases';
import { RestPanel } from './RestPanel';
import type { Character, EncounterState, GamePhase, GameSession } from '../types';

type TableSetupPanelProps = {
  activeSession: GameSession | null;
  character: Character;
  characterStatus: string;
  encounter: EncounterState | null;
  phase: GamePhase;
  busy?: boolean;
  disabled?: boolean;
  hasOpeningScene?: boolean;
  onStartExploration: (premise: string) => Promise<void> | void;
  onAskOpeningScene: (premise: string) => Promise<unknown> | unknown;
  onAskRestSummary?: () => Promise<void> | void;
  onApplyShortRest?: (hitDiceSpent: number) => Promise<void> | void;
  onApplyLongRest?: () => Promise<void> | void;
};

export function TableSetupPanel({
  activeSession,
  busy = false,
  character,
  characterStatus,
  disabled = false,
  hasOpeningScene = false,
  encounter,
  onAskOpeningScene,
  onAskRestSummary,
  onApplyLongRest,
  onApplyShortRest,
  onStartExploration,
  phase,
}: TableSetupPanelProps) {
  const [premise, setPremise] = useState('');
  const phaseDefinition = getGamePhaseDefinition(phase);
  const canOpenScene = Boolean(activeSession) && !disabled && !busy;
  const canStartExploration = Boolean(activeSession) && !disabled && !busy;
  const checks = [
    {
      label: 'Character',
      ready: Boolean(character.name && character.id),
      detail: character.name || characterStatus,
    },
    {
      label: 'Table',
      ready: Boolean(activeSession),
      detail: activeSession?.title ?? 'Create or join a table first',
    },
    {
      label: 'Rules',
      ready: Boolean(activeSession?.rules.version),
      detail: activeSession ? `${activeSession.rules.version.toUpperCase()} / ${activeSession.rules.enabledModules.join(', ')}` : 'SRD 5.1',
    },
    {
      label: 'AI DM',
      ready: Boolean(activeSession),
      detail: 'Adventure mode, Thai narration, confirm state changes',
    },
    {
      label: 'Opening',
      ready: hasOpeningScene,
      detail: hasOpeningScene ? 'The table has a first scene and next actions.' : 'Start the adventure to let AI DM open the first scene.',
    },
  ];

  async function submitOpeningScene(event: FormEvent) {
    event.preventDefault();
    if (!canOpenScene) return;
    await onAskOpeningScene(premise);
  }

  return (
    <section className="fw-panel table-setup-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Table Setup</p>
          <h2 className="fw-h2">{phaseDefinition.label}</h2>
        </div>
        {phase === 'combat' ? <Swords size={22} aria-hidden="true" /> : <Compass size={22} aria-hidden="true" />}
      </div>

      {phase === 'setup' ? (
        <div className="adventure-start-card">
          <div>
            <strong>{hasOpeningScene ? 'Opening scene ready' : 'เริ่มจากฉากแรกของ AI DM'}</strong>
            <span>
              {hasOpeningScene
                ? 'พร้อมเข้าสู่ Exploration และให้ผู้เล่นเลือกทางไปต่อ'
                : 'AI จะเปิดฉากตามธีมห้อง สร้าง objective, danger และตัวเลือกตามสถานการณ์'}
            </span>
          </div>
          <button className="fw-btn fw-btn--primary" disabled={!canStartExploration} onClick={() => onStartExploration(premise)} type="button">
            <Compass size={17} aria-hidden="true" />
            เริ่มการผจญภัย
          </button>
        </div>
      ) : null}

      <div className="setup-status-strip" aria-label="Setup readiness">
        {checks.map((check) => (
          <div className={check.ready ? 'setup-status ready' : 'setup-status'} key={check.label} title={`${check.label}: ${check.detail}`}>
            {check.ready ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
            <span>{check.label}</span>
          </div>
        ))}
      </div>

      <p className="phase-description">{phaseDefinition.description}</p>

      {phase === 'setup' ? (
        <form className="opening-scene-form" onSubmit={submitOpeningScene}>
          <div className="fw-field">
            <label className="fw-field__label">Opening Premise</label>
            <textarea
              className="fw-input"
              disabled={!canOpenScene}
              onChange={(event) => setPremise(event.target.value)}
              placeholder="เช่น เมืองชายแดนหลังฝนตก, งานว่าจ้างหายตัว, โทนลึกลับ/กดดัน..."
              rows={2}
              value={premise}
            />
          </div>
          <button className="fw-btn fw-btn--ghost" disabled={!canOpenScene} type="submit">
            <Sparkles size={17} aria-hidden="true" />
            ให้ AI เปิดฉากก่อน
          </button>
          {!hasOpeningScene ? (
            <small className="setup-hint">
              ปุ่มนี้จะให้ AI DM เปิดฉากตามธีมห้อง แล้วพาเข้า Exploration อัตโนมัติ
            </small>
          ) : null}
        </form>
      ) : null}

      {phase === 'combat' && encounter ? (
        <div className="setup-combat-note">
          <strong>{encounter.name}</strong>
          <span>
            Round {encounter.round} / {encounter.combatants.length} combatants
          </span>
        </div>
      ) : null}

      {phase === 'rest' ? (
        <>
          <RestPanel
            busy={busy}
            character={character}
            disabled={disabled || !activeSession || !onApplyShortRest || !onApplyLongRest}
            onLongRest={() => onApplyLongRest?.()}
            onShortRest={(hitDiceSpent) => onApplyShortRest?.(hitDiceSpent)}
          />
          <div className="rest-summary-actions">
            <button className="fw-btn fw-btn--ghost" disabled={disabled || busy || !activeSession} onClick={onAskRestSummary} type="button">
              <Sparkles size={17} aria-hidden="true" />
              Ask AI for Recap
            </button>
            <small className="setup-hint">สรุป consequence, unresolved threat และ hook สำหรับครั้งหน้า</small>
          </div>
        </>
      ) : null}
    </section>
  );
}

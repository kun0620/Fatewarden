import { Heart, Plus, Shield, UserRound, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { createCompanion } from '../engine/companion/companionEngine';
import type { CompanionBehavior, CompanionSheet } from '../engine/companion/companionTypes';
import { useGameStore } from '../store/useGameStore';

type CompanionPanelProps = {
  sessionId: string | null;
  currentUserId: string | null;
  isHost: boolean;
};

type SummonDraft = {
  name: string;
  type: CompanionSheet['type'];
  armorClass: number;
  hitPoints: number;
  speed: number;
  attackDice: string;
};

const behaviorOptions: CompanionBehavior[] = ['aggressive', 'defensive', 'support', 'passive'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function loyaltyTier(tier: CompanionSheet['loyalty']['tier']): string {
  if (tier === 'hostile') return 'hostile';
  if (tier === 'devoted') return 'devoted';
  if (tier === 'friendly') return 'loyal';
  return 'wary';
}

function hpPercent(companion: CompanionSheet) {
  if (companion.characterSnapshot.maxHitPoints <= 0) return 0;
  return clamp(
    Math.round((companion.characterSnapshot.hitPoints / companion.characterSnapshot.maxHitPoints) * 100),
    0,
    100,
  );
}

function hpState(percent: number): 'full' | 'mid' | 'low' | 'bleed' {
  if (percent > 60) return 'full';
  if (percent > 30) return 'mid';
  if (percent > 10) return 'low';
  return 'bleed';
}

function toIsoNow() {
  return new Date().toISOString();
}

export function CompanionPanel({ sessionId, currentUserId, isHost }: CompanionPanelProps) {
  const companionState = useGameStore((state) => state.companionState);
  const dispatch = useGameStore((state) => state.dispatch);
  const updateCompanion = useGameStore((state) => state.updateCompanion);
  const [isSummonOpen, setIsSummonOpen] = useState(false);
  const [summonDraft, setSummonDraft] = useState<SummonDraft>({
    name: 'Shadow Hound',
    type: 'beast',
    armorClass: 13,
    hitPoints: 16,
    speed: 40,
    attackDice: '1d6+2',
  });
  const [loyaltyNotes, setLoyaltyNotes] = useState<Record<string, string>>({});

  const companions = companionState.companions;
  const canManageRoom = Boolean(sessionId && currentUserId);
  const canSummon = canManageRoom && isHost;

  const summary = useMemo(() => {
    const active = companions.filter((item) => item.isActive).length;
    return `${active}/${companions.length} active`;
  }, [companions]);

  function submitSummon(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !currentUserId) return;

    const companion = createCompanion(currentUserId, summonDraft.name.trim(), summonDraft.type, {
      armorClass: Math.max(1, Math.floor(summonDraft.armorClass)),
      hitPoints: Math.max(1, Math.floor(summonDraft.hitPoints)),
      maxHitPoints: Math.max(1, Math.floor(summonDraft.hitPoints)),
      speed: Math.max(0, Math.floor(summonDraft.speed)),
      abilities: { str: 10, dex: 12, con: 10, int: 8, wis: 10, cha: 8 },
      attackDice: summonDraft.attackDice.trim() || '1d4+1',
      attackType: 'slashing',
      conditions: [],
    });

    dispatch({
      id: crypto.randomUUID(),
      type: 'COMPANION_SUMMON',
      sessionId,
      actorId: currentUserId,
      createdAt: toIsoNow(),
      source: 'user',
      companion,
    });
    setIsSummonOpen(false);
  }

  function dismissCompanion(companion: CompanionSheet) {
    if (!sessionId || !currentUserId) return;
    dispatch({
      id: crypto.randomUUID(),
      type: 'COMPANION_DISMISS',
      sessionId,
      actorId: currentUserId,
      createdAt: toIsoNow(),
      source: 'user',
      companionId: companion.id,
    });
  }

  function changeLoyalty(companion: CompanionSheet, delta: number) {
    if (!sessionId || !currentUserId) return;
    const reason = (loyaltyNotes[companion.id] ?? '').trim() || 'Table decision';
    dispatch({
      id: crypto.randomUUID(),
      type: 'COMPANION_LOYALTY_CHANGE',
      sessionId,
      actorId: currentUserId,
      createdAt: toIsoNow(),
      source: 'user',
      companionId: companion.id,
      delta,
      reason,
    });
  }

  function setBehavior(companion: CompanionSheet, behavior: CompanionBehavior) {
    updateCompanion({ ...companion, behavior });
  }

  function toggleActive(companion: CompanionSheet) {
    updateCompanion({ ...companion, isActive: !companion.isActive });
  }

  return (
    <section className="fw-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Room</p>
          <h2 className="fw-h2">Companions</h2>
        </div>
        <span className="fw-caption">{summary}</span>
      </div>

      {canSummon ? (
        <button className="fw-btn fw-btn--ghost" onClick={() => setIsSummonOpen((prev) => !prev)} type="button">
          <Plus aria-hidden="true" size={16} />
          Summon
        </button>
      ) : null}

      {isSummonOpen ? (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} onSubmit={submitSummon}>
          <div className="fw-field">
            <label className="fw-field__label">Name</label>
            <input
              className="fw-input"
              onChange={(event) => setSummonDraft((prev) => ({ ...prev, name: event.target.value }))}
              required
              value={summonDraft.name}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="fw-field">
              <label className="fw-field__label">Type</label>
              <select
                className="fw-select"
                onChange={(event) =>
                  setSummonDraft((prev) => ({
                    ...prev,
                    type: event.target.value as CompanionSheet['type'],
                  }))
                }
                value={summonDraft.type}
              >
                <option value="npc">NPC</option>
                <option value="beast">Beast</option>
                <option value="summon">Summon</option>
                <option value="hireling">Hireling</option>
              </select>
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Attack Dice</label>
              <input
                className="fw-input fw-input--mono"
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, attackDice: event.target.value }))}
                value={summonDraft.attackDice}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="fw-field">
              <label className="fw-field__label">AC</label>
              <input
                className="fw-input fw-input--mono"
                min={1}
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, armorClass: Number(event.target.value) || 1 }))}
                style={{ textAlign: 'center' }}
                type="number"
                value={summonDraft.armorClass}
              />
            </div>
            <div className="fw-field">
              <label className="fw-field__label">HP</label>
              <input
                className="fw-input fw-input--mono"
                min={1}
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, hitPoints: Number(event.target.value) || 1 }))}
                style={{ textAlign: 'center' }}
                type="number"
                value={summonDraft.hitPoints}
              />
            </div>
            <div className="fw-field">
              <label className="fw-field__label">Speed</label>
              <input
                className="fw-input fw-input--mono"
                min={0}
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, speed: Number(event.target.value) || 0 }))}
                style={{ textAlign: 'center' }}
                type="number"
                value={summonDraft.speed}
              />
            </div>
          </div>
          <button className="fw-btn fw-btn--primary" type="submit">
            <Plus aria-hidden="true" size={16} />
            Summon Companion
          </button>
        </form>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {companions.map((companion) => {
          const canControl = isHost || companion.ownerId === currentUserId;
          const hp = hpPercent(companion);
          const loyalty = clamp(companion.loyalty.current, 0, 100);
          return (
            <article className="fw-card" key={companion.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                <div>
                  <strong className="fw-body-sm">{companion.name}</strong>
                  <p className="fw-caption">{companion.type}</p>
                </div>
                <div className="fw-field" style={{ minWidth: '110px' }}>
                  <label className="fw-field__label">Behavior</label>
                  <select
                    className="fw-select"
                    disabled={!canControl}
                    onChange={(event) => setBehavior(companion, event.target.value as CompanionBehavior)}
                    value={companion.behavior}
                  >
                    {behaviorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-2)' }}>
                <span className="fw-caption">
                  <Heart size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  {companion.characterSnapshot.hitPoints}/{companion.characterSnapshot.maxHitPoints}
                </span>
                <span className="fw-caption">
                  <Shield size={12} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  AC {companion.characterSnapshot.armorClass}
                </span>
              </div>
              <div className="fw-hp" data-state={hpState(hp)} style={{ marginBottom: 'var(--sp-3)' }}>
                <div className="fw-hp__fill" style={{ width: `${hp}%` }} />
              </div>

              <div className="fw-loyalty" data-tier={loyaltyTier(companion.loyalty.tier)} style={{ marginBottom: 'var(--sp-3)' }}>
                <div className="fw-loyalty__row">
                  <span className="fw-loyalty__tier">{companion.loyalty.tier}</span>
                  <span className="fw-loyalty__value">{loyalty}/100</span>
                </div>
                <div className="fw-loyalty__track">
                  <div className="fw-loyalty__fill" style={{ width: `${loyalty}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <button className="fw-btn fw-btn--ghost fw-btn--sm" disabled={!canControl} onClick={() => toggleActive(companion)} type="button">
                  <UserRound size={14} aria-hidden="true" />
                  {companion.isActive ? 'Active' : 'Inactive'}
                </button>
                <button className="fw-btn fw-btn--danger fw-btn--sm" disabled={!canControl} onClick={() => dismissCompanion(companion)} type="button">
                  <X size={14} aria-hidden="true" />
                  Dismiss
                </button>
              </div>

              <div className="fw-field" style={{ marginBottom: 'var(--sp-2)' }}>
                <label className="fw-field__label">Loyalty reason</label>
                <input
                  className="fw-input"
                  disabled={!canControl}
                  onChange={(event) =>
                    setLoyaltyNotes((prev) => ({
                      ...prev,
                      [companion.id]: event.target.value,
                    }))
                  }
                  placeholder="Why did loyalty change?"
                  value={loyaltyNotes[companion.id] ?? ''}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <button className="fw-btn fw-btn--ghost fw-btn--sm" disabled={!canControl} onClick={() => changeLoyalty(companion, 10)} type="button">
                  + Loyalty
                </button>
                <button className="fw-btn fw-btn--ghost fw-btn--sm" disabled={!canControl} onClick={() => changeLoyalty(companion, -10)} type="button">
                  - Loyalty
                </button>
              </div>

              {companion.characterSnapshot.conditions.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {companion.characterSnapshot.conditions.map((condition) => (
                    <span className="fw-cond fw-cond--minor" key={`${companion.id}-${condition}`}>
                      <span className="fw-cond__dot" />
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="fw-caption">No active conditions.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

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

function loyaltyClass(tier: CompanionSheet['loyalty']['tier']) {
  if (tier === 'hostile') return 'hostile';
  if (tier === 'friendly') return 'friendly';
  if (tier === 'devoted') return 'devoted';
  return 'neutral';
}

function hpPercent(companion: CompanionSheet) {
  if (companion.characterSnapshot.maxHitPoints <= 0) return 0;
  return clamp(
    Math.round((companion.characterSnapshot.hitPoints / companion.characterSnapshot.maxHitPoints) * 100),
    0,
    100,
  );
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
    <section className="panel companion-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Room</p>
          <h2>Companions</h2>
        </div>
        <span className="status">{summary}</span>
      </div>

      {canSummon ? (
        <button className="secondary-button" onClick={() => setIsSummonOpen((prev) => !prev)} type="button">
          <Plus aria-hidden="true" size={16} />
          Summon
        </button>
      ) : null}

      {isSummonOpen ? (
        <form className="stack-form" onSubmit={submitSummon}>
          <label>
            Name
            <input
              onChange={(event) => setSummonDraft((prev) => ({ ...prev, name: event.target.value }))}
              required
              value={summonDraft.name}
            />
          </label>
          <div className="stepper-row">
            <label>
              Type
              <select
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
            </label>
            <label>
              Attack Dice
              <input
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, attackDice: event.target.value }))}
                value={summonDraft.attackDice}
              />
            </label>
          </div>
          <div className="stepper-row">
            <label>
              AC
              <input
                min={1}
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, armorClass: Number(event.target.value) || 1 }))}
                type="number"
                value={summonDraft.armorClass}
              />
            </label>
            <label>
              HP
              <input
                min={1}
                onChange={(event) => setSummonDraft((prev) => ({ ...prev, hitPoints: Number(event.target.value) || 1 }))}
                type="number"
                value={summonDraft.hitPoints}
              />
            </label>
          </div>
          <label>
            Speed
            <input
              min={0}
              onChange={(event) => setSummonDraft((prev) => ({ ...prev, speed: Number(event.target.value) || 0 }))}
              type="number"
              value={summonDraft.speed}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus aria-hidden="true" size={16} />
            Summon Companion
          </button>
        </form>
      ) : null}

      <div className="companion-list">
        {companions.map((companion) => {
          const canControl = isHost || companion.ownerId === currentUserId;
          const hp = hpPercent(companion);
          const loyalty = clamp(companion.loyalty.current, 0, 100);
          const loyaltyTierClass = loyaltyClass(companion.loyalty.tier);
          return (
            <article className="companion-card" key={companion.id}>
              <div className="companion-header">
                <div>
                  <strong>{companion.name}</strong>
                  <span>{companion.type}</span>
                </div>
                <label className="select-label">
                  <span>Behavior</span>
                  <select
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
                </label>
              </div>

              <div className="companion-hp-row">
                <span>
                  <Heart size={14} aria-hidden="true" /> HP {companion.characterSnapshot.hitPoints}/
                  {companion.characterSnapshot.maxHitPoints}
                </span>
                <span>
                  <Shield size={14} aria-hidden="true" /> AC {companion.characterSnapshot.armorClass}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill hp-fill" style={{ width: `${hp}%` }} />
              </div>

              <div className={`companion-loyalty ${loyaltyTierClass}`}>
                <span>Loyalty {loyalty}/100</span>
                <div className="progress-track">
                  <div className="progress-fill loyalty-fill" style={{ width: `${loyalty}%` }} />
                </div>
              </div>

              <div className="companion-controls">
                <button className="secondary-button" disabled={!canControl} onClick={() => toggleActive(companion)} type="button">
                  <UserRound size={14} aria-hidden="true" />
                  {companion.isActive ? 'Active' : 'Inactive'}
                </button>
                <button className="danger-button" disabled={!canControl} onClick={() => dismissCompanion(companion)} type="button">
                  <X size={14} aria-hidden="true" />
                  Dismiss
                </button>
              </div>

              <label>
                Loyalty reason
                <input
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
              </label>
              <div className="companion-controls">
                <button className="secondary-button" disabled={!canControl} onClick={() => changeLoyalty(companion, 10)} type="button">
                  + Loyalty
                </button>
                <button className="secondary-button" disabled={!canControl} onClick={() => changeLoyalty(companion, -10)} type="button">
                  - Loyalty
                </button>
              </div>

              {companion.characterSnapshot.conditions.length ? (
                <div className="condition-chips">
                  {companion.characterSnapshot.conditions.map((condition) => (
                    <span key={`${companion.id}-${condition}`}>{condition}</span>
                  ))}
                </div>
              ) : (
                <p className="form-message">No active conditions.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

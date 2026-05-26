import { useMemo, useState } from 'react';
import { Shield, Sparkles, Swords, Users } from 'lucide-react';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import { useGameStore } from '../../store/useGameStore';
import type { VaultCharacter } from '../../types';
import { WIcon } from './runVisuals';

type RunPosition = 1 | 2 | 3 | 4;

function hpText(character: VaultCharacter) {
  return `${character.hitPoints}/${character.maxHitPoints} HP`;
}

function firstOpenPosition(positions: Record<string, RunPosition>) {
  const used = new Set(Object.values(positions));
  return ([1, 2, 3, 4] as RunPosition[]).find((position) => !used.has(position)) ?? null;
}

function sortedParty(
  selectedIds: string[],
  positions: Record<string, RunPosition>,
  charactersById: Map<string, VaultCharacter>,
) {
  return selectedIds
    .map((id) => charactersById.get(id) ?? null)
    .filter((character): character is VaultCharacter => character !== null)
    .sort((a, b) => (positions[a.id] ?? 99) - (positions[b.id] ?? 99));
}

export function RunStartScreen() {
  const { permanentProgress, startRun, vaultCharacters } = useGameStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, RunPosition>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [startingRelic] = useState(() =>
    WARDEN_RUN_RELICS[Math.floor(Math.random() * WARDEN_RUN_RELICS.length)],
  );

  const charactersById = useMemo(
    () => new Map(vaultCharacters.map((character) => [character.id, character])),
    [vaultCharacters],
  );
  const selectedParty = useMemo(
    () => sortedParty(selectedIds, positions, charactersById),
    [charactersById, positions, selectedIds],
  );
  const canBegin = selectedIds.length === 4 && selectedIds.every((id) => positions[id]);
  const passiveBonuses = permanentProgress.passiveBonuses;

  function toggleCharacter(character: VaultCharacter) {
    if (selectedIds.includes(character.id)) {
      setSelectedIds((current) => current.filter((id) => id !== character.id));
      setPositions((current) => {
        const next = { ...current };
        delete next[character.id];
        return next;
      });
      setAssigningId((current) => (current === character.id ? null : current));
      return;
    }

    if (selectedIds.length >= 4) return;

    const openPosition = firstOpenPosition(positions);
    setSelectedIds((current) => [...current, character.id]);
    setAssigningId(character.id);
    if (openPosition) {
      setPositions((current) => ({
        ...current,
        [character.id]: openPosition,
      }));
    }
  }

  function assignPosition(position: RunPosition) {
    if (!assigningId || !selectedIds.includes(assigningId)) return;

    setPositions((current) => {
      const next = { ...current };
      for (const [characterId, assignedPosition] of Object.entries(next)) {
        if (assignedPosition === position) {
          delete next[characterId];
        }
      }
      next[assigningId] = position;
      return next;
    });
  }

  function beginRun() {
    if (!canBegin || !startingRelic) return;
    startRun({
      partyIds: selectedIds,
      positions,
      startingRelic: startingRelic.id,
    });
  }

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-stage">
        <section className="wr-scene" style={{ maxWidth: 1080 }}>
          <div className="wr-scene-inner">
            <div className="wr-eyebrow">WARDEN'S RUN</div>
            <h1 className="wr-title" style={{ marginBottom: 8 }}>WARDEN'S RUN</h1>
            <p className="wr-scene-text">Enter the Dungeon. Survive.</p>
            <div className="wr-rule">
              <span className="wr-rule-diamond" />
            </div>

            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)' }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <section className="wr-panel" style={{ padding: 18 }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="wr-eyebrow">Select Party</div>
                      <h2 className="wr-choice-title">4 characters from your vault</h2>
                    </div>
                    <span className="wr-tag">{selectedIds.length}/4 selected</span>
                  </div>

                  {vaultCharacters.length === 0 ? (
                    <div className="fw-card" style={{ alignItems: 'center', display: 'flex', gap: 10, marginTop: 14, padding: 18 }}>
                      <Users size={28} />
                      <span>Create characters first</span>
                    </div>
                  ) : (
                    <div className="wr-choice-list" style={{ marginTop: 14 }}>
                      {vaultCharacters.map((character) => {
                        const selected = selectedIds.includes(character.id);
                        const isAssigning = assigningId === character.id;
                        return (
                          <button
                            className="wr-choice"
                            key={character.id}
                            onClick={() => toggleCharacter(character)}
                            style={selected ? { borderColor: 'var(--wr-gold-deep)' } : undefined}
                            type="button"
                          >
                            <span className="wr-choice-mark">
                              {selected ? positions[character.id] ?? '?' : '+'}
                            </span>
                            <span className="wr-choice-body">
                              <span className="wr-choice-title">{character.name}</span>
                              <span className="wr-choice-desc">
                                Level {character.level} {character.ancestry} {character.className} · {hpText(character)}
                              </span>
                            </span>
                            {isAssigning && <span className="wr-tag">assigning</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="wr-panel" style={{ padding: 18 }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="wr-eyebrow">Positions</div>
                      <h2 className="wr-choice-title">Click a character, then assign rank</h2>
                    </div>
                    <Swords size={18} />
                  </div>
                  <div className="wr-treasure-cards" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 14 }}>
                    {([1, 2, 3, 4] as RunPosition[]).map((position) => {
                      const assigned = selectedParty.find((character) => positions[character.id] === position);
                      return (
                        <button
                          className={`wr-treasure-card ${assigned ? 'chosen' : ''}`}
                          disabled={!assigningId}
                          key={position}
                          onClick={() => assignPosition(position)}
                          type="button"
                        >
                          <span className="wr-item-rarity">POS {position}</span>
                          <strong>{assigned?.name ?? 'Open'}</strong>
                          <span className="wr-choice-desc">{assigned?.className ?? 'Select a hero'}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside style={{ display: 'grid', gap: 16 }}>
                <section className="wr-panel" style={{ padding: 18 }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="wr-eyebrow">Starting Relic</div>
                      <h2 className="wr-choice-title">{startingRelic.name}</h2>
                    </div>
                    {WIcon(startingRelic.icon ?? 'sparkles', { size: 24 })}
                  </div>
                  <div className="wr-treasure-card chosen" style={{ marginTop: 14 }}>
                    <span className="wr-item-rarity">{startingRelic.rarity}</span>
                    <strong>{startingRelic.name}</strong>
                    <span className="wr-choice-desc">{startingRelic.description}</span>
                  </div>
                </section>

                <section className="wr-panel" style={{ padding: 18 }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div className="wr-eyebrow">Warden Upgrades</div>
                      <h2 className="wr-choice-title">Permanent progress</h2>
                    </div>
                    <Shield size={18} />
                  </div>
                  <div className="wr-gold-display">
                    <span className="wr-gold-coin">+</span>
                    <span className="wr-gold-amount">{passiveBonuses.startingGold} gold</span>
                  </div>
                  <div className="wr-gold-display">
                    <Sparkles size={16} />
                    <span className="wr-gold-amount">+{passiveBonuses.startingHpBonus} HP per character</span>
                  </div>
                </section>

                <button
                  className="wr-btn wr-btn-gold wr-btn-lg"
                  disabled={!canBegin}
                  onClick={beginRun}
                  type="button"
                >
                  BEGIN RUN
                </button>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import type { RunRelic } from '../../engine/run/runTypes';
import { useGameStore } from '../../store/useGameStore';
import type { VaultCharacter } from '../../types';
import { PortraitArt, WIcon } from './runVisuals';

type AssemblyPosition = 1 | 2 | 3 | 4;
type PositionMap = Record<AssemblyPosition, string | null>;

const POSITION_LABELS: Array<{ n: AssemblyPosition; title: string; desc: string }> = [
  { n: 1, title: 'Vanguard', desc: 'melee front' },
  { n: 2, title: 'Flanker', desc: 'melee/ranged' },
  { n: 3, title: 'Support', desc: 'ranged/heal' },
  { n: 4, title: 'Rear', desc: 'ranged/magic' },
];

const FALLBACK_RELIC: RunRelic = {
  id: 'fallback_relic',
  name: 'Unlit Censer',
  description: 'A quiet charm. The vault has not offered its true relics.',
  effect: 'none',
  icon: 'sparkles',
  rarity: 'common',
};

function hpText(character: VaultCharacter) {
  return `HP ${character.hitPoints}/${character.maxHitPoints}`;
}

function classText(character: VaultCharacter) {
  return `${character.className} Lv${character.level}`;
}

function firstOpenSlot(positions: PositionMap): AssemblyPosition | null {
  return POSITION_LABELS.find((position) => !positions[position.n])?.n ?? null;
}

function getCharacterInitial(character: VaultCharacter) {
  return character.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AssemblyScreen() {
  const { permanentProgress, startRun, vaultCharacters } = useGameStore();
  const [positions, setPositions] = useState<PositionMap>({ 1: null, 2: null, 3: null, 4: null });
  const [activeSlot, setActiveSlot] = useState<AssemblyPosition | null>(null);
  const [startingRelic] = useState<RunRelic>(() =>
    WARDEN_RUN_RELICS[Math.floor(Math.random() * WARDEN_RUN_RELICS.length)] ?? FALLBACK_RELIC,
  );

  const assignedIds = useMemo(
    () => new Set(Object.values(positions).filter((id): id is string => Boolean(id))),
    [positions],
  );
  const charactersById = useMemo(
    () => new Map(vaultCharacters.map((character) => [character.id, character])),
    [vaultCharacters],
  );
  const selectedCharacters = useMemo(
    () => Object.values(positions)
      .map((id) => (id ? charactersById.get(id) ?? null : null))
      .filter((character): character is VaultCharacter => Boolean(character)),
    [charactersById, positions],
  );
  const isReady = selectedCharacters.length >= 1;
  const passiveBonuses = permanentProgress.passiveBonuses;
  const totalHp = selectedCharacters.reduce((sum, character) => sum + character.maxHitPoints + passiveBonuses.startingHpBonus, 0);
  const activeUpgrades = [
    passiveBonuses.startingGold > 0 ? { icon: 'coin', name: `+${passiveBonuses.startingGold} Starting Gold`, desc: 'The dead leave what they carried.' } : null,
    passiveBonuses.startingHpBonus > 0 ? { icon: 'heart', name: `+${passiveBonuses.startingHpBonus} HP per character`, desc: 'Old scars harden into ritual armor.' } : null,
    passiveBonuses.startingItems > 0 ? { icon: 'scroll', name: `+${passiveBonuses.startingItems} Starting Item`, desc: 'Prepared hands enter darkness first.' } : null,
    passiveBonuses.shopDiscount > 0 ? { icon: 'coin', name: `${passiveBonuses.shopDiscount}% Shop Discount`, desc: 'Even doomed merchants honor reputation.' } : null,
  ].filter((upgrade): upgrade is { icon: string; name: string; desc: string } => Boolean(upgrade));

  function openSlot(position: AssemblyPosition) {
    setActiveSlot(position);
  }

  function assignCharacter(characterId: string) {
    const targetSlot = activeSlot ?? firstOpenSlot(positions);
    if (!targetSlot || assignedIds.has(characterId)) return;
    setPositions((current) => ({
      ...current,
      [targetSlot]: characterId,
    }));
    setActiveSlot(null);
  }

  function removeCharacter(position: AssemblyPosition) {
    setPositions((current) => ({
      ...current,
      [position]: null,
    }));
    setActiveSlot(position);
  }

  function beginRun() {
    if (!isReady) return;
    const partyIds = Object.values(positions).filter((id): id is string => Boolean(id));
    const positionMap = Object.entries(positions).reduce<Record<string, AssemblyPosition>>((acc, [position, characterId]) => {
      if (!characterId) return acc;
      acc[characterId] = Number(position) as AssemblyPosition;
      return acc;
    }, {});

    startRun({
      partyIds,
      positions: positionMap,
      startingRelic: startingRelic.id,
    });
  }

  return (
    <div className="wr-app">
      <div className="wr-atmos" />
      <div className="wr-noise" />
      <div className="wr-vignette" />

      <main className="wr-stage">
        <section className="wr-scene">
          <div className="wr-scene-inner" style={{ maxWidth: 1100 }}>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>Bind your wardens before the dark.</div>
              <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 28, letterSpacing: '0.14em', color: 'var(--wr-bone)', marginTop: 4, textTransform: 'uppercase' }}>
                Party Assembly
              </div>
              <div className="wr-rule" style={{ maxWidth: 280, margin: '10px auto 16px' }}><span className="wr-rule-diamond" /></div>
            </div>

            <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Positions</div>
            <div className="wr-asm-line">
              {POSITION_LABELS.map((position) => {
                const characterId = positions[position.n];
                const character = characterId ? charactersById.get(characterId) ?? null : null;
                return (
                  <div key={position.n} className="wr-asm-slot" data-pos={position.n}>
                    <div className="wr-asm-slot-num">POS {position.n}</div>
                    {character ? (
                      <>
                        <div className="wr-asm-portrait">
                          <PortraitArt kind={character.className} color={position.n === 1 ? '#B8860B' : '#9B5DE5'} />
                        </div>
                        <div className="wr-asm-name">{character.name}</div>
                        <div className="wr-asm-class">{classText(character)}</div>
                        <div className="wr-asm-pos-title">{position.title}</div>
                        <div className="wr-asm-pos-desc">{hpText(character)}</div>
                        <button className="wr-btn wr-btn-sm wr-btn-ghost" type="button" onClick={() => removeCharacter(position.n)} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                          {WIcon('x', { size: 10 })} Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="wr-asm-portrait" style={{ display: 'grid', placeItems: 'center', color: 'var(--wr-text-3)' }}>
                          {WIcon('plus', { size: 28 })}
                        </div>
                        <div className="wr-asm-name">{position.title}</div>
                        <div className="wr-asm-class">{position.desc}</div>
                        <div className="wr-asm-pos-title">Empty</div>
                        <div className="wr-asm-pos-desc">Choose a warden.</div>
                        <button className="wr-btn wr-btn-sm wr-btn-violet" type="button" onClick={() => openSlot(position.n)} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                          {WIcon('plus', { size: 10 })} Add
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="wr-panel" style={{ marginTop: 14, padding: 14 }}>
              <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div className="wr-eyebrow">Your Wardens</div>
                  <div style={{ color: 'var(--wr-text-3)', fontFamily: 'var(--wr-f-body)', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>
                    {activeSlot ? `Choose a character for position ${activeSlot}.` : 'Click a slot, then bind a character from your vault.'}
                  </div>
                </div>
                <span className="wr-tag">{selectedCharacters.length}/4 bound</span>
              </div>

              {permanentProgress.unlockedClasses.length > 0 && (
                <div style={{ color: 'var(--wr-violet-bright)', fontFamily: 'var(--wr-f-body)', fontSize: 12, fontStyle: 'italic', marginBottom: 10 }}>
                  More classes available in Warden's Vault.
                </div>
              )}

              {vaultCharacters.length === 0 ? (
                <div className="wr-narration" style={{ margin: 0, fontSize: 14 }}>No wardens in the vault yet.</div>
              ) : (
                <div className="wr-bind-grid" style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                  {vaultCharacters.map((character) => {
                    const assigned = assignedIds.has(character.id);
                    const canAssign = Boolean(activeSlot) && !assigned;
                    return (
                      <button
                        key={character.id}
                        className={`wr-bind-card ${assigned ? 'selected' : ''}`}
                        type="button"
                        disabled={!canAssign}
                        onClick={() => assignCharacter(character.id)}
                        style={!canAssign && !assigned ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                      >
                        <div className="wr-bind-portrait">
                          {character.portraitUrl ? (
                            <img src={character.portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <PortraitArt kind={character.className} color={assigned ? '#B8860B' : '#9B5DE5'} />
                          )}
                        </div>
                        <div className="wr-bind-name">{character.name}</div>
                        <div className="wr-bind-class">{classText(character)}</div>
                        <div className="wr-bind-stats">
                          <span>{getCharacterInitial(character)}</span>
                          <span>{hpText(character)}</span>
                        </div>
                        {assigned && <span className="wr-chip" style={{ marginTop: 8 }}>Bound</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="wr-asm-grid">
              <div className="wr-panel wr-asm-relic">
                <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
                <div className="wr-eyebrow" style={{ color: 'var(--wr-gold-bright)' }}>Starting Relic</div>
                <div className="wr-asm-relic-card">
                  <div className="wr-asm-relic-icon">{WIcon(startingRelic.icon ?? 'sparkles', { size: 28 })}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 14, letterSpacing: '0.10em', color: 'var(--wr-bone)' }}>{startingRelic.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--wr-violet-bright)', letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'var(--wr-f-head)', marginTop: 2 }}>
                      {startingRelic.rarity ?? 'relic'}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--wr-text-2)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.45 }}>
                      {startingRelic.description}
                    </div>
                  </div>
                </div>
              </div>

              <div className="wr-panel" style={{ padding: 14 }}>
                <div className="wr-eyebrow" style={{ color: 'var(--wr-violet-bright)', marginBottom: 8 }}>Warden Upgrades Active</div>
                {activeUpgrades.length ? activeUpgrades.map((upgrade) => (
                  <div key={upgrade.name} className="wr-up-row">
                    <div className="wr-up-ic">{WIcon(upgrade.icon, { size: 14 })}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 12, letterSpacing: '0.08em', color: 'var(--wr-bone)' }}>{upgrade.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>{upgrade.desc}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--wr-text-3)', fontStyle: 'italic' }}>No permanent upgrades active.</div>
                )}
              </div>

              <div className="wr-panel" style={{ padding: 14 }}>
                <div className="wr-eyebrow" style={{ marginBottom: 8 }}>Party Summary</div>
                <div style={{ fontSize: 13, color: 'var(--wr-text-2)', lineHeight: 1.5 }}>
                  <div><b style={{ color: 'var(--wr-bone)' }}>Wardens</b> <span style={{ fontFamily: 'var(--wr-f-mono)', color: 'var(--wr-gold-bright)' }}>{selectedCharacters.length}</span></div>
                  <div><b style={{ color: 'var(--wr-bone)' }}>Total HP</b> <span style={{ fontFamily: 'var(--wr-f-mono)', color: 'var(--wr-blood-bright)' }}>{totalHp}</span></div>
                  <div><b style={{ color: 'var(--wr-bone)' }}>Gold</b> <span style={{ fontFamily: 'var(--wr-f-mono)', color: 'var(--wr-gold-bright)' }}>{50 + passiveBonuses.startingGold}g</span></div>
                  <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--wr-text-3)' }}>
                    {isReady ? 'The line is set. The first stratum waits.' : 'Bind at least one warden to begin.'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="wr-btn wr-btn-gold wr-btn-lg" type="button" disabled={!isReady} onClick={beginRun}>
                {WIcon('compass', { size: 14 })} Begin Run {WIcon('chevR', { size: 12 })}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AssemblyScreen;

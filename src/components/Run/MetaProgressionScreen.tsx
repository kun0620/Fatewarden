import { useMemo, useState } from 'react';
import { classes as CLASSES } from '../../data/classes';
import { WARDEN_RUN_RELICS } from '../../data/relics';
import { floor1Enemies, floor2Enemies, floor3Enemies, bossEnemies, type RunEnemy } from '../../data/enemies';
import { supabase } from '../../lib/supabase';
import { useGameStore } from '../../store/useGameStore';
import type { PermanentProgress } from '../../engine/run/runTypes';
import { WIcon, PortraitArt } from './runVisuals';

type VaultTab = 'classes' | 'relics' | 'upgrades' | 'bestiary';

type ProgressWithBestiary = PermanentProgress & {
  unlockedBestiary?: string[];
};

type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  isUnlocked: (progress: PermanentProgress) => boolean;
  apply: (progress: PermanentProgress) => PermanentProgress;
};

const TABS: { id: VaultTab; label: string; icon: string; blurb: string }[] = [
  { id: 'classes', label: 'Classes', icon: 'star', blurb: 'Unlock new wardens to bind.' },
  { id: 'relics', label: 'Relics', icon: 'rune', blurb: 'Expand the relic pool for shops and treasure.' },
  { id: 'upgrades', label: 'Upgrades', icon: 'anvil', blurb: 'Permanent bonuses for every future run.' },
  { id: 'bestiary', label: 'Bestiary', icon: 'skull', blurb: 'Lore of every foe you have faced.' },
];

const PASSIVE_UPGRADES: UpgradeDefinition[] = [
  {
    id: 'starting_gold_10',
    name: '+10 Starting Gold',
    description: 'Begin every run with a heavier purse.',
    icon: 'coin',
    cost: 50,
    isUnlocked: (progress) => progress.passiveBonuses.startingGold >= 10,
    apply: (progress) => ({
      ...progress,
      passiveBonuses: { ...progress.passiveBonuses, startingGold: Math.max(progress.passiveBonuses.startingGold, 10) },
    }),
  },
  {
    id: 'starting_hp_5',
    name: '+5 HP per Character',
    description: 'Each bound warden starts future runs with extra grit.',
    icon: 'heart',
    cost: 75,
    isUnlocked: (progress) => progress.passiveBonuses.startingHpBonus >= 5,
    apply: (progress) => ({
      ...progress,
      passiveBonuses: { ...progress.passiveBonuses, startingHpBonus: Math.max(progress.passiveBonuses.startingHpBonus, 5) },
    }),
  },
  {
    id: 'starting_item_1',
    name: '+1 Starting Item',
    description: 'The party begins with one extra supply from the vault.',
    icon: 'scroll',
    cost: 100,
    isUnlocked: (progress) => progress.passiveBonuses.startingItems >= 1,
    apply: (progress) => ({
      ...progress,
      passiveBonuses: { ...progress.passiveBonuses, startingItems: Math.max(progress.passiveBonuses.startingItems, 1) },
    }),
  },
  {
    id: 'shop_discount_10',
    name: 'Shop Discount 10%',
    description: 'Merchants recognize the seal and lower their prices.',
    icon: 'coin',
    cost: 120,
    isUnlocked: (progress) => progress.passiveBonuses.shopDiscount >= 10,
    apply: (progress) => ({
      ...progress,
      passiveBonuses: { ...progress.passiveBonuses, shopDiscount: Math.max(progress.passiveBonuses.shopDiscount, 10) },
    }),
  },
  {
    id: 'extra_rest_option',
    name: 'Extra Rest Option',
    description: 'Campfires reveal one additional recovery choice.',
    icon: 'moon',
    cost: 80,
    isUnlocked: (progress) => progress.unlockedItems.includes('extra_rest_option'),
    apply: (progress) => ({
      ...progress,
      unlockedItems: progress.unlockedItems.includes('extra_rest_option')
        ? progress.unlockedItems
        : [...progress.unlockedItems, 'extra_rest_option'],
    }),
  },
];

const ENEMY_POOL: RunEnemy[] = [...floor1Enemies, ...floor2Enemies, ...floor3Enemies, ...bossEnemies];

function rankLabel(points: number) {
  if (points >= 2500) return 'Nightmare';
  if (points >= 1000) return 'Keeper';
  if (points >= 400) return 'Warden';
  return 'Apprentice';
}

function canAfford(progress: PermanentProgress, cost: number) {
  return progress.wardenPoints >= cost;
}

async function saveProgress(userId: string | null, progress: PermanentProgress) {
  if (!userId || userId === 'local' || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ warden_progress: progress })
    .eq('id', userId);
  if (error) throw error;
}

interface MetaProgressionScreenProps {
  onBack?: () => void;
}

export function MetaProgressionScreen({ onBack }: MetaProgressionScreenProps) {
  const { currentUserId, permanentProgress, setPermanentProgress } = useGameStore();
  const [tab, setTab] = useState<VaultTab>('classes');
  const [message, setMessage] = useState('');
  const unlockedBestiary = (permanentProgress as ProgressWithBestiary).unlockedBestiary ?? [];
  const totalUnlockCount = useMemo(
    () => ({
      classes: CLASSES.length,
      relics: WARDEN_RUN_RELICS.length,
      upgrades: PASSIVE_UPGRADES.length,
      bestiary: ENEMY_POOL.length,
    }),
    [],
  );

  async function commitProgress(nextProgress: PermanentProgress, successMessage: string) {
    setPermanentProgress(nextProgress);
    setMessage(successMessage);
    try {
      await saveProgress(currentUserId ?? permanentProgress.userId, nextProgress);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save Warden progress.');
    } finally {
      window.setTimeout(() => setMessage(''), 2200);
    }
  }

  async function unlockClass(classId: string, cost: number) {
    if (!canAfford(permanentProgress, cost) || permanentProgress.unlockedClasses.includes(classId)) return;
    await commitProgress({
      ...permanentProgress,
      wardenPoints: permanentProgress.wardenPoints - cost,
      unlockedClasses: [...permanentProgress.unlockedClasses, classId],
    }, 'Class unlocked.');
  }

  async function unlockRelic(relicId: string, cost: number) {
    if (!canAfford(permanentProgress, cost) || permanentProgress.unlockedRelics.includes(relicId)) return;
    await commitProgress({
      ...permanentProgress,
      wardenPoints: permanentProgress.wardenPoints - cost,
      unlockedRelics: [...permanentProgress.unlockedRelics, relicId],
    }, 'Relic unlocked.');
  }

  async function unlockUpgrade(upgrade: UpgradeDefinition) {
    if (!canAfford(permanentProgress, upgrade.cost) || upgrade.isUnlocked(permanentProgress)) return;
    await commitProgress({
      ...upgrade.apply(permanentProgress),
      wardenPoints: permanentProgress.wardenPoints - upgrade.cost,
    }, 'Upgrade unlocked.');
  }

  return (
    <div className="wr-scene">
      <div className="wr-scene-inner" style={{ maxWidth: 1180 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={onBack} type="button">
              {WIcon('chevL', { size: 11 })} Back
            </button>
          )}
          <div className="wr-eyebrow">Hearth · Meta Progression</div>
        </div>

        <div className="wr-vault-hero">
          <div style={{ flex: 1 }}>
            <div className="wr-eyebrow" style={{ color: 'var(--wr-violet-bright)' }}>WARDEN'S VAULT</div>
            <div style={{ fontFamily: 'var(--wr-f-head)', fontSize: 32, letterSpacing: '0.14em', color: 'var(--wr-bone)', margin: '6px 0 4px' }}>
              Spend the dead's worth.
            </div>
            <div style={{ fontFamily: 'var(--wr-f-body)', fontStyle: 'italic', color: 'var(--wr-text-2)', fontSize: 14, maxWidth: 540, lineHeight: 1.5 }}>
              Convert Warden Points into permanent unlocks: classes, relic pools, field upgrades, and lore from the creatures that survived your memory.
            </div>
          </div>
          <div className="wr-vault-wp">
            <div className="wr-eyebrow" style={{ fontSize: 9 }}>Warden Points</div>
            <div className="wr-vault-wp-num">{permanentProgress.wardenPoints.toLocaleString()}</div>
            <div className="wr-vault-wp-foot">{rankLabel(permanentProgress.totalPoints)} · {permanentProgress.totalPoints.toLocaleString()} WP total</div>
          </div>
        </div>

        <div className="wr-vault-tabs">
          {TABS.map((item) => (
            <button key={item.id} className={`wr-vault-tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)} type="button">
              <span style={{ color: tab === item.id ? 'var(--wr-gold-bright)' : 'var(--wr-text-3)' }}>{WIcon(item.icon, { size: 14 })}</span>
              {item.label}
              <span className="wr-vault-tab-count">{totalUnlockCount[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="wr-vault-blurb">{TABS.find((item) => item.id === tab)?.blurb}</div>

        {message && <div className="wr-chip gold" style={{ marginBottom: 10 }}>{message}</div>}

        {tab === 'classes' && (
          <div className="wr-vault-grid">
            {CLASSES.map((classItem) => {
              const unlocked = permanentProgress.unlockedClasses.includes(classItem.id);
              const cost = 150;
              return (
                <div className={`wr-vault-unlock ${unlocked ? 'owned' : canAfford(permanentProgress, cost) ? 'ready' : 'locked'}`} key={classItem.id}>
                  <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
                  <div className="wr-vault-unlock-ic">{WIcon(unlocked ? 'star' : 'lock', { size: 22 })}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wr-vault-unlock-name">{classItem.name}</div>
                    <div className="wr-vault-unlock-desc">{classItem.description}</div>
                  </div>
                  <div className="wr-vault-unlock-cta">
                    {unlocked ? <span className="wr-chip good" style={{ fontSize: 8 }}>{WIcon('check', { size: 10 })} Unlocked</span> : (
                      <>
                        <div className={`wr-vault-cost ${canAfford(permanentProgress, cost) ? '' : 'dim'}`}>
                          <span className="wr-vault-cost-num">{cost}</span><span className="wr-vault-cost-unit">WP</span>
                        </div>
                        <button className="wr-btn wr-btn-sm wr-btn-violet" disabled={!canAfford(permanentProgress, cost)} onClick={() => void unlockClass(classItem.id, cost)} type="button">
                          Unlock
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'relics' && (
          <div className="wr-vault-grid">
            {WARDEN_RUN_RELICS.map((relic) => {
              const unlocked = permanentProgress.unlockedRelics.includes(relic.id);
              const cost = relic.rarity === 'legendary' ? 250 : relic.rarity === 'rare' ? 180 : 120;
              return (
                <div className={`wr-vault-unlock ${unlocked ? 'owned' : canAfford(permanentProgress, cost) ? 'ready' : 'locked'}`} key={relic.id}>
                  <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
                  <div className="wr-vault-unlock-ic">{WIcon(relic.icon ?? 'rune', { size: 22 })}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wr-vault-unlock-name">{unlocked ? relic.name : '??? Relic'}</div>
                    <div className="wr-vault-unlock-desc">{unlocked ? relic.effect : 'A sealed relic waits beneath old ash.'}</div>
                  </div>
                  <div className="wr-vault-unlock-cta">
                    {unlocked ? <span className="wr-chip good" style={{ fontSize: 8 }}>{WIcon('check', { size: 10 })} Unlocked</span> : (
                      <>
                        <div className={`wr-vault-cost ${canAfford(permanentProgress, cost) ? '' : 'dim'}`}>
                          <span className="wr-vault-cost-num">{cost}</span><span className="wr-vault-cost-unit">WP</span>
                        </div>
                        <button className="wr-btn wr-btn-sm wr-btn-violet" disabled={!canAfford(permanentProgress, cost)} onClick={() => void unlockRelic(relic.id, cost)} type="button">
                          Unlock
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'upgrades' && (
          <div className="wr-vault-grid">
            {PASSIVE_UPGRADES.map((upgrade) => {
              const unlocked = upgrade.isUnlocked(permanentProgress);
              return (
                <div className={`wr-vault-unlock ${unlocked ? 'owned' : canAfford(permanentProgress, upgrade.cost) ? 'ready' : 'locked'}`} key={upgrade.id}>
                  <div className="wr-corn tl" /><div className="wr-corn tr" /><div className="wr-corn bl" /><div className="wr-corn br" />
                  <div className="wr-vault-unlock-ic">{WIcon(upgrade.icon, { size: 22 })}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wr-vault-unlock-name">{upgrade.name}</div>
                    <div className="wr-vault-unlock-desc">{upgrade.description}</div>
                  </div>
                  <div className="wr-vault-unlock-cta">
                    {unlocked ? <span className="wr-chip good" style={{ fontSize: 8 }}>{WIcon('check', { size: 10 })} Unlocked</span> : (
                      <>
                        <div className={`wr-vault-cost ${canAfford(permanentProgress, upgrade.cost) ? '' : 'dim'}`}>
                          <span className="wr-vault-cost-num">{upgrade.cost}</span><span className="wr-vault-cost-unit">WP</span>
                        </div>
                        <button className="wr-btn wr-btn-sm wr-btn-violet" disabled={!canAfford(permanentProgress, upgrade.cost)} onClick={() => void unlockUpgrade(upgrade)} type="button">
                          Unlock
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'bestiary' && (
          <div className="wr-vault-grid">
            {ENEMY_POOL.map((enemy) => {
              const unlocked = unlockedBestiary.includes(enemy.id);
              return (
                <div className={`wr-vault-unlock ${unlocked ? 'owned' : 'locked'}`} key={enemy.id}>
                  <div className="wr-vault-unlock-ic">
                    {unlocked ? <PortraitArt kind={enemy.id} color={enemy.color ?? '#9B5DE5'} /> : WIcon('skull', { size: 22 })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wr-vault-unlock-name">{unlocked ? enemy.name : '???'}</div>
                    <div className="wr-vault-unlock-desc">
                      {unlocked
                        ? `${enemy.behavior} foe · AC ${enemy.ac} · ${enemy.attacks[0]?.name ?? 'Unknown attack'}`
                        : 'A silhouette in the chronicle. Face it in a run to reveal its lore.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetaProgressionScreen;

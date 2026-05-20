import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { applyLongRest, applyShortRest } from '../engine/character/rest';
import { recalculateCharacter } from '../lib/characterDerived';
import { canLevelUp } from '../lib/characterProgression';
import { listVaultCharacters, saveVaultCharacter } from '../lib/characters';
import { abilityLabels, abilityModifier, formatModifier, skillAbilityMap } from '../lib/rules';
import type { AbilityKey, Character, Item, SpellSlotState, VaultCharacter } from '../types';
import { CharacterSheetView } from './CharacterSheetView';
import { LevelUpModal } from './LevelUpModal';
import { Icon } from './ui/Icons';

type CharacterSheetPageProps = {
  user: User;
  onBack: () => void;
};

type TabId = 'skills' | 'features' | 'spells' | 'items' | 'lore';

const abilityOrder: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const shortAbilityLabels: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const sgn = formatModifier;

function Card({
  children,
  elev,
  className = '',
  style,
}: {
  children: ReactNode;
  elev?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`fw-card ${elev ? 'fw-card-elev' : ''} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

function CardHead({ icon, title, right }: { icon: string; title: string; right?: ReactNode }) {
  return (
    <div className="fw-card-head">
      {Icon(icon, { size: 16 })}
      <h3>{title}</h3>
      {right ? <div style={{ marginLeft: 'auto' }}>{right}</div> : null}
    </div>
  );
}

function LockedBadge({ text = 'Coming soon' }: { text?: string }) {
  return (
    <span className="fw-pill dim" style={{ fontSize: 9, textTransform: 'uppercase' }}>
      {text}
    </span>
  );
}

function disabledReason(enabled: boolean, reason: string) {
  return enabled ? undefined : reason;
}

function VitalTile({
  label,
  value,
  sub,
  small,
  gold,
}: {
  label: string;
  value: string;
  sub: string;
  small?: boolean;
  gold?: boolean;
}) {
  return (
    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: '10px 8px', textAlign: 'center' }}>
      <div className="fw-eyebrow" style={{ fontSize: small ? 8.5 : 9.5, marginBottom: 4 }}>{label}</div>
      <div className="fw-display" style={{ fontSize: small ? 18 : 22, color: gold ? 'var(--gold-bright)' : 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2, fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>{sub}</div>
    </div>
  );
}

function ResourceBar({
  label,
  cur,
  max,
  color,
  diamond,
}: {
  label: string;
  cur: number;
  max: number;
  color: 'gold' | 'arcane';
  diamond?: boolean;
}) {
  const safeMax = Math.max(1, max);
  const safeCur = Math.max(0, Math.min(cur, safeMax));

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--text-2)' }}>{safeCur} / {safeMax}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: safeMax }).map((_, index) => {
          const active = index < safeCur;
          return (
            <span
              key={index}
              style={{
                flex: 1,
                height: 10,
                borderRadius: diamond ? 0 : 3,
                transform: diamond ? 'skewX(-25deg)' : 'none',
                background: active
                  ? color === 'arcane'
                    ? 'linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))'
                    : 'linear-gradient(180deg, var(--gold-bright), var(--gold-deep))'
                  : 'var(--bg-deep)',
                border: `1px solid ${active ? (color === 'arcane' ? 'var(--arcane)' : 'var(--gold-deep)') : 'var(--border-soft)'}`,
                boxShadow: active ? (color === 'arcane' ? '0 0 4px rgba(124,58,237,0.5)' : '0 0 4px rgba(214,168,79,0.4)') : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RpLine({ label, text }: { label: string; text?: string }) {
  return (
    <div>
      <div className="fw-eyebrow" style={{ fontSize: 9.5, color: 'var(--gold)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>{text ? `"${text}"` : 'Not written yet.'}</div>
    </div>
  );
}

function formatUpdatedAt(value?: string) {
  if (!value) return 'never saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'saved recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsFor(character: Character, user: User) {
  const fromName = character.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  return (fromName || user.email?.slice(0, 2) || 'FW').toUpperCase();
}

function itemIcon(item: Item) {
  if (item.category === 'weapon') return 'sword';
  if (item.category === 'armor') return 'shield';
  if (item.category === 'consumable') return 'potion';
  if (item.category === 'quest') return 'sparkles';
  if (item.category === 'tool') return 'cog';
  return 'bag';
}

function itemTag(item: Item) {
  if (item.weapon) {
    const range = item.weapon.rangeNormal ? ` / ${item.weapon.rangeNormal}${item.weapon.rangeLong ? `/${item.weapon.rangeLong}` : ''} ft` : '';
    return `${item.weapon.damageDice} ${item.weapon.damageType}${range}`;
  }
  if (item.armor) return `AC ${item.armor.baseAC}${item.armor.type === 'shield' ? ' shield' : ''}`;
  return item.description || item.category;
}

function SheetItem({ item }: { item: Item }) {
  const special = item.rarity !== 'common' || item.attuned || item.attunement;
  const lore = item.category === 'quest';

  return (
    <div style={{ display: 'flex', gap: 10, padding: 10, marginBottom: 4, background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 5, alignItems: 'center' }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: special ? 'rgba(214,168,79,0.10)' : lore ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.025)',
          border: `1px solid ${special ? 'var(--gold-deep)' : lore ? 'rgba(124,58,237,0.4)' : 'var(--border-soft)'}`,
          display: 'grid',
          placeItems: 'center',
          color: special ? 'var(--gold-bright)' : lore ? 'var(--arcane-bright)' : 'var(--text-3)',
          flexShrink: 0,
        }}
      >
        {Icon(itemIcon(item), { size: 12 })}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{item.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{itemTag(item)}</div>
      </div>
      {item.quantity > 1 ? <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-2)' }}>x{item.quantity}</span> : null}
      {item.equipped ? <span className="fw-pill" style={{ fontSize: 9 }}>Equipped</span> : null}
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
        <div className="fw-display" style={{ fontSize: 18, color: 'var(--text)' }}>{title}</div>
        <p className="fw-serif" style={{ margin: '8px auto 0', maxWidth: 420, fontStyle: 'italic' }}>{text}</p>
      </div>
    </Card>
  );
}

function SkillsPanel({ character }: { character: Character }) {
  const derived = character.systemData.derivedStats;
  const skillRows = Object.entries(skillAbilityMap).map(([name, ability]) => ({
    name,
    ability,
    mod: derived?.skillBonuses?.[name] ?? abilityModifier(character.abilities[ability]),
    proficient: character.skills.some((skill) => skill.toLowerCase() === name.toLowerCase()),
  }));

  return (
    <Card>
      <CardHead
        icon="eye"
        title="Skills"
        right={<span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>filled = proficient <LockedBadge /></span>}
      />
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        {skillRows.map(({ name, ability, mod, proficient }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px dashed var(--border-soft)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 50, border: `1px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: proficient ? 'var(--text)' : 'var(--text-2)', flex: 1 }}>{name}</span>
            <span style={{ fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.1em' }}>{shortAbilityLabels[ability]}</span>
            <span className="fw-mono" style={{ fontSize: 13, color: proficient ? 'var(--gold-bright)' : 'var(--text-2)', minWidth: 28, textAlign: 'right' }}>{sgn(mod)}</span>
            <button
              className="fw-btn fw-btn-ghost fw-btn-sm"
              disabled
              title="Dice rolling from the character sheet is not wired yet."
              type="button"
              style={{ padding: '2px 6px' }}
            >
              {Icon('dice', { size: 10 })}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeaturesPanel({ character }: { character: Character }) {
  const groups = [
    { kind: 'Race', values: [character.ancestry, character.subrace].filter(Boolean) as string[] },
    { kind: 'Class', values: character.features },
    { kind: 'Proficiency', values: character.proficiencies },
  ].flatMap((group) => group.values.map((value) => ({ kind: group.kind, name: value })));

  if (!groups.length) {
    return <EmptyPanel title="No features recorded" text="Edit the sheet to add racial traits, class features, and proficiencies." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map((feature, index) => (
        <Card key={`${feature.kind}-${feature.name}-${index}`} style={{ borderColor: feature.kind === 'Class' ? 'rgba(214,168,79,0.3)' : 'var(--border-soft)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12 }}>
            <span className="fw-pill" style={{ height: 'fit-content', marginTop: 2 }}>{feature.kind}</span>
            <div style={{ flex: 1 }}>
              <div className="fw-display" style={{ fontSize: 14, color: feature.kind === 'Class' ? 'var(--gold-bright)' : 'var(--text)', marginBottom: 4 }}>{feature.name}</div>
              <div className="fw-serif" style={{ fontSize: 13.5, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.55 }}>
                Recorded on this character. Use Edit Sheet to refine the rules text.
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SpellsPanel({ character }: { character: Character }) {
  const spells = character.spellsKnown?.length ? character.spellsKnown : character.spells;
  const slots = Object.entries(character.spellSlots ?? {})
    .map(([level, state]) => [Number(level), state] as [number, SpellSlotState])
    .filter(([, state]) => state.max > 0)
    .sort(([a], [b]) => a - b);
  const spellSaveDC = character.systemData.derivedStats?.spellSaveDC;
  const spellAttackBonus = character.systemData.derivedStats?.spellAttackBonus;
  const castReason = 'Spell casting from the character sheet is not wired yet.';

  return (
    <div>
      <div style={{ padding: 14, background: 'linear-gradient(180deg, rgba(124,58,237,0.07), rgba(124,58,237,0.02))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 50, background: 'rgba(124,58,237,0.15)', border: '1px solid var(--arcane)', display: 'grid', placeItems: 'center', color: 'var(--arcane-bright)' }}>
          {Icon('flame', { size: 18 })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-display" style={{ fontSize: 14, color: 'var(--text)' }}>Spellcasting</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>
            {spellSaveDC ? <>Spell save DC <b style={{ color: 'var(--gold-bright)' }}>{spellSaveDC}</b></> : 'No spell save DC'} /{' '}
            {spellAttackBonus !== undefined ? <>Spell attack <b style={{ color: 'var(--gold-bright)' }}>{sgn(spellAttackBonus)}</b></> : 'No spell attack'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {slots.length ? slots.map(([level, state]) => (
            <span key={level} style={{ minWidth: 34, height: 26, borderRadius: 6, background: state.used >= state.max ? 'var(--bg-deep)' : 'linear-gradient(180deg, var(--arcane-bright), var(--arcane-deep))', border: `1px solid ${state.used >= state.max ? 'var(--border)' : 'var(--arcane)'}`, display: 'grid', placeItems: 'center', color: state.used >= state.max ? 'var(--text-4)' : '#fff', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
              L{level} {state.max - state.used}/{state.max}
            </span>
          )) : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No slots</span>}
        </div>
      </div>

      {spells.length ? (
        <Card>
          <CardHead
            icon="flame"
            title="Known Spells"
            right={<span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>{spells.length} known <LockedBadge /></span>}
          />
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {spells.map((spell) => (
              <div key={spell} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
                <span style={{ color: 'var(--arcane-bright)' }}>{Icon('flame', { size: 13 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{spell}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>Edit spell notes in the full sheet.</div>
                </div>
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  disabled
                  title={castReason}
                  type="button"
                  style={{ padding: '3px 8px', fontSize: 10.5 }}
                >
                  {Icon('dice', { size: 10 })} Cast
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyPanel title="No spells prepared" text="This character has no spells recorded yet." />
      )}
    </div>
  );
}

function ItemsPanel({ character }: { character: Character }) {
  const inventory = character.inventory;
  const equipped = inventory.items.filter((item) => item.equipped);
  const carried = inventory.items.filter((item) => !item.equipped);
  const carryWeight = inventory.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            ['PP', inventory.currency.pp, '#E9D5FF'],
            ['GP', inventory.currency.gp, '#D6A84F'],
            ['EP', inventory.currency.ep, '#B8B0A4'],
            ['SP', inventory.currency.sp, '#A8A29E'],
            ['CP', inventory.currency.cp, '#8C5A3C'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 6, padding: 10, textAlign: 'center' }}>
              <div className="fw-eyebrow" style={{ fontSize: 10, color: color as string }}>{label}</div>
              <div className="fw-display" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1.1 }}>{value as number}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <CardHead icon="sword" title="Equipped" right={<span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)' }}>Carry {Math.round(carryWeight)} / {inventory.maxCarryWeight} lb</span>} />
        <div style={{ padding: 8 }}>
          {equipped.length ? equipped.map((item) => <SheetItem item={item} key={item.id} />) : <div style={{ padding: 12, color: 'var(--text-3)' }}>No equipped items.</div>}
        </div>
      </Card>

      <Card>
        <CardHead icon="bag" title="Carried" />
        <div style={{ padding: 8 }}>
          {carried.length ? carried.map((item) => <SheetItem item={item} key={item.id} />) : <div style={{ padding: 12, color: 'var(--text-3)' }}>No carried items.</div>}
        </div>
      </Card>
    </div>
  );
}

function LorePanel({ character }: { character: Character }) {
  const personality = character.personality;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <CardHead icon="scroll" title="Backstory" />
        <div style={{ padding: '14px 18px', fontFamily: 'var(--f-serif)', fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
          {personality?.backstory || character.backstory || 'No backstory recorded yet.'}
        </div>
      </Card>

      <Card>
        <CardHead icon="heart" title="Personality" />
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: 'var(--f-serif)', fontSize: 13.5, lineHeight: 1.55 }}>
          <RpLine label="Trait" text={personality?.traits ?? character.personalityTraits[0]} />
          <RpLine label="Ideal" text={personality?.ideals ?? character.personalityTraits[1]} />
          <RpLine label="Bond" text={personality?.bonds ?? character.personalityTraits[2]} />
          <RpLine label="Flaw" text={personality?.flaws ?? character.personalityTraits[3]} />
        </div>
      </Card>
    </div>
  );
}

export function CharacterSheetPage({ user, onBack }: CharacterSheetPageProps) {
  const [tab, setTab] = useState<TabId>('skills');
  const [characters, setCharacters] = useState<VaultCharacter[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVault() {
      setLoading(true);
      setError('');
      try {
        const loaded = await listVaultCharacters(user);
        if (cancelled) return;
        setCharacters(loaded);
        setSelectedId((current) => current || loaded[0]?.id || '');
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load character vault.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadVault();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedCharacter = useMemo(() => {
    const raw = characters.find((character) => character.id === selectedId) ?? characters[0];
    return raw ? recalculateCharacter(raw) : null;
  }, [characters, selectedId]);

  const derived = selectedCharacter?.systemData.derivedStats;
  const hpMax = Math.max(1, selectedCharacter?.maxHitPoints ?? 1);
  const hpCurrent = Math.max(0, Math.min(selectedCharacter?.hitPoints ?? 0, hpMax));
  const hpPct = (hpCurrent / hpMax) * 100;
  const hpColor = hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--blood-bright)';

  async function persistCharacter(nextCharacter: Character, message = 'Sheet saved.') {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const saved = await saveVaultCharacter(recalculateCharacter(nextCharacter), user);
      setCharacters((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
      });
      setSelectedId(saved.id);
      setStatus(message);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save character sheet.');
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function adjustHp(delta: number) {
    if (!selectedCharacter) return;
    await persistCharacter(
      {
        ...selectedCharacter,
        hitPoints: Math.max(0, Math.min(selectedCharacter.maxHitPoints, selectedCharacter.hitPoints + delta)),
      },
      'Hit points updated.',
    );
  }

  async function healFull() {
    if (!selectedCharacter) return;
    await persistCharacter({ ...selectedCharacter, hitPoints: selectedCharacter.maxHitPoints }, 'Hit points restored.');
  }

  async function takeShortRest() {
    if (!selectedCharacter) return;
    await persistCharacter(applyShortRest(selectedCharacter, 1), 'Short rest applied.');
  }

  async function takeLongRest() {
    if (!selectedCharacter) return;
    await persistCharacter(applyLongRest(selectedCharacter), 'Long rest applied.');
  }

  function levelUpReason(character: Character) {
    if (saving) return 'Save in progress.';
    if (!canLevelUp(character)) return 'Level up is not available yet.';
    return 'Level up this character.';
  }

  if (loading) {
    return (
      <div className="fw-scroll" style={{ flex: 1 }}>
        <div className="fw-page" style={{ maxWidth: 1480 }}>
          <EmptyPanel title="Loading character sheet" text="Opening your vault and recalculating character stats." />
        </div>
      </div>
    );
  }

  if (!selectedCharacter) {
    return (
      <div className="fw-scroll" style={{ flex: 1 }}>
        <div className="fw-page" style={{ maxWidth: 1480 }}>
          <EmptyPanel title="No character in the vault" text="Forge a warden first, then return here to manage the full sheet." />
          <div style={{ marginTop: 12 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">{Icon('chevL', { size: 12 })} Back</button>
          </div>
          {error ? <p style={{ color: 'var(--blood-bright)', marginTop: 12 }}>{error}</p> : null}
        </div>
      </div>
    );
  }

  const initials = initialsFor(selectedCharacter, user);
  const saves = abilityOrder.map((ability) => ({
    ability,
    mod: derived?.savingThrows?.[ability] ?? abilityModifier(selectedCharacter.abilities[ability]),
    proficient: selectedCharacter.savingThrows?.includes(ability) ?? false,
  }));
  const languageText = selectedCharacter.languages.length ? selectedCharacter.languages.join(' / ') : 'No languages recorded';

  return (
    <div className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page" style={{ maxWidth: 1480 }}>
        <div className="fw-cs-header fw-orn">
          <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
          <div className="fw-cs-portrait">
            <div className="fw-cs-portrait-inner">{initials}</div>
            <span className="fw-cs-level">{selectedCharacter.level}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-eyebrow" style={{ color: 'var(--gold)', marginBottom: 4 }}>Character Sheet / Vault</div>
            <h1 className="fw-display" style={{ fontSize: 36, color: 'var(--text)', lineHeight: 1.05, letterSpacing: '0.04em' }}>{selectedCharacter.name}</h1>
            <div className="fw-serif" style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--text-2)', marginTop: 6 }}>
              {selectedCharacter.ancestry} {selectedCharacter.className} / {selectedCharacter.background || 'No background'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="fw-pill gold">{Icon('crown', { size: 10 })} Level {selectedCharacter.level}</span>
              <span className="fw-pill dim">PB {sgn(derived?.proficiencyBonus ?? 2)}</span>
              <span className="fw-pill">{selectedCharacter.alignment || 'Unaligned'}</span>
              {selectedCharacter.subclass ? <span className="fw-pill">{selectedCharacter.subclass}</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={onBack}>{Icon('chevL', { size: 11 })} Back</button>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" type="button" onClick={() => setEditOpen(true)}>{Icon('cog', { size: 11 })} Edit Sheet</button>
              <button
                className="fw-btn fw-btn-gold fw-btn-sm"
                disabled={!canLevelUp(selectedCharacter) || saving}
                onClick={() => setLevelUpOpen(true)}
                title={levelUpReason(selectedCharacter)}
                type="button"
              >
                {Icon('sparkles', { size: 11 })} Level Up
              </button>
            </div>
            <select
              className="fw-select"
              onChange={(event) => setSelectedId(event.target.value)}
              style={{ minWidth: 220 }}
              value={selectedCharacter.id}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} / Lv {character.level}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--text-4)', fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
              {saving ? 'saving...' : `last edit / ${formatUpdatedAt(selectedCharacter.updatedAt)}`}
            </div>
            {status ? <div style={{ color: 'var(--success)', fontSize: 11 }}>{status}</div> : null}
            {error ? <div style={{ color: 'var(--blood-bright)', fontSize: 11, maxWidth: 260, textAlign: 'right' }}>{error}</div> : null}
          </div>
        </div>

        <div className="fw-cs-grid">
          <div className="fw-cs-col">
            <Card elev className="fw-orn" style={{ overflow: 'hidden' }}>
              <span className="fw-orn-c tl" /><span className="fw-orn-c tr" />
              <span className="fw-orn-c bl" /><span className="fw-orn-c br" />
              <div style={{ padding: '16px 18px', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(153,27,27,0.18), transparent 70%)' }}>
                <div className="fw-eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>Hit Points</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                  <span className="fw-display" style={{ fontSize: 48, lineHeight: 1, color: hpColor }}>{hpCurrent}</span>
                  <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--text-3)' }}>/ {hpMax}</span>
                </div>
                <div style={{ marginTop: 12, height: 6, background: 'var(--bg-deep)', borderRadius: 50, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                  <div style={{ height: '100%', width: `${hpPct}%`, background: `linear-gradient(90deg, var(--blood), ${hpColor})`, transition: 'width 0.25s' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                  <button className="fw-btn fw-btn-blood fw-btn-sm" disabled={saving} title={saving ? 'Save in progress.' : 'Reduce current HP by 5.'} type="button" onClick={() => void adjustHp(-5)}>{Icon('minus', { size: 11 })} 5</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={saving} title={saving ? 'Save in progress.' : 'Reduce current HP by 1.'} type="button" onClick={() => void adjustHp(-1)}>{Icon('minus', { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={saving} title={saving ? 'Save in progress.' : 'Increase current HP by 1.'} type="button" onClick={() => void adjustHp(1)}>{Icon('plus', { size: 11 })} 1</button>
                  <button className="fw-btn fw-btn-gold fw-btn-sm" disabled={saving} title={saving ? 'Save in progress.' : 'Increase current HP by 5.'} type="button" onClick={() => void adjustHp(5)}>{Icon('plus', { size: 11 })} 5</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={saving} title={saving ? 'Save in progress.' : 'Restore current HP to maximum.'} type="button" onClick={() => void healFull()} style={{ fontSize: 10.5 }}>{Icon('heart', { size: 10 })} Full heal</button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead icon="shield" title="Combat Vitals" />
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <VitalTile label="AC" value={`${derived?.armorClass ?? selectedCharacter.armorClass}`} sub="equipment" />
                <VitalTile label="INIT" value={sgn(derived?.initiative ?? abilityModifier(selectedCharacter.abilities.dex))} sub="Dex" gold />
                <VitalTile label="SPD" value={`${selectedCharacter.speed}`} sub="ft / round" />
                <VitalTile label="PROF" value={sgn(derived?.proficiencyBonus ?? 2)} sub={`Lv ${selectedCharacter.level}`} />
                <VitalTile label="PASS / PERC" value={`${derived?.passivePerception ?? 10}`} sub="10 + Perception" small />
                <VitalTile label="HIT DICE" value={`${selectedCharacter.hitDice}/${selectedCharacter.maxHitDice}`} sub={selectedCharacter.className} />
              </div>
            </Card>

            <Card>
              <CardHead icon="dice" title="Ability Scores" />
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {abilityOrder.map((ability) => {
                  const value = selectedCharacter.abilities[ability];
                  const mod = abilityModifier(value);
                  return (
                    <div key={ability} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 10, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span className="fw-eyebrow" style={{ fontSize: 10 }}>{shortAbilityLabels[ability]}</span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-3)' }}>{value}</span>
                      </div>
                      <div className="fw-display" style={{ fontSize: 26, color: 'var(--gold-bright)', lineHeight: 1.1, marginTop: 2 }}>{sgn(mod)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHead icon="shield" title="Saving Throws" right={<LockedBadge />} />
              <div style={{ padding: '8px 12px 12px' }}>
                {saves.map(({ ability, mod, proficient }) => (
                  <div key={ability} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px dashed var(--border-soft)' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 50, border: `1px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, letterSpacing: '0.04em' }}>{shortAbilityLabels[ability]}</span>
                    <span className="fw-mono" style={{ fontSize: 13, color: proficient ? 'var(--gold-bright)' : 'var(--text-2)', minWidth: 30, textAlign: 'right' }}>{sgn(mod)}</span>
                    <button
                      className="fw-btn fw-btn-ghost fw-btn-sm"
                      disabled
                      title="Saving throw rolls from the character sheet are not wired yet."
                      type="button"
                      style={{ padding: '2px 6px' }}
                    >
                      {Icon('dice', { size: 10 })}
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead icon="eye" title="Senses & Languages" />
              <div style={{ padding: 12, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                <div><b style={{ color: 'var(--text)' }}>Darkvision</b> {selectedCharacter.darkvision} ft</div>
                <div><b style={{ color: 'var(--text)' }}>Exhaustion:</b> {selectedCharacter.exhaustionLevel}</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-3)' }}>{languageText}</div>
              </div>
            </Card>
          </div>

          <div className="fw-cs-col">
            <div className="fw-tabs">
              {[
                ['skills', 'Skills', 'eye'],
                ['features', 'Features', 'sparkles'],
                ['spells', 'Spells', 'flame'],
                ['items', 'Inventory', 'bag'],
                ['lore', 'Lore & Notes', 'scroll'],
              ].map(([id, label, icon]) => (
                <button key={id} type="button" className={`fw-tab ${tab === id ? 'active' : ''}`.trim()} onClick={() => setTab(id as TabId)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Icon(icon, { size: 11 })} {label}
                </button>
              ))}
              <span style={{ flex: 1, borderBottom: '1px solid var(--border-soft)' }} />
            </div>
            <div style={{ marginTop: 16 }}>
              {tab === 'skills' ? <SkillsPanel character={selectedCharacter} /> : null}
              {tab === 'features' ? <FeaturesPanel character={selectedCharacter} /> : null}
              {tab === 'spells' ? <SpellsPanel character={selectedCharacter} /> : null}
              {tab === 'items' ? <ItemsPanel character={selectedCharacter} /> : null}
              {tab === 'lore' ? <LorePanel character={selectedCharacter} /> : null}
            </div>
          </div>

          <div className="fw-cs-col">
            <Card>
              <CardHead icon="alert" title="Conditions" />
              <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selectedCharacter.activeConditions.length ? selectedCharacter.activeConditions.map((condition) => (
                  <span className="fw-cond bleed" key={condition}>{condition}</span>
                )) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No active conditions.</span>}
              </div>
            </Card>

            <Card>
              <CardHead icon="flame" title="Resources" />
              <div style={{ padding: '12px 14px' }}>
                {Object.entries(selectedCharacter.spellSlots ?? {})
                  .filter(([, slot]) => slot.max > 0)
                  .map(([level, slot]) => (
                    <ResourceBar key={level} label={`Spell Slots (Lv ${level})`} cur={slot.max - slot.used} max={slot.max} color="arcane" />
                  ))}
                <ResourceBar label="Hit Dice" cur={selectedCharacter.hitDice} max={selectedCharacter.maxHitDice} color="gold" />
                <ResourceBar label="Inspiration" cur={selectedCharacter.inspiration ? 1 : 0} max={1} color="gold" diamond />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    className="fw-btn fw-btn-ghost fw-btn-sm"
                    disabled={saving || selectedCharacter.hitDice <= 0}
                    onClick={() => void takeShortRest()}
                    title={saving ? 'Save in progress.' : disabledReason(selectedCharacter.hitDice > 0, 'No hit dice remaining.')}
                    type="button"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {Icon('flame', { size: 11 })} Short Rest
                  </button>
                  <button
                    className="fw-btn fw-btn-gold fw-btn-sm"
                    disabled={saving}
                    onClick={() => void takeLongRest()}
                    title={saving ? 'Save in progress.' : 'Long rest will recover HP, hit dice, and resources.'}
                    type="button"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {Icon('sparkles', { size: 11 })} Long Rest
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead icon="dice" title="Quick Rolls" right={<LockedBadge />} />
              <div style={{ padding: '8px 10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['Initiative', `1d20 ${sgn(derived?.initiative ?? 0)}`, 'zap', true],
                  ['Perception', `1d20 ${sgn(derived?.skillBonuses?.Perception ?? 0)}`, 'eye', false],
                  ['Best Save', `1d20 ${sgn(Math.max(...saves.map((save) => save.mod)))}`, 'shield', false],
                  selectedCharacter.spells.length ? [selectedCharacter.spells[0], `Spell attack ${sgn(derived?.spellAttackBonus ?? 0)}`, 'flame', false] : null,
                ].filter(Boolean).map((row) => {
                  const [name, dice, icon, primary] = row as [string, string, string, boolean];
                  return (
                    <button
                      key={name}
                      className="fw-btn fw-btn-ghost"
                      disabled
                      title="Quick rolls from the character sheet are not wired yet."
                      type="button"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12, borderColor: primary ? 'var(--gold-deep)' : undefined, background: primary ? 'rgba(214,168,79,0.06)' : undefined }}
                    >
                      <span style={{ color: primary ? 'var(--gold-bright)' : 'var(--gold)' }}>{Icon(icon, { size: 12 })}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{name}</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>{dice}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHead icon="heart" title="Roleplay" />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--f-serif)', fontSize: 13.5, lineHeight: 1.55 }}>
                <RpLine label="Quote" text={selectedCharacter.personality?.quote} />
                <RpLine label="Ideal" text={selectedCharacter.personality?.ideals ?? selectedCharacter.personalityTraits[1]} />
                <RpLine label="Bond" text={selectedCharacter.personality?.bonds ?? selectedCharacter.personalityTraits[2]} />
                <RpLine label="Flaw" text={selectedCharacter.personality?.flaws ?? selectedCharacter.personalityTraits[3]} />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {editOpen ? (
        <CharacterSheetView
          character={selectedCharacter}
          disabled={saving}
          onClose={() => setEditOpen(false)}
          onSave={async (nextCharacter) => {
            await persistCharacter(nextCharacter, 'Sheet edits saved.');
            setEditOpen(false);
          }}
          status={status}
        />
      ) : null}

      <LevelUpModal
        character={selectedCharacter}
        onCancel={() => setLevelUpOpen(false)}
        onConfirm={async (updatedCharacter) => {
          await persistCharacter(updatedCharacter, 'Level up saved.');
          setLevelUpOpen(false);
        }}
        open={levelUpOpen}
      />
    </div>
  );
}

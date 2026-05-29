import { MapPin } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Character, EncounterState, GamePhase, GameSession } from '../types';
import { InventoryPanel } from './InventoryPanel';
import { PartyPanel } from './PartyPanel';
import { CompanionPanel } from './CompanionPanel';
import { CombatTracker } from './CombatTracker';

type MobilePanel = 'party' | 'inventory' | 'map';

interface MobileDockProps {
  activeSession: GameSession | null;
  character: Character;
  currentCharacter: Character;
  encounter: EncounterState | null;
  hasSupabaseConfig: boolean;
  isHost: boolean;
  mobilePanel: MobilePanel;
  user: User | null;
  onCombatEvent: (body: string, metadata: Record<string, unknown>) => Promise<void>;
  onEncounterChange: (encounter: EncounterState | null) => Promise<void>;
  onRequestPhaseChange: (phase: GamePhase) => Promise<void>;
  onUpdateCharacter: (character: Character) => Promise<void>;
}

export function MobileDock({
  activeSession,
  character,
  currentCharacter,
  encounter,
  hasSupabaseConfig,
  isHost,
  mobilePanel,
  user,
  onCombatEvent,
  onEncounterChange,
  onRequestPhaseChange,
  onUpdateCharacter,
}: MobileDockProps) {
  return (
    <>
      {/* ── Party tab (mobile only) ──────────────────────── */}
      <div className={`fw-dock__party ${mobilePanel === 'party' ? 'active' : ''}`}>
        <PartyPanel activeSession={activeSession} currentCharacter={currentCharacter} />
        <CompanionPanel
          currentUserId={user?.id ?? null}
          isHost={isHost}
          sessionId={activeSession?.id ?? null}
        />
        <CombatTracker
          character={character}
          encounter={encounter}
          onCombatEvent={onCombatEvent}
          onEncounterChange={onEncounterChange}
          onRequestPhaseChange={onRequestPhaseChange}
        />
      </div>

      {/* ── Inventory tab (mobile only) ──────────────────── */}
      <div className={`fw-dock__inventory ${mobilePanel === 'inventory' ? 'active' : ''}`}>
        <InventoryPanel
          character={character}
          disabled={hasSupabaseConfig && (!activeSession || !user)}
          onUpdateCharacter={onUpdateCharacter}
        />
      </div>

      {/* ── Map tab (mobile only) ────────────────────────── */}
      <div className={`fw-dock__map ${mobilePanel === 'map' ? 'active' : ''}`}>
        <section className="fw-panel fw-card--framed">
          <div className="fw-panel__header">
            <div>
              <p className="fw-caption">Map</p>
              <h2 className="fw-h2">World View</h2>
            </div>
            <MapPin size={20} aria-hidden="true" />
          </div>
          <div style={{ padding: 'var(--sp-4)' }}>
            <p className="fw-body">แผนที่กำลังถูกจารึก... ตอนนี้ใช้ Scene และ Story Log เพื่อติดตามพื้นที่ผจญภัย</p>
          </div>
        </section>
      </div>
    </>
  );
}

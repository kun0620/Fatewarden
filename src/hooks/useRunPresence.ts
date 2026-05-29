import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';

export interface PresencePlayer {
  userId: string;
  displayName: string;
  characterId?: string;
  status: 'online' | 'offline' | 'afk';
}

type PresenceState = Record<string, PresencePlayer[]>;

function normalizePresenceState(state: PresenceState) {
  const mapped: Record<string, PresencePlayer> = {};
  Object.entries(state).forEach(([key, presences]) => {
    const latest = presences[0];
    if (latest) {
      mapped[key] = {
        ...latest,
        status: latest.status ?? 'online',
      };
    }
  });
  return mapped;
}

export function useRunPresence() {
  const { activeSession, currentUserId, activeCharacter } = useGameStore();
  const [players, setPlayers] = useState<Record<string, PresencePlayer>>({});

  useEffect(() => {
    if (!activeSession?.id || !currentUserId || !supabase) {
      setPlayers({});
      return;
    }

    const channel = supabase.channel(`run:${activeSession.id}:presence`, {
      config: { presence: { key: currentUserId } },
    });

    const trackPresence = (status: PresencePlayer['status']) => channel.track({
      userId: currentUserId,
      displayName: activeCharacter?.name?.trim() || 'Warden',
      characterId: activeCharacter?.id,
      status,
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setPlayers(normalizePresenceState(channel.presenceState() as PresenceState));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const latest = (newPresences as unknown as PresencePlayer[])[0];
        if (!latest) return;
        setPlayers((prev) => ({
          ...prev,
          [key]: { ...latest, status: latest.status ?? 'online' },
        }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPlayers((prev) => {
          const existing = prev[key];
          if (!existing) return prev;
          return {
            ...prev,
            [key]: { ...existing, status: 'offline' },
          };
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence('online');
        }
      });

    let afkTimer: ReturnType<typeof setTimeout> | undefined;
    const resetAfk = () => {
      if (afkTimer) clearTimeout(afkTimer);
      void trackPresence('online');
      afkTimer = setTimeout(() => {
        void trackPresence('afk');
      }, 5 * 60 * 1000);
    };

    window.addEventListener('mousemove', resetAfk);
    window.addEventListener('keydown', resetAfk);
    resetAfk();

    return () => {
      if (afkTimer) clearTimeout(afkTimer);
      window.removeEventListener('mousemove', resetAfk);
      window.removeEventListener('keydown', resetAfk);
      void channel.unsubscribe();
    };
  }, [activeCharacter?.id, activeCharacter?.name, activeSession?.id, currentUserId]);

  return { players };
}

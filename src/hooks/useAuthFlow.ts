import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export function useAuthFlow() {
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let alive = true;
    const acceptSession = async (session: Session | null) => {
      if (!alive) return;
      if (!session) {
        setAuthSession(null);
        setAuthLoading(false);
        return;
      }

      const { data, error } = await client
        .from('profiles')
        .select('banned_at,ban_reason')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!alive) return;
      if (error && error.code !== '42P01' && error.code !== '42703') {
        setAuthError(error.message);
        setAuthSession(null);
        setAuthLoading(false);
        return;
      }

      const bannedAt = typeof data?.banned_at === 'string' ? data.banned_at : '';
      if (bannedAt) {
        const reason = typeof data?.ban_reason === 'string' && data.ban_reason.trim()
          ? ` Reason: ${data.ban_reason.trim()}`
          : '';
        setAuthError(`Account suspended. Contact support.${reason}`);
        setAuthSession(null);
        setAuthLoading(false);
        await client.auth.signOut();
        return;
      }

      setAuthError('');
      setAuthSession(session);
      setAuthLoading(false);
    };

    client.auth.getSession().then(({ data }) => {
      void acceptSession(data.session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void acceptSession(session);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthSession(null);
    setAuthError('');
  };

  return {
    authSession,
    authLoading,
    authError,
    user: authSession?.user ?? null,
    signOut,
  };
}

import { LogIn, LogOut, Mail, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthPanelProps = {
  user: User | null;
  loading: boolean;
};

export function AuthPanel({ loading, user }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    const credentials = { email: email.trim(), password };
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(mode === 'signin' ? 'Signed in.' : 'Account created. Check your email if confirmation is enabled.');
      setPassword('');
    }

    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  if (loading) {
    return (
      <section className="fw-panel auth-panel">
        <p className="fw-caption">Auth</p>
        <h2 className="fw-h2">Checking session</h2>
      </section>
    );
  }

  if (user) {
    return (
      <section className="fw-panel auth-panel">
        <div>
          <p className="fw-caption">Signed in</p>
          <h2 className="fw-h2">{user.email ?? 'Adventurer'}</h2>
        </div>
        <button className="fw-btn fw-btn--ghost" disabled={busy} onClick={signOut} type="button">
          <LogOut size={17} aria-hidden="true" />
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="fw-panel auth-panel">
      <div className="fw-panel__header">
        <div>
          <p className="fw-caption">Auth</p>
          <h2 className="fw-h2">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
        </div>
        {mode === 'signin' ? <LogIn size={24} aria-hidden="true" /> : <UserPlus size={24} aria-hidden="true" />}
      </div>

      <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} onSubmit={submit}>
        <div className="fw-field">
          <label className="fw-field__label">Email</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Mail size={16} aria-hidden="true" />
            <input
              className="fw-input"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
        </div>
        <div className="fw-field">
          <label className="fw-field__label">Password</label>
          <input
            className="fw-input"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {message ? <p className="fw-caption">{message}</p> : null}
        <button className="fw-btn fw-btn--primary" disabled={busy} type="submit">
          {mode === 'signin' ? <LogIn size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
          {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        className="fw-btn fw-btn--ghost"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setMessage('');
        }}
        type="button"
      >
        {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
      </button>
    </section>
  );
}

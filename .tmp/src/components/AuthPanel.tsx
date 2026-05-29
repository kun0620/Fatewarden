import { FormEvent, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Icon } from './ui/Icons';
import { FateSeal, FateLogo } from './ui/Brand';

type AuthPanelProps = {
  user: User | null;
  loading: boolean;
};

export function AuthPanel({ loading, user }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wardenName, setWardenName] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      setMessage(mode === 'signin' ? 'Entered the table.' : 'Account created. Check your email if confirmation is enabled.');
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
      <div className="fw-login-wrap">
        <div className="fw-login-art">
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.45 }}>
            <FateSeal size={520} className="fw-rune-spin" />
          </div>
        </div>
        <div className="fw-login-stage">
          <div className="fw-login-card fw-orn fw-fade">
            <div className="fw-orn-c tl" />
            <div className="fw-orn-c tr" />
            <div className="fw-orn-c bl" />
            <div className="fw-orn-c br" />
            <div className="fw-auth-loading">
              <FateSeal size={64} className="fw-rune-spin" />
              <p className="fw-eyebrow">Consulting the Arcanum…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="fw-login-wrap">
        <div className="fw-login-art">
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FateSeal size={320} style={{ opacity: 0.15 }} />
          </div>
        </div>
        <div className="fw-login-stage">
          <div className="fw-login-card fw-orn fw-fade" style={{ width: 'min(440px, 100%)' }}>
            <div className="fw-orn-c tl" />
            <div className="fw-orn-c tr" />
            <div className="fw-orn-c bl" />
            <div className="fw-orn-c br" />
            <div style={{ textAlign: 'center' }}>
              <p className="fw-eyebrow" style={{ marginBottom: 6 }}>Signed in</p>
              <h1 className="fw-display" style={{ fontSize: 26, color: 'var(--text)', lineHeight: 1.15 }}>
                Welcome back, warden.
              </h1>
              <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic' }}>
                {user.email ?? 'Adventurer'}
              </p>
            </div>
            <button
              className="fw-btn fw-btn-gold fw-btn-lg"
              disabled={busy}
              onClick={signOut}
              type="button"
              style={{ justifyContent: 'center' }}
            >
              {Icon('logout', { size: 16 })}
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fw-login-wrap">
      <div className="fw-login-art">
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.5 }}>
          <div style={{ position: 'relative', width: 720, height: 720 }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
              <FateSeal size={720} className="fw-rune-spin" />
            </div>
            <div style={{ position: 'absolute', inset: 130, opacity: 0.8 }}>
              <FateSeal size={460} />
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 28, left: 28, color: 'var(--text-3)', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FateLogo size="sm" />
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-3)', fontSize: 11.5 }}>
          <span className="fw-eyebrow">Volume Seven · Of Pacts &amp; Patient Gods</span>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent, var(--border))' }} />
          <span style={{ fontFamily: 'var(--f-mono)' }}>v 0.8.3 — Rite of Embers</span>
        </div>
      </div>

      <div className="fw-login-stage">
        <div className="fw-login-card fw-orn fw-fade">
          <div className="fw-orn-c tl" />
          <div className="fw-orn-c tr" />
          <div className="fw-orn-c bl" />
          <div className="fw-orn-c br" />

          <div style={{ textAlign: 'center' }}>
            <div className="fw-eyebrow" style={{ marginBottom: 6 }}>
              {mode === 'signin' ? 'Return to the Table' : 'Take Up the Mantle'}
            </div>
            <h1 className="fw-display" style={{ fontSize: 28, color: 'var(--text)', lineHeight: 1.15 }}>
              {mode === 'signin' ? 'Welcome back, warden.' : 'Forge a new pact.'}
            </h1>
            <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
              {mode === 'signin'
                ? 'Your party waits. The Cinder-Reeve has not moved since last session.'
                : 'Bind a name to your dice. Carry it through every campaign.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <button
              className={`fw-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => { setMode('signin'); setMessage(''); }}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`fw-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setMessage(''); }}
              type="button"
            >
              Create account
            </button>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={submit}>
            {mode === 'signup' && (
              <div className="fw-field">
                <label className="fw-label">Warden Name</label>
                <input
                  type="text"
                  className="fw-input"
                  value={wardenName}
                  onChange={(e) => setWardenName(e.target.value)}
                  placeholder="Aedric"
                />
              </div>
            )}

            <div className="fw-field">
              <label className="fw-label">Email</label>
              <div className="fw-auth-input-row">
                {Icon('user', { size: 14 })}
                <input
                  type="email"
                  className="fw-input"
                  style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, outline: 'none' }}
                  autoComplete="email"
                  placeholder="you@realm.tld"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  value={email}
                />
              </div>
            </div>

            <div className="fw-field">
              <label className="fw-label">Passphrase</label>
              <div className="fw-auth-input-row">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="fw-input"
                  style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, outline: 'none' }}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  placeholder="••••••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  value={password}
                />
                <button
                  className="fw-btn fw-btn-ghost fw-btn-sm"
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ padding: '2px 6px', fontSize: 11 }}
                >
                  {Icon(showPw ? 'eyeOff' : 'eye', { size: 12 })} {showPw ? 'hide' : 'show'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-3)' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--bg-deep)', display: 'grid', placeItems: 'center', color: 'var(--gold)' }}>
                  {Icon('check', { size: 10 })}
                </span>
                Keep me at the table
              </label>
              <span style={{ flex: 1 }} />
              <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Forgot passphrase?
              </a>
            </div>

            {message && (
              <p
                className={`fw-auth-message ${
                  message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')
                    ? 'is-error'
                    : 'is-success'
                }`}
              >
                {message}
              </p>
            )}

            <button
              className="fw-btn fw-btn-gold fw-btn-lg"
              disabled={busy}
              type="submit"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {Icon('login', { size: 16 })}
              {busy ? 'Consulting the Arcanum…' : mode === 'signin' ? 'Enter the table' : 'Bind your name'}
            </button>
          </form>

          <div className="fw-divider">
            <span style={{ fontSize: 11, letterSpacing: '0.2em' }}>OR</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              className="fw-btn fw-btn-ghost"
              disabled
              style={{ width: '100%', justifyContent: 'center' }}
              type="button"
            >
              {Icon('globe', { size: 14 })}
              Discord
            </button>
            <button
              className="fw-btn fw-btn-ghost"
              disabled
              style={{ width: '100%', justifyContent: 'center' }}
              type="button"
            >
              {Icon('link', { size: 14 })}
              Roll20 SSO
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
            By entering you accept the <a href="#" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Warden&apos;s Compact</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

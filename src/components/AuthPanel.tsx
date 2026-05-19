import { CSSProperties, FormEvent, ReactNode, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ensureProfile, sendPasswordReset, validateUsername } from '../lib/profiles';
import { FateLogo, FateSeal } from './ui/Brand';
import { Icon } from './ui/Icons';

type AuthPanelProps = {
  user: User | null;
  loading: boolean;
};

function LoginHero({ embers }: { embers: Array<{ id: number; delay: number; drift: number; duration: number; left: number; opacity: number; size: number }> }) {
  return (
    <aside className="fw-login-hero">
      <div className="fw-login-hero-bg" aria-hidden="true">
        <div className="fw-login-seal-stack">
          <FateSeal size={680} animate />
          <div className="fw-login-seal-inner">
            <FateSeal size={360} animate={false} />
          </div>
        </div>
        <div className="fw-login-embers">
          {embers.map((e) => (
            <span
              key={e.id}
              style={{
                left: `${e.left}%`,
                width: e.size,
                height: e.size,
                animationDelay: `${e.delay}s`,
                animationDuration: `${e.duration}s`,
                '--drift': `${e.drift}px`,
                opacity: e.opacity,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="fw-login-hero-top">
        <FateLogo size="sm" />
        <span className="fw-pill dim" style={{ fontSize: 10 }}>
          <span className="fw-dot fw-dot-gold" /> Realm online - 12,408 wardens
        </span>
      </div>

      <div className="fw-login-hero-center">
        <div className="fw-eyebrow" style={{ color: 'var(--gold)' }}>Volume Seven - Of Pacts &amp; Patient Gods</div>
        <h1 className="fw-display fw-login-tagline">
          The dice<br />remember<br />
          <span style={{ color: 'var(--gold-bright)', fontStyle: 'italic', fontFamily: 'var(--f-serif)' }}>everything.</span>
        </h1>
        <p className="fw-serif fw-login-flavor">
          &quot;And when the warden returned, the table had not gone cold - only patient.&quot;
        </p>

        <div className="fw-login-session fw-orn">
          <span className="fw-orn-c tl" />
          <span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" />
          <span className="fw-orn-c br" />
          <div className="fw-login-session-head">
            <span className="fw-pill blood" style={{ animation: 'fw-glow-pulse 2.4s infinite' }}>
              <span className="fw-dot" /> Awaiting your move
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>SESSION 15 - 2d ago</span>
          </div>
          <div className="fw-display fw-login-session-title">The Hollow Crown of Ysavir</div>
          <div className="fw-serif" style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.55 }}>
            The chapel&apos;s binding circle still smolders. Halric breathes shallow. The Cinder-Reeve has not moved.
          </div>
          <div className="fw-login-session-party">
            {[
              { i: 'AE', c: '#7C3AED' },
              { i: 'BR', c: '#D6A84F' },
              { i: 'MK', c: '#22C55E' },
              { i: 'TH', c: '#C72D2D' },
            ].map((p, i) => (
              <span key={p.i} className="fw-avatar sm" style={{ marginLeft: i ? -8 : 0, background: `linear-gradient(135deg, ${p.c}33, #15101f)`, borderColor: `${p.c}55` }}>
                {p.i}
              </span>
            ))}
            <span style={{ flex: 1, color: 'var(--text-3)', fontSize: 11.5, marginLeft: 10 }}>
              Brask, Mira, Thelos - 3 wardens at the table
            </span>
          </div>
        </div>
      </div>

      <div className="fw-login-hero-bottom">
        <span className="fw-eyebrow">Chronicle</span>
        <span className="fw-hr-line" />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--text-3)' }}>v 0.8.3 - Rite of Embers</span>
      </div>
    </aside>
  );
}

function LoginCard({ children }: { children: ReactNode }) {
  return (
    <main className="fw-login-form-pane">
      <div className="fw-login-card fw-orn">
        <span className="fw-orn-c tl" />
        <span className="fw-orn-c tr" />
        <span className="fw-orn-c bl" />
        <span className="fw-orn-c br" />
        {children}
      </div>
    </main>
  );
}

function DiscordLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M20.32 4.37A19.79 19.79 0 0 0 15.36 3l-.24.48a14.57 14.57 0 0 1 4.35 2.18 14.12 14.12 0 0 0-12.94 0 14.57 14.57 0 0 1 4.35-2.18L10.64 3a19.79 19.79 0 0 0-4.96 1.37C2.54 9.05 1.69 13.62 2.1 18.12A19.93 19.93 0 0 0 8.16 21l.74-1.01a12.95 12.95 0 0 1-2.33-1.12l.56-.43a14.25 14.25 0 0 0 9.74 0l.56.43a12.95 12.95 0 0 1-2.33 1.12l.74 1.01a19.93 19.93 0 0 0 6.06-2.88c.48-5.22-.82-9.75-1.58-13.75ZM9.2 15.3c-1.17 0-2.12-1.08-2.12-2.4s.93-2.4 2.12-2.4c1.2 0 2.14 1.08 2.12 2.4 0 1.32-.94 2.4-2.12 2.4Zm5.6 0c-1.17 0-2.12-1.08-2.12-2.4s.93-2.4 2.12-2.4c1.2 0 2.14 1.08 2.12 2.4 0 1.32-.94 2.4-2.12 2.4Z"
        fill="#fff"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.75h3.56c2.08-1.92 3.28-4.74 3.28-8.07Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.68l-3.56-2.75c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853" />
      <path d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37Z" fill="#EA4335" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.25c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06Z"
        fill="#fff"
      />
    </svg>
  );
}

export function AuthPanel({ loading, user }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [wardenName, setWardenName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        size: 1 + Math.random() * 2.2,
        left: Math.random() * 100,
        delay: -Math.random() * 14,
        duration: 9 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 60,
        opacity: 0.35 + Math.random() * 0.55,
      })),
    [],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setMessage('');

    try {
      const trimmedEmail = email.trim();

      if (mode === 'reset') {
        await sendPasswordReset(trimmedEmail);
        setMessage('Password reset link sent. Check your email.');
        setBusy(false);
        return;
      }

      if (password.length < 8) throw new Error('Passphrase must be at least 8 characters.');

      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passphrases do not match.');
        const checked = validateUsername(username);
        if (!checked.ok) throw new Error(checked.message);

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              username: checked.username,
              displayName: wardenName.trim() || checked.username,
            },
          },
        });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user, { username: checked.username, displayName: wardenName });
        setMessage('Account created. Check your email if confirmation is enabled.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user);
        setMessage('Entered the table.');
      }

      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    }

    setBusy(false);
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
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
        <LoginHero embers={embers} />
        <LoginCard>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: 320, textAlign: 'center', gap: 14 }}>
            <FateSeal size={64} animate />
            <p className="fw-eyebrow">Consulting the Arcanum...</p>
          </div>
        </LoginCard>
      </div>
    );
  }

  if (user) {
    return (
      <div className="fw-login-wrap">
        <LoginHero embers={embers} />
        <LoginCard>
          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>Signed in</div>
            <h2 className="fw-display" style={{ fontSize: 26, color: 'var(--text)', lineHeight: 1.15 }}>Welcome back, warden.</h2>
            <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>{user.email ?? 'Adventurer'}</p>
          </div>
          <button className="fw-btn fw-btn-gold fw-btn-lg fw-login-cta" disabled={busy} onClick={signOut} type="button">
            {Icon('logout', { size: 16 })}
            <span>Sign out</span>
            <span className="fw-login-cta-arrow">{Icon('arrowR', { size: 14 })}</span>
          </button>
        </LoginCard>
      </div>
    );
  }

  return (
    <div className="fw-login-wrap">
      <LoginHero embers={embers} />

      <main className="fw-login-form-pane">
        <div className="fw-login-card fw-orn">
          <span className="fw-orn-c tl" />
          <span className="fw-orn-c tr" />
          <span className="fw-orn-c bl" />
          <span className="fw-orn-c br" />

          <div>
            <div className="fw-eyebrow" style={{ marginBottom: 8 }}>
              {mode === 'signin' ? 'Return to the Table' : mode === 'reset' ? 'Recover the Key' : 'Take Up the Mantle'}
            </div>
            <h2 className="fw-display" style={{ fontSize: 26, color: 'var(--text)', lineHeight: 1.15 }}>
              {mode === 'signin' ? 'Welcome back, warden.' : mode === 'reset' ? 'Reset your passphrase.' : 'Forge a new pact.'}
            </h2>
            <p className="fw-serif" style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
              {mode === 'signin'
                ? "Sign your sigil. Your party hasn't strayed far."
                : mode === 'reset'
                  ? 'We will send a one-use recovery link to your email.'
                : 'Bind a name to your dice. Carry it through every campaign.'}
            </p>
          </div>

          <div className="fw-login-tabs">
            <button className={`fw-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); setMessage(''); }} type="button">
              Sign in
            </button>
            <button className={`fw-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setMessage(''); }} type="button">
              Create account
            </button>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={submit}>
            {mode === 'signup' ? (
              <>
                <div className="fw-field">
                  <label className="fw-label">Warden Name</label>
                  <input className="fw-input" onChange={(e) => setWardenName(e.target.value)} placeholder="e.g. Aedric, Sister Vael..." type="text" value={wardenName} />
                </div>
                <div className="fw-field">
                  <label className="fw-label">Username</label>
                  <input className="fw-input" onChange={(e) => setUsername(e.target.value)} placeholder="aedric_vael" required type="text" value={username} />
                </div>
              </>
            ) : null}

            <div className="fw-field">
              <label className="fw-label">Email</label>
              <div className="fw-input-wrap">
                <span className="fw-input-icon">{Icon('mail', { size: 13 })}</span>
                <input
                  autoComplete="email"
                  className="fw-input has-icon"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@realm.tld"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className="fw-field">
              <label className="fw-label">Passphrase</label>
              <div className="fw-input-wrap">
                <span className="fw-input-icon">{Icon('lock', { size: 13 })}</span>
                <input
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="fw-input has-icon has-trail"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required={mode !== 'reset'}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                />
                <button className="fw-input-trail" onClick={() => setShowPw((s) => !s)} title={showPw ? 'Hide passphrase' : 'Reveal passphrase'} type="button">
                  {Icon(showPw ? 'eyeOff' : 'eye', { size: 13 })}
                </button>
              </div>
            </div>

            {mode === 'signup' ? (
              <div className="fw-field">
                <label className="fw-label">Confirm passphrase</label>
                <input
                  autoComplete="new-password"
                  className="fw-input"
                  minLength={8}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                />
              </div>
            ) : null}

            {mode !== 'reset' ? <label className="fw-login-remember">
              <button type="button" className={`fw-check ${remember ? 'on' : ''}`} onClick={() => setRemember((r) => !r)} aria-label="Toggle remember session">
                {remember && Icon('check', { size: 10 })}
              </button>
              <span>Keep me at the table</span>
              <span style={{ flex: 1 }} />
              {mode === 'signin' ? (
                <button className="fw-auth-link" onClick={() => { setMode('reset'); setMessage(''); }} type="button">
                  Forgot passphrase?
                </button>
              ) : (
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--text-4)', fontSize: 10.5 }}>30 days</span>
              )}
            </label> : null}

            {message ? (
              <p className={`fw-auth-message ${message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'is-error' : 'is-success'}`}>
                {message}
              </p>
            ) : null}

            <button className="fw-btn fw-btn-gold fw-btn-lg fw-login-cta" disabled={busy} type="submit">
              {Icon('login', { size: 16 })}
              <span>{busy ? 'Consulting the Arcanum...' : mode === 'signin' ? 'Enter the table' : mode === 'reset' ? 'Send reset link' : 'Bind your name'}</span>
              <span className="fw-login-cta-arrow">{Icon('arrowR', { size: 14 })}</span>
            </button>
          </form>

          <div className="fw-divider"><span style={{ fontSize: 10.5, letterSpacing: '0.22em' }}>OR SUMMON VIA</span></div>

          <div className="fw-login-sso">
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn" disabled type="button"><span className="fw-login-sso-mark" style={{ background: '#5865F2' }}><DiscordLogo /></span><span>Discord</span></button>
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn" disabled={busy} onClick={() => void signInWithGoogle()} type="button"><span className="fw-login-sso-mark" style={{ background: '#fff' }}><GoogleLogo /></span><span>Google</span></button>
            <button className="fw-btn fw-btn-ghost fw-login-sso-btn" disabled type="button"><span className="fw-login-sso-mark" style={{ background: '#1877F2' }}><FacebookLogo /></span><span>Facebook</span></button>
          </div>

          <div className="fw-login-foot">
            <span>By entering you accept the <a href="#">Warden&apos;s Compact</a> &amp; <a href="#">Scrivener&apos;s Privacy</a>.</span>
          </div>
        </div>

        <div className="fw-login-aside-help">
          {mode === 'reset' ? 'Remembered the passphrase?' : 'New to the table?'}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'reset' ? 'signin' : 'signup'); }}>
            {mode === 'reset' ? 'Return to sign in ->' : 'Forge a pact in 60 seconds ->'}
          </a>
        </div>
      </main>
    </div>
  );
}

import { BookOpen, Grid3X3, LayoutList, ScrollText, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listJoinedSessions } from '../lib/sessions';
import type { GamePhase, GameSession } from '../types';

type CampaignLibraryProps = {
  user: User;
  onBack: () => void;
  onEnterSession: (session: GameSession) => void;
};

type LibraryFilter = 'all' | 'active' | 'draft' | 'paused' | 'archived';
type LibrarySort = 'recent' | 'az';
type LibraryView = 'grid' | 'list';

function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const deltaMs = Math.max(0, now - then);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;

  if (deltaMs < minute) return 'just now';
  if (deltaMs < hour) return `${Math.floor(deltaMs / minute)} min ago`;
  if (deltaMs < day) return `${Math.floor(deltaMs / hour)} hours ago`;
  if (deltaMs < month) return `${Math.floor(deltaMs / day)} days ago`;
  return `${Math.floor(deltaMs / month)} months ago`;
}

function deriveStatus(phase: GamePhase): 'active' | 'draft' {
  return phase === 'setup' ? 'draft' : 'active';
}

function getThemeAccent(themeKey: string): string {
  switch (themeKey) {
    case 'horror':
      return 'radial-gradient(90% 100% at 78% 8%, rgba(199,45,45,0.20) 0%, rgba(20,17,29,0) 68%)';
    case 'mystery':
      return 'radial-gradient(90% 100% at 78% 8%, rgba(124,58,237,0.22) 0%, rgba(20,17,29,0) 68%)';
    case 'high_fantasy':
      return 'radial-gradient(90% 100% at 78% 8%, rgba(214,168,79,0.18) 0%, rgba(20,17,29,0) 68%)';
    default:
      return 'radial-gradient(90% 100% at 78% 8%, rgba(124,58,237,0.26) 0%, rgba(20,17,29,0) 68%)';
  }
}

function statusLabel(status: 'active' | 'draft') {
  return status === 'active' ? 'Active' : 'Draft';
}

export function CampaignLibrary({ onBack, onEnterSession, user }: CampaignLibraryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [view, setView] = useState<LibraryView>('grid');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    listJoinedSessions()
      .then((rows) => {
        if (!alive) return;
        setSessions(rows);
      })
      .catch((nextError) => {
        if (!alive) return;
        setError(nextError instanceof Error ? nextError.message : 'Could not load campaigns.');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const filtered = useMemo(() => {
    const byText = sessions.filter((session) =>
      session.title.toLowerCase().includes(query.trim().toLowerCase()),
    );
    const byFilter = byText.filter((session) => {
      if (filter === 'all') return true;
      if (filter === 'active') return session.phase !== 'setup';
      if (filter === 'draft') return session.phase === 'setup';
      return false;
    });
    return [...byFilter].sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, query, sessions, sort]);

  const stats = useMemo(() => {
    const campaigns = sessions.length;
    const sessionsRun = sessions.length;
    const characters = sessions.reduce((sum, session) => sum + session.partySize, 0);
    return { campaigns, sessionsRun, characters };
  }, [sessions]);

  if (loading) {
    return (
      <main className="fw-scroll" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            aria-hidden="true"
            className="fw-rune-spin"
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: '999px',
              color: 'var(--gold-bright)',
              display: 'grid',
              height: 52,
              margin: '0 auto',
              placeItems: 'center',
              width: 52,
            }}
          >
            <ScrollText size={24} />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="fw-scroll">
        <div className="fw-page" style={{ paddingTop: 'var(--sp-9)' }}>
          <article className="fw-card fw-card-elev" style={{ padding: 'var(--sp-6)' }}>
            <p className="fw-display" style={{ fontSize: 18, margin: 0 }}>Could not load campaigns</p>
            <p className="fw-serif" style={{ color: 'var(--text-2)', marginBottom: 'var(--sp-4)' }}>{error}</p>
            <button className="fw-btn fw-btn-gold" onClick={onBack} type="button">Back</button>
          </article>
        </div>
      </main>
    );
  }

  if (!sessions.length) {
    return (
      <main className="fw-scroll">
        <div className="fw-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <article className="fw-card fw-card-elev" style={{ maxWidth: 520, padding: 'var(--sp-7)', textAlign: 'center' }}>
            <div className="fw-main-menu__tile-icon" style={{ margin: '0 auto var(--sp-4)' }}>
              <ScrollText size={20} aria-hidden="true" />
            </div>
            <h2 className="fw-display" style={{ margin: 0 }}>No campaigns yet</h2>
            <p className="fw-serif" style={{ color: 'var(--text-2)', marginTop: 'var(--sp-3)' }}>
              Start a new adventure or import an existing campaign.
            </p>
            <button className="fw-btn fw-btn-gold" onClick={onBack} type="button">New Campaign</button>
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="fw-scroll">
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <p className="fw-eyebrow">The Stacks</p>
            <h1 className="fw-display">Campaign Library</h1>
            <p className="sub fw-serif">Every tale you've kept.</p>
          </div>
          <div className="fw-page-head-actions">
            <button className="fw-btn fw-btn-ghost" disabled type="button">Import campaign</button>
            <button className="fw-btn fw-btn-gold" onClick={onBack} type="button">New Campaign</button>
          </div>
        </header>

        <section className="fw-lib-stats" style={{ display: 'grid', gap: 'var(--sp-3)', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          {[
            ['Campaigns', String(stats.campaigns)],
            ['Sessions run', String(stats.sessionsRun)],
            ['Hours', '—'],
            ['Characters', String(stats.characters)],
          ].map(([label, value]) => (
            <article className="fw-card" key={label} style={{ padding: 'var(--sp-4)' }}>
              <p className="fw-caption" style={{ marginBottom: 'var(--sp-2)' }}>{label}</p>
              <p className="fw-display" style={{ fontSize: 24, margin: 0 }}>{value}</p>
            </article>
          ))}
        </section>

        <section className="fw-lib-toolbar" style={{ alignItems: 'center', display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-5)' }}>
          <label className="fw-search" style={{ flex: '1 1 280px' }}>
            <Search size={14} aria-hidden="true" />
            <input
              aria-label="Search campaigns"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaigns..."
              value={query}
            />
          </label>
          <div className="fw-seg" role="tablist">
            {(['all', 'active', 'draft', 'paused', 'archived'] as const).map((option) => (
              <button
                className={`fw-seg-btn ${filter === option ? 'active' : ''}`}
                key={option}
                onClick={() => setFilter(option)}
                type="button"
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="fw-select"
            onChange={(event) => setSort(event.target.value as LibrarySort)}
            style={{ width: 140 }}
            value={sort}
          >
            <option value="recent">Recent</option>
            <option value="az">A→Z</option>
          </select>
          <div className="fw-seg">
            <button className={`fw-seg-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} type="button">
              <Grid3X3 size={14} />
            </button>
            <button className={`fw-seg-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} type="button">
              <LayoutList size={14} />
            </button>
          </div>
        </section>

        {view === 'grid' ? (
          <section className="fw-lib-grid" style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', marginTop: 'var(--sp-5)' }}>
            {filtered.map((session) => {
              const status = deriveStatus(session.phase);
              return (
                <article
                  className="fw-card fw-card-elev fw-orn"
                  key={session.id}
                  style={{ backgroundImage: getThemeAccent(session.theme.key), padding: 'var(--sp-4)', position: 'relative' }}
                >
                  <span className="fw-orn-c tl" />
                  <span className="fw-orn-c tr" />
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                    <span className={`fw-pill ${status === 'active' ? 'fw-pill-arcane' : 'fw-pill-dim'}`}>{statusLabel(status)}</span>
                    <span className="fw-pill fw-pill-dim">{session.theme.key.replaceAll('_', ' ')}</span>
                  </div>
                  <h3 className="fw-display" style={{ fontSize: 18, margin: 0 }}>{session.title}</h3>
                  <p className="fw-serif" style={{ color: 'var(--text-2)', fontStyle: 'italic', margin: 'var(--sp-2) 0 var(--sp-3)' }}>
                    {session.theme.tone} · {session.playMode}
                  </p>
                  <div style={{ display: 'flex', marginBottom: 'var(--sp-3)' }}>
                    {Array.from({ length: Math.min(4, Math.max(1, session.partySize)) }).map((_, idx) => (
                      <span className="fw-avatar sm" key={`${session.id}-${idx}`} style={{ marginLeft: idx ? -8 : 0 }}>
                        P{idx + 1}
                      </span>
                    ))}
                  </div>
                  <p className="fw-mono" style={{ color: 'var(--text-3)', fontSize: 11, margin: '0 0 var(--sp-3)' }}>
                    1 session · last played {formatRelativeDate(session.createdAt)}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => onEnterSession(session)} type="button">
                      {status === 'draft' ? 'Open' : 'Resume'}
                    </button>
                    <button className="fw-btn fw-btn-ghost fw-btn-icon fw-btn-sm" disabled type="button">⋯</button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="fw-card" style={{ marginTop: 'var(--sp-5)', overflow: 'hidden', padding: 0 }}>
            {filtered.map((session) => {
              const status = deriveStatus(session.phase);
              return (
                <article
                  key={session.id}
                  style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-soft)',
                    display: 'grid',
                    gap: 'var(--sp-3)',
                    gridTemplateColumns: '36px minmax(180px,1fr) auto auto auto auto auto',
                    padding: '10px 16px',
                  }}
                >
                  <span className="fw-avatar sm">{session.title.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <p className="fw-display" style={{ fontSize: 13, margin: 0 }}>{session.title}</p>
                    <p className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic', margin: 0 }}>
                      {session.theme.tone} · {session.playMode}
                    </p>
                  </div>
                  <span className="fw-pill fw-pill-dim">{session.theme.key.replaceAll('_', ' ')}</span>
                  <span className={`fw-pill ${status === 'active' ? 'fw-pill-arcane' : 'fw-pill-dim'}`}>{statusLabel(status)}</span>
                  <span className="fw-mono" style={{ color: 'var(--text-3)', fontSize: 12 }}>1</span>
                  <span className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
                    {formatRelativeDate(session.createdAt)}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onEnterSession(session)} type="button">Resume</button>
                    <button className="fw-btn fw-btn-ghost fw-btn-icon fw-btn-sm" disabled type="button">⋯</button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', marginTop: 'var(--sp-6)' }}>
          {[
            ['Start from a Seed', 'Turn a single hook into tonight’s session.'],
            ['Import a Module', 'Bring your prepared material into Fatewarden.'],
            ['One-shot Tonight', 'Quick-start format for a fast table.'],
          ].map(([title, body]) => (
            <article className="fw-card" key={title} style={{ padding: 'var(--sp-4)' }}>
              <p className="fw-display" style={{ fontSize: 16, margin: 0 }}>{title}</p>
              <p className="fw-serif" style={{ color: 'var(--text-2)', margin: 'var(--sp-2) 0 0' }}>{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

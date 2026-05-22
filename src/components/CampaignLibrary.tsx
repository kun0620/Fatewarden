import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Icon } from './ui/Icons';
import { downloadCampaignExport, listOwnedCampaignExports } from '../lib/dataExport';
import { listJoinedSessions } from '../lib/sessions';
import type { GamePhase, GameSession } from '../types';

type CampaignLibraryProps = {
  user: User;
  onBack: () => void;
  onCreateCampaign: () => void;
  onGenerateCampaign: () => void;
  onEnterSession: (session: GameSession) => void;
};

type LibraryFilter = 'All' | 'Active' | 'Paused' | 'Draft' | 'Archived';
type LibrarySort = 'recent' | 'az';
type LibraryView = 'grid' | 'list';

function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const deltaMs = Math.max(0, Date.now() - then);
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

function themeAccent(themeKey: string): string {
  switch (themeKey) {
    case 'horror':
      return 'rgba(220,40,40,0.35)';
    case 'mystery':
      return 'rgba(124,58,237,0.4)';
    case 'high_fantasy':
      return 'rgba(146,180,255,0.35)';
    default:
      return 'rgba(214,168,79,0.35)';
  }
}

function statusTone(status: 'active' | 'draft') {
  return status === 'active'
    ? { bg: 'rgba(34,197,94,0.10)', bd: 'rgba(34,197,94,0.4)', c: '#4ADE80', label: 'active' }
    : { bg: 'rgba(124,58,237,0.10)', bd: 'rgba(124,58,237,0.4)', c: '#A271FF', label: 'draft' };
}

function Card({
  children,
  elev,
  style,
}: {
  children: React.ReactNode;
  elev?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`fw-card ${elev ? 'fw-card-elev' : ''}`} style={style}>
      {children}
    </section>
  );
}

export function CampaignLibrary({ onBack, onCreateCampaign, onEnterSession, onGenerateCampaign, user }: CampaignLibraryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [campaignExports, setCampaignExports] = useState<Awaited<ReturnType<typeof listOwnedCampaignExports>>>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('All');
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [view, setView] = useState<LibraryView>('grid');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([listJoinedSessions(), listOwnedCampaignExports(user)])
      .then(([sessionRows, campaignRows]) => {
        if (!alive) return;
        setSessions(sessionRows);
        setCampaignExports(campaignRows);
      })
      .catch((nextError) => {
        if (!alive) return;
        setError(nextError instanceof Error ? nextError.message : 'Could not load campaigns.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user.id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      const status = deriveStatus(session.phase);
      const matchesText =
        !needle ||
        session.title.toLowerCase().includes(needle) ||
        session.theme.key.toLowerCase().includes(needle) ||
        session.theme.tone.toLowerCase().includes(needle);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Active' && status === 'active') ||
        (filter === 'Draft' && status === 'draft');
      return matchesText && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, query, sessions, sort]);

  const stats = useMemo(() => {
    const active = sessions.filter((session) => deriveStatus(session.phase) === 'active').length;
    return {
      campaigns: sessions.length,
      active,
      sessionsRun: sessions.length,
      characters: sessions.reduce((sum, session) => sum + session.partySize, 0),
    };
  }, [sessions]);

  if (loading) {
    return (
      <main className="fw-scroll" style={{ flex: 1 }}>
        <div className="fw-page" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
          <div className="fw-rune-spin" style={{ color: 'var(--gold-bright)' }}>{Icon('scroll', { size: 28 })}</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="fw-scroll" style={{ flex: 1 }}>
        <div className="fw-page">
          <Card elev style={{ maxWidth: 560, padding: 24 }}>
            <div className="fw-eyebrow">The Stacks</div>
            <h1 className="fw-display" style={{ fontSize: 24 }}>Could not load campaigns</h1>
            <p className="fw-serif" style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>{error}</p>
            <button className="fw-btn fw-btn-gold" onClick={onBack} type="button">Back to menu</button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Stacks</div>
            <h1>Campaign Library</h1>
            <div className="sub">Every tale you've kept. Resume, fork, or shelve.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" onClick={onGenerateCampaign} type="button">{Icon('wand', { size: 12 })} AI Generator</button>
            <button className="fw-btn fw-btn-gold" onClick={onCreateCampaign} type="button">{Icon('plus', { size: 12 })} New Campaign</button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { k: 'Campaigns', v: stats.campaigns, sub: 'Across your joined tables' },
            { k: 'Active rooms', v: stats.active, sub: 'Ready to resume' },
            { k: 'Sessions run', v: stats.sessionsRun, sub: 'Tracked from live rooms' },
            { k: 'Characters', v: stats.characters, sub: 'Reserved seats and party size' },
          ].map((stat) => (
            <Card key={stat.k} style={{ padding: '14px 16px' }}>
              <div className="fw-eyebrow" style={{ marginBottom: 4 }}>{stat.k}</div>
              <div className="fw-display" style={{ fontSize: 28, color: 'var(--gold-bright)', lineHeight: 1 }}>{stat.v}</div>
              <div className="fw-serif" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>{stat.sub}</div>
            </Card>
          ))}
        </section>

        <section style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <label className="fw-search" style={{ width: 300 }}>
            {Icon('search', { size: 12 })}
            <input
              aria-label="Search campaigns"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaigns, sessions, NPCs..."
              value={query}
            />
          </label>
          <div className="fw-seg" role="tablist">
            {(['All', 'Active', 'Paused', 'Draft', 'Archived'] as const).map((nextFilter) => (
              <button
                className={`fw-seg-btn ${filter === nextFilter ? 'active' : ''}`}
                disabled={nextFilter === 'Paused' || nextFilter === 'Archived'}
                key={nextFilter}
                onClick={() => setFilter(nextFilter)}
                type="button"
              >
                {nextFilter}
              </button>
            ))}
          </div>
          <select className="fw-select" onChange={(event) => setSort(event.target.value as LibrarySort)} style={{ width: 160 }} value={sort}>
            <option value="recent">Sort: Recent</option>
            <option value="az">Sort: A to Z</option>
          </select>
          <span style={{ flex: 1 }} />
          <div className="fw-seg">
            <button className={`fw-seg-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} type="button">
              {Icon('layers', { size: 12 })} Grid
            </button>
            <button className={`fw-seg-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} type="button">
              {Icon('scroll', { size: 12 })} List
            </button>
          </div>
        </section>

        {!sessions.length ? (
          <Card elev style={{ padding: 28, textAlign: 'center' }}>
            <div className="fw-eyebrow">No campaigns in the stacks</div>
            <h2 className="fw-display" style={{ fontSize: 24, margin: '8px 0 6px' }}>Start from a room setup</h2>
            <p className="fw-serif" style={{ color: 'var(--text-2)', fontStyle: 'italic', margin: 0 }}>
              Create or join a campaign and it will appear here with live session data.
            </p>
          </Card>
        ) : view === 'grid' ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visible.map((session) => {
              const status = deriveStatus(session.phase);
              const tone = statusTone(status);
              const accent = themeAccent(session.theme.key);
              return (
                <article
                  className="fw-card fw-orn"
                  key={session.id}
                  style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                  <span className="fw-orn-c tl" />
                  <span className="fw-orn-c tr" />
                  <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: 'linear-gradient(135deg, #1a1428, #06050b)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 40%, ${accent}, transparent 60%), radial-gradient(ellipse at 75% 70%, rgba(0,0,0,0.6), transparent 60%)` }} />
                    <span style={{ position: 'absolute', top: 10, left: 10, padding: '2px 8px', borderRadius: 999, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: tone.bg, border: `1px solid ${tone.bd}`, color: tone.c }}>{tone.label}</span>
                    <span className="fw-pill fw-pill-dim" style={{ position: 'absolute', top: 10, right: 10 }}>{session.theme.key.replaceAll('_', ' ')}</span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div>
                      <div className="fw-display" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '0.02em' }}>{session.title}</div>
                      <div className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 2 }}>
                        {session.theme.tone} / {session.playMode}
                      </div>
                    </div>
                    <div style={{ display: 'flex', marginBlock: 4 }}>
                      {Array.from({ length: Math.min(5, Math.max(1, session.partySize)) }).map((_, index) => (
                        <div className="fw-avatar sm" key={`${session.id}-${index}`} style={{ marginLeft: index ? -8 : 0 }}>
                          P{index + 1}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--f-mono)', marginTop: 'auto', paddingTop: 8, borderTop: '1px dashed var(--border-soft)' }}>
                      <span>{session.partySize} seats</span>
                      <span>{session.phase}</span>
                      <span style={{ flex: 1 }} />
                      <span className="fw-serif" style={{ fontStyle: 'italic' }}>{formatRelativeDate(session.createdAt)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button className="fw-btn fw-btn-gold fw-btn-sm" onClick={() => onEnterSession(session)} style={{ flex: 1, justifyContent: 'center' }} type="button">
                        {status === 'draft' ? 'Open draft' : 'Resume'} {Icon('arrowR', { size: 11 })}
                      </button>
                      <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled type="button">{Icon('kebab', { size: 12 })}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1.4fr 0.7fr 0.7fr 0.7fr 0.6fr 110px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-soft)', background: 'rgba(0,0,0,0.2)' }}>
              {['', 'Campaign', 'Theme', 'Status', 'Seats', 'Last played', ''].map((heading) => (
                <div className="fw-eyebrow" key={heading}>{heading}</div>
              ))}
            </div>
            {visible.map((session) => {
              const status = deriveStatus(session.phase);
              const tone = statusTone(status);
              return (
                <article key={session.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1.4fr 0.7fr 0.7fr 0.7fr 0.6fr 110px', gap: 12, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ width: 56, height: 36, borderRadius: 4, background: `linear-gradient(135deg, ${themeAccent(session.theme.key)} 0%, transparent 70%), linear-gradient(135deg, #1a1428, #06050b)`, border: '1px solid var(--border-soft)' }} />
                  <div>
                    <div className="fw-display" style={{ fontSize: 13, color: 'var(--text)' }}>{session.title}</div>
                    <div className="fw-serif" style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{session.theme.tone} / {session.playMode}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{session.theme.key.replaceAll('_', ' ')}</div>
                  <div><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: tone.bg, border: `1px solid ${tone.bd}`, color: tone.c }}>{tone.label}</span></div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--text-2)' }}>{session.partySize}</div>
                  <div className="fw-serif" style={{ fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic' }}>{formatRelativeDate(session.createdAt)}</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onEnterSession(session)} type="button">Open</button>
                    <button className="fw-btn fw-btn-icon fw-btn-ghost fw-btn-sm" disabled type="button">{Icon('kebab', { size: 12 })}</button>
                  </div>
                </article>
              );
            })}
          </Card>
        )}

        <Card elev style={{ marginTop: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            {[
              ['sparkles', 'Start from a Seed', 'Pick a tone, a region, a hook. The Warden builds the first session shell.'],
              ['book', 'Import a Module', 'Bring prepared material. PDF and module import are visual placeholders for now.'],
              ['users', 'One-shot Tonight', 'Three hours, four players, one table. Pre-built characters can be attached later.'],
            ].map(([icon, title, body], index) => (
              <div key={title} style={{ padding: 20, borderRight: index < 2 ? '1px solid var(--border-soft)' : undefined }}>
                <span style={{ color: 'var(--gold-bright)' }}>{Icon(icon, { size: 18 })}</span>
                <div className="fw-display" style={{ fontSize: 14, marginTop: 8 }}>{title}</div>
                <div className="fw-serif" style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>{body}</div>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled style={{ marginTop: 10 }} type="button">
                  Coming soon {Icon('arrowR', { size: 10 })}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card elev style={{ marginTop: 16 }}>
          <div className="fw-card-head">
            <div>
              <div className="fw-eyebrow">Campaign JSON</div>
              <h2 className="fw-display" style={{ fontSize: 16, margin: 0 }}>Owned drafts</h2>
            </div>
            <span className="fw-pill fw-pill-dim">{campaignExports.length} saved</span>
          </div>
          <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {campaignExports.length ? (
              campaignExports.map((campaign) => (
                <div key={campaign.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-soft)' }}>
                  <div>
                    <div className="fw-display" style={{ fontSize: 13 }}>{campaign.title}</div>
                    <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
                      Updated {formatRelativeDate(campaign.updated_at ?? campaign.created_at ?? new Date().toISOString())}
                    </div>
                  </div>
                  <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => downloadCampaignExport(campaign)} type="button">
                    Export JSON
                  </button>
                </div>
              ))
            ) : (
              <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
                Campaign Creator drafts saved to Supabase will appear here for JSON export.
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

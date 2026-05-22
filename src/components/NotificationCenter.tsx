import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTiming,
  relativeNotificationTime,
  subscribeToNotifications,
  type AppNotification,
} from '../lib/notifications';
import { Icon } from './ui/Icons';

type NotificationCenterProps = {
  user: User | null;
  variant?: 'rail' | 'topbar';
  onNavigate?: (target: 'game') => void;
};

function uniqueById(items: AppNotification[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function toneStyle(type: AppNotification['type']) {
  const priority = notificationTiming[type].priority;
  if (priority === 'high') return { borderColor: 'rgba(153,27,27,0.5)', background: 'rgba(153,27,27,0.12)' };
  if (priority === 'medium') return { borderColor: 'rgba(214,168,79,0.45)', background: 'rgba(214,168,79,0.10)' };
  return { borderColor: 'rgba(34,197,94,0.32)', background: 'rgba(34,197,94,0.08)' };
}

export function NotificationCenter({ onNavigate, user, variant = 'rail' }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setToasts([]);
      setUnreadCount(0);
      return;
    }

    let alive = true;
    setLoading(true);
    Promise.all([listNotifications(user), countUnreadNotifications(user)])
      .then(([rows, count]) => {
        if (!alive) return;
        setItems(rows);
        setUnreadCount(count);
      })
      .catch((error) => console.warn('Could not load notifications', error))
      .finally(() => {
        if (alive) setLoading(false);
      });

    const channel = subscribeToNotifications(user, (notification) => {
      setItems((current) => uniqueById([notification, ...current]).slice(0, 80));
      setUnreadCount((current) => current + (notification.read ? 0 : 1));
      setToasts((current) => uniqueById([notification, ...current]).slice(0, 3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== notification.id));
      }, notificationTiming[notification.type].ms);
    });

    return () => {
      alive = false;
      void channel.unsubscribe();
    };
  }, [user]);

  async function markAllRead() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  }

  async function openContext(notification: AppNotification) {
    if (!notification.read) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
      void markNotificationRead(notification.id).catch((error) => console.warn('Could not mark notification read', error));
    }
    setOpen(false);
    setToasts((current) => current.filter((item) => item.id !== notification.id));
    if (notification.metadata.sessionId) {
      onNavigate?.('game');
    }
  }

  const button =
    variant === 'rail' ? (
      <button
        type="button"
        className="fw-rail-btn"
        onClick={() => setOpen((next) => !next)}
        title="Notices"
        aria-label="Notices"
        aria-expanded={open}
      >
        {Icon('bell', { size: 17 })}
        <span className="fw-rail-label">Notices</span>
        {unreadCount ? (
          <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 14, height: 14, padding: '0 3px', background: 'var(--blood)', border: '1px solid var(--bg)', borderRadius: 8, color: '#FFE6E6', fontSize: 9, fontFamily: 'var(--f-mono)', display: 'grid', placeItems: 'center', boxShadow: '0 0 6px rgba(153,27,27,0.6)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
    ) : (
      <button type="button" className="fw-btn fw-btn-icon fw-btn-ghost" aria-label="Notices" aria-expanded={open} onClick={() => setOpen((next) => !next)}>
        {Icon('bell', { size: 14 })}
        {unreadCount ? <span className="fw-pill blood" style={{ position: 'absolute', transform: 'translate(8px,-10px)', fontSize: 9, padding: '0 4px' }}>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>
    );

  return (
    <>
      <div style={{ position: 'relative' }}>
        {button}
        {open ? (
          <section className="fw-card fw-card-elev" style={{ position: 'fixed', left: variant === 'rail' ? 78 : 'auto', right: variant === 'rail' ? 'auto' : 22, top: variant === 'rail' ? 344 : 58, width: 340, zIndex: 80, overflow: 'hidden' }}>
            <div className="fw-card-head">
              <div>
                <div className="fw-eyebrow">Notifications</div>
                <h2 className="fw-display" style={{ fontSize: 16, margin: 0 }}>Recent notices</h2>
              </div>
              <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={!unreadCount} onClick={() => void markAllRead()} type="button">Mark all read</button>
            </div>
            <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflow: 'auto' }}>
              {loading ? (
                <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>Loading notices...</div>
              ) : items.length ? (
                items.map((item) => (
                  <button
                    className="fw-btn fw-btn-ghost"
                    key={item.id}
                    onClick={() => void openContext(item)}
                    style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: 10, textAlign: 'left', borderColor: item.read ? 'var(--border-soft)' : 'rgba(153,27,27,0.45)', ...(!item.read ? toneStyle(item.type) : {}) }}
                    type="button"
                  >
                    <span style={{ color: 'var(--gold-bright)', marginTop: 1 }}>{Icon(notificationTiming[item.type].icon, { size: 14 })}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: 'var(--text)', fontSize: 12.5 }}>{item.title}</span>
                      <span className="fw-serif" style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.35 }}>{item.body}</span>
                      <span style={{ display: 'block', color: 'var(--text-3)', fontSize: 10.5, marginTop: 4, fontFamily: 'var(--f-mono)' }}>{relativeNotificationTime(item.createdAt)}</span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="fw-serif" style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>No notices in the last 7 days.</div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div style={{ position: 'fixed', top: 76, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, width: 340, pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <button
            className="fw-card fw-card-elev"
            key={toast.id}
            onClick={() => void openContext(toast)}
            style={{ pointerEvents: 'auto', padding: 12, textAlign: 'left', cursor: 'pointer', ...toneStyle(toast.type) }}
            type="button"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: 'var(--gold-bright)', marginTop: 1 }}>{Icon(notificationTiming[toast.type].icon, { size: 15 })}</span>
              <span>
                <span className="fw-display" style={{ display: 'block', color: 'var(--text)', fontSize: 13 }}>{toast.title}</span>
                <span className="fw-serif" style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.35 }}>{toast.body}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

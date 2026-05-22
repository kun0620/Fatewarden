import { FormEvent, useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { REPORT_REASONS, sendContentReport, type ReportReason, type ReportTarget } from '../lib/reports';

type ReportContentModalProps = {
  target: ReportTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportContentModal({ target, onClose, onSubmitted }: ReportContentModalProps) {
  const [reason, setReason] = useState<ReportReason>('inappropriate_content');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;
    setReason('inappropriate_content');
    setDetails('');
    setError('');
    setBusy(false);
  }, [target]);

  if (!target) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendContentReport({ reason, details, target });
      onSubmitted?.();
      onClose();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Could not send report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', zIndex: 80, display: 'grid', placeItems: 'center', padding: 16 }}>
      <section className="fw-card fw-card-elev" style={{ width: 'min(520px, 100%)' }}>
        <div className="fw-card-head">
          <div>
            <div className="fw-eyebrow">Moderation Report</div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flag size={16} aria-hidden="true" />
              Report {target.kind}
            </h3>
          </div>
        </div>
        <form className="fw-card-body" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fw-field">
            <label className="fw-label">Reason</label>
            <select className="fw-select" onChange={(event) => setReason(event.target.value as ReportReason)} value={reason}>
              {REPORT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="fw-field">
            <label className="fw-label">Details</label>
            <textarea
              className="fw-textarea"
              maxLength={2000}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Optional context for the moderation team..."
              rows={5}
              value={details}
            />
          </div>
          {target.title || target.author ? (
            <div className="fw-pill dim" style={{ alignSelf: 'flex-start' }}>
              {[target.title, target.author].filter(Boolean).join(' / ')}
            </div>
          ) : null}
          {error ? <div className="fw-pill blood" style={{ alignSelf: 'flex-start' }}>{error}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="fw-btn fw-btn-ghost" disabled={busy} onClick={onClose} type="button">Cancel</button>
            <button className="fw-btn fw-btn-gold" disabled={busy} type="submit">{busy ? 'Sending...' : 'Submit report'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

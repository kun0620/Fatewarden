import { useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Campaign } from '../engine/campaign/campaignTypes';
import {
  buildAiCampaignPrompt,
  type AiCampaignValidationIssue,
  type CampaignTone,
  validateAiCampaignJson,
} from '../lib/aiCampaignGenerator';
import { Icon } from './ui/Icons';

type AiCampaignGeneratorProps = {
  user: User;
  onBack: () => void;
  onImportCampaign: (campaign: Campaign) => void;
};

const tones: Array<{ value: CampaignTone; label: string }> = [
  { value: 'dark_fantasy', label: 'Dark Fantasy' },
  { value: 'horror', label: 'Horror' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'comedy', label: 'Comedy' },
];

function IssueList({ issues, tone }: { issues: AiCampaignValidationIssue[]; tone: 'blood' | 'gold' }) {
  if (!issues.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {issues.map((issue, index) => (
        <div className="fw-card" key={`${issue.message}-${index}`} style={{ padding: '10px 12px' }}>
          <span className={`fw-pill ${tone}`} style={{ marginRight: 8 }}>
            {tone === 'blood' ? 'Error' : 'Warning'}
          </span>
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>
            {issue.nodeId ? `${issue.nodeId}: ` : ''}
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AiCampaignGenerator({ onBack, onImportCampaign, user }: AiCampaignGeneratorProps) {
  const [theme, setTheme] = useState('haunted borderlands and a cursed inheritance');
  const [tone, setTone] = useState<CampaignTone>('dark_fantasy');
  const [acts, setActs] = useState(3);
  const [levelMin, setLevelMin] = useState(1);
  const [levelMax, setLevelMax] = useState(5);
  const [customInstructions, setCustomInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validation, setValidation] = useState<ReturnType<typeof validateAiCampaignJson> | null>(null);

  const promptInput = useMemo(
    () => ({ theme, tone, acts, levelMin, levelMax, customInstructions }),
    [theme, tone, acts, levelMin, levelMax, customInstructions],
  );

  const generatedPrompt = prompt || buildAiCampaignPrompt(promptInput);

  const generatePrompt = () => {
    setPrompt(buildAiCampaignPrompt(promptInput));
    setCopied(false);
  };

  const copyPrompt = async () => {
    const nextPrompt = generatedPrompt;
    setPrompt(nextPrompt);
    try {
      await navigator.clipboard.writeText(nextPrompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = nextPrompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
  };

  const updateLevelMin = (value: number) => {
    const next = Math.min(Math.max(value, 1), levelMax);
    setLevelMin(next);
  };

  const updateLevelMax = (value: number) => {
    const next = Math.max(Math.min(value, 20), levelMin);
    setLevelMax(next);
  };

  const validateAndImport = () => {
    const result = validateAiCampaignJson(jsonText);
    setValidation(result);
    if (result.errors.length || !result.campaign) return;

    setImporting(true);
    window.setTimeout(() => {
      onImportCampaign(result.campaign as Campaign);
    }, 350);
  };

  return (
    <main className="fw-scroll" style={{ flex: 1 }}>
      <div className="fw-page">
        <header className="fw-page-head">
          <div>
            <div className="fw-eyebrow">The Forge</div>
            <h1>AI Campaign Generator</h1>
            <div className="sub">Copy a structured prompt, paste model JSON back, then edit it in Campaign Creator.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="fw-pill dim">{user.email ?? 'Local Warden'}</span>
            <button className="fw-btn fw-btn-ghost" onClick={onBack} type="button">
              {Icon('chevL', { size: 12 })} Library
            </button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16, alignItems: 'start' }}>
          <section className="fw-card fw-card-elev">
            <div className="fw-card-head">
              {Icon('wand', { size: 16 })}
              <h3>Prompt Builder</h3>
              <span className="fw-pill gold" style={{ marginLeft: 'auto' }}>Copy / paste only</span>
            </div>
            <div className="fw-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className="fw-field">
                <span className="fw-label">Theme</span>
                <input className="fw-input" onChange={(event) => setTheme(event.target.value)} value={theme} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="fw-field">
                  <span className="fw-label">Tone</span>
                  <select className="fw-select" onChange={(event) => setTone(event.target.value as CampaignTone)} value={tone}>
                    {tones.map((nextTone) => (
                      <option key={nextTone.value} value={nextTone.value}>{nextTone.label}</option>
                    ))}
                  </select>
                </label>
                <label className="fw-field">
                  <span className="fw-label">Acts</span>
                  <select className="fw-select" onChange={(event) => setActs(Number(event.target.value))} value={acts}>
                    {[1, 2, 3, 4, 5].map((actCount) => (
                      <option key={actCount} value={actCount}>{actCount}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="fw-field">
                <span className="fw-label">Level Range {levelMin}-{levelMax}</span>
                <input className="fw-input" max={20} min={1} onChange={(event) => updateLevelMin(Number(event.target.value))} type="range" value={levelMin} />
                <input className="fw-input" max={20} min={1} onChange={(event) => updateLevelMax(Number(event.target.value))} type="range" value={levelMax} />
              </div>
              <label className="fw-field">
                <span className="fw-label">Custom Instructions</span>
                <textarea
                  className="fw-textarea"
                  onChange={(event) => setCustomInstructions(event.target.value)}
                  placeholder="Optional constraints, villains, regions, factions, or table tone..."
                  rows={5}
                  value={customInstructions}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="fw-btn fw-btn-gold" onClick={generatePrompt} type="button">
                  {Icon('wand', { size: 12 })} Generate Prompt
                </button>
                <button className="fw-btn fw-btn-ghost" onClick={() => void copyPrompt()} type="button">
                  {Icon(copied ? 'check' : 'copy', { size: 12 })} {copied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            </div>
          </section>

          <section className="fw-card fw-card-elev">
            <div className="fw-card-head">
              {Icon('scroll', { size: 16 })}
              <h3>Generated Prompt</h3>
              <span className="fw-pill dim" style={{ marginLeft: 'auto' }}>Schema included</span>
            </div>
            <div className="fw-card-body">
              <textarea
                className="fw-textarea"
                onChange={(event) => setPrompt(event.target.value)}
                rows={22}
                style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
                value={generatedPrompt}
              />
            </div>
          </section>
        </section>

        <section className="fw-card fw-card-elev" style={{ marginTop: 16 }}>
          <div className="fw-card-head">
            {Icon('check', { size: 16 })}
            <h3>Paste JSON and Import</h3>
            {validation?.summary ? (
              <span className="fw-pill success" style={{ marginLeft: 'auto' }}>
                {validation.summary.acts} acts / {validation.summary.chapters} chapters / {validation.summary.scenes} scenes / {validation.summary.nodes} nodes
              </span>
            ) : null}
          </div>
          <div className="fw-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr', gap: 16 }}>
            <label className="fw-field">
              <span className="fw-label">Campaign JSON</span>
              <textarea
                className="fw-textarea"
                onChange={(event) => {
                  setJsonText(event.target.value);
                  setValidation(null);
                }}
                placeholder='Paste JSON here, starting with {"meta": ...}'
                rows={18}
                style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
                value={jsonText}
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="fw-btn fw-btn-gold" disabled={importing || !jsonText.trim()} onClick={validateAndImport} type="button">
                {Icon(importing ? 'check' : 'arrowR', { size: 12 })} {importing ? 'Opening Creator' : 'Validate & Import'}
              </button>
              {!validation ? (
                <div className="fw-card" style={{ padding: 16 }}>
                  <div className="fw-eyebrow">Validation</div>
                  <p className="fw-serif" style={{ color: 'var(--text-3)', fontStyle: 'italic', margin: '6px 0 0' }}>
                    Checks JSON parse errors, required campaign fields, node types, duplicate node IDs, dead ends, flags, reachability, and combat coverage.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`fw-pill ${validation.errors.length ? 'blood' : 'success'}`}>
                      {validation.errors.length ? `${validation.errors.length} errors` : 'No errors'}
                    </span>
                    <span className={`fw-pill ${validation.warnings.length ? 'gold' : 'dim'}`}>
                      {validation.warnings.length} warnings
                    </span>
                  </div>
                  <IssueList issues={validation.errors} tone="blood" />
                  <IssueList issues={validation.warnings} tone="gold" />
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

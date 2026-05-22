import React from 'react';
import type { ValidationResult } from '../../engine/campaign/campaignCreatorTypes';

interface CampaignValidationPanelProps {
  validation: ValidationResult;
}

export default function CampaignValidationPanel({ validation }: CampaignValidationPanelProps) {
  return (
    <div className="validation-panel">
      <h3>Validation</h3>
      {validation.valid ? (
        <div className="validation-pass">✅ All checks passed</div>
      ) : (
        <div className="validation-fail">❌ {validation.errors.length} error(s)</div>
      )}

      {validation.errors.length > 0 && (
        <div className="errors-list">
          <h4>Errors:</h4>
          {validation.errors.map((err, i) => (
            <div key={i} className="error-item">
              {err.node_id && <span className="node-ref">[{err.node_id}]</span>}
              {err.message}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="warnings-list">
          <h4>Warnings:</h4>
          {validation.warnings.map((warn, i) => (
            <div key={i} className="warning-item">
              {warn.node_id && <span className="node-ref">[{warn.node_id}]</span>}
              {warn.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

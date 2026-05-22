import React, { useState } from 'react';
import type { CampaignMeta } from '../../engine/campaign/campaignTypes';

interface CampaignMetaEditorProps {
  meta: CampaignMeta;
  onUpdate: (meta: CampaignMeta) => void;
  onClose: () => void;
}

export default function CampaignMetaEditor({ meta, onUpdate, onClose }: CampaignMetaEditorProps) {
  const [title, setTitle] = useState(meta.title);
  const [description, setDescription] = useState(meta.description);

  const handleSave = () => {
    onUpdate({ ...meta, title, description });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Campaign Meta</h2>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

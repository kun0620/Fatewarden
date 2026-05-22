import React, { useState } from 'react';
import type { Campaign, Node, CampaignMeta } from '../../engine/campaign/campaignTypes';
import { findNodeInCampaign } from '../../engine/campaign/campaignEngine';

interface CampaignNodeFormProps {
  campaign: Campaign;
  nodeId: string;
  onUpdate: (campaign: Campaign) => void;
}

function updateNodeInCampaign(campaign: Campaign, nodeId: string, updater: (node: Node) => Node): Campaign {
  const updated = { ...campaign };
  for (const act of updated.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        const idx = scene.nodes.findIndex(n => n.id === nodeId);
        if (idx !== -1) {
          scene.nodes = [...scene.nodes];
          scene.nodes[idx] = updater(scene.nodes[idx]);
          return updated;
        }
      }
    }
  }
  return campaign;
}

function collectNodeIds(campaign: Campaign): string[] {
  const ids: string[] = [];
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        ids.push(...scene.nodes.map(n => n.id));
      }
    }
  }
  return ids;
}

export default function CampaignNodeForm({ campaign, nodeId, onUpdate }: CampaignNodeFormProps) {
  const node = findNodeInCampaign(campaign, nodeId);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const allNodeIds = collectNodeIds(campaign);

  if (!node) {
    return <div className="empty-state">Node not found</div>;
  }

  const toggleSection = (name: string) => {
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const updateNode = (updater: (n: Node) => Node) => {
    onUpdate(updateNodeInCampaign(campaign, nodeId, updater));
  };

  const NodeConnectionField = ({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) => (
    <div className="form-group">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- None --</option>
        {allNodeIds.filter(id => id !== nodeId).map(id => (
          <option key={id} value={id}>{id}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="node-form">
      <div className="form-header">
        <h3>{node.type.toUpperCase()}</h3>
        <p>ID: {node.id}</p>
      </div>

      <div className="form-content">
        {/* Narration Node */}
        {node.type === 'narration' && (
          <>
            <div className="form-group">
              <label>Text</label>
              <textarea
                value={(node as any).text || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, text: e.target.value }))}
                rows={6}
              />
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={(node as any).image || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('narration-connections')} style={{ cursor: 'pointer' }}>
                ▼ Next Node
              </h4>
              {expandedSections['narration-connections'] && (
                <NodeConnectionField
                  label="Next Node"
                  value={(node as any).next}
                  onChange={(v) => updateNode(n => ({ ...n as any, next: v || undefined }))}
                />
              )}
            </div>
          </>
        )}

        {/* Choice Node */}
        {node.type === 'choice' && (
          <>
            <div className="form-group">
              <label>Prompt</label>
              <textarea
                value={(node as any).prompt || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, prompt: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('choice-options')} style={{ cursor: 'pointer' }}>
                ▼ Options ({((node as any).options || []).length})
              </h4>
              {expandedSections['choice-options'] && (
                <div className="options-list">
                  {((node as any).options || []).map((opt: any, idx: number) => (
                    <div key={idx} className="option-item">
                      <input
                        type="text"
                        placeholder="Option text"
                        value={opt.text || ''}
                        onChange={(e) => updateNode(n => {
                          const opts = [...(n as any).options];
                          opts[idx] = { ...opts[idx], text: e.target.value };
                          return { ...n as any, options: opts };
                        })}
                      />
                      <select
                        value={opt.choice_mode || 'host'}
                        onChange={(e) => updateNode(n => {
                          const opts = [...(n as any).options];
                          opts[idx] = { ...opts[idx], choice_mode: e.target.value };
                          return { ...n as any, options: opts };
                        })}
                      >
                        <option value="host">Host chooses</option>
                        <option value="vote">Party votes</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Dice Check Node */}
        {node.type === 'dice_check' && (
          <>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={(node as any).description || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Skill</label>
              <input
                type="text"
                value={(node as any).skill || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, skill: e.target.value }))}
                placeholder="e.g., Athletics, Stealth"
              />
            </div>
            <div className="form-group">
              <label>Difficulty Class (DC)</label>
              <input
                type="number"
                value={(node as any).dc || 10}
                onChange={(e) => updateNode(n => ({ ...n as any, dc: parseInt(e.target.value) || 10 }))}
                min="1" max="30"
              />
            </div>
            <div className="form-group">
              <label>Roller</label>
              <select
                value={(node as any).roller || 'host'}
                onChange={(e) => updateNode(n => ({ ...n as any, roller: e.target.value }))}
              >
                <option value="host">Host rolls</option>
                <option value="all_best">All - best</option>
                <option value="all_worst">All - worst</option>
                <option value="highest_stat">Highest stat character</option>
              </select>
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('dice-connections')} style={{ cursor: 'pointer' }}>
                ▼ Outcomes
              </h4>
              {expandedSections['dice-connections'] && (
                <>
                  <NodeConnectionField
                    label="On Success"
                    value={(node as any).on_success}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_success: v || undefined }))}
                  />
                  <NodeConnectionField
                    label="On Fail"
                    value={(node as any).on_fail}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_fail: v || undefined }))}
                  />
                  <NodeConnectionField
                    label="On Critical Success"
                    value={(node as any).on_critical_success}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_critical_success: v || undefined }))}
                  />
                  <NodeConnectionField
                    label="On Critical Fail"
                    value={(node as any).on_critical_fail}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_critical_fail: v || undefined }))}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* Combat Node */}
        {node.type === 'combat' && (
          <>
            <div className="form-section">
              <h4 onClick={() => toggleSection('combat-enemies')} style={{ cursor: 'pointer' }}>
                ▼ Enemies ({((node as any).enemies || []).length})
              </h4>
              {expandedSections['combat-enemies'] && (
                <div className="enemies-list">
                  {((node as any).enemies || []).map((enemy: any, idx: number) => (
                    <div key={idx} className="enemy-item">
                      <input
                        type="text"
                        placeholder="Enemy name"
                        value={enemy.name || ''}
                        onChange={(e) => updateNode(n => {
                          const enemies = [...(n as any).enemies];
                          enemies[idx] = { ...enemies[idx], name: e.target.value };
                          return { ...n as any, enemies };
                        })}
                      />
                      <input
                        type="number"
                        placeholder="HP"
                        value={enemy.hp || 0}
                        onChange={(e) => updateNode(n => {
                          const enemies = [...(n as any).enemies];
                          enemies[idx] = { ...enemies[idx], hp: parseInt(e.target.value) || 0 };
                          return { ...n as any, enemies };
                        })}
                        min="1"
                      />
                      <input
                        type="number"
                        placeholder="AC"
                        value={enemy.ac || 10}
                        onChange={(e) => updateNode(n => {
                          const enemies = [...(n as any).enemies];
                          enemies[idx] = { ...enemies[idx], ac: parseInt(e.target.value) || 10 };
                          return { ...n as any, enemies };
                        })}
                        min="1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Win Condition</label>
              <select
                value={(node as any).win_condition || 'kill_all'}
                onChange={(e) => updateNode(n => ({ ...n as any, win_condition: e.target.value }))}
              >
                <option value="kill_all">Kill all enemies</option>
                <option value="kill_boss">Kill boss</option>
                <option value="escape">Escape</option>
              </select>
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('combat-connections')} style={{ cursor: 'pointer' }}>
                ▼ Outcomes
              </h4>
              {expandedSections['combat-connections'] && (
                <>
                  <NodeConnectionField
                    label="On Win"
                    value={(node as any).on_win}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_win: v || undefined }))}
                  />
                  <NodeConnectionField
                    label="On Lose"
                    value={(node as any).on_lose}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_lose: v || undefined }))}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* Item Reward Node */}
        {node.type === 'item_reward' && (
          <>
            <div className="form-section">
              <h4 onClick={() => toggleSection('items')} style={{ cursor: 'pointer' }}>
                ▼ Items ({((node as any).items || []).length})
              </h4>
              {expandedSections['items'] && (
                <div className="items-list">
                  {((node as any).items || []).map((item: any, idx: number) => (
                    <div key={idx} className="item-entry">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name || ''}
                        onChange={(e) => updateNode(n => {
                          const items = [...(n as any).items];
                          items[idx] = { ...items[idx], name: e.target.value };
                          return { ...n as any, items };
                        })}
                      />
                      <textarea
                        placeholder="Description"
                        value={item.description || ''}
                        onChange={(e) => updateNode(n => {
                          const items = [...(n as any).items];
                          items[idx] = { ...items[idx], description: e.target.value };
                          return { ...n as any, items };
                        })}
                        rows={2}
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity || 1}
                        onChange={(e) => updateNode(n => {
                          const items = [...(n as any).items];
                          items[idx] = { ...items[idx], quantity: parseInt(e.target.value) || 1 };
                          return { ...n as any, items };
                        })}
                        min="1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('reward-connections')} style={{ cursor: 'pointer' }}>
                ▼ Next Node
              </h4>
              {expandedSections['reward-connections'] && (
                <NodeConnectionField
                  label="Next"
                  value={(node as any).next}
                  onChange={(v) => updateNode(n => ({ ...n as any, next: v || undefined }))}
                />
              )}
            </div>
          </>
        )}

        {/* NPC Dialogue Node */}
        {node.type === 'npc_dialogue' && (
          <>
            <div className="form-group">
              <label>NPC Name</label>
              <input
                type="text"
                value={(node as any).npc_name || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, npc_name: e.target.value }))}
                placeholder="NPC name"
              />
            </div>
            <div className="form-group">
              <label>NPC Image URL</label>
              <input
                type="text"
                value={(node as any).npc_image || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, npc_image: e.target.value }))}
                placeholder="https://example.com/npc.jpg"
              />
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('dialogue-lines')} style={{ cursor: 'pointer' }}>
                ▼ Dialogue Lines ({((node as any).lines || []).length})
              </h4>
              {expandedSections['dialogue-lines'] && (
                <div className="dialogue-list">
                  {((node as any).lines || []).map((line: any, idx: number) => (
                    <div key={idx} className="dialogue-item">
                      <select
                        value={line.speaker || 'npc'}
                        onChange={(e) => updateNode(n => {
                          const lines = [...(n as any).lines];
                          lines[idx] = { ...lines[idx], speaker: e.target.value };
                          return { ...n as any, lines };
                        })}
                      >
                        <option value="npc">NPC</option>
                        <option value="player">Player</option>
                      </select>
                      <textarea
                        placeholder="Dialogue text"
                        value={line.text || ''}
                        onChange={(e) => updateNode(n => {
                          const lines = [...(n as any).lines];
                          lines[idx] = { ...lines[idx], text: e.target.value };
                          return { ...n as any, lines };
                        })}
                        rows={2}
                      />
                      {(line.options || []).length > 0 && (
                        <div className="options-sub">
                          {line.options.map((opt: any, optIdx: number) => (
                            <input
                              key={optIdx}
                              type="text"
                              placeholder="Option response"
                              value={opt.text || ''}
                              onChange={(e) => updateNode(n => {
                                const lines = [...(n as any).lines];
                                lines[idx].options[optIdx] = { ...lines[idx].options[optIdx], text: e.target.value };
                                return { ...n as any, lines };
                              })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Condition Check Node */}
        {node.type === 'condition_check' && (
          <>
            <div className="form-section">
              <h4 onClick={() => toggleSection('conditions')} style={{ cursor: 'pointer' }}>
                ▼ Conditions ({((node as any).conditions || []).length})
              </h4>
              {expandedSections['conditions'] && (
                <div className="conditions-list">
                  {((node as any).conditions || []).map((cond: any, idx: number) => (
                    <div key={idx} className="condition-item">
                      <select
                        value={cond.check || 'flag'}
                        onChange={(e) => updateNode(n => {
                          const conds = [...(n as any).conditions];
                          conds[idx] = { ...conds[idx], check: e.target.value };
                          return { ...n as any, conditions: conds };
                        })}
                      >
                        <option value="flag">Flag</option>
                        <option value="stat">Stat</option>
                        <option value="inventory">Inventory</option>
                      </select>
                      <input
                        type="text"
                        placeholder={cond.check === 'flag' ? 'Flag key' : cond.check === 'stat' ? 'Stat name' : 'Item ID'}
                        value={cond.flag_key || cond.stat || cond.item_id || ''}
                        onChange={(e) => updateNode(n => {
                          const conds = [...(n as any).conditions];
                          if (cond.check === 'flag') conds[idx].flag_key = e.target.value;
                          else if (cond.check === 'stat') conds[idx].stat = e.target.value;
                          else conds[idx].item_id = e.target.value;
                          return { ...n as any, conditions: conds };
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('condition-connections')} style={{ cursor: 'pointer' }}>
                ▼ Outcomes
              </h4>
              {expandedSections['condition-connections'] && (
                <>
                  <NodeConnectionField
                    label="On Match"
                    value={(node as any).on_true}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_true: v || undefined }))}
                  />
                  <NodeConnectionField
                    label="On Default"
                    value={(node as any).on_default}
                    onChange={(v) => updateNode(n => ({ ...n as any, on_default: v || undefined }))}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* Cutscene Node */}
        {node.type === 'cutscene' && (
          <>
            <div className="form-section">
              <h4 onClick={() => toggleSection('slides')} style={{ cursor: 'pointer' }}>
                ▼ Slides ({((node as any).slides || []).length})
              </h4>
              {expandedSections['slides'] && (
                <div className="slides-list">
                  {((node as any).slides || []).map((slide: any, idx: number) => (
                    <div key={idx} className="slide-item">
                      <textarea
                        placeholder="Slide text"
                        value={slide.text || ''}
                        onChange={(e) => updateNode(n => {
                          const slides = [...(n as any).slides];
                          slides[idx] = { ...slides[idx], text: e.target.value };
                          return { ...n as any, slides };
                        })}
                        rows={3}
                      />
                      <input
                        type="text"
                        placeholder="Background image URL"
                        value={slide.image || ''}
                        onChange={(e) => updateNode(n => {
                          const slides = [...(n as any).slides];
                          slides[idx] = { ...slides[idx], image: e.target.value };
                          return { ...n as any, slides };
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-section">
              <h4 onClick={() => toggleSection('cutscene-connections')} style={{ cursor: 'pointer' }}>
                ▼ Next Node
              </h4>
              {expandedSections['cutscene-connections'] && (
                <NodeConnectionField
                  label="Next"
                  value={(node as any).next}
                  onChange={(v) => updateNode(n => ({ ...n as any, next: v || undefined }))}
                />
              )}
            </div>
          </>
        )}

        {/* End Node */}
        {node.type === 'end' && (
          <>
            <div className="form-group">
              <label>Ending Title</label>
              <input
                type="text"
                value={(node as any).title || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, title: e.target.value }))}
                placeholder="e.g., Happy Ending, Tragic End"
              />
            </div>
            <div className="form-group">
              <label>Ending Status</label>
              <select
                value={(node as any).status || 'success'}
                onChange={(e) => updateNode(n => ({ ...n as any, status: e.target.value }))}
              >
                <option value="success">Success</option>
                <option value="neutral">Neutral</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={(node as any).text || ''}
                onChange={(e) => updateNode(n => ({ ...n as any, text: e.target.value }))}
                placeholder="Campaign ending description"
                rows={6}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

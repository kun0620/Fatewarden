import React, { useState } from 'react';
import type { Campaign } from '../../engine/campaign/campaignTypes';
import { findNodeInCampaign } from '../../engine/campaign/campaignEngine';
import { transitionToNode } from '../../engine/campaign/campaignRunner';
import type { RunnerState } from '../../engine/campaign/campaignRunnerTypes';

interface CampaignPlaytestProps {
  campaign: Campaign;
  onClose: () => void;
}

// Simple playtest state for testing campaign flow without full multiplayer setup
function createSimplePlaytestState(campaign: Campaign): RunnerState {
  const firstScene = campaign.acts[0]?.chapters[0]?.scenes[0];
  if (!firstScene) throw new Error('Campaign has no scenes');

  return {
    campaign_id: campaign.meta.id,
    current_node_id: firstScene.entry_node_id,
    current_scene_id: firstScene.id,
    flags: {},
    party: {},
    is_multiplayer: false,
    host_player_id: 'playtest',
    updated_at: Date.now()
  };
}

export default function CampaignPlaytest({ campaign, onClose }: CampaignPlaytestProps) {
  const [runnerState, setRunnerState] = useState<RunnerState>(() => createSimplePlaytestState(campaign));
  const [debugOpen, setDebugOpen] = useState(false);
  const [selectedJumpNode, setSelectedJumpNode] = useState('');
  const [flagName, setFlagName] = useState('');
  const [flagValue, setFlagValue] = useState('true');

  const currentNode = findNodeInCampaign(campaign, runnerState.current_node_id);

  // Collect all nodes
  const allNodes: Array<{ id: string; type: string }> = [];
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        allNodes.push(...scene.nodes.map(n => ({ id: n.id, type: n.type })));
      }
    }
  }

  const handleJumpToNode = () => {
    if (selectedJumpNode) {
      const nextState = transitionToNode(campaign, runnerState, selectedJumpNode);
      setRunnerState(nextState);
    }
  };

  const handleToggleFlag = () => {
    if (flagName) {
      const newState = { ...runnerState };
      const parsedValue = flagValue === 'true' ? true : flagValue === 'false' ? false : parseInt(flagValue) || 0;
      newState.flags = { ...newState.flags, [flagName]: parsedValue };
      setRunnerState(newState);
      setFlagName('');
      setFlagValue('true');
    }
  };

  const renderNodeContent = () => {
    if (!currentNode) {
      return <div className="placeholder">Node not found</div>;
    }

    const node = currentNode as any;

    switch (node.type) {
      case 'narration':
        return (
          <div className="node-display">
            <div className="node-text">{node.text}</div>
            {node.image && <img src={node.image} alt="Scene" style={{ maxWidth: '100%', marginTop: '1rem' }} />}
            {node.next && (
              <button onClick={() => {
                const nextState = transitionToNode(campaign, runnerState, node.next);
                setRunnerState(nextState);
              }}>
                Continue →
              </button>
            )}
          </div>
        );

      case 'choice':
        return (
          <div className="node-display">
            <div className="node-text">{node.prompt}</div>
            <div className="choices-list">
              {(node.options || []).map((opt: any) => (
                <button
                  key={opt.id}
                  className="choice-button"
                  onClick={() => {
                    const nextState = transitionToNode(campaign, runnerState, opt.next || node.next);
                    setRunnerState(nextState);
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        );

      case 'dice_check':
        return (
          <div className="node-display">
            <div className="node-text">{node.description}</div>
            <div className="dice-info">
              <p>Skill: {node.skill} | DC: {node.dc}</p>
            </div>
            <div className="dice-buttons">
              {node.on_success && (
                <button onClick={() => {
                  const nextState = transitionToNode(campaign, runnerState, node.on_success);
                  setRunnerState(nextState);
                }}>
                  ✓ Success
                </button>
              )}
              {node.on_fail && (
                <button onClick={() => {
                  const nextState = transitionToNode(campaign, runnerState, node.on_fail);
                  setRunnerState(nextState);
                }}>
                  ✗ Fail
                </button>
              )}
            </div>
          </div>
        );

      case 'combat':
        return (
          <div className="node-display">
            <div className="node-text">⚔️ Combat!</div>
            <div className="enemies-display">
              {(node.enemies || []).map((enemy: any, i: number) => (
                <div key={i} className="enemy-display">
                  {enemy.name}: {enemy.hp} HP (AC {enemy.ac})
                </div>
              ))}
            </div>
            <div className="combat-buttons">
              {node.on_win && (
                <button onClick={() => {
                  const nextState = transitionToNode(campaign, runnerState, node.on_win);
                  setRunnerState(nextState);
                }}>
                  Victory
                </button>
              )}
              {node.on_lose && (
                <button onClick={() => {
                  const nextState = transitionToNode(campaign, runnerState, node.on_lose);
                  setRunnerState(nextState);
                }}>
                  Defeat
                </button>
              )}
            </div>
          </div>
        );

      case 'item_reward':
        return (
          <div className="node-display">
            <div className="node-text">🎁 Received Items:</div>
            <div className="items-display">
              {(node.items || []).map((item: any) => (
                <div key={item.id} className="item-display">
                  <strong>{item.name}</strong> (×{item.quantity})<br />
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
            {node.next && (
              <button onClick={() => {
                const nextState = transitionToNode(campaign, runnerState, node.next);
                setRunnerState(nextState);
              }}>
                Continue →
              </button>
            )}
          </div>
        );

      case 'npc_dialogue':
        return (
          <div className="node-display">
            <div className="npc-header">
              {node.npc_image && <img src={node.npc_image} alt={node.npc_name} style={{ width: '60px', height: '60px', borderRadius: '50%' }} />}
              <div className="npc-name">{node.npc_name}</div>
            </div>
            <div className="dialogue-display">
              {(node.lines || []).map((line: any, i: number) => (
                <div key={i} className={`dialogue-line ${line.speaker}`}>
                  <strong>{line.speaker === 'npc' ? node.npc_name : 'You'}:</strong> {line.text}
                </div>
              ))}
            </div>
            {node.next && (
              <button onClick={() => {
                const nextState = transitionToNode(campaign, runnerState, node.next);
                setRunnerState(nextState);
              }}>
                Continue →
              </button>
            )}
          </div>
        );

      case 'end':
        return (
          <div className="node-display end-display">
            <div className="ending-title">{node.title || 'The End'}</div>
            <div className="ending-status">{node.status}</div>
            <div className="ending-text">{node.text}</div>
            <button onClick={onClose}>Close Playtest</button>
          </div>
        );

      default:
        return <div className="placeholder">Node type: {node.type}</div>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content playtest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playtest-header">
          <h2>Playtest Mode</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="playtest-main">
          <div className="playtest-runner">
            {renderNodeContent()}
          </div>

          {debugOpen && (
            <div className="debug-panel">
              <h4>Debug Tools</h4>
              <div className="debug-section">
                <label>Jump to Node:</label>
                <select value={selectedJumpNode} onChange={(e) => setSelectedJumpNode(e.target.value)}>
                  <option value="">-- Select --</option>
                  {allNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id}</option>
                  ))}
                </select>
                <button onClick={handleJumpToNode}>Jump</button>
              </div>
              <div className="debug-section">
                <label>Set Flag:</label>
                <input
                  type="text"
                  placeholder="flag_name"
                  value={flagName}
                  onChange={(e) => setFlagName(e.target.value)}
                />
                <select value={flagValue} onChange={(e) => setFlagValue(e.target.value)}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="10">10</option>
                </select>
                <button onClick={handleToggleFlag}>Set</button>
              </div>
              <div className="debug-section">
                <label>Current Node:</label>
                <div style={{ fontSize: '0.85rem', color: '#4a90e2' }}>{runnerState.current_node_id}</div>
              </div>
              <div className="debug-section">
                <label>Flags:</label>
                <div style={{ fontSize: '0.75rem', maxHeight: '100px', overflow: 'auto' }}>
                  {Object.entries(runnerState.flags).map(([k, v]) => (
                    <div key={k}>{k}: {String(v)}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="playtest-footer">
          <button onClick={() => setDebugOpen(!debugOpen)}>
            {debugOpen ? '▲' : '▼'} Debug Tools
          </button>
        </div>
      </div>
    </div>
  );
}

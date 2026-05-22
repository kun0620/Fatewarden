import React, { useState, useRef, useEffect } from 'react';
import type { Campaign, Node } from '../../engine/campaign/campaignTypes';
import { getNodeStatus, getNodePreview } from '../../engine/campaign/campaignValidator';
import { findNodeInCampaign } from '../../engine/campaign/campaignEngine';

interface CampaignVisualTreeProps {
  campaign: Campaign;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onUpdateCampaign: (campaign: Campaign) => void;
}

interface NodePosition {
  [nodeId: string]: { x: number; y: number };
}

export default function CampaignVisualTree({
  campaign,
  selectedNodeId,
  onSelectNode,
  onUpdateCampaign
}: CampaignVisualTreeProps) {
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [nodePositions, setNodePositions] = useState<NodePosition>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Collect all nodes into a flat map
  const allNodes = new Map<string, Node>();
  for (const act of campaign.acts) {
    for (const chapter of act.chapters) {
      for (const scene of chapter.scenes) {
        for (const node of scene.nodes) {
          allNodes.set(node.id, node);
        }
      }
    }
  }

  // Initialize node positions (simple grid layout)
  useEffect(() => {
    if (Object.keys(nodePositions).length === 0) {
      const positions: NodePosition = {};
      let col = 0;
      let row = 0;
      for (const nodeId of allNodes.keys()) {
        positions[nodeId] = {
          x: col * 200,
          y: row * 200
        };
        col++;
        if (col > 4) {
          col = 0;
          row++;
        }
      }
      setNodePositions(positions);
    }
  }, [allNodes.size]);

  const getNodeIcon = (node: Node): string => {
    const icons: Record<string, string> = {
      narration: '📖',
      choice: '🔀',
      dice_check: '🎲',
      combat: '⚔️',
      item_reward: '🎁',
      npc_dialogue: '💬',
      condition_check: '❓',
      cutscene: '🎬',
      end: '🏁'
    };
    return icons[node.type] || '?';
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = nodePositions[nodeId];

    const handleMouseMove = (moveE: MouseEvent) => {
      const deltaX = (moveE.clientX - startX) / zoom;
      const deltaY = (moveE.clientY - startY) / zoom;

      setNodePositions(prev => ({
        ...prev,
        [nodeId]: {
          x: startPos.x + deltaX,
          y: startPos.y + deltaY
        }
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in'
      ? Math.min(zoom + 0.2, 3)
      : Math.max(zoom - 0.2, 0.5);
    setZoom(newZoom);
  };

  const handleReset = () => {
    setPanX(0);
    setPanY(0);
    setZoom(1);
  };

  return (
    <div className="visual-tree-container">
      <div className="tree-toolbar">
        <button onClick={() => handleZoom('in')}>➕ Zoom</button>
        <button onClick={() => handleZoom('out')}>➖ Zoom</button>
        <button onClick={handleReset}>🎯 Reset</button>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#888' }}>
          {Math.round(zoom * 100)}% | Pan: Ctrl+Drag
        </span>
      </div>

      <div
        ref={canvasRef}
        className="tree-canvas"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Render all nodes as cards */}
        {Array.from(allNodes.values()).map(node => {
          const status = getNodeStatus(node, allNodes);
          const preview = getNodePreview(node);
          const isSelected = node.id === selectedNodeId;
          const pos = nodePositions[node.id] || { x: 0, y: 0 };

          return (
            <div
              key={node.id}
              className={`node-card ${isSelected ? 'selected' : ''} ${status}`}
              style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                cursor: 'pointer'
              }}
              onClick={() => onSelectNode(node.id)}
              onMouseDown={(e) => {
                if (e.button === 0 && !e.ctrlKey) {
                  handleNodeDrag(node.id, e);
                }
              }}
            >
              <div className="node-icon">{getNodeIcon(node)}</div>
              <div className="node-content">
                <div className="node-type">{node.type}</div>
                <div className="node-preview">{preview}</div>
              </div>
              <div className={`status-badge ${status}`}>
                {status === 'complete' ? '🟢' : '🔴'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

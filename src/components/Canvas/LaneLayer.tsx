/**
 * components/Canvas/LaneLayer.tsx — Swim lane background bands (LANES view only).
 */
import React from 'react';
import type { GraphNode, LaneMetrics, Position, ViewMode } from '../../types/graph';
import { NODE_W } from '../../utils/layout';

interface LaneLayerProps {
  nodes: GraphNode[];
  positions: Record<string, Position>;
  laneMetrics: Record<string, LaneMetrics>;
  ownerColors: Record<string, string>;
  viewMode: ViewMode;
  onFocusOwner?: (owner: string) => void;
  focusedOwner?: string | null;
}

export function LaneLayer({ nodes, positions, laneMetrics, ownerColors, viewMode, onFocusOwner, focusedOwner }: LaneLayerProps) {
  if (viewMode !== 'lanes' || nodes.length === 0) return null;
  const ownerOrder: string[] = [];
  nodes.forEach((node) => { if (!ownerOrder.includes(node.owner)) ownerOrder.push(node.owner); });

  // Compute lane width from actual node positions so it always covers the full graph
  const maxNodeRight = nodes.reduce((max, n) => {
    const pos = positions[n.id];
    return pos ? Math.max(max, pos.x + NODE_W) : max;
  }, 1200);
  const totalWidth = maxNodeRight + 300;

  return (
    <>
      {ownerOrder.map((owner, index) => {
        const metrics = laneMetrics[owner];
        if (!metrics) return null;
        const color = ownerColors[owner] ?? '#4f9eff';
        const isEven = index % 2 === 0;
        return (
          <g key={owner} style={{ pointerEvents: 'none' }}>
            <rect x={0} y={metrics.y} width={totalWidth} height={metrics.height}
              fill={isEven ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.1)'} />
            <rect x={0} y={metrics.y} width={3} height={metrics.height} fill={color} opacity={0.6} />
            <line x1={0} y1={metrics.y + metrics.height} x2={totalWidth} y2={metrics.y + metrics.height}
              stroke="var(--border)" strokeWidth={1} />
            <g
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => onFocusOwner?.(owner)}
            >
              <title>{focusedOwner === owner ? `Exit focus on ${owner}` : `Focus on ${owner} lane`}</title>
              <rect
                x={0} y={metrics.y} width={160} height={metrics.height}
                fill="transparent"
              />
              <text x={16} y={metrics.y + metrics.height / 2 + 4}
                fontFamily="var(--font-display)" fontSize={11} fontWeight={700}
                fill={color} opacity={focusedOwner === owner ? 1 : 0.8}>
                {owner}
              </text>
            </g>
          </g>
        );
      })}
    </>
  );
}

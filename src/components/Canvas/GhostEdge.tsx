/**
 * components/Canvas/GhostEdge.tsx — Dashed preview edge while drawing connections.
 */
import React from 'react';
import { NODE_W, NODE_H } from '../../utils/layout';
import type { Position } from '../../types/graph';

interface GhostEdgeProps {
  sourcePosition: Position | undefined;
  targetPoint: Position;
}

export function GhostEdge({ sourcePosition, targetPoint }: GhostEdgeProps) {
  if (!sourcePosition) return null;
  const startX = sourcePosition.x + NODE_W;
  const startY = sourcePosition.y + NODE_H / 2;
  const endX = targetPoint.x;
  const endY = targetPoint.y;
  const cx1 = startX + (endX - startX) * 0.45;
  const cx2 = startX + (endX - startX) * 0.55;
  return (
    <path
      d={`M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`}
      fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6 4"
      opacity={0.8} style={{ pointerEvents: 'none' }} />
  );
}

/**
 * components/Canvas/PhaseLayer.tsx — SVG vertical band overlays for phases.
 *
 * Renders one translucent column per phase, sorted by phase.sequence.
 * Each band spans the full canvas height and is bounded horizontally by
 * the leftmost/rightmost nodes assigned to that phase.
 *
 * Phases are purely visual — they do not affect layout or node visibility.
 */

import React, { useState, useRef } from 'react';
import { useGraphStore } from '../../store/graphStore';
import type { GraphPhase, GraphNode, GraphGroup, Position } from '../../types/graph';
import { NODE_W, NODE_H, PHASE_PAD_X, COLLAPSED_W, LANE_LABEL_W } from '../../utils/layout';
import { GROUP_R } from '../../utils/grouping';

const PHASE_PAD_Y = 20;

const HEADER_H = 48;
const BADGE_R = 12;

interface PhaseLayerProps {
  phases: GraphPhase[];
  nodes: GraphNode[];
  groups: GraphGroup[];
  positions: Record<string, Position>;
  focusedPhaseId: string | null;
  selectedPhaseId: string | null;
  canvasHeight: number;
  collapsedPhaseIds: string[];
  viewMode: 'dag' | 'lanes';
  designMode: boolean;
  screenToSvg: (clientX: number, clientY: number) => Position;
  onPhaseClick: (id: string) => void;
  onPhaseDoubleClick: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

interface BandData {
  phase: GraphPhase;
  idx: number;
  minX: number;
  maxX: number;
  dagMinY?: number; // DAG mode: top of bounding envelope
  dagMaxY?: number; // DAG mode: bottom of last node row (before NODE_H + pad)
}

export function PhaseLayer({
  phases,
  nodes,
  groups,
  positions,
  focusedPhaseId,
  selectedPhaseId,
  canvasHeight,
  collapsedPhaseIds,
  viewMode,
  designMode,
  screenToSvg,
  onPhaseClick,
  onPhaseDoubleClick,
  onToggleCollapse,
}: PhaseLayerProps) {
  const { saveLayoutToCache, pushNonMembersOutOfPhase, reorderPhasesByPosition } = useGraphStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const dragRef = useRef<{
    startSvgX: number;
    startSvgY: number;
    startPositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  function handleHeaderMouseDown(e: React.MouseEvent, phase: GraphPhase) {
    e.stopPropagation();
    e.preventDefault();

    const state = useGraphStore.getState();
    const svgPt = screenToSvg(e.clientX, e.clientY);

    // Snapshot start positions of all nodes AND groups assigned to this phase
    const startPositions: Record<string, { x: number; y: number }> = {};
    phase.nodeIds.forEach((nid) => {
      const pos = state.positions[nid];
      if (pos) startPositions[nid] = { x: pos.x, y: pos.y };
    });
    (phase.groupIds ?? []).forEach((gid) => {
      const pos = state.positions[gid];
      if (pos) startPositions[gid] = { x: pos.x, y: pos.y };
    });

    dragRef.current = { startSvgX: svgPt.x, startSvgY: svgPt.y, startPositions };
    setDraggingId(phase.id);

    let lastPushTime = 0;

    function onMove(me: MouseEvent) {
      if (!dragRef.current) return;
      const cur = screenToSvg(me.clientX, me.clientY);
      let dx = cur.x - dragRef.current.startSvgX;
      const dy = cur.y - dragRef.current.startSvgY;

      // In lanes view, clamp dx so no member node slides behind the lane title.
      if (viewMode === 'lanes') {
        const minMemberX = Math.min(
          ...Object.values(dragRef.current.startPositions).map((p) => p.x)
        );
        dx = Math.max(dx, LANE_LABEL_W - minMemberX);
      }

      const updates: Record<string, { x: number; y: number }> = {};
      Object.entries(dragRef.current.startPositions).forEach(([nid, pos]) => {
        updates[nid] = { x: pos.x + dx, y: pos.y + dy };
      });
      useGraphStore.setState((s) => ({ positions: { ...s.positions, ...updates } }));
      const now = Date.now();
      if (now - lastPushTime > 50) {
        lastPushTime = now;
        pushNonMembersOutOfPhase(phase.id);
      }
    }

    function onUp() {
      if (dragRef.current) {
        // Member node positions are already live in the store (written during onMove).
        // Push all non-members out using the unified, phase-band-aware algorithm.
        pushNonMembersOutOfPhase(phase.id);
        reorderPhasesByPosition();
        saveLayoutToCache();
        dragRef.current = null;
      }
      setDraggingId(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  if (phases.length === 0) return null;

  const sorted = [...phases].sort((a, b) => a.sequence - b.sequence);
  const hasFocus = focusedPhaseId !== null;
  const bandH = Math.max(canvasHeight, 400);
  const collapsedSet = new Set(collapsedPhaseIds);

  // Build band data — skip phases with no positioned members (nodes or groups)
  const bands: BandData[] = [];
  sorted.forEach((phase, idx) => {
    const assignedNodePositions = phase.nodeIds
      .map((nid) => positions[nid])
      .filter((p): p is Position => !!p);
    const assignedGroupPositions = (phase.groupIds ?? [])
      .map((gid) => positions[gid])
      .filter((p): p is Position => !!p);

    if (assignedNodePositions.length === 0 && assignedGroupPositions.length === 0) return;

    const allXMins = [
      ...assignedNodePositions.map((p) => p.x),
      ...assignedGroupPositions.map((p) => p.x - GROUP_R),
    ];
    const allXMaxes = [
      ...assignedNodePositions.map((p) => p.x + NODE_W),
      ...assignedGroupPositions.map((p) => p.x + GROUP_R),
    ];

    const rawMinX = Math.min(...allXMins) - PHASE_PAD_X;
    const minX = viewMode === 'lanes' ? Math.max(LANE_LABEL_W, rawMinX) : rawMinX;
    const maxX = Math.max(...allXMaxes) + PHASE_PAD_X;

    const allPositions = [...assignedNodePositions, ...assignedGroupPositions];
    let dagMinY: number | undefined;
    let dagMaxY: number | undefined;
    if (viewMode === 'dag') {
      dagMinY = Math.min(...allPositions.map((p) => p.y)) - PHASE_PAD_Y;
      dagMaxY = Math.max(...allPositions.map((p) => p.y));
    }

    bands.push({ phase, idx, minX, maxX, dagMinY, dagMaxY });
  });

  if (bands.length === 0) return null;

  return (
    <>
      {bands.map(({ phase, idx, minX, maxX, dagMinY, dagMaxY }) => {
        const isCollapsed = collapsedSet.has(phase.id);
        const isHovered = hoveredId === phase.id;
        const isFocused = focusedPhaseId === phase.id;
        const isSelected = selectedPhaseId === phase.id;
        const isGhosted = hasFocus && !isFocused;

        const fillOpacity = isGhosted ? 0.01 : isHovered ? 0.08 : isFocused ? 0.12 : 0.04;
        const headerOpacity = isGhosted ? 0.01 : isFocused ? 0.30 : isHovered ? 0.22 : 0.16;
        const strokeOpacity = isGhosted ? 0.02 : isSelected ? 0.6 : 0.2;

        // DAG mode: bands are tight envelopes around nodes; LANE mode: full-height columns
        const isDag = viewMode === 'dag' && dagMinY !== undefined && dagMaxY !== undefined;
        const bandTop = isDag ? dagMinY! : 0;
        const actualBandH = isDag ? dagMaxY! + NODE_H + PHASE_PAD_Y - bandTop : bandH;

        if (isCollapsed) {
          // ── Collapsed strip variant ────────────────────────────────────────
          const stripCenterX = minX + COLLAPSED_W / 2;
          const labelY = bandTop + actualBandH / 2;
          const expandBtnY = bandTop + 20;
          return (
            <g
              key={phase.id}
              data-phase-id={phase.id}
              style={{ cursor: 'pointer' }}
              onDoubleClick={() => onToggleCollapse(phase.id)}
              onMouseEnter={() => setHoveredId(phase.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Strip fill */}
              <rect
                x={minX}
                y={bandTop}
                width={COLLAPSED_W}
                height={actualBandH}
                rx={isDag ? 6 : 0}
                fill={phase.color}
                fillOpacity={isGhosted ? 0.01 : isHovered ? 0.12 : 0.06}
                onClick={() => onPhaseClick(phase.id)}
              />
              {/* Right border */}
              <line
                x1={minX + COLLAPSED_W}
                y1={bandTop}
                x2={minX + COLLAPSED_W}
                y2={bandTop + actualBandH}
                stroke={phase.color}
                strokeOpacity={strokeOpacity}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              {/* Rotated phase name */}
              <text
                x={stripCenterX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill={phase.color}
                fillOpacity={isGhosted ? 0.1 : 0.85}
                transform={`rotate(-90, ${stripCenterX}, ${labelY})`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {phase.name}
              </text>
              {/* Expand button (▶) */}
              <text
                x={stripCenterX}
                y={expandBtnY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fill={phase.color}
                fillOpacity={isGhosted ? 0.1 : 0.8}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(phase.id); }}
              >
                ▶
              </text>
            </g>
          );
        }

        // ── Expanded band variant ──────────────────────────────────────────
        const bandW = maxX - minX;
        const badgeX = minX + 14 + BADGE_R;
        const badgeY = bandTop + HEADER_H / 2;

        const isDraggable = designMode;
        const dragCursor = draggingId === phase.id ? 'grabbing' : isDraggable ? 'grab' : 'pointer';

        return (
          <g
            key={phase.id}
            data-phase-id={phase.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onPhaseClick(phase.id)}
            onDoubleClick={() => onPhaseDoubleClick(phase.id)}
            onMouseEnter={() => setHoveredId(phase.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Main band fill */}
            <rect
              x={minX} y={bandTop} width={bandW} height={actualBandH}
              rx={isDag ? 8 : 0}
              fill={phase.color} fillOpacity={fillOpacity}
            />

            {/* Header strip — drag handle in design mode only */}
            <rect
              x={minX} y={bandTop} width={bandW} height={HEADER_H}
              rx={isDag ? 8 : 0}
              fill={phase.color} fillOpacity={headerOpacity}
              style={{ cursor: dragCursor }}
              onMouseDown={isDraggable ? (e) => handleHeaderMouseDown(e, phase) : undefined}
            />
            {/* Square off the bottom corners of the header so it blends into the band */}
            {isDag && (
              <rect
                x={minX} y={bandTop + HEADER_H / 2} width={bandW} height={HEADER_H / 2}
                fill={phase.color} fillOpacity={headerOpacity}
              />
            )}

            {/* Border: right-side dashed line in LANE; full rounded outline in DAG */}
            {isDag ? (
              <rect
                x={minX} y={bandTop} width={bandW} height={actualBandH}
                rx={8} fill="none"
                stroke={phase.color} strokeOpacity={strokeOpacity} strokeWidth={1.5} strokeDasharray="6 4"
              />
            ) : (
              <line
                x1={maxX} y1={0} x2={maxX} y2={bandH}
                stroke={phase.color} strokeOpacity={strokeOpacity} strokeWidth={1.5} strokeDasharray="6 4"
              />
            )}

            {/* Number badge */}
            <circle cx={badgeX} cy={badgeY} r={BADGE_R} fill={phase.color} fillOpacity={isGhosted ? 0.05 : 0.85} />
            <text
              x={badgeX} y={badgeY + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontWeight={700} fill="#fff"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {idx + 1}
            </text>

            {/* Phase name */}
            <text
              x={badgeX + BADGE_R + 6} y={badgeY + 1}
              dominantBaseline="middle" fontSize={13} fontWeight={600}
              fill={phase.color} fillOpacity={isGhosted ? 0.1 : 0.9}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {phase.name}
            </text>

            {/* Collapse button (◀) */}
            <text
              x={maxX - 14} y={badgeY + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={12} fill={phase.color} fillOpacity={isGhosted ? 0.1 : 0.7}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(phase.id); }}
            >
              ◀
            </text>
          </g>
        );
      })}
    </>
  );
}

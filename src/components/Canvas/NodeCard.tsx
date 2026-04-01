/**
 * components/Canvas/NodeCard.tsx — Renders a single node as an SVG group.
 *
 * Fix notes:
 *  - Uses CSS `style.transform` (not SVG `transform` attribute) so node positions
 *    can be CSS-transitioned during view/focus-mode switches.
 *  - Uses `wasDraggedRef` to prevent the click handler from firing after a drag
 *    (the SVG `click` event fires after `mouseup`, at which point dragRef is null).
 *  - In LANES view, node Y position is clamped to its owner's lane bounds on drag.
 *  - Hover dim/highlight is entirely CSS-driven (no Zustand subscription).
 */

import React, { memo, useRef, useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { NODE_W, NODE_H, truncateText } from '../../utils/layout';
import type { GraphNode, Position } from '../../types/graph';

interface NodeCardProps {
  node: GraphNode;
  position: Position;
  color: string;
  screenToSvg: (clientX: number, clientY: number) => Position;
  onFocusRequest: (id: string) => void;
}

export const NodeCard = memo(function NodeCard({ node, position, color, screenToSvg, onFocusRequest }: NodeCardProps) {
  const {
    selectedNodeId, lastJumpedNodeId,
    designMode, designTool, connectSourceId,
    setSelectedNode, setHoveredNode, setConnectSource, addEdge,
    saveLayoutToCache,
  } = useGraphStore();

  const groupRef = useRef<SVGGElement>(null);

  const dragRef = useRef<{
    startSvgX: number; startSvgY: number;
    startNodeX: number; startNodeY: number;
    moved: boolean;
  } | null>(null);

  // Separate flag: set true during drag, consumed by handleClick to block selection.
  // Necessary because onMouseUp nulls dragRef BEFORE the browser fires the click event.
  const wasDraggedRef = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLocalHovered, setIsLocalHovered] = useState(false);

  const isSelected = selectedNodeId === node.id;
  const isJumped = lastJumpedNodeId === node.id;
  const isConnectSource = connectSourceId === node.id;

  let strokeColor = 'var(--border2)';
  let strokeWidth = 1.5;
  if (isConnectSource) { strokeColor = '#a78bfa'; strokeWidth = 2.5; }
  else if (isSelected || isLocalHovered) { strokeColor = 'var(--accent)'; strokeWidth = 2; }

  // ── Drag handling ─────────────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    if (designMode && designTool === 'connect') return;

    const svgPt = screenToSvg(e.clientX, e.clientY);
    wasDraggedRef.current = false;
    dragRef.current = {
      startSvgX: svgPt.x,
      startSvgY: svgPt.y,
      startNodeX: position.x,
      startNodeY: position.y,
      moved: false,
    };

    function onMouseMove(me: MouseEvent) {
      if (!dragRef.current) return;
      const currentSvgPt = screenToSvg(me.clientX, me.clientY);
      const dx = currentSvgPt.x - dragRef.current.startSvgX;
      const dy = currentSvgPt.y - dragRef.current.startSvgY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragRef.current.moved = true;
        wasDraggedRef.current = true; // persists past mouseup so click handler can see it
      }
      if (dragRef.current.moved) {
        groupRef.current?.classList.add('node-dragging');
        const state = useGraphStore.getState();
        let newY = dragRef.current.startNodeY + dy;

        // Clamp to the node's own swim lane in LANES view
        if (state.viewMode === 'lanes') {
          const lane = state.laneMetrics[node.owner];
          if (lane) {
            const margin = 6;
            newY = Math.max(
              lane.y + margin,
              Math.min(lane.y + lane.height - NODE_H - margin, newY)
            );
          }
        }

        useGraphStore.setState((s) => ({
          positions: {
            ...s.positions,
            [node.id]: { x: dragRef.current!.startNodeX + dx, y: newY },
          },
        }));
      }
    }

    function onMouseUp() {
      if (dragRef.current?.moved) saveLayoutToCache();
      groupRef.current?.classList.remove('node-dragging');
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // ── Click: select node or complete connection ─────────────────────────
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    // Block click if this mousedown-mouseup was actually a drag
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }

    if (designMode && designTool === 'connect') {
      if (!connectSourceId) {
        setConnectSource(node.id);
      } else if (connectSourceId !== node.id) {
        addEdge(connectSourceId, node.id);
        setConnectSource(null);
      }
      return;
    }

    setSelectedNode(node.id);
  }

  // ── Double-click: focus mode (view) or edit (design) ─────────────────
  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (designMode) {
      document.dispatchEvent(new CustomEvent('flowgraph:edit-node', { detail: { nodeId: node.id } }));
    } else {
      onFocusRequest(node.id);
    }
  }

  return (
    <g
      ref={groupRef}
      className={`node-group${isJumped ? ' node-jumped' : ''}`}
      data-id={node.id}
      // CSS transform (not SVG attribute) enables CSS transitions for view/focus switches
      style={{ cursor: 'grab', transform: `translate(${position.x}px,${position.y}px)` }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => { setIsLocalHovered(true); setHoveredNode(node.id); }}
      onMouseLeave={() => { setIsLocalHovered(false); setHoveredNode(null); }}
    >
      {/* Drop shadow */}
      <rect x={2} y={4} width={NODE_W} height={NODE_H} rx={6}
        fill="rgba(0,0,0,0.3)" style={{ filter: 'blur(4px)' }} />

      {/* Main rectangle */}
      <rect
        className="node-main-rect"
        width={NODE_W} height={NODE_H} rx={6}
        fill={isLocalHovered || isSelected ? 'var(--surface2)' : 'var(--surface)'}
        stroke={strokeColor} strokeWidth={strokeWidth}
        style={{ transition: 'fill .15s, stroke .15s' }}
      />

      {/* Left accent bar */}
      <rect x={0} y={0} width={4} height={NODE_H} rx={3} fill={color} />

      {/* Node ID */}
      <text x={14} y={20} fontFamily="var(--font-mono)" fontSize={9}
        fill="var(--text3)" style={{ pointerEvents: 'none' }}>
        #{node.id}
      </text>

      {/* Node name */}
      <text x={14} y={38} fontFamily="var(--font-mono)" fontSize={11.5} fontWeight={600}
        fill="var(--text)" style={{ pointerEvents: 'none' }}>
        {truncateText(node.name, 20)}
      </text>

      {/* Owner */}
      <text x={14} y={56} fontFamily="var(--font-mono)" fontSize={9}
        fill={color} style={{ pointerEvents: 'none' }}>
        {truncateText(node.owner, 24)}
      </text>
    </g>
  );
});

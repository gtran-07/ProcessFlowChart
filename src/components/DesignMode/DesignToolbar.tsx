/**
 * components/DesignMode/DesignToolbar.tsx — Purple banner toolbar shown when design mode is active.
 */

import React, { useEffect } from 'react';
import { useGraphStore } from '../../store/graphStore';
import type { DesignTool } from '../../types/graph';
import styles from './DesignToolbar.module.css';

const TOOL_HINTS: Record<DesignTool, string> = {
  select: 'Drag nodes to reposition. Click to inspect.',
  add: 'Click empty canvas to add a node at that position.',
  connect: 'Click source node → click target node to draw an edge.',
};

export function DesignToolbar() {
  const { designTool, setDesignTool, selectedNodeId, undoStack, redoStack, undo, redo } = useGraphStore();

  // Ctrl+Z = undo, Ctrl+Y or Ctrl+Shift+Z = redo
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  function handleEditClick() {
    if (!selectedNodeId) return;
    document.dispatchEvent(
      new CustomEvent('flowgraph:edit-node', { detail: { nodeId: selectedNodeId } })
    );
  }

  return (
    <div className={styles.banner}>
      <strong className={styles.label}>✏️ Design Mode</strong>
      <div className={styles.sep} />

      <button
        className={`${styles.toolBtn} ${designTool === 'select' ? styles.active : ''}`}
        onClick={() => setDesignTool('select')}
        title="Select / move nodes"
      >Select</button>

      <button
        className={`${styles.toolBtn} ${designTool === 'add' ? styles.active : ''}`}
        onClick={() => setDesignTool('add')}
        title="Click canvas to add a node"
      >Add Node</button>

      <button
        className={`${styles.toolBtn} ${designTool === 'connect' ? styles.active : ''}`}
        onClick={() => setDesignTool('connect')}
        title="Click source then target to draw a connection"
      >Connect</button>

      <div className={styles.sep} />

      <button
        className={styles.toolBtn}
        onClick={handleEditClick}
        disabled={!selectedNodeId}
        title={selectedNodeId ? 'Edit selected node' : 'Select a node first'}
        style={{ opacity: selectedNodeId ? 1 : 0.4 }}
      >Edit Node</button>

      <div className={styles.sep} />

      <button
        className={styles.toolBtn}
        onClick={undo}
        disabled={undoStack.length === 0}
        title="Undo (Ctrl+Z)"
        style={{ opacity: undoStack.length === 0 ? 0.4 : 1 }}
      >↩ Undo</button>

      <button
        className={styles.toolBtn}
        onClick={redo}
        disabled={redoStack.length === 0}
        title="Redo (Ctrl+Y)"
        style={{ opacity: redoStack.length === 0 ? 0.4 : 1 }}
      >↪ Redo</button>

      <span className={styles.hint}>{TOOL_HINTS[designTool]}</span>
    </div>
  );
}

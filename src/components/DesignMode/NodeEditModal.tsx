/**
 * components/DesignMode/NodeEditModal.tsx — Modal for adding or editing a node.
 *
 * Triggered by:
 *   - Clicking "Add Node" tool then clicking canvas (add mode)
 *   - Double-clicking a node in design mode (edit mode)
 *   - Clicking "Edit Node" in DesignToolbar or Inspector
 *
 * Listens for two custom DOM events:
 *   - 'flowgraph:add-node'  → opens in add mode with canvas click position
 *   - 'flowgraph:edit-node' → opens in edit mode with the node's current data
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { generateNodeId } from '../../utils/exportJson';
import type { Position } from '../../types/graph';
import styles from './NodeEditModal.module.css';

type ModalMode = 'add' | 'edit';

export function NodeEditModal() {
  const { allNodes, addNode, updateNode, deleteNode, ownerColors } = useGraphStore();

  // ── Local modal state ─────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>('add');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<Position>({ x: 0, y: 0 });

  // Form fields
  const [fieldId, setFieldId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldOwner, setFieldOwner] = useState('');
  const [fieldDesc, setFieldDesc] = useState('');
  const [ownerOpen, setOwnerOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Unique owners for the datalist autocomplete
  const existingOwners = [...new Set(allNodes.map((n) => n.owner))];

  // ── Listen for open events dispatched by Canvas and DesignToolbar ─────
  useEffect(() => {
    function handleAddNode(e: Event) {
      const position = (e as CustomEvent<Position>).detail;
      setMode('add');
      setEditingNodeId(null);
      setInsertPosition(position);
      setFieldId(generateNodeId(allNodes));
      setFieldName('');
      setFieldOwner(existingOwners[0] ?? '');
      setFieldDesc('');
      setIsOpen(true);
    }

    function handleEditNode(e: Event) {
      const { nodeId } = (e as CustomEvent<{ nodeId: string }>).detail;
      const node = allNodes.find((n) => n.id === nodeId);
      if (!node) return;
      setMode('edit');
      setEditingNodeId(nodeId);
      setFieldId(node.id);
      setFieldName(node.name);
      setFieldOwner(node.owner);
      setFieldDesc(node.description);
      setIsOpen(true);
    }

    document.addEventListener('flowgraph:add-node', handleAddNode);
    document.addEventListener('flowgraph:edit-node', handleEditNode);
    return () => {
      document.removeEventListener('flowgraph:add-node', handleAddNode);
      document.removeEventListener('flowgraph:edit-node', handleEditNode);
    };
  }, [allNodes, existingOwners]);

  // ── Auto-focus name field when modal opens ────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => nameInputRef.current?.focus(), 80);
  }, [isOpen]);

  // ── Close on Escape ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function handleSave() {
    if (!fieldId.trim() || !fieldName.trim()) {
      alert('Node ID and Name are required.');
      return;
    }

    if (mode === 'add') {
      // Check for duplicate ID before adding
      if (allNodes.find((n) => n.id === fieldId.trim())) {
        alert(`A node with ID "${fieldId.trim()}" already exists. Please use a unique ID.`);
        return;
      }
      addNode(
        {
          id: fieldId.trim(),
          name: fieldName.trim(),
          owner: fieldOwner.trim() || 'Unknown',
          description: fieldDesc.trim(),
          dependencies: [],
        },
        insertPosition
      );
    } else if (editingNodeId) {
      updateNode(editingNodeId, {
        name: fieldName.trim(),
        owner: fieldOwner.trim() || 'Unknown',
        description: fieldDesc.trim(),
      });
    }

    setIsOpen(false);
  }

  function handleDelete() {
    if (!editingNodeId) return;
    const node = allNodes.find((n) => n.id === editingNodeId);
    if (!node) return;
    if (!confirm(`Delete "${node.name}"? All connections to/from this node will also be removed.`)) return;
    deleteNode(editingNodeId);
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.icon}>{mode === 'add' ? '➕' : '✏️'}</span>
          <div className={styles.title}>{mode === 'add' ? 'Add Node' : 'Edit Node'}</div>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Node ID — editable only when adding, locked when editing */}
          <div className={styles.field}>
            <label className={styles.label}>Node ID</label>
            <input
              className={styles.input}
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value)}
              disabled={mode === 'edit'}
              style={{ opacity: mode === 'edit' ? 0.5 : 1 }}
              placeholder="e.g. STEP-01"
              maxLength={40}
            />
            {mode === 'edit' && (
              <div className={styles.fieldHint}>ID cannot be changed (it's referenced by other nodes' dependencies)</div>
            )}
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input
              ref={nameInputRef}
              className={styles.input}
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Short descriptive name"
              maxLength={60}
            />
          </div>

          {/* Owner — with custom dropdown from existing owners */}
          <div className={styles.field}>
            <label className={styles.label}>Owner / Lane</label>
            <div style={{ position: 'relative' }}>
              <input
                className={styles.input}
                value={fieldOwner}
                onChange={(e) => { setFieldOwner(e.target.value); setOwnerOpen(true); }}
                onFocus={() => setOwnerOpen(true)}
                onBlur={() => setTimeout(() => setOwnerOpen(false), 160)}
                placeholder="e.g. Engineering"
                maxLength={60}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setOwnerOpen((o) => !o)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0,
                  width: 28, background: 'transparent', border: 'none',
                  color: 'var(--text3)', cursor: 'pointer', fontSize: 10,
                }}
              >▾</button>
              {ownerOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                  background: 'var(--surface)', border: '1px solid var(--border2)',
                  borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                  maxHeight: 180, overflowY: 'auto', marginTop: 2,
                }}>
                  {existingOwners
                    .filter((o) => o.toLowerCase().includes(fieldOwner.toLowerCase()))
                    .map((owner) => (
                      <div
                        key={owner}
                        onMouseDown={() => { setFieldOwner(owner); setOwnerOpen(false); }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 8,
                          borderBottom: '1px solid var(--border)',
                          color: 'var(--text)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: ownerColors[owner] ?? '#4f9eff',
                        }} />
                        {owner}
                      </div>
                    ))}
                  {fieldOwner.trim() && !existingOwners.some((o) => o.toLowerCase() === fieldOwner.trim().toLowerCase()) && (
                    <div
                      onMouseDown={() => { setOwnerOpen(false); }}
                      style={{
                        padding: '8px 12px', fontSize: 11,
                        color: 'var(--accent)', fontStyle: 'italic',
                        borderTop: existingOwners.length > 0 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      + Create new owner: "{fieldOwner.trim()}"
                    </div>
                  )}
                  {existingOwners.filter((o) => o.toLowerCase().includes(fieldOwner.toLowerCase())).length === 0 &&
                    !fieldOwner.trim() && (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)' }}>
                      No owners yet — type a name
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={fieldDesc}
              onChange={(e) => setFieldDesc(e.target.value)}
              placeholder="1–3 sentences explaining what this step involves"
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          {/* Delete button — only in edit mode */}
          {mode === 'edit' && (
            <button className={styles.deleteBtn} onClick={handleDelete}>
              Delete Node
            </button>
          )}
          <button className={styles.cancelBtn} onClick={() => setIsOpen(false)}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

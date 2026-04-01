/**
 * components/Panels/Sidebar.tsx — Left pane with owner filter checkboxes.
 *
 * Lists all unique owners in the graph with colored dots and node counts.
 * Checking/unchecking an owner shows/hides all their nodes on the canvas.
 * Includes a "Select All" toggle and collapses to a floating peek button.
 *
 * Auto-opens when the first JSON file is loaded.
 * Responds to the 'flowgraph:toggle-sidebar' custom event dispatched by the Header.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '../../store/graphStore';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { allNodes, activeOwners, ownerColors, toggleOwner, toggleAllOwners, fitToScreen } =
    useGraphStore();

  const [collapsed, setCollapsed] = useState(true);

  // ── Auto-expand when first data is loaded ─────────────────────────────
  // We track whether we've already auto-opened so repeated loads (or reactive
  // re-renders) don't fight the user if they manually collapsed the sidebar.
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (allNodes.length > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setCollapsed(false);
    }
    // Reset the flag when data is cleared so the next load auto-opens again.
    if (allNodes.length === 0) hasAutoOpened.current = false;
  }, [allNodes.length]);

  // ── Listen for the header's ☰ toggle button ───────────────────────────
  useEffect(() => {
    function handleToggle() {
      setCollapsed((c) => !c);
    }
    document.addEventListener('flowgraph:toggle-sidebar', handleToggle);
    return () => document.removeEventListener('flowgraph:toggle-sidebar', handleToggle);
  }, []);

  // ── Derive ordered unique owner list ──────────────────────────────────
  const owners: string[] = [];
  allNodes.forEach((node) => {
    if (!owners.includes(node.owner)) owners.push(node.owner);
  });

  const allActive = owners.length > 0 && owners.every((o) => activeOwners.has(o));

  /**
   * handleToggleOwner — toggles one owner then fits the viewport so newly
   * visible nodes are not stranded off-screen.
   */
  function handleToggleOwner(owner: string) {
    toggleOwner(owner);
    // Fit after a microtask so the store update (and React re-render) has
    // settled before we read the canvas dimensions.
    setTimeout(() => fitToScreen(), 60);
  }

  /**
   * handleToggleAll — same pattern for the Select All control.
   */
  function handleToggleAll() {
    toggleAllOwners();
    setTimeout(() => fitToScreen(), 60);
  }

  return (
    <>
      {/* Main sidebar panel */}
      <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
          <span>Owners</span>
          <button
            className={styles.allBtn}
            onClick={handleToggleAll}
            title={allActive ? 'Deselect all owners' : 'Select all owners'}
          >
            ALL
          </button>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(true)}
            title="Collapse filters"
          >»</button>
        </div>

        <div className={styles.filterScroll}>
          {owners.length === 0 ? (
            <div className={styles.empty}>Load a JSON file to see owners</div>
          ) : (
            <>
              {/* Select All row */}
              <div
                className={`${styles.filterItem} ${allActive ? styles.checked : ''}`}
                onClick={handleToggleAll}
              >
                <div className={styles.checkBox} />
                <span className={`${styles.checkLabel} ${styles.checkLabelBold}`}>Select All</span>
                <span className={styles.filterCount}>{owners.length}</span>
              </div>
              <div className={styles.sep} />
              {/* Individual owner rows */}
              {owners.map((owner) => {
                const count = allNodes.filter((n) => n.owner === owner).length;
                const isActive = activeOwners.has(owner);
                return (
                  <div
                    key={owner}
                    className={`${styles.filterItem} ${isActive ? styles.checked : ''}`}
                    onClick={() => handleToggleOwner(owner)}
                  >
                    <div className={styles.checkBox} />
                    <span
                      className={styles.ownerDot}
                      style={{ background: ownerColors[owner] ?? '#4f9eff' }}
                    />
                    <span className={styles.checkLabel}>{owner}</span>
                    <span className={styles.filterCount}>{count}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Floating peek button — shown when sidebar is collapsed */}
      {collapsed && (
        <button
          className={styles.peekBtn}
          onClick={() => setCollapsed(false)}
          title="Show owner filters"
        >
          ☰
        </button>
      )}
    </>
  );
}

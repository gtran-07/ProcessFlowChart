/**
 * components/Modals/UserGuideModal.tsx — Full interactive user guide modal.
 *
 * Contains 19 fully-written sections covering every feature of FlowGraph.
 * Written for a non-technical user who has never used the app before.
 *
 * Navigation: fixed left panel with section links, scrollable right content area.
 * Keyboard shortcut: Shift+? opens this modal (wired in App.tsx).
 * Also listens for 'flowgraph:guide-state' custom events from Header.
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './UserGuideModal.module.css';

// ─── AI PROMPT & EXAMPLE ─────────────────────────────────────────────────────

const AI_PROMPT = `You are converting a graphical process flow (PDF/Visio/description) into a JSON file for a dependency flowchart viewer.

OUTPUT REQUIREMENT:
- Output ONLY valid JSON. No markdown. No explanation. No code fences.

JSON FORMAT:
- Output must be a JSON array of node objects: [ { ... }, { ... } ].
- Each node object MUST contain:
  - "id": string (unique)
  - "name": string (≤60 chars)
  - "owner": string (lane/group name)
  - "description": string (1–3 sentences)
  - "dependencies": array of string ids (prerequisites — nodes that must complete BEFORE this one)

DEPENDENCY DIRECTION (IMPORTANT):
- "dependencies" are PREREQUISITES.
- If step B requires step A to be done first, then B.dependencies includes "A".
- Do NOT list downstream steps as dependencies.

RULES:
1) IDs must be unique and stable. Use a consistent scheme like "REQ-01", "DES-02", "TEST-03".
2) Every dependency id must exist in the output — no dangling references.
3) If the diagram contains a loop/cycle, break it by inserting a review/approval/checkpoint node.
4) Use owner names as lane headers (or infer lanes if not explicitly labeled).
5) Keep "name" short and "description" 1–3 sentences.

FINAL VALIDATION BEFORE OUTPUT:
- Ensure no duplicate ids.
- Ensure all dependencies reference existing ids.
- Ensure dependencies represent prerequisites (not outputs).

Now output the JSON array only.`;

const EXAMPLE_JSON = `[
  {
    "id": "REQ-01",
    "name": "Gather Requirements",
    "owner": "Project",
    "description": "Collect requirements and constraints from stakeholders.",
    "dependencies": []
  },
  {
    "id": "DES-01",
    "name": "Create Functional Design",
    "owner": "Engineering",
    "description": "Draft the functional design and review with stakeholders.",
    "dependencies": ["REQ-01"]
  },
  {
    "id": "TEST-01",
    "name": "Execute Validation Test",
    "owner": "QA",
    "description": "Run validation tests and record results.",
    "dependencies": ["DES-01"]
  }
]`;

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });
}

// ─── SECTION DATA ────────────────────────────────────────────────────────────

interface GuideSection {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

function Tip({ children }: { children: React.ReactNode }) {
  return <div className={styles.tip}><span className={styles.tipIcon}>💡</span><div>{children}</div></div>;
}
function Warning({ children }: { children: React.ReactNode }) {
  return <div className={styles.warning}><span className={styles.tipIcon}>⚠️</span><div>{children}</div></div>;
}
function Shortcut({ keys, action }: { keys: string; action: string }) {
  return (
    <div className={styles.shortcutRow}>
      <code className={styles.kbd}>{keys}</code>
      <span className={styles.shortcutAction}>{action}</span>
    </div>
  );
}
function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className={styles.step}>
      <div className={styles.stepNum}>{number}</div>
      <div>{children}</div>
    </div>
  );
}

const SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    content: (
      <div>
        <p>FlowGraph is a visual tool for exploring <strong>dependency maps</strong> — diagrams that show which tasks, steps, or systems must be completed before others can begin. Think of it like a visual to-do list where some tasks are blocked until earlier tasks finish.</p>
        <p style={{marginTop:12}}>Every box on the canvas is a <strong>node</strong> (a step or task). Every arrow is a <strong>connection</strong> showing that one step depends on another. An arrow from A → B means "B cannot start until A is done."</p>

        <h4 className={styles.subheading}>Loading your first file</h4>
        <Step number={1}>Click <strong>Browse JSON File</strong> in the top-left of the header.</Step>
        <Step number={2}>Select a <code>.json</code> file from your computer. The file must contain an array of node objects (see the JSON Spec in the Help modal for the exact format).</Step>
        <Step number={3}>The graph appears on the canvas. The sidebar opens showing all owners/teams, and the status bar updates with the node and edge count.</Step>

        <h4 className={styles.subheading}>Don't have a JSON file yet?</h4>
        <p>Use the <strong>📋 Help button</strong> in the header to open the AI Prompt tab. Copy the prompt, paste it into any AI assistant (Claude, Copilot, ChatGPT), describe your process, and the AI will generate the JSON for you. Save the output as a <code>.json</code> file and load it here.</p>

        <Tip>Tell the AI "output JSON only, no explanation" to avoid having to strip out markdown text before loading.</Tip>
      </div>
    ),
  },
  {
    id: 'navigating',
    icon: '🧭',
    title: 'Navigating the Canvas',
    content: (
      <div>
        <p>The canvas is an infinite scrollable space. You can pan in any direction and zoom in and out freely.</p>

        <h4 className={styles.subheading}>Pan (move around)</h4>
        <p>Click and drag on any <strong>empty area</strong> of the canvas (not on a node or edge). The cursor changes to a grabbing hand while panning.</p>

        <h4 className={styles.subheading}>Zoom</h4>
        <p>Scroll your mouse wheel to zoom in and out. The zoom is <strong>centered on your cursor position</strong> — whatever is under your cursor stays fixed as you zoom. You can also use the <strong>+</strong> and <strong>−</strong> buttons at the bottom-center of the canvas.</p>

        <h4 className={styles.subheading}>Fit to Screen</h4>
        <p>Click the <strong>⊞</strong> button in the header to automatically zoom and center the entire graph so all nodes are visible. Useful after loading a new file or after navigating far from the main graph.</p>

        <h4 className={styles.subheading}>Reset Layout</h4>
        <p>Click the <strong>↺</strong> button in the header to recalculate the automatic layout from scratch. This is useful if you've dragged nodes around and want to start fresh. Note: this clears your manual arrangement.</p>

        <h4 className={styles.subheading}>Minimap</h4>
        <p>The small map in the <strong>bottom-right corner</strong> shows the entire graph at a reduced scale. The blue rectangle represents your current viewport. Click anywhere on the minimap to jump to that area of the graph.</p>

        <Tip>If you've zoomed in very close and lost your place, click ⊞ (Fit to Screen) to get back to the full view.</Tip>
      </div>
    ),
  },
  {
    id: 'understanding',
    icon: '📊',
    title: 'Understanding the Graph',
    content: (
      <div>
        <p>Each element in the graph has a specific meaning:</p>

        <h4 className={styles.subheading}>Nodes (boxes)</h4>
        <p>Each box represents a step, task, or process. Inside each box you'll see:</p>
        <ul className={styles.ul}>
          <li><strong>#ID</strong> (small text, top) — the unique identifier for this node</li>
          <li><strong>Name</strong> (bold text, center) — the display label for this step</li>
          <li><strong>Owner</strong> (colored text, bottom) — which team or person owns this step</li>
          <li><strong>Colored left bar</strong> — the color represents the owner/team. Same color = same owner.</li>
        </ul>

        <h4 className={styles.subheading}>Edges (arrows)</h4>
        <p>An arrow from node A to node B means <strong>"B depends on A"</strong> — A must be completed before B can start. Follow the arrows left-to-right to understand the sequence of work.</p>

        <h4 className={styles.subheading}>Node visual states</h4>
        <ul className={styles.ul}>
          <li><strong>Normal</strong> — plain dark box with subtle border</li>
          <li><strong>Hovered</strong> — blue border; connected nodes are highlighted, others fade out</li>
          <li><strong>Selected</strong> — persistent blue border; details shown in the Inspector panel</li>
          <li><strong>Search result</strong> — amber/gold border after a search</li>
          <li><strong>Jumped-to</strong> — pulsing amber glow after clicking a search result. Fades after 3 seconds.</li>
          <li><strong>Highlighted</strong> — teal border on nodes directly connected to the hovered node</li>
          <li><strong>Dimmed</strong> — 35% opacity on nodes not connected to the hovered node</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'searching',
    icon: '🔍',
    title: 'Searching for Nodes',
    content: (
      <div>
        <p>The search bar at the top of the screen lets you quickly find any node by name, ID, or owner.</p>

        <Step number={1}>Click the search bar or press <code>⌘K</code> (Mac) / <code>Ctrl+K</code> (Windows) to focus it.</Step>
        <Step number={2}>Start typing any part of the node's name, ID, or owner name.</Step>
        <Step number={3}>A dropdown appears with matching results. Each result shows the name, ID, and owner.</Step>
        <Step number={4}>Click any result to jump to that node. The canvas pans and zooms to center it, and the node pulses with a glow for a few seconds.</Step>

        <p>Press <code>Escape</code> to close the search results without navigating anywhere.</p>

        <Tip>Search is case-insensitive and matches partial text. Searching "des" will find "Design", "description", etc.</Tip>
      </div>
    ),
  },
  {
    id: 'filtering',
    icon: '🏷️',
    title: 'Filtering by Owner',
    content: (
      <div>
        <p>When a graph has many nodes across multiple teams or departments, you can filter to show only specific owners.</p>

        <Step number={1}>Click the <strong>☰</strong> button in the header (or the floating ☰ button if the sidebar is collapsed) to open the Owners panel on the left.</Step>
        <Step number={2}>Each owner is listed with a colored dot and a count of their nodes.</Step>
        <Step number={3}>Click any owner row to toggle their nodes on or off.</Step>
        <Step number={4}>Edges are also filtered — if either endpoint is hidden, the edge is hidden too.</Step>

        <p>The <strong>Select All / ALL</strong> button at the top toggles all owners at once.</p>
        <p>Click <strong>»</strong> inside the panel or <strong>☰</strong> in the header again to collapse the sidebar.</p>

        <Warning>Filtering hides nodes from the canvas view but does not delete them. All filtered nodes are still in the data and will reappear when you re-enable their owner.</Warning>
      </div>
    ),
  },
  {
    id: 'views',
    icon: '👁️',
    title: 'View Modes (DAG vs Lanes)',
    content: (
      <div>
        <p>FlowGraph has two ways to arrange nodes on the canvas, switchable via the <strong>DAG / LANES</strong> toggle in the header.</p>

        <h4 className={styles.subheading}>DAG View (default)</h4>
        <p>Nodes are arranged <strong>left-to-right by dependency depth</strong>. Nodes with no dependencies (the starting points) appear on the left. Each subsequent column contains nodes that depend on nodes in the previous column. This gives the clearest picture of the overall flow sequence.</p>
        <p>Best for: understanding the full sequence, identifying bottlenecks, seeing the critical path.</p>

        <h4 className={styles.subheading}>LANES View</h4>
        <p>Nodes are grouped into <strong>horizontal swim lanes by owner</strong>. Each team's nodes appear in their own labeled band. The left-to-right column position still reflects dependency depth, so you can see both who does what AND when they do it.</p>
        <p>Best for: understanding team responsibilities, cross-team handoffs, parallel workstreams.</p>

        <Tip>Your arrangement in each view is saved separately. Switching from DAG to LANES and back restores exactly where you left off in each view.</Tip>
      </div>
    ),
  },
  {
    id: 'focus-mode',
    icon: '🎯',
    title: 'Focus Mode',
    content: (
      <div>
        <p>Focus Mode lets you zoom into the immediate context of one node — showing only that node, what it depends on, and what depends on it. Everything else is hidden temporarily.</p>

        <h4 className={styles.subheading}>Entering Focus Mode</h4>
        <p><strong>Double-click any node</strong> (when Design Mode is OFF). The canvas animates to show only the focused node plus its direct parents (upstream dependencies) and direct children (downstream dependents).</p>
        <p>A yellow banner appears at the top of the canvas showing the focused node's name.</p>

        <h4 className={styles.subheading}>Exiting Focus Mode</h4>
        <p>There are three ways to exit:</p>
        <ul className={styles.ul}>
          <li>Press <code>Escape</code></li>
          <li>Click the <strong>✕</strong> on the focus banner</li>
          <li>Double-click the canvas background</li>
        </ul>
        <p>The graph animates back to exactly the positions and zoom level you had before entering focus mode.</p>

        <Warning>Double-clicking a node while Design Mode is active opens the Edit Node dialog instead of entering Focus Mode.</Warning>
      </div>
    ),
  },
  {
    id: 'inspector',
    icon: '🔎',
    title: 'Inspecting a Node',
    content: (
      <div>
        <p>The Inspector panel (right side) shows the full details of any selected node.</p>

        <Step number={1}><strong>Single-click</strong> any node to select it. The Inspector panel opens automatically.</Step>
        <Step number={2}>The Inspector shows: the node's full name, ID, description, owner (as a colored tag), and all dependencies listed as tags.</Step>
        <Step number={3}>Click the <strong>«</strong> button inside the Inspector, or click the <strong>▣</strong> button in the header, to close it.</Step>

        <p>The Inspector closes automatically if the selected node becomes hidden (for example, if you filter out its owner).</p>
        <p>When Design Mode is active, an <strong>Edit Node</strong> button appears at the bottom of the Inspector for quick access to editing.</p>

        <Tip>Dependency tags in the Inspector show the node's <em>name</em>, not its ID, for readability.</Tip>
      </div>
    ),
  },
  {
    id: 'layouts',
    icon: '💾',
    title: 'Saved Layouts',
    content: (
      <div>
        <p>After arranging nodes where you want them (by dragging), you can save the layout with a name and restore it later.</p>

        <Step number={1}>Click the <strong>Layouts</strong> button in the header.</Step>
        <Step number={2}>Type a name for your layout in the input field.</Step>
        <Step number={3}>Press <code>Enter</code> or click <strong>SAVE</strong>.</Step>
        <Step number={4}>Your layout appears in the list below. Click it to restore that arrangement.</Step>
        <Step number={5}>Click the <strong>✕</strong> icon on a layout row to delete it.</Step>

        <p>Saved layouts store both the node positions AND the viewport zoom/pan. Restoring a layout puts everything back exactly as it was.</p>

        <Warning>Layouts are stored in your browser's localStorage. They survive page refreshes but are browser-specific — they won't appear in a different browser or on a different computer.</Warning>
        <Warning>If you load a different JSON file, existing saved layouts may no longer match the nodes (the IDs might not exist in the new file). Always save a new layout after loading new data.</Warning>
      </div>
    ),
  },
  {
    id: 'design-overview',
    icon: '✏️',
    title: 'Design Mode Overview',
    content: (
      <div>
        <p>Design Mode lets you modify the graph directly in the browser — adding nodes, drawing connections, editing details, and deleting elements — without needing to edit the JSON file manually.</p>

        <h4 className={styles.subheading}>Activating Design Mode</h4>
        <p>Click the <strong>✏️ Design</strong> button in the header. It only activates when a JSON file is loaded. A purple toolbar banner appears at the top of the canvas.</p>

        <h4 className={styles.subheading}>The Design Toolbar</h4>
        <p>The purple banner contains four tools and a hint showing what the current tool does:</p>
        <ul className={styles.ul}>
          <li><strong>Select</strong> — default; drag nodes and click to inspect</li>
          <li><strong>Add Node</strong> — click empty canvas to place a new node</li>
          <li><strong>Connect</strong> — draw a new directed connection between two nodes</li>
          <li><strong>Edit Node</strong> — open the edit dialog for the selected node</li>
        </ul>

        <h4 className={styles.subheading}>Saving changes</h4>
        <p>Whenever you make any change, the <strong>Save JSON</strong> button appears in the header (teal color). Click it to download the updated <code>flowgraph.json</code> file. You can reload this file into FlowGraph at any time.</p>

        <Warning>Changes are NOT saved automatically. If you close the browser without clicking Save JSON, your changes will be lost.</Warning>

        <Tip>Double-clicking a node in Design Mode opens the Edit dialog. In normal view mode, double-clicking enters Focus Mode.</Tip>
      </div>
    ),
  },
  {
    id: 'design-select',
    icon: '🖱️',
    title: 'Design: Select Tool',
    content: (
      <div>
        <p>The Select tool is the default tool when Design Mode is active. It behaves the same as normal view mode.</p>
        <ul className={styles.ul}>
          <li><strong>Drag a node</strong> to reposition it on the canvas</li>
          <li><strong>Single-click a node</strong> to select it and open the Inspector</li>
          <li><strong>Double-click a node</strong> to open the Edit Node dialog</li>
          <li><strong>Click empty canvas</strong> to deselect</li>
        </ul>
        <p>Switch back to Select after using Add Node or Connect to avoid accidentally adding nodes or starting connections when you click.</p>

        <Tip>Dragged positions are saved automatically. Click <strong>Layouts</strong> to save a named snapshot of the current arrangement.</Tip>
      </div>
    ),
  },
  {
    id: 'design-add',
    icon: '➕',
    title: 'Design: Add Node',
    content: (
      <div>
        <p>The Add Node tool lets you create new nodes by clicking directly on the canvas where you want them placed.</p>

        <Step number={1}>Click <strong>Add Node</strong> in the design toolbar. The cursor changes to a crosshair (+).</Step>
        <Step number={2}>Click anywhere on the empty canvas where you want the new node to appear.</Step>
        <Step number={3}>The <strong>Add Node form</strong> opens with these fields:
          <ul className={styles.ul}>
            <li><strong>Node ID</strong> — auto-generated (e.g. NODE-07). You can change it, but it must be unique across all nodes.</li>
            <li><strong>Name</strong> — required. The display label shown on the node card. Keep it short (≤60 characters).</li>
            <li><strong>Owner / Lane</strong> — which team or group this belongs to. Start typing to see existing owners as suggestions.</li>
            <li><strong>Description</strong> — optional. 1–3 sentences describing what this step involves.</li>
          </ul>
        </Step>
        <Step number={4}>Click <strong>Save</strong> to add the node, or <strong>Cancel</strong> to abort.</Step>

        <p>The node appears at the position you clicked. If you used a new owner name, a new color is automatically assigned and the owner appears in the filter sidebar.</p>

        <Tip>After adding a node, switch to the Connect tool to draw edges from it to other nodes.</Tip>
        <Warning>Node IDs cannot be changed after creation (they're referenced by other nodes' dependency lists). Choose a meaningful, stable ID like "STEP-01" rather than a generic one.</Warning>
      </div>
    ),
  },
  {
    id: 'design-connect',
    icon: '🔗',
    title: 'Design: Connect Tool',
    content: (
      <div>
        <p>The Connect tool draws a directed edge (arrow) from one node to another, establishing a dependency relationship.</p>

        <Step number={1}>Click <strong>Connect</strong> in the design toolbar. The cursor changes to a crosshair.</Step>
        <Step number={2}><strong>Click the prerequisite node</strong> (the one that must happen first). It glows purple to confirm it's selected as the source. A dashed line follows your cursor.</Step>
        <Step number={3}><strong>Click the dependent node</strong> (the one that cannot start until the source is done). The connection is drawn with an arrow from source → target.</Step>

        <p>The connection means: <em>"target depends on source."</em> Target cannot start until source is complete.</p>

        <h4 className={styles.subheading}>Canceling a connection</h4>
        <p>Click on empty canvas, press <code>Escape</code>, or switch tools to cancel a connection in progress.</p>

        <Warning>Duplicate connections are silently ignored. If you try to connect A → B when A → B already exists, nothing happens.</Warning>
        <Warning>Self-connections (a node pointing to itself) are blocked.</Warning>
        <Tip>The direction matters: click the PREREQUISITE first, then the DEPENDENT. The arrow goes from prerequisite → dependent.</Tip>
      </div>
    ),
  },
  {
    id: 'design-edit',
    icon: '📝',
    title: 'Design: Edit Node',
    content: (
      <div>
        <p>The Edit Node dialog lets you update a node's name, owner, and description. You can also delete the node from here.</p>

        <h4 className={styles.subheading}>Opening the Edit dialog</h4>
        <p>There are three ways:</p>
        <ul className={styles.ul}>
          <li><strong>Double-click any node</strong> while Design Mode is active</li>
          <li>Select a node (single-click), then click <strong>Edit Node</strong> in the design toolbar</li>
          <li>Select a node, then click <strong>Edit Node</strong> in the Inspector panel</li>
        </ul>

        <h4 className={styles.subheading}>What you can change</h4>
        <ul className={styles.ul}>
          <li><strong>Name</strong> — the display label shown on the node card</li>
          <li><strong>Owner / Lane</strong> — moves the node to a different team's lane. If you enter a new owner name, a color is automatically assigned.</li>
          <li><strong>Description</strong> — the detail text shown in the Inspector panel</li>
        </ul>

        <h4 className={styles.subheading}>What you cannot change</h4>
        <p>The <strong>Node ID</strong> is locked after creation because it's referenced by other nodes' dependency lists. Changing it would break all connections to/from this node.</p>

        <h4 className={styles.subheading}>Deleting a node</h4>
        <p>Click the red <strong>Delete Node</strong> button in the bottom-left of the edit dialog. You'll be asked to confirm. Deleting removes the node AND all edges connected to it, and removes it from any other node's dependency list.</p>
      </div>
    ),
  },
  {
    id: 'design-delete-edge',
    icon: '✂️',
    title: 'Design: Delete a Connection',
    content: (
      <div>
        <p>Connections (edges/arrows) can be deleted in Design Mode by clicking on them directly.</p>

        <Step number={1}>Make sure <strong>Design Mode is active</strong>. The tool doesn't matter — edge deletion works in all design tools.</Step>
        <Step number={2}><strong>Hover your mouse over any arrow</strong> on the canvas. The arrow turns red and a tooltip appears: <em>"🗑 Click to delete connection"</em>.</Step>
        <Step number={3}><strong>Click the arrow</strong> to delete it. The connection is removed immediately.</Step>

        <Tip>The clickable hit area is 12px wide — much wider than the visible 1.5px line — so you don't need to be perfectly precise. Just hover near the arrow.</Tip>
        <Warning>There is no undo. If you accidentally delete an edge, use the Connect tool to redraw it, then Save JSON.</Warning>
      </div>
    ),
  },
  {
    id: 'saving',
    icon: '💾',
    title: 'Saving Your Changes',
    content: (
      <div>
        <p>Any changes you make in Design Mode (adding, editing, or deleting nodes and connections) are tracked but not automatically saved.</p>

        <Step number={1}>Make changes in Design Mode — the <strong>Save JSON</strong> button appears in the header (teal color) as soon as you make any change.</Step>
        <Step number={2}>Click <strong>Save JSON</strong> to download a file called <code>flowgraph.json</code>.</Step>
        <Step number={3}>Store the file somewhere safe. You can reload it into FlowGraph at any time using <strong>Browse JSON File</strong>.</Step>

        <p>The exported JSON format is identical to the format FlowGraph imports — it's human-readable and can be opened in any text editor.</p>

        <Warning>Changes only exist in the browser while the page is open. If you close or refresh the browser tab without clicking Save JSON, your changes are permanently lost.</Warning>
        <Tip>Save frequently as you work — think of Save JSON like Ctrl+S in a regular document editor.</Tip>
      </div>
    ),
  },
  {
    id: 'shortcuts',
    icon: '⌨️',
    title: 'Keyboard Shortcuts',
    content: (
      <div>
        <p>FlowGraph supports the following keyboard shortcuts:</p>
        <div className={styles.shortcutTable}>
          <Shortcut keys="⌘K / Ctrl+K" action="Open the search bar" />
          <Shortcut keys="Escape" action="Close search results, exit Focus Mode, or close any open modal" />
          <Shortcut keys="Shift+?" action="Open this User Guide" />
          <Shortcut keys="Double-click node" action="Enter Focus Mode (view) or Edit Node dialog (design mode)" />
          <Shortcut keys="Double-click background" action="Exit Focus Mode" />
        </div>
        <Tip>Most buttons in the header have tooltips — hover over them to see what they do and any keyboard shortcut they support.</Tip>
      </div>
    ),
  },
  {
    id: 'ai-json',
    icon: '🤖',
    title: 'Getting a JSON File with AI',
    content: (
      <div>
        <p>You don't need to write the JSON manually. Any AI assistant can generate it for you from a process description.</p>

        <Step number={1}>Click the <strong>📋</strong> button in the header to open the Help modal.</Step>
        <Step number={2}>Go to the <strong>Prompt</strong> tab and click <strong>Copy Prompt</strong>.</Step>
        <Step number={3}>Open any AI assistant: Claude, Microsoft Copilot, ChatGPT, or similar.</Step>
        <Step number={4}>Paste the prompt, then on the next line describe your process. Include: the steps involved, who does each step, and what order they happen in.</Step>
        <Step number={5}>The AI outputs a JSON array. Copy it.</Step>
        <Step number={6}>Open a plain text editor (Notepad, VS Code, TextEdit), paste the JSON, and save the file with a <code>.json</code> extension (e.g. <code>myprocess.json</code>).</Step>
        <Step number={7}>Load the file into FlowGraph using <strong>Browse JSON File</strong>.</Step>

        <Tip>Add the instruction "output JSON only, no markdown, no explanation" to the end of the prompt. This prevents the AI from wrapping the JSON in code fences, which would cause a parse error.</Tip>
        <Warning>If the graph loads but shows no arrows, the dependency IDs don't match the node IDs exactly. Open the JSON file in a text editor and check that the values in "dependencies" arrays exactly match the "id" fields (they are case-sensitive).</Warning>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    icon: '🔧',
    title: 'Troubleshooting',
    content: (
      <div>
        <p>Solutions to the most common problems:</p>

        <div className={styles.troubleTable}>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>JSON file won't load</div>
            <div className={styles.troubleSolution}>The file must contain a JSON array starting with <code>[</code> and ending with <code>]</code>. Open it in a text editor to check. If the AI output included markdown code fences (<code>```json</code>), remove them before saving.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>Nodes appear but no arrows</div>
            <div className={styles.troubleSolution}>The values in <code>dependencies</code> arrays don't exactly match the <code>id</code> fields of other nodes. IDs are case-sensitive. Open the JSON and verify the spelling matches exactly.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>A node is missing from the graph</div>
            <div className={styles.troubleSolution}>Its owner is filtered out. Open the sidebar (☰) and check that all owners are ticked.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>Can't activate Design Mode</div>
            <div className={styles.troubleSolution}>Load a JSON file first. Design Mode only activates when data is present.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>Saved layout is gone</div>
            <div className={styles.troubleSolution}>Layouts are stored in browser localStorage. They don't survive clearing browser data, and they're not shared across browsers or devices.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>Graph looks cluttered or tangled</div>
            <div className={styles.troubleSolution}>Try switching to LANES view for a cleaner separation by team. Use Focus Mode (double-click a node) to explore one node's context at a time. You can also drag nodes to custom positions.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>Save JSON button not visible</div>
            <div className={styles.troubleSolution}>The button only appears after at least one change is made in Design Mode. Make sure Design Mode is active (purple Design button) and that you've added, edited, or deleted something.</div>
          </div>
          <div className={styles.troubleRow}>
            <div className={styles.troubleProblem}>I accidentally deleted an edge</div>
            <div className={styles.troubleSolution}>Use Ctrl+Z (Undo) in Design Mode to reverse the deletion, or switch to the Connect tool and redraw the connection.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-prompt-text',
    icon: '📋',
    title: 'AI Prompt',
    content: (
      <div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
          <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>Copy this prompt into any AI assistant, then describe your process flow as the input.</div>
          <button onClick={() => copyText(AI_PROMPT)} style={{ padding:'6px 10px', border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:10, borderRadius:5, cursor:'pointer', whiteSpace:'nowrap' }}>Copy Prompt</button>
        </div>
        <textarea readOnly value={AI_PROMPT} style={{ width:'100%', minHeight:260, resize:'vertical', padding:12, borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.6, outline:'none' }} />
        <div style={{ marginTop:10, fontSize:11, color:'var(--text3)' }}>Tip: ask the AI to output <strong>JSON only</strong> (no markdown) to avoid parse errors.</div>
      </div>
    ),
  },
  {
    id: 'ai-example',
    icon: '📄',
    title: 'Example JSON',
    content: (
      <div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
          <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>A minimal example of the JSON format accepted by FlowGraph.</div>
          <button onClick={() => copyText(EXAMPLE_JSON)} style={{ padding:'6px 10px', border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:10, borderRadius:5, cursor:'pointer', whiteSpace:'nowrap' }}>Copy Example</button>
        </div>
        <pre style={{ whiteSpace:'pre', overflow:'auto', padding:12, borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.6 }}>{EXAMPLE_JSON}</pre>
      </div>
    ),
  },
  {
    id: 'ai-spec',
    icon: '📐',
    title: 'JSON Spec',
    content: (
      <div>
        <div style={{ fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--text3)', fontWeight:800, margin:'14px 0 8px' }}>Required node fields</div>
        <pre style={{ whiteSpace:'pre', overflow:'auto', padding:12, borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg3)', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.6 }}>{`{\n  "id": "string (unique, case-sensitive)",\n  "name": "string (≤60 chars, shown on node card)",\n  "owner": "string (determines swim lane and color)",\n  "description": "string (1–3 sentences, shown in Inspector)",\n  "dependencies": ["id-of-prereq-1", "id-of-prereq-2"]\n}`}</pre>
        <div style={{ fontSize:10, letterSpacing:1, textTransform:'uppercase', color:'var(--text3)', fontWeight:800, margin:'14px 0 8px' }}>Rules</div>
        <ul style={{ paddingLeft:20, margin:'8px 0', color:'var(--text2)', fontSize:13, lineHeight:1.9 }}>
          <li>Output must be a <strong>JSON array</strong></li>
          <li><strong>Dependencies are prerequisites</strong>: if B requires A, then B.dependencies includes "A"</li>
          <li>All dependency IDs must exist in the same file</li>
          <li>No duplicate IDs</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ai-workflow',
    icon: '🔄',
    title: 'AI Workflow',
    content: (
      <div>
        <ol style={{ paddingLeft:20, margin:'8px 0', color:'var(--text2)', fontSize:13, lineHeight:2 }}>
          <li>Start from your process description, PDF, or Visio diagram</li>
          <li>Go to <strong>AI Prompt</strong> section and click <strong>Copy Prompt</strong></li>
          <li>Open Copilot, Claude, or ChatGPT and paste the prompt</li>
          <li>Follow with your process description (lanes, steps, sequence)</li>
          <li>The AI outputs a JSON array — save it as <code style={{background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:3,padding:'1px 5px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--accent)'}}>myprocess.json</code></li>
          <li>Load the file using <strong>Browse JSON File</strong> in FlowGraph</li>
        </ol>
        <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)', borderRadius:6, fontSize:12, color:'var(--text2)' }}>
          ⚠️ If edges are missing: dependency IDs don't match node IDs exactly — they are case-sensitive.
        </div>
      </div>
    ),
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function UserGuideModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  // Listen for open events from App.tsx (Shift+?) and Header
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.open || e.type === 'flowgraph:open-guide') {
        setIsOpen(true);
        setActiveSection(SECTIONS[0].id);
      }
    };
    document.addEventListener('flowgraph:open-guide', handler);
    document.addEventListener('flowgraph:guide-state', handler);
    document.addEventListener('flowgraph:help-state', handler);
    return () => {
      document.removeEventListener('flowgraph:open-guide', handler);
      document.removeEventListener('flowgraph:guide-state', handler);
      document.removeEventListener('flowgraph:help-state', handler);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleNavClick(sectionId: string) {
    setActiveSection(sectionId);
    // Scroll content to top when switching sections
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  if (!isOpen) return null;

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>⬡</div>
            <div>
              <div className={styles.title}>FlowGraph User Guide</div>
              <div className={styles.subtitle}>Everything you need to know about using FlowGraph</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.shortcutHint}><code>Shift+?</code> to open anytime</div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>
        </div>

        <div className={styles.body}>
          {/* Left navigation */}
          <nav className={styles.nav}>
            <div className={styles.navGroup}>User Guide</div>
            {SECTIONS.filter(s => !s.id.startsWith('ai-')).map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ''}`}
                onClick={() => handleNavClick(section.id)}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                <span className={styles.navLabel}>{section.title}</span>
              </button>
            ))}
            <div className={styles.navGroup}>AI Tools</div>
            {SECTIONS.filter(s => s.id.startsWith('ai-')).map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ''}`}
                onClick={() => handleNavClick(section.id)}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                <span className={styles.navLabel}>{section.title}</span>
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div className={styles.content} ref={contentRef}>
            <div key={currentSection.id} className={styles.sectionContent}>
              <div className={styles.contentHeader}>
                <span className={styles.contentIcon}>{currentSection.icon}</span>
                <h2 className={styles.contentTitle}>{currentSection.title}</h2>
              </div>
              <div className={styles.contentBody}>
                {currentSection.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

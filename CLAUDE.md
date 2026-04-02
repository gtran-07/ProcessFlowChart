# FlowGraph — CLAUDE.md

Built completely with **Claude Code**. Authored by **Giang Tran**.

---

## What this app is

FlowGraph is a browser-based interactive dependency flowchart viewer and editor.
Users load, create, and edit directed acyclic graphs (DAGs) stored as JSON files.
No server required — runs entirely in the browser and can be hosted on GitHub Pages.

---

## Commands

```bash
npm run dev           # Vite dev server (hot reload)
npm run build         # tsc + vite build → dist/
npm run preview       # preview the production build locally
npm run lint          # ESLint over src/
```

The only build command needed before committing is `npm run build`. If it passes
TypeScript compilation (`tsc`) and Vite bundling with no errors, the code is ready.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand (single store, no providers) |
| Styling | CSS Modules + global CSS variables |
| Rendering | Native SVG (no D3/Cytoscape) |
| File I/O | File System Access API (Chrome/Edge) with `<input type="file">` / download fallback |

---

## Project Structure

```
src/
├── App.tsx                     Root layout: Header | (Sidebar + Canvas + Inspector)
├── App.module.css
├── main.tsx
├── styles/
│   └── global.css              CSS custom properties (design tokens) + keyframes + print CSS
├── types/
│   ├── graph.ts                All TypeScript interfaces: GraphNode, GraphEdge, Transform, …
│   └── fileSystem.d.ts         File System Access API type stubs (showOpenFilePicker, showSaveFilePicker)
├── store/
│   └── graphStore.ts           Single Zustand store — ALL app state and actions live here
├── utils/
│   ├── layout.ts               DAG layout (Sugiyama-style) + lane layout algorithms
│   ├── colors.ts               Owner → hex color assignment
│   ├── exportJson.ts           JSON serialization: buildExportPayload() + exportGraphToJson()
│   └── exportPdf.ts            SVG-based PDF export via window.print() — current view or full chart
├── adapters/
│   ├── adapterInterface.ts     GraphAdapter base interface (load / save)
│   ├── fileAdapter.ts          Local JSON file adapter
│   └── sharepointAdapter.ts    SharePoint/OneDrive stub (Microsoft Graph API)
└── components/
    ├── Header/                 File ops, search, view toggle, save/save-as/export, design mode
    ├── Canvas/                 SVG canvas, pan/zoom, NodeCard, EdgeLayer, LaneLayer, MiniMap
    ├── Panels/                 Sidebar (owner filter) + Inspector (selected node details)
    ├── DesignMode/             DesignToolbar + NodeEditModal (add/edit nodes)
    └── Modals/                 UserGuideModal (Shift+?), HelpModal
```

---

## Architecture Rules

### State
- **All state lives in `graphStore.ts`**. No component-level state for graph data.
- Components call store actions; actions update state; React re-renders.
- Never mutate store state directly from a component.

### JSON Format
```json
{
  "nodes": [
    {
      "id": "STEP-01",
      "name": "Step name (≤60 chars)",
      "owner": "Team name (determines swim lane + color)",
      "description": "1–3 sentences.",
      "dependencies": ["ID-OF-PREREQ"]
    }
  ],
  "_layout": {
    "currentView": "dag",
    "dag":   { "positions": { "STEP-01": { "x": 0, "y": 0 } }, "transform": { "x": 0, "y": 0, "k": 1 } },
    "lanes": { "positions": { ... }, "transform": { ... } }
  }
}
```
Legacy format (plain `[ ... ]` array, no `_layout`) is still accepted on load.

### Serialization
`buildExportPayload()` in `exportJson.ts` is the **single source of truth** for
serialization. Both the download path and the File System Access API in-place
write path call this function. Never duplicate the serialization logic.

### File I/O modes
| Mode | When | Save behaviour |
|---|---|---|
| **Linked** (teal chip) | Opened via `showOpenFilePicker` / `showSaveFilePicker` in Chrome/Edge | Writes directly to file on disk — no download |
| **Unlinked** (gray chip) | Opened via `<input type="file">` (Firefox/Safari) or new flowchart | Downloads a copy to the user's Downloads folder |

After **Save As**, the returned `FileSystemFileHandle` replaces the old handle and
`currentFileName` is updated to the new filename — so subsequent saves go to the
new location.

### PDF Export
`exportPdf.ts` exports via `window.print()`. Signature:
```ts
exportToPdf(mode: 'current' | 'full', positions?, _ownerColors?, _nodeOwnerMap?, _transform?, viewMode?)
```
Steps (all DOM changes are reverted in `afterprint`):
1. **JS-based DOM isolation** — walks up from `#canvas-wrap` to `<body>`, hides all siblings at every level with `visibility:hidden`. Forces `#canvas-wrap` to `position:fixed; inset:0; background:#fff; z-index:99999`. Restoring is done by reverting inline styles. This is more reliable than `@media print` CSS for hiding the sidebar/header.
2. **ViewBox setup**:
   - `'full'`: `computeFullBBox()` computes positions bbox + PADDING=80. In `'lanes'` mode, `minX` is clamped to `≤ -PADDING/2` so lane labels (drawn at x=0) are included. Sets viewBox; resets `#graph-root` transform to identity.
   - `'current'`: sets viewBox to `"0 0 svgW svgH"` where svgW/svgH are the canvas pixel dimensions. The `#graph-root` transform is left untouched — the SVG renders exactly what's on-screen, scaled to fill the page.
3. **Grid injection** — `injectBackgroundAndGrid()` inserts `<g id="pdf-injected">` before `#graph-root`:
   - Grid spacing: `minor = clamp(round(vbW/35), 20, 100)`, `major = minor * 5`. Pattern origin snapped to a round multiple of `minor` so lines are at clean coordinates.
   - `#pdf-minor` pattern: `path "M minor 0 L 0 0 0 minor"`, stroke `#d0dde8` 0.35. Creates thin lines at every minor grid interval.
   - `#pdf-major` pattern: fills tile with `url(#pdf-minor)` then overlays `path "M major 0 L 0 0 0 major"`, stroke `#b0c0cc` 0.7. Creates slightly heavier lines every 5 minor cells.
   - White `<rect>` and grid `<rect>` both covering the full viewBox area.
   - `#arrow-pdf-black` marker: black polygon fill `#222`.
4. **Edge override**: every `.edge-vis` → stroke `#222222`, width `1.5`, opacity `1`, `marker-end url(#arrow-pdf-black)`.
5. Calls `window.print()`.
6. In `afterprint`: `restoreIsolation()`, removes injected `<g>`, restores edge attributes, restores viewBox/transform.

Print CSS in `global.css` (`@media print`):
- SVG forced to `100vw × 100vh`.
- `print-color-adjust: exact` preserves colored node-card fills.
- `#canvas-wrap::before` hidden (removes the dark dot-grid pseudo-element).
- Non-SVG children of `#canvas-wrap` hidden (minimap, banners, tooltips).

### Custom Events (component decoupling)
| Event | Fired by | Handled by |
|---|---|---|
| `flowgraph:open-guide` | App.tsx (Shift+?) / Header | UserGuideModal |
| `flowgraph:toggle-sidebar` | Header | Sidebar |
| `flowgraph:open-file-picker` | Canvas empty state | Header |
| `flowgraph:add-node` | Canvas click (add tool) | NodeEditModal |

### Responsive Header
All button text is wrapped in `<span className={styles.btnLabel}>`. At `< 920px`
this class is hidden, leaving icon-only buttons. Tooltips always carry the full
description so nothing is lost.

### Stable DOM IDs
These IDs are used for direct DOM access — do not remove or rename them:
- `#canvas-wrap` — the outer canvas container div
- `#graph-root` — the SVG `<g>` that receives the pan/zoom transform
- `#graph-content` — inner `<g>` that wraps lanes/edges/nodes (keyed for fade-in)
- `#edge-delete-tip` — the floating edge-delete tooltip

---

## Adding New Features

### New store field + action
1. Add the field + action signature to the `GraphStore` interface.
2. Add the field to the initial state object.
3. Implement the action (the `set(...)` call) in the store body.

### New header button
1. Add button JSX with `<span className={styles.btnLabel}>Label</span>` around the text.
2. Add styles in `Header.module.css`.
3. Icon-only responsive behaviour is handled automatically by the `< 920px` media query.

### New modal
1. Create the component and have it listen for a custom event in `useEffect`.
2. Dispatch the custom event from wherever it should be triggered.
3. Render the modal in `App.tsx` (outside the layout flow, at the end of the JSX).

### Updating the User Guide
Edit the `SECTIONS` array in `UserGuideModal.tsx`. The guide's search box uses
`extractText()` to recursively pull plain text from the JSX — no separate keyword
lists need to be maintained.

---

## Known Constraints & Gotchas

| Issue | Cause | Fix in place |
|---|---|---|
| Black square flicker on hover | SVG `filter: drop-shadow` causes GPU compositing artifacts | Replaced with stroke-based glow on `.node-main-rect`; `will-change: opacity` on `.node-group` |
| Header covers canvas content | `.svgCanvas { overflow: visible }` let filter regions paint outside SVG bounds | Changed to `overflow: hidden` |
| Lane Y-drift on owner toggle | Old absolute Y positions become wrong when lanes shift | `toggleOwner` / `toggleAllOwners` translate Y positions by `newLane.y − oldLane.y` delta |
| Firefox/Safari can't save in-place | No File System Access API | Graceful fallback: download a copy; broken-chain chip signals the mode |
| `window.print()` is synchronous on some browsers | Print dialog may close before `afterprint` fires on Safari | Cleanup is idempotent — safe to call multiple times |

---

## Deployment

GitHub Pages via GitHub Actions. The workflow builds on push to `main` and
deploys `dist/` to the `gh-pages` branch. The Vite config sets `base: '/ProcessFlowChart/'`.

Repo: `gtran-07/ProcessFlowChart`
Live: `https://gtran-07.github.io/ProcessFlowChart/`

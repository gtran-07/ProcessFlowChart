/**
 * vite.standalone.config.ts — Build config that outputs a SINGLE self-contained HTML file.
 *
 * Use this for:
 *   - `npm run build:standalone` → outputs dist/standalone.html
 *
 * The output file:
 *   - Has all JS and CSS inlined directly into the HTML (no external files needed)
 *   - Opens directly in any browser by double-clicking — no server required
 *   - Works completely offline
 *   - Can be emailed, dropped in SharePoint as a document, or shared via file share
 *
 * This is powered by `vite-plugin-singlefile` which replaces all <script src> and
 * <link rel="stylesheet"> tags with their inlined content after the build.
 *
 * Note: The SharePoint adapter won't work in offline mode (it needs network access
 * to reach Microsoft Graph API), but all other features work fully offline.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(),
    // viteSingleFile inlines all assets into index.html after the build
    viteSingleFile(),
  ],
  build: {
    outDir: 'dist',
    // Single file build doesn't need sourcemaps (they'd bloat the HTML)
    sourcemap: false,
    // Rename the output to standalone.html so it's clearly identified
    rollupOptions: {
      output: {
        // Everything ends up inlined into index.html; rename it for clarity
        entryFileNames: 'standalone.js',
      },
    },
  },
});

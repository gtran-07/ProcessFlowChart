/**
 * vite.config.ts — Standard Vite configuration for development and hosted builds.
 *
 * Use this config for:
 *   - `npm run dev`       → local dev server with HMR
 *   - `npm run build`     → standard React SPA output to dist/
 *
 * For a single self-contained HTML file (offline/portable), use vite.standalone.config.ts instead.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base: '/' serves the app at the domain root.
  // Works for GitHub user/org pages (username.github.io) and custom domains.
  // If deploying to a project page (username.github.io/repo-name), change this to '/repo-name/'.
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

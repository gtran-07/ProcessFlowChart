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
  build: {
    outDir: 'dist',
    // Generate sourcemaps for easier debugging in production
    sourcemap: true,
  },
});

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl starts its web worker from a URL relative to its own file; pre-bundling
  // moves the file and breaks that URL, so the map shows no tiles in `npm run dev`.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})

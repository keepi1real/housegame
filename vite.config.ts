import { defineConfig } from 'vite'

// Relative base keeps the build portable to itch.io and any static host.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})

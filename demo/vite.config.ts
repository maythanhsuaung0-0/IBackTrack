import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      'wxt/browser': fileURLToPath(new URL('./browser.ts', import.meta.url)),
    },
  },
  build: { outDir: '../demo-dist', emptyOutDir: true },
  server: { fs: { allow: ['..'] } },
});

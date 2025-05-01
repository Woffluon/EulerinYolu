// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // No plugins needed for plain HTML/CSS/JS
  server: {
    open: true // Automatically open in browser
  },
  build: {
    outDir: 'dist'
  }
});

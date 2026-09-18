import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // For a repo named pharma-cad-isometric on GitHub Pages. Vercel can use '/'.
  base: process.env.GITHUB_ACTIONS ? '/pharma-cad-isometric/' : '/',
  build: { target: 'es2022', sourcemap: true }
});

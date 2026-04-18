import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ChainReaction-web/' : '/',
  plugins: [react()],
  server: { port: 3001, host: true },
}));

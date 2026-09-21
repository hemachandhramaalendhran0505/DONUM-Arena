import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// DONUM — Vite configuration.
// Note: the dev server binds 0.0.0.0 and allows all hosts so the app works
// behind the sandbox/preview proxy as well as on localhost.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: { clientPort: 443 },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);

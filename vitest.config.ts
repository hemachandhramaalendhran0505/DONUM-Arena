import { defineConfig } from 'vite';
import path from 'node:path';

// Unit + service-layer tests (jsdom for the localStorage-backed store).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
} as never);

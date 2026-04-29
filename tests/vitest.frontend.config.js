import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['frontend/**/*.test.{js,jsx}'],
    setupFiles: ['./frontend/setup.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['../client/src/**/*.{js,jsx}'],
      exclude: [
        '../client/src/main.jsx',
        '../client/src/App.css',
        '**/node_modules/**',
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/frontend',
    },
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      // Resolve client source paths cleanly
      '@': '../client/src',
    },
  },
});

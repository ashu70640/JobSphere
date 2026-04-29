import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'unit/**/*.test.js',
      'integration/**/*.test.js',
      'security/**/*.test.js',
    ],
    setupFiles: ['./utils/setup.js'],
    globalSetup: './utils/globalSetup.js',
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',          // isolate each test file in its own process
    poolOptions: {
      forks: { singleFork: false },
    },
    sequence: {
      concurrent: false,    // integration tests must NOT run concurrently
    },
    coverage: {
      provider: 'v8',
      include: [
        '../services/auth/src/**/*.js',
        '../services/jobs/src/**/*.js',
      ],
      exclude: [
        '**/node_modules/**',
        '**/config/db.js',
        '**/server.js',
        '**/index.js',
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/backend',
    },
    reporters: ['verbose'],
  },
});

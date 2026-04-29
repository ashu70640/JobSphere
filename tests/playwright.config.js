import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,     // run sequentially — shared state in DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: './coverage/e2e-report' }],
    ['list'],
  ],
  timeout: 30000,
  expect: { timeout: 8000 },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Docker Compose before tests, tear down after
  // Uncomment if you want Playwright to manage Docker
  // globalSetup: './e2e/globalSetup.js',
  // globalTeardown: './e2e/globalTeardown.js',
});

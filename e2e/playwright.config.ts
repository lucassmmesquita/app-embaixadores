import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  fullyParallel: false,
  retries: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
  ],

  outputDir: 'test-results/artifacts',

  use: {
    baseURL: process.env.BASE_URL || 'https://app-embaixadores-staging.onrender.com/app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

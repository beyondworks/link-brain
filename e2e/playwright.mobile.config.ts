import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  reporter: 'list',
  timeout: 30000,
  use: {
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {},
    },
  ],
});

import { defineConfig, devices } from '@playwright/test'
import loadEnvLocal from './scripts/load-env-local.mjs'

loadEnvLocal()

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.mjs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/mobile-smoke.spec.ts',
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
      },
      testMatch: '**/mobile-smoke.spec.ts',
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'yarn dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        cwd: __dirname,
        timeout: 120_000,
      },
})

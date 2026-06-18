import { defineConfig, devices } from '@playwright/test'
import loadEnvLocal from './scripts/load-env-local.mjs'

loadEnvLocal()

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.mjs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
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

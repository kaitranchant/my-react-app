import fs from 'node:fs'
import path from 'node:path'

import { test as setup } from '@playwright/test'

import {
  coachAuthFile,
  clientAuthFile,
  dismissPortalWelcomeDialog,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  hasE2ECredentials,
  login,
} from './fixtures'

const authDir = path.dirname(coachAuthFile)

setup.describe.configure({ mode: 'serial' })

setup.beforeAll(() => {
  fs.mkdirSync(authDir, { recursive: true })
})

setup('authenticate coach', async ({ page }) => {
  setup.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
  await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD, /\/dashboard/)
  await page.context().storageState({ path: coachAuthFile })
})

setup('authenticate client', async ({ page }) => {
  setup.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
  await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, /\/portal/)
  await dismissPortalWelcomeDialog(page)
  await page.context().storageState({ path: clientAuthFile })
})

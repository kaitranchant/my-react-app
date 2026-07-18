import path from 'node:path'

import { test, expect, E2E_CLIENT_NAME, E2E_CLIENT_ID } from './fixtures'

const fixtureImage = path.join(__dirname, 'fixtures', 'progress-photo.png')
const E2E_ASSESSMENT_NOTE = 'E2E knees cave slightly on descent'

test.describe.configure({ mode: 'serial' })

test.describe('Client assessments', () => {
  test('coach can record a structured assessment with score, notes, and photo', async ({
    coachPage: page,
  }) => {
    test.setTimeout(90_000)

    await page.goto(`/clients/${E2E_CLIENT_ID}`)
    await expect(page.getByRole('heading', { name: E2E_CLIENT_NAME })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Assessment notes' }).click()

    await expect(page.getByRole('heading', { name: 'Assessment notes' })).toBeVisible()

    const startButton = page.getByRole('button', {
      name: /Start assessment|New assessment/,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    await page.getByPlaceholder('Search movements…').fill('Overhead squat')
    await page.getByRole('button', { name: /Overhead squat/i }).first().click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByRole('button', { name: 'Begin' }).click()

    const dialog = page.getByRole('dialog').filter({ hasText: 'Overhead squat' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /^2/ }).first().click()
    await dialog
      .getByPlaceholder('Observations for this movement…')
      .fill(E2E_ASSESSMENT_NOTE)
    await dialog.getByRole('button', { name: 'Add media' }).click()
    await dialog.locator('input[type="file"]').setInputFiles(fixtureImage)
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await page.getByRole('button', { name: /Save assessment|Save changes/ }).click()

    await expect(page.getByText('Assessment saved')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(E2E_ASSESSMENT_NOTE).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/2\/3/).first()).toBeVisible()
  })

  test('coach can record a re-assessment and see a score delta', async ({
    coachPage: page,
  }) => {
    test.setTimeout(90_000)

    await page.goto(`/clients/${E2E_CLIENT_ID}`)
    await page.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Assessment notes' }).click()

    await page.getByRole('button', { name: 'New assessment' }).click()
    await page.getByPlaceholder('Search movements…').fill('Overhead squat')
    await page.getByRole('button', { name: /Overhead squat/i }).first().click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await page.getByRole('button', { name: 'Begin' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Overhead squat' })
    await dialog.getByRole('button', { name: /^3/ }).first().click()
    await dialog
      .getByPlaceholder('Observations for this movement…')
      .fill('E2E improved depth control')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()

    await page.getByRole('button', { name: /Save assessment|Save changes/ }).click()
    await expect(page.getByText('Assessment saved')).toBeVisible({
      timeout: 20_000,
    })

    await expect(page.getByText(/from 2\/3|from .*2\/3/).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})

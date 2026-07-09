import { type Locator } from '@playwright/test'

import {
  test,
  expect,
  openPortalWorkoutForLogging,
  clickWorkoutLogButton,
} from './fixtures'

async function ensureSetLogged(dialog: Locator, setNumber: number) {
  const incompleteButton = dialog
    .getByRole('button', {
      name: `Confirm set ${setNumber}`,
    })
    .first()
  const completeButton = dialog
    .getByRole('button', {
      name: `Mark set ${setNumber} incomplete`,
    })
    .first()

  if (await completeButton.isVisible()) return

  if (await incompleteButton.isVisible()) {
    await incompleteButton.click()
    await expect(completeButton).toBeVisible({ timeout: 10_000 })
  }
}

test.describe('PR tracking', () => {
  test('client completing a strong set surfaces PR feedback', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)

    await openPortalWorkoutForLogging(page)

    const viewLogButton = page.getByRole('button', { name: /View log/i })
    if (await viewLogButton.isVisible()) {
      await viewLogButton.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(page.getByText(/Personal Record|Personal best|PR pace/i).first()).toBeVisible({
        timeout: 15_000,
      })
      return
    }

    await clickWorkoutLogButton(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const startButton = dialog.getByRole('button', {
      name: /Start workout|View session/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    await expect(dialog.getByLabel(/Set 1 weight/i).first()).toBeEnabled({
      timeout: 15_000,
    })
    await dialog.getByLabel(/Set 1 weight/i).first().fill('285')
    await dialog.getByLabel(/Set 1 reps/i).first().fill('5')
    await ensureSetLogged(dialog, 1)

    await expect(dialog.getByText('PR pace')).toBeVisible({ timeout: 15_000 })
  })
})

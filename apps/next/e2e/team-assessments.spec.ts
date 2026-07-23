import { test, expect, E2E_CLIENT_NAME } from './fixtures'

const TEAM_NAME = 'E2E Leaderboard Team'
const TEAMMATE_NAME = 'E2E Teammate'

test.describe('Team assessments', () => {
  test('coach scores multiple team members on one test and sees progress', async ({
    coachPage: page,
  }) => {
    test.setTimeout(120_000)

    await page.goto('/teams')
    await page.getByRole('link', { name: TEAM_NAME }).click()
    await expect(page.getByRole('heading', { name: TEAM_NAME })).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole('tab', { name: 'Assessments' }).click()
    await page.getByRole('button', { name: 'Start team assessment' }).click()

    await page.getByPlaceholder('Search movements…').fill('Overhead squat')
    await page.getByRole('button', { name: /Overhead squat/i }).first().click()
    await page.getByRole('button', { name: 'Start session', exact: true }).click()

    await expect(page.getByText('Team assessment started')).toBeVisible({
      timeout: 20_000,
    })

    // Tap the test to open the athlete roster for it.
    await page.getByRole('button', { name: /Overhead squat/i }).first().click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Overhead squat' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/0 of 2 scored/)).toBeVisible()

    // Score the first athlete, then move straight to the next one.
    await dialog
      .getByRole('button', { name: new RegExp(E2E_CLIENT_NAME) })
      .click()
    await expect(dialog.getByText(`Overhead squat — ${E2E_CLIENT_NAME}`)).toBeVisible()
    await dialog.getByRole('button', { name: /^2/ }).first().click()
    await dialog.getByRole('button', { name: 'Save & next athlete' }).click()

    // Runner advances to the remaining unscored athlete.
    await expect(
      dialog.getByText(`Overhead squat — ${TEAMMATE_NAME}`)
    ).toBeVisible({ timeout: 15_000 })
    await dialog.getByRole('button', { name: /^3/ }).first().click()
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()

    // Back on the roster: both athletes scored.
    await expect(dialog.getByText(/2 of 2 scored/)).toBeVisible({
      timeout: 15_000,
    })
    await dialog.getByRole('button', { name: 'Done' }).click()

    // Test list and session header reflect full progress.
    await expect(page.getByText(/2\/2 scored/)).toBeVisible()
    await expect(page.getByText('2 of 2 scores')).toBeVisible()

    await page.getByRole('button', { name: 'Mark complete' }).click()
    await expect(page.getByText('Team assessment completed')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Completed', { exact: true })).toBeVisible()
  })
})

import {
  test,
  expect,
  E2E_CLIENT_NAME,
  E2E_PROGRAM_NAME,
  selectedDayWorkoutSummary,
} from './fixtures'

test.describe('Program assignment', () => {
  test('coach sees assigned program on client programs tab', async ({
    coachPage: page,
  }) => {
    await page.goto('/clients')
    await page.getByText(E2E_CLIENT_NAME).click()
    await expect(page).toHaveURL(/\/clients\//)

    await page.getByRole('tab', { name: 'Programs' }).click()
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: E2E_PROGRAM_NAME })
    ).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach sees materialized workout on client calendar', async ({
    coachPage: page,
  }) => {
    await page.goto('/clients')
    await page.getByText(E2E_CLIENT_NAME).click()

    await page.getByRole('tab', { name: 'Calendar' }).click()
    await expect(selectedDayWorkoutSummary(page)).toBeVisible({
      timeout: 15_000,
    })
  })
})

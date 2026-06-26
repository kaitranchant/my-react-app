import {
  test,
  expect,
  E2E_CLIENT_ID,
  E2E_PROGRAM_NAME,
  selectedDayWorkoutSummary,
} from './fixtures'

test.describe('Program assignment', () => {
  test('coach sees assigned program on client programs tab', async ({
    coachPage: page,
  }) => {
    await page.goto(`/clients/${E2E_CLIENT_ID}?tab=training&section=programs`)
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: E2E_PROGRAM_NAME })
    ).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach sees materialized workout on client calendar', async ({
    coachPage: page,
  }) => {
    await page.goto(`/clients/${E2E_CLIENT_ID}?tab=training`)
    await expect(selectedDayWorkoutSummary(page)).toBeVisible({
      timeout: 15_000,
    })
  })
})

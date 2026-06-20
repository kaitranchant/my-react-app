import { test, expect } from './fixtures'

test.describe('Settings', () => {
  test('coach can save notification and coaching preferences', async ({
    coachPage: page,
  }) => {
    test.setTimeout(60_000)

    await page.goto('/settings#notifications')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    const workoutToggle = page.getByRole('switch', {
      name: 'Workout completions',
    })
    const wasChecked = await workoutToggle.getAttribute('aria-checked')
    await workoutToggle.click()
    await expect(page.getByText('Notification preference saved')).toBeVisible({
      timeout: 10_000,
    })

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()

    await page.goto('/settings#notifications')
    if (wasChecked === 'true') {
      await workoutToggle.click()
      await expect(page.getByText('Notification preference saved')).toBeVisible({
        timeout: 10_000,
      })
    }

    await page.goto('/settings#coaching')
    await page.getByRole('combobox').filter({ hasText: /Pounds|Kilograms/ }).click()
    await page.getByRole('option', { name: 'Kilograms (kg)' }).click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Coaching preferences saved')).toBeVisible({
      timeout: 10_000,
    })

    await page.goto('/load')
    await expect(page.getByRole('heading', { name: 'Load Management' })).toBeVisible()
    await expect(page.getByText(/\d[\d,]* kg/).first()).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/settings#coaching')
    await page.getByRole('combobox').filter({ hasText: /Kilograms|Pounds/ }).click()
    await page.getByRole('option', { name: 'Pounds (lbs)' }).click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Coaching preferences saved')).toBeVisible({
      timeout: 10_000,
    })
  })
})

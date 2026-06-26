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
    await expect(page.getByText('Saved').first()).toBeVisible({
      timeout: 10_000,
    })

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()

    await page.goto('/settings#notifications')
    if (wasChecked === 'true') {
      await workoutToggle.click()
      await expect(page.getByText('Saved').first()).toBeVisible({
        timeout: 10_000,
      })
    }

    await page.goto('/settings#coaching')
    const unitCombobox = page
      .getByRole('combobox')
      .filter({ hasText: /Pounds|Kilograms/ })
    const unitLabel = await unitCombobox.textContent()
    const alternateUnit = unitLabel?.includes('Kilograms')
      ? 'Pounds (lbs)'
      : 'Kilograms (kg)'

    await unitCombobox.click()
    await page.getByRole('option', { name: alternateUnit }).click()
    const savePreferences = page.getByRole('button', { name: 'Save preferences' })
    if (await savePreferences.isEnabled()) {
      await savePreferences.click()
      await expect(page.getByText('Coaching preferences saved')).toBeVisible({
        timeout: 10_000,
      })
    }
  })
})

import { test, expect, E2E_CLIENT_NAME, type Page } from './fixtures'
import type { Locator } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function pickFirstAvailableSlot(page: Page, dialog: Locator) {
  const dateCombobox = dialog.getByRole('combobox').nth(1)
  const timeCombobox = dialog.getByRole('combobox').nth(2)

  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    if (dayIndex > 0) {
      await dateCombobox.click()
      await page.getByRole('option').nth(dayIndex).click()
    }

    await expect(timeCombobox).not.toContainText('Loading', { timeout: 20_000 })

    if (await timeCombobox.isEnabled()) {
      await timeCombobox.click()
      await page.getByRole('option').first().click()
      return
    }
  }

  throw new Error('No available scheduling slots in the next 14 days')
}

test.describe('Session scheduling', () => {
  test('coach scheduling page loads with tabs and booking link', async ({
    coachPage: page,
  }) => {
    await page.goto('/scheduling')
    await expect(
      page.getByRole('heading', { name: 'Scheduling' })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('tab', { name: 'This week' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Availability' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Session packs' })).toBeVisible()

    await page.getByRole('tab', { name: 'Availability' }).click()
    await expect(page).toHaveURL(/view=availability/)
    await expect(page.getByText('Shareable booking link')).toBeVisible()
    await expect(page.locator('input.font-mono')).toHaveValue(/e2e-coach/)
  })

  test('coach can book a session for the E2E client', async ({
    coachPage: page,
  }) => {
    await page.goto('/scheduling')
    await page.getByRole('button', { name: 'Book session' }).click()

    const dialog = page.getByRole('dialog', { name: 'Book a session' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('combobox').first().click()
    await page.getByRole('option', { name: E2E_CLIENT_NAME }).click()

    await pickFirstAvailableSlot(page, dialog)

    await dialog.getByRole('button', { name: 'Book session' }).click()
    await expect(page.getByText('Session booked')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('client sees the booked session on portal sessions', async ({
    clientPage: page,
  }) => {
    await page.goto('/portal/sessions')
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Scheduled').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('E2E Studio').first()).toBeVisible()
  })

  test('booking link redirects logged-in client to portal sessions', async ({
    clientPage: page,
  }) => {
    await page.goto('/book/e2e-coach')
    await expect(page).toHaveURL(/\/portal\/sessions/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
  })

  test('client can self-book a session when booking is enabled', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)

    await page.goto('/portal/sessions')
    await expect(page.getByText('Book a session').first()).toBeVisible({
      timeout: 15_000,
    })

    const form = page.locator('form').filter({ hasText: 'Book session' })
    const dateCombobox = form.getByRole('combobox').first()
    const timeCombobox = form.getByRole('combobox').nth(1)

    for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
      if (dayIndex > 0) {
        await dateCombobox.click()
        await page.getByRole('option').nth(dayIndex).click()
      }

      await expect(timeCombobox).not.toContainText('Loading', { timeout: 20_000 })

      if (await timeCombobox.isEnabled()) {
        await timeCombobox.click()
        await page.getByRole('option').first().click()
        break
      }

      if (dayIndex === 13) {
        throw new Error('No client self-booking slots in the next 14 days')
      }
    }

    await form.getByRole('button', { name: 'Book session' }).click()
    await expect(page.getByText('Session booked')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Scheduled').first()).toBeVisible()
  })
})

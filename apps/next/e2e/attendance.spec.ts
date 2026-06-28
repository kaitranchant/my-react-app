import { test, expect, E2E_CLIENT_NAME, clickSidebarLink } from './fixtures'

test.describe('Attendance', () => {
  test('coach can mark daily client presence', async ({ coachPage: page }) => {
    await clickSidebarLink(page, 'Clients', 'Attendance')
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()

    const clientRow = page.getByRole('listitem').filter({ hasText: E2E_CLIENT_NAME })
    await expect(clientRow).toBeVisible()
    const statusSelect = clientRow.getByRole('combobox').first()
    await statusSelect.click()
    await page.getByRole('option', { name: 'Present' }).click()

    await expect(statusSelect).toContainText('Present', {
      timeout: 15_000,
    })
    await expect(page.getByText(/1 present/i)).toBeVisible()
  })

  test('coach can mark team event attendance from global page', async ({
    coachPage: page,
  }) => {
    const teamName = `E2E Attendance Team ${Date.now()}`
    const eventTitle = `E2E Practice ${Date.now()}`

    await page.goto('/teams')
    await page.getByRole('button', { name: 'Create team' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create team' })
    await dialog.getByLabel('Name').fill(teamName)
    await dialog.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(page).toHaveURL(/\/teams\//, { timeout: 15_000 })

    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Add member' }).click()
    await page.getByLabel('Client').click()
    await page.getByRole('option', { name: E2E_CLIENT_NAME }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add member', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

    await page.getByRole('tab', { name: 'Schedule' }).click()
    await page.getByRole('button', { name: 'Add event' }).click()
    const eventDialog = page.getByRole('dialog', { name: 'Add team event' })
    await eventDialog.getByLabel('Title').fill(eventTitle)
    await eventDialog.getByRole('button', { name: 'Add event', exact: true }).click()
    await expect(page.getByText('Event added to team schedule')).toBeVisible({
      timeout: 15_000,
    })
    await expect(eventDialog).toBeHidden({ timeout: 15_000 })
    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 15_000 })

    await page.goto('/attendance')
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()
    await page
      .locator('div')
      .filter({ has: page.getByText('Filter by team') })
      .getByRole('button', { name: teamName })
      .click()
    await expect(page.getByText(eventTitle)).toBeVisible()

    const eventCard = page.locator('li').filter({ hasText: eventTitle })
    await eventCard.getByRole('button', { name: 'Roll call' }).click()

    const memberRow = eventCard
      .locator('li')
      .filter({ hasText: E2E_CLIENT_NAME })
    await memberRow.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: 'Present' }).click()

    await expect(memberRow.getByRole('combobox').nth(1)).toContainText(
      'Present',
      { timeout: 15_000 }
    )
    await expect(eventCard.getByText(/1 present/i)).toBeVisible()
  })

  test('coach can filter daily roll call by team', async ({ coachPage: page }) => {
    const teamName = `E2E Attendance Filter ${Date.now()}`

    await page.goto('/teams')
    await page.getByRole('button', { name: 'Create team' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create team' })
    await dialog.getByLabel('Name').fill(teamName)
    await dialog.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(page).toHaveURL(/\/teams\//, { timeout: 15_000 })

    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Add member' }).click()
    await page.getByLabel('Client').click()
    await page.getByRole('option', { name: E2E_CLIENT_NAME }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add member', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

    await clickSidebarLink(page, 'Clients', 'Attendance')
    await page
      .locator('div')
      .filter({ has: page.getByText('Filter by team') })
      .getByRole('button', { name: teamName })
      .click()

    const clientRows = page.getByRole('listitem').filter({ hasText: E2E_CLIENT_NAME })
    await expect(clientRows).toHaveCount(1)
    await expect(page.getByText(`Mark presence for ${teamName} members`)).toBeVisible()
  })
})

import { test, expect, E2E_CLIENT_NAME, expandSidebarGroup } from './fixtures'

test.describe('Attendance', () => {
  test('coach can mark daily client presence', async ({ coachPage: page }) => {
    await expandSidebarGroup(page, 'Clients')
    await page.getByRole('link', { name: 'Attendance', exact: true }).click()
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
    await page.getByLabel('Title').fill(eventTitle)
    await page.getByRole('button', { name: 'Add event', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })
    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 15_000 })

    await page.goto('/attendance')
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()
    await page.getByRole('tab', { name: teamName }).click()
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

    await expandSidebarGroup(page, 'Clients')
    await page.getByRole('link', { name: 'Attendance', exact: true }).click()
    await page.getByRole('tab', { name: teamName }).click()

    const clientRows = page.getByRole('listitem').filter({ hasText: E2E_CLIENT_NAME })
    await expect(clientRows).toHaveCount(1)
    await expect(page.getByText(`Mark presence for ${teamName} members`)).toBeVisible()
  })
})

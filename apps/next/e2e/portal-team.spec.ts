import {
  test,
  expect,
  E2E_CLIENT_NAME,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  hasE2ECredentials,
  login,
  signOutFromApp,
  teamIdFromUrl,
  todayDateKey,
} from './fixtures'

test.describe('Portal team', () => {
  test('client sees team announcements and can RSVP to events', async ({
    coachPage: page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(150_000)

    const teamName = `E2E Portal Team ${Date.now()}`
    const eventTitle = `E2E Practice ${Date.now()}`
    const announcementText = `E2E team announcement ${Date.now()}`
    const eventDate = todayDateKey()

    await page.goto('/teams')
    await page.getByRole('button', { name: 'Create team' }).click()
    const dialog = page.getByRole('dialog', { name: 'Create team' })
    await dialog.getByLabel('Name').fill(teamName)
    await dialog.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(page).toHaveURL(/\/teams\//, { timeout: 15_000 })
    const teamId = teamIdFromUrl(page.url())
    expect(teamId).toBeTruthy()

    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Add member' }).click()
    await page.getByRole('combobox', { name: 'Client' }).click()
    await page.getByRole('option', { name: E2E_CLIENT_NAME }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add member', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

    await page.getByRole('tab', { name: 'Overview' }).click()
    await page
      .getByPlaceholder('Post a message to the whole team…')
      .fill(announcementText)
    await page.getByRole('button', { name: 'Post announcement' }).click()
    await expect(page.getByText(announcementText)).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('tab', { name: 'Schedule' }).click()
    await page.getByRole('tab', { name: 'Events' }).click()
    await expect(page).toHaveURL(/section=events/, { timeout: 15_000 })
    await page.getByRole('button', { name: 'Add event' }).click()
    const eventDialog = page.getByRole('dialog', { name: 'Add team event' })
    await eventDialog.getByLabel('Title').fill(eventTitle)
    await eventDialog.getByLabel('Date').fill(eventDate)
    await eventDialog.getByRole('button', { name: 'Add event', exact: true }).click()
    await expect(eventDialog).toBeHidden({ timeout: 15_000 })
    await page.reload()
    await page.getByRole('tab', { name: 'Schedule' }).click()
    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 15_000 })

    await signOutFromApp(page, 'E2E Coach')

    await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, /\/portal/)

    await page.goto(`/portal/team?team=${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(announcementText)).toBeVisible()
    await expect(page.getByText(eventTitle)).toBeVisible()

    await page.getByRole('button', { name: 'Going' }).click()
    await expect(page.getByText('RSVP updated')).toBeVisible({
      timeout: 15_000,
    })

    await signOutFromApp(page, E2E_CLIENT_NAME)

    await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD, /\/dashboard/)

    await page.goto('/teams')
    await page.getByRole('link', { name: teamName }).click()
    await page.getByRole('tab', { name: 'Schedule' }).click()
    await page.getByRole('tab', { name: 'Events' }).click()
    await expect(page.getByText(/RSVP: 1 going/)).toBeVisible({
      timeout: 15_000,
    })
  })
})

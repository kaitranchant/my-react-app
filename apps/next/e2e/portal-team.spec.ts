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
} from './fixtures'

function tomorrowDateKey() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

test.describe('Portal team', () => {
  test('client sees team announcements and can RSVP to events', async ({
    coachPage: page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(90_000)

    const teamName = `E2E Portal Team ${Date.now()}`
    const eventTitle = `E2E Practice ${Date.now()}`
    const announcementText = `E2E team announcement ${Date.now()}`
    const eventDate = tomorrowDateKey()

    await page.goto('/teams')
    await page.getByRole('button', { name: 'Create team' }).click()
    await page.getByLabel('Name').fill(teamName)
    await page.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(page).toHaveURL(/\/teams\//, { timeout: 15_000 })
    const teamId = teamIdFromUrl(page.url())
    expect(teamId).toBeTruthy()

    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Add member' }).click()
    await page.getByLabel('Client').click()
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
    await page.getByRole('button', { name: 'Add event' }).click()
    await page.getByLabel('Title').fill(eventTitle)
    await page.getByLabel('Date').fill(eventDate)
    await page.getByRole('button', { name: 'Add event', exact: true }).click()
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
    await expect(page.getByText(/RSVP: 1 going/)).toBeVisible({
      timeout: 15_000,
    })
  })
})

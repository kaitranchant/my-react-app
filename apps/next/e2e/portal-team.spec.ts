import { test, expect, E2E_CLIENT_NAME } from './fixtures'

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
    coachPage,
    clientPage,
  }) => {
    const teamName = `E2E Portal Team ${Date.now()}`
    const eventTitle = `E2E Practice ${Date.now()}`
    const announcementText = `E2E team announcement ${Date.now()}`
    const eventDate = tomorrowDateKey()

    await coachPage.goto('/teams')
    await coachPage.getByRole('button', { name: 'Create team' }).click()
    await coachPage.getByLabel('Name').fill(teamName)
    await coachPage.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(coachPage).toHaveURL(/\/teams\//, { timeout: 15_000 })

    await coachPage.getByRole('tab', { name: 'Members' }).click()
    await coachPage.getByRole('button', { name: 'Add member' }).click()
    await coachPage.getByLabel('Client').click()
    await coachPage.getByRole('option', { name: E2E_CLIENT_NAME }).click()
    await coachPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Add member', exact: true })
      .click()
    await expect(coachPage.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

    await coachPage.getByRole('tab', { name: 'Overview' }).click()
    await coachPage
      .getByPlaceholder('Post a message to the whole team…')
      .fill(announcementText)
    await coachPage.getByRole('button', { name: 'Post announcement' }).click()
    await expect(coachPage.getByText(announcementText)).toBeVisible({
      timeout: 15_000,
    })

    await coachPage.getByRole('tab', { name: 'Schedule' }).click()
    await coachPage.getByRole('button', { name: 'Add event' }).click()
    await coachPage.getByLabel('Title').fill(eventTitle)
    await coachPage.getByLabel('Date').fill(eventDate)
    await coachPage.getByRole('button', { name: 'Add event', exact: true }).click()
    await expect(coachPage.getByText(eventTitle)).toBeVisible({ timeout: 15_000 })

    await clientPage.goto('/portal/team')
    await expect(clientPage.getByRole('heading', { name: teamName })).toBeVisible({
      timeout: 15_000,
    })
    await expect(clientPage.getByText(announcementText)).toBeVisible()
    await expect(clientPage.getByText(eventTitle)).toBeVisible()

    await clientPage.getByRole('button', { name: 'Going' }).click()
    await expect(clientPage.getByText('RSVP updated')).toBeVisible({
      timeout: 15_000,
    })

    await coachPage.reload()
    await coachPage.getByRole('tab', { name: 'Schedule' }).click()
    await expect(coachPage.getByText(/RSVP: 1 going/)).toBeVisible({
      timeout: 15_000,
    })
  })
})

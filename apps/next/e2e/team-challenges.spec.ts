import {
  test,
  expect,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_NAME,
  E2E_CLIENT_PASSWORD,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  login,
  signOutFromApp,
  teamIdFromUrl,
} from './fixtures'

test.describe('Team challenges', () => {
  test('coach can publish a challenge and client sees it on the team portal', async ({
    coachPage: page,
  }) => {
    test.setTimeout(90_000)

    const teamName = `E2E Challenge Team ${Date.now()}`
    const challengeName = `E2E Consistency Challenge ${Date.now()}`

    await page.goto('/teams')
    await page.getByRole('button', { name: 'Create team' }).click()
    const createTeamDialog = page.getByRole('dialog', { name: 'Create team' })
    await createTeamDialog.getByLabel('Name').fill(teamName)
    await createTeamDialog
      .getByRole('button', { name: 'Create team', exact: true })
      .click()

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

    await page.getByRole('tab', { name: 'Challenges' }).click()
    await expect(page.getByRole('heading', { name: 'Challenges' })).toBeVisible()

    await page.getByRole('button', { name: 'New challenge' }).click()
    const challengeDialog = page.getByRole('dialog', {
      name: 'Create team challenge',
    })
    await challengeDialog.getByLabel('Challenge name').fill(challengeName)
    await challengeDialog.getByLabel('Metric').click()
    await page.getByRole('option', { name: 'Consistency' }).click()
    await challengeDialog.getByRole('button', { name: 'Create draft' }).click()
    await expect(challengeDialog).toBeHidden({ timeout: 15_000 })

    await expect(page.getByText(challengeName)).toBeVisible({ timeout: 15_000 })

    const challengeCard = page.locator('[data-slot="card"]').filter({
      has: page.getByText(challengeName, { exact: true }),
    })
    await challengeCard.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Challenge published')).toBeVisible({
      timeout: 15_000,
    })

    await signOutFromApp(page, 'E2E Coach')
    await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, /\/portal/)

    await page.goto(`/portal/team?team=${teamId}`)
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: 'Team challenges' })).toBeVisible()
    await expect(page.getByText(challengeName)).toBeVisible()

    await signOutFromApp(page, E2E_CLIENT_NAME)
    await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD, /\/dashboard/)
  })
})

import {
  test,
  expect,
  E2E_CLIENT_ID,
  E2E_CLIENT_NAME,
  E2E_GYM_COACH_EMAIL,
  E2E_GYM_COACH_PASSWORD,
  clientRosterLink,
  login,
} from './fixtures'

test.describe('Gyms', () => {
  test('owner can create gym, share a client, and invite a coach who gains access', async ({
    browser,
    coachPage: page,
  }) => {
    test.setTimeout(60_000)

    const gymName = `E2E Gym ${Date.now()}`

    await page.goto('/gym')
    await page.getByRole('button', { name: 'Create gym' }).click()
    await page.getByLabel('Gym name').fill(gymName)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create gym' })
      .click()

    await expect(page.getByRole('heading', { name: gymName })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto(`/clients/${E2E_CLIENT_ID}`)
    await page.getByRole('button', { name: 'More actions' }).click()
    await page
      .getByRole('menuitem', { name: new RegExp(`Add to ${gymName}`) })
      .click()
    await page.getByRole('button', { name: 'More actions' }).click()
    await expect(
      page.getByRole('menuitem', {
        name: new RegExp(`Remove from ${gymName}`),
      })
    ).toBeVisible({ timeout: 15_000 })

    await page.goto('/gym')
    await page.getByRole('button', { name: 'Invite coach' }).click()
    await page.getByLabel('Email').fill(E2E_GYM_COACH_EMAIL)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create invite link' })
      .click()

    const signupLink = page.getByRole('dialog').getByText(/invite=/)
    await expect(signupLink).toBeVisible({ timeout: 15_000 })
    const inviteUrlText = (await signupLink.textContent())?.trim() ?? ''
    const token = new URL(inviteUrlText, 'http://localhost').searchParams.get('invite')
    expect(token).toBeTruthy()
    const inviteUrl = `/gym/join?invite=${token}`

    const gymCoachContext = await browser.newContext()
    const gymCoachPage = await gymCoachContext.newPage()

    await login(gymCoachPage, E2E_GYM_COACH_EMAIL, E2E_GYM_COACH_PASSWORD)
    await expect(gymCoachPage).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    await gymCoachPage.goto(inviteUrl)
    await expect(gymCoachPage.getByText(`Join ${gymName}`).first()).toBeVisible({
      timeout: 15_000,
    })
    await gymCoachPage.getByRole('button', { name: 'Accept invite' }).click()
    await expect(gymCoachPage).toHaveURL(/\/gym\?gym=/, { timeout: 15_000 })
    await expect(
      gymCoachPage.getByRole('heading', { name: gymName })
    ).toBeVisible({ timeout: 15_000 })

    await gymCoachPage.goto('/clients')
    await expect(
      gymCoachPage.locator('table').getByText(E2E_CLIENT_NAME)
    ).toBeVisible({
      timeout: 15_000,
    })

    await clientRosterLink(gymCoachPage, E2E_CLIENT_NAME).click()
    await expect(
      gymCoachPage.getByRole('heading', { name: E2E_CLIENT_NAME })
    ).toBeVisible({ timeout: 15_000 })
    await expect(gymCoachPage.getByText('Primary coach:')).toBeVisible()
    await expect(
      gymCoachPage.getByText(new RegExp(`${gymName} member`))
    ).toBeVisible()
    await expect(gymCoachPage.getByText('E2E Coach')).toBeVisible()

    await gymCoachContext.close()
  })
})

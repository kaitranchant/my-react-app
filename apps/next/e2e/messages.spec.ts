import {
  test,
  expect,
  E2E_CLIENT_NAME,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  E2E_CLIENT_ID,
  hasE2ECredentials,
  signOutFromApp,
} from './fixtures'

test.describe('Client messaging', () => {
  test('client and coach can exchange messages', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    const clientMessage = `E2E client message ${Date.now()}`
    const coachReply = `E2E coach reply ${Date.now()}`

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/messages')
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
    const clientTextarea = page.getByPlaceholder('Write a message…')
    await clientTextarea.click()
    await clientTextarea.fill(clientMessage)
    const clientSend = page.getByRole('button', { name: 'Send message' })
    await expect(clientSend).toBeEnabled({ timeout: 5_000 })
    await clientSend.click()
    await expect(page.getByText(clientMessage)).toBeVisible({ timeout: 10_000 })

    await signOutFromApp(page, E2E_CLIENT_NAME)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`/messages?client=${E2E_CLIENT_ID}`)
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
    await expect(
      page.locator('.whitespace-pre-wrap').filter({ hasText: clientMessage }).last()
    ).toBeVisible({ timeout: 15_000 })

    const coachTextarea = page.getByPlaceholder('Write a message…')
    await coachTextarea.click()
    await coachTextarea.fill(coachReply)
    const coachSend = page.getByRole('button', { name: 'Send message' })
    await expect(coachSend).toBeEnabled({ timeout: 5_000 })
    await coachSend.click()
    await expect(
      page.locator('.whitespace-pre-wrap').filter({ hasText: coachReply }).last()
    ).toBeVisible({ timeout: 10_000 })
  })
})

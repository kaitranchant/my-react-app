import { test, expect, expectSidebarLink } from './fixtures'

test.describe('Progressive overload', () => {
  test('coach progressive overload inbox loads without schema errors', async ({
    coachPage: page,
  }) => {
    await expectSidebarLink(page, 'Programming', 'Progressive overload')
    await page.getByRole('link', { name: 'Progressive overload', exact: true }).click()

    await expect(page).toHaveURL(/\/progressive-overload/, { timeout: 15_000 })
    await expect(
      page.getByRole('heading', { name: 'Progressive overload' })
    ).toBeVisible()

    await expect(
      page.getByText(/requires a database update/i)
    ).toHaveCount(0)

    await expect(
      page
        .getByText(/No load increases to review/i)
        .or(page.getByText(/suggestion/i))
    ).toBeVisible({ timeout: 15_000 })
  })
})

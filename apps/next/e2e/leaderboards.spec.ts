import { test, expect, expandSidebarGroup, E2E_CLIENT_NAME } from './fixtures'

test.describe('Leaderboards', () => {
  test('coach can open leaderboards and switch categories', async ({
    coachPage: page,
  }) => {
    await expandSidebarGroup(page, 'Clients')
    await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Leaderboards' })).toBeVisible()

    await expect(page.getByText('Roster leaderboard')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Strength' })).toBeVisible()

    await page.getByRole('button', { name: 'Strength' }).click()
    await expect(page).toHaveURL(/metric=strength/)

    await page.getByRole('button', { name: 'Wilks / DOTS' }).click()
    await expect(page).toHaveURL(/metric=relative_strength/)

    await page.getByRole('tab', { name: 'This month' }).click()
    await expect(page).toHaveURL(/period=month/)

    await page.getByRole('button', { name: 'Streak' }).click()
    await expect(page).toHaveURL(/metric=streak/)
  })

  test('coach sees Wilks / DOTS score for seeded athlete', async ({
    coachPage: page,
  }) => {
    await expandSidebarGroup(page, 'Clients')
    await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
    await page.getByRole('button', { name: 'Wilks / DOTS' }).click()
    await expect(page).toHaveURL(/metric=relative_strength/)

    await expect(page.getByRole('cell', { name: E2E_CLIENT_NAME })).toBeVisible()
    await expect(page.getByText(/DOTS ·/)).toBeVisible()
  })
})

import { test, expect, expandSidebarGroup } from './fixtures'

test.describe('Leaderboards', () => {
  test('coach can open leaderboards and switch categories', async ({
    coachPage: page,
  }) => {
    await expandSidebarGroup(page, 'Athletes')
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
})

import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixture } from './fixture'
import { mockRadar } from './radar-fixture'

test.beforeEach(async ({ page }) => {
  await mockRadar(page)
  await page.clock.install({ time: new Date('2026-10-14T08:15:00Z') })
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ json: { success: false } })
  )
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: fixture })
  )
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Activity planner' })
  ).toBeVisible()
})

test('ranks activity windows and updates the plan for each activity', async ({
  page,
}) => {
  const planner = page.getByRole('region', { name: 'Activity planner' })
  await expect(planner.getByText('Best match')).toBeVisible()
  await expect(planner.locator('.activity-window')).toHaveCount(3)

  await planner.getByRole('button', { name: 'Picnic' }).click()
  await expect(planner.getByRole('button', { name: 'Picnic' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(planner.locator('.activity-window').first()).toContainText('2')

  await page.getByRole('button', { name: '°F', exact: true }).click()
  await expect(planner.locator('.activity-window').first()).toContainText('°F')
})

test('planner remains accessible without page overflow on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 })
  const planner = page.getByRole('region', { name: 'Activity planner' })
  await planner.scrollIntoViewIfNeeded()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations
  ).toEqual([])
})

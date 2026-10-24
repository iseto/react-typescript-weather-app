import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixture } from './fixture'
import { mockRadar } from './radar-fixture'

test.beforeEach(async ({ page }) => {
  await mockRadar(page)
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ json: { success: false } })
  )
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: fixture })
  )
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
})

test('opens a complete local-day forecast and closes with the keyboard', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'View details for Thursday 15 October' })
    .click()

  const dialog = page.getByRole('dialog', { name: 'Thursday 15 October' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.day-detail-header p')).toHaveText('Overcast')
  await expect(dialog.getByText('25%', { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText('3.0 · Moderate')).toBeVisible()
  await expect(
    dialog.getByLabel(
      'Hourly forecast for Thursday 15 October, scroll for more hours'
    )
  ).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'View details for Thursday 15 October' })
  ).toBeFocused()
})

test('day details are accessible and stay within a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page
    .getByRole('button', { name: 'View details for Wednesday 14 October' })
    .click()

  const dialog = page.getByRole('dialog', { name: 'Wednesday 14 October' })
  await expect(dialog).toBeVisible()
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

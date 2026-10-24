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
  await page.goto('/?lat=52.52&lon=13.41&city=Berlin&country=Germany')
  await expect(page.getByRole('heading', { name: 'Rain radar' })).toBeVisible()
})

test('loads, navigates, and animates recent radar frames', async ({ page }) => {
  const radar = page.getByRole('region', { name: 'Rain radar', exact: true })
  await expect(
    radar.getByRole('region', {
      name: 'Interactive rain radar map centered on Berlin',
    })
  ).toBeVisible()
  await expect(radar.getByText('10:40 CEST')).toBeVisible()

  await radar.getByRole('button', { name: 'Previous radar frame' }).click()
  await expect(radar.getByText('10:30 CEST')).toBeVisible()
  await radar.getByRole('button', { name: 'Play radar animation' }).click()
  await expect(
    radar.getByRole('button', { name: 'Pause radar animation' })
  ).toBeVisible()
  await expect(radar.getByText('10:40 CEST')).toBeVisible({ timeout: 2500 })
  await radar.getByRole('button', { name: 'Pause radar animation' }).click()
})

test('keeps the last radar frame when offline and stays accessible on mobile', async ({
  page,
  context,
}) => {
  const radar = page.getByRole('region', { name: 'Rain radar', exact: true })
  await page.setViewportSize({ width: 320, height: 760 })
  await radar.scrollIntoViewIfNeeded()
  await context.setOffline(true)
  await expect(radar.getByText('Last loaded frame')).toBeVisible()
  await expect(
    radar.getByRole('button', { name: 'Play radar animation' })
  ).toBeDisabled()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  expect(
    (
      await new AxeBuilder({ page })
        .include('.rain-radar')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations
  ).toEqual([])
  await context.setOffline(false)
})

test('contains radar service failures without affecting the forecast', async ({
  page,
}) => {
  await page.route(
    'https://api.rainviewer.com/public/weather-maps.json',
    (route) => route.fulfill({ status: 503, json: { error: true } })
  )
  await page.getByRole('button', { name: 'Refresh radar' }).click()
  await expect(
    page.getByText('Radar service returned 503. Showing the last loaded frame.')
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
})

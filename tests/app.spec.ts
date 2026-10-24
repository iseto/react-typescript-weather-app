import { test, expect } from '@playwright/test'
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
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Lisbon',
            country: 'Portugal',
            latitude: 38.72,
            longitude: -9.14,
          },
        ],
      },
    })
  )
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
})
test('responsive forecast, units, saved places, and accessible dialog', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'Berlin' })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.getByRole('button', { name: '°F', exact: true }).click()
  await expect(page.locator('.temperature')).toHaveText('64°')
  await page.getByRole('button', { name: 'Save place', exact: true }).click()
  await expect(
    page.getByRole('navigation', { name: 'Saved places' })
  ).toContainText('Berlin')
  await page.reload()
  await expect(
    page.getByRole('button', { name: '°F', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Remove saved place' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Get the app' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('city search works with keyboard and keeps search available after loading', async ({
  page,
}) => {
  const search = page.getByRole('combobox', { name: 'Search for a city' })
  await search.fill('Lis')
  await expect(
    page.getByRole('listbox', { name: 'Cities' }).getByRole('option')
  ).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  await expect(search).toHaveValue('')
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
})
test('shared URL selects its location and clipboard fallback includes the coordinates', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          ;(window as unknown as { copied: string }).copied = text
        },
      },
      configurable: true,
    })
  })
  await page.goto('/?lat=38.72&lon=-9.14&city=Lisbon&country=Portugal')
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Share forecast' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Forecast link copied' })
  ).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied)
  ).toContain('lat=38.72')
})
test('offline shell and saved forecast survive a reload', async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true }
        )
      )
  })
  await page.unroute('https://api.open-meteo.com/**')
  await context.setOffline(true)
  await page.reload()
  await expect(
    page.getByText(
      'You’re offline. Your last saved forecast is available below.'
    )
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
  await expect(page.getByText('SAVED FORECAST', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await context.setOffline(false)
})
test('first visit API failure gives a recoverable state without invented weather', async ({
  page,
}) => {
  await page.evaluate(async () => {
    localStorage.clear()
    for (const r of await navigator.serviceWorker.getRegistrations())
      await r.unregister()
  })
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, json: { error: true } })
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'No forecast yet' })
  ).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: '503' })
  ).toBeVisible()
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: fixture })
  )
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
})
test('meets automated WCAG AA checks on the dashboard and modal', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const dashboard = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dashboard.violations).toEqual([])
  await page.getByRole('button', { name: 'Get the app' }).click()
  const dialog = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(dialog.violations).toEqual([])
})

test('first visit selects an approximate city without requesting GPS', async ({
  page,
}) => {
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({
      json: {
        success: true,
        city: 'Lisbon',
        country: 'Portugal',
        latitude: 38.72,
        longitude: -9.14,
      },
    })
  )
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  await expect(page.getByText('Portugal · Approximate city (IP)')).toBeVisible()
  let lookups = 0
  await page.route('https://ipwho.is/**', (route) => {
    lookups++
    return route.fulfill({ json: { success: false } })
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  expect(lookups).toBe(0)
})
test('denied device location falls back to IP and handles provider failure', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (
          _success: unknown,
          failure: (error: { code: number }) => void
        ) => failure({ code: 1 }),
      },
      configurable: true,
    })
  })
  await page.reload()
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({
      json: {
        success: true,
        city: 'Lisbon',
        country: 'Portugal',
        latitude: 38.72,
        longitude: -9.14,
      },
    })
  )
  await page.getByRole('button', { name: 'Use my location' }).click()
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  await expect(page.getByText('Portugal · Approximate city (IP)')).toBeVisible()
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ status: 429, json: { success: false } })
  )
  await page.getByRole('button', { name: 'Use my location' }).click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Location and IP lookup unavailable' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
})

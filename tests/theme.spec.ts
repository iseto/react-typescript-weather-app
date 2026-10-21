import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixture } from './fixture'
test.beforeEach(async ({ page }) => {
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
})
test('follows the device until an explicit theme is chosen and remembers it on reload', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  const select = page.getByRole('combobox', { name: 'Color theme' })
  await expect(select).toHaveValue('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await select.selectOption('dark')
  await page.reload()
  await expect(select).toHaveValue('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#121b17'
  )
  await select.selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
test('applies a saved theme before React loads', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('atmos-theme', JSON.stringify('dark'))
    localStorage.setItem('atmos-contrast', JSON.stringify('more'))
  })
  await page.route('**/assets/index-*.js', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(
    await page.locator('html').evaluate((e) => getComputedStyle(e).colorScheme)
  ).toBe('dark')
})
test('handles blocked storage and invalid preferences', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => {
    localStorage.setItem('atmos-theme', JSON.stringify('invalid'))
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
  })
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toHaveValue(
    'system'
  )
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('status').filter({ hasText: 'Theme changed for this visit' })
  ).toBeVisible()
})
for (const theme of ['light', 'dark']) {
  test(`${theme} theme has accessible dashboard, search and dialog contrast without mobile overflow`, async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('combobox', { name: 'Color theme' })
      .selectOption(theme)
    await expect(
      page.getByRole('heading', { name: 'The week ahead' })
    ).toBeVisible()
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true)
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
    await page
      .getByRole('combobox', { name: 'Search for a city' })
      .fill('Lisbon')
    await expect(
      page.getByRole('listbox', { name: 'Cities' }).getByRole('option')
    ).toBeVisible()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Get the app' }).click()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
  })
}
test('retains the selected dark theme on a real offline service-worker reload', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('dark')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.unroute('https://api.open-meteo.com/**')
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('status', { name: 'Forecast data status' })
  ).toHaveAttribute('data-state', 'offline')
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toHaveValue(
    'dark'
  )
})

for (const theme of ['light', 'dark']) {
  test(`${theme} with increased contrast retains weather interactions and readable dialogs`, async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'The week ahead' })
    ).toBeVisible()
    await page
      .getByRole('combobox', { name: 'Color theme' })
      .selectOption(theme)
    await page
      .getByRole('combobox', { name: 'Contrast', exact: true })
      .selectOption('more')
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more')
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
    expect(
      (
        await new AxeBuilder({ page })
          .withRules(['color-contrast-enhanced'])
          .analyze()
      ).violations
    ).toEqual([])
    await page.getByRole('button', { name: 'Get the app' }).click()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(
      page.getByRole('combobox', { name: 'Contrast', exact: true })
    ).toHaveValue('more')
    await expect(
      page.getByRole('combobox', { name: 'Color theme' })
    ).toHaveValue(theme)
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true)
    }
  })
}

test('system contrast follows device changes independently of theme and supports forced colors', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', contrast: 'more' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more')
  await page
    .getByRole('combobox', { name: 'Color theme' })
    .selectOption('light')
  await page.emulateMedia({ contrast: 'no-preference' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveAttribute(
    'data-contrast',
    'standard'
  )
  await page
    .getByRole('combobox', { name: 'Contrast', exact: true })
    .selectOption('more')
  await page.emulateMedia({ forcedColors: 'active' })
  await expect(
    page.getByRole('heading', { name: 'The week ahead' })
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'Contrast', exact: true }).focus()
  await expect(
    page.getByRole('combobox', { name: 'Contrast', exact: true })
  ).toBeFocused()
  expect(
    await page
      .getByRole('combobox', { name: 'Contrast', exact: true })
      .evaluate((el) => getComputedStyle(el).forcedColorAdjust)
  ).toBe('auto')
})

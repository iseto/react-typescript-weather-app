import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixture } from './fixture'
test.use({ timezoneId: 'Pacific/Honolulu' })
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T08:15:00Z') })
  const weather = structuredClone(fixture)
  weather.hourly.precipitation_probability = weather.hourly.time.map((_, i) =>
    i >= 6 && i <= 8 ? 70 : 10
  )
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: weather })
  )
  await page.goto('/?lat=52.52&lon=13.41&city=Berlin&country=Germany')
  await expect(
    page.getByRole('status', { name: 'Forecast data status' })
  ).toHaveAttribute('data-state', 'ready')
})
test('today briefing uses local forecast data and follows the temperature unit', async ({
  page,
}) => {
  const briefing = page.getByRole('region', { name: "Today's briefing" })
  await expect(briefing).toContainText(
    "Today's high is 21°C, with a low of 12°C."
  )
  await expect(briefing).toContainText('Warmer later')
  await expect(briefing).toContainText('from 16:00 to 19:00 (up to 70%)')
  await page.getByRole('button', { name: '°F', exact: true }).click()
  await expect(briefing).toContainText(
    "Today's high is 70°F, with a low of 54°F."
  )
  await expect(briefing).toContainText('70%')
})
test('briefing rolls over at city-local midnight and does not relabel old forecasts as today', async ({
  page,
}) => {
  const briefing = page.getByRole('region', { name: "Today's briefing" })
  await page.clock.setFixedTime(new Date('2026-10-14T22:15:00Z'))
  await page.clock.fastForward(60000)
  await expect(briefing.locator('.briefing-date')).toHaveText('15 Oct')
  await expect(briefing).toContainText("Today's high is 19°C")
  await page.clock.setFixedTime(new Date('2026-10-22T08:15:00Z'))
  await page.clock.fastForward(60000)
  await expect(briefing).toContainText(
    'This forecast does not cover today in Berlin'
  )
  await expect(briefing.locator('.briefing-summary')).toHaveCount(0)
})
test('offline briefing keeps its source timestamp and is readable in both themes on mobile', async ({
  page,
  context,
}) => {
  const briefing = page.getByRole('region', { name: "Today's briefing" })
  const retrieved = await briefing.locator('time').getAttribute('datetime')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.unroute('https://api.open-meteo.com/**')
  await context.setOffline(true)
  await page.reload()
  await expect(briefing).toContainText('From the previous forecast')
  await expect(briefing).toContainText('from 16:00 to 19:00')
  await expect(briefing.locator('time')).toHaveAttribute('datetime', retrieved!)
  await page.setViewportSize({ width: 320, height: 844 })
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('combobox', { name: 'Color theme' })
      .selectOption(theme)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    expect(
      (
        await new AxeBuilder({ page })
          .include('.daily-briefing')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations
    ).toEqual([])
  }
})

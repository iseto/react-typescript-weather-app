import { test, expect, type Page } from '@playwright/test'
import { fixture, autumnFixture } from './fixture'
test.use({ timezoneId: 'Pacific/Honolulu' })
const berlin = {
  name: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.41,
}
const lisbon = {
  name: 'Lisbon',
  country: 'Portugal',
  latitude: 38.72,
  longitude: -9.14,
}
const tokyo = {
  name: 'Tokyo',
  country: 'Japan',
  latitude: 35.68,
  longitude: 139.69,
}
const retrieved = '2026-10-14T08:15:00.000Z'
function weather(temp: number, timezone = 'Europe/Berlin') {
  const difference = temp - fixture.current.temperature_2m
  return {
    ...fixture,
    timezone,
    current: {
      ...fixture.current,
      temperature_2m: temp,
      apparent_temperature: fixture.current.apparent_temperature + difference,
    },
    hourly: {
      ...fixture.hourly,
      temperature_2m: fixture.hourly.temperature_2m.map((t) => t + difference),
    },
    daily: {
      ...fixture.daily,
      temperature_2m_max: fixture.daily.temperature_2m_max.map(
        (t) => t + difference
      ),
      temperature_2m_min: fixture.daily.temperature_2m_min.map(
        (t) => t + difference
      ),
    },
  }
}
const state = (page: Page) =>
  page.getByRole('status', { name: 'Forecast data status' })
async function cacheBoth(page: Page) {
  await page.getByRole('button', { name: 'Save place', exact: true }).click()
  const search = page.getByRole('combobox', { name: 'Search for a city' })
  await search.fill('Lisbon')
  await page.getByRole('option').click()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  await page.getByRole('button', { name: 'Save place', exact: true }).click()
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(retrieved) })
  await page.addInitScript(
    ({ berlin, tokyo }) => {
      if (!localStorage.getItem('atmos-last-place')) {
        localStorage.setItem('atmos-last-place', JSON.stringify(berlin))
        localStorage.setItem('atmos-places', JSON.stringify([tokyo]))
      }
    },
    { berlin, tokyo }
  )
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ json: { success: false } })
  )
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { results: [lisbon] } })
  )
  await page.route('https://api.open-meteo.com/**', (route) => {
    const lisbon =
      new URL(route.request().url()).searchParams.get('latitude') === '38.72'
    return route.fulfill({
      json: lisbon ? weather(24, 'Europe/Lisbon') : weather(18),
    })
  })
  await page.goto('/')
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
})
test('switching cities while pending cannot relabel the previous city’s data or apply a late response', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let pending = false
  await page.route('https://api.open-meteo.com/**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('latitude') !== '38.72')
      return route.fulfill({ json: weather(18) })
    pending = true
    await gate
    await route.fulfill({ json: weather(31) }).catch(() => {})
  })
  await page.getByRole('button', { name: 'Save place', exact: true }).click()
  await page.getByRole('combobox').fill('Lisbon')
  await page.getByRole('option').click()
  await expect(state(page)).toHaveAttribute('data-state', 'loading')
  await expect.poll(() => pending).toBe(true)
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
  await expect(page.locator('.temperature')).toHaveCount(0)
  await page
    .getByRole('navigation', { name: 'Saved places' })
    .getByRole('button', { name: 'Berlin' })
    .click()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  release()
  await expect(page.getByRole('heading', { name: 'Berlin' })).toBeVisible()
  await expect(page.locator('.temperature')).toHaveText('18°')
  expect(
    await page.evaluate(() =>
      localStorage.getItem('atmos-weather-38.720,-9.140')
    )
  ).toBeNull()
})
test('refresh failure preserves distinct forecast/retrieval timestamps, then reconnect refreshes the selected city only', async ({
  page,
  context,
}) => {
  await cacheBoth(page)
  const original = await page
    .locator('.retrieval-time time')
    .getAttribute('datetime')
  await expect(page.locator('.forecast-time time')).toHaveAttribute(
    'datetime',
    '2026-10-14T08:00:00.000Z'
  )
  expect(Date.parse(original!)).toBeGreaterThan(
    Date.parse('2026-10-14T08:00:00Z')
  )
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.getByRole('button', { name: 'Refresh forecast' }).click()
  await expect(state(page)).toHaveAttribute('data-state', 'cached')
  await expect(page.locator('.retrieval-time time')).toHaveAttribute(
    'datetime',
    original!
  )
  await expect(page.locator('.temperature')).toHaveText('24°')
  await context.setOffline(true)
  await expect(state(page)).toHaveAttribute('data-state', 'offline')
  let calls = 0
  await page.route('https://api.open-meteo.com/**', (route) => {
    calls++
    expect(new URL(route.request().url()).searchParams.get('latitude')).toBe(
      '52.52'
    )
    return route.fulfill({ json: weather(22) })
  })
  await page
    .getByRole('navigation', { name: 'Saved places' })
    .getByRole('button', { name: 'Berlin' })
    .click()
  await expect(page.locator('.temperature')).toHaveText('18°')
  expect(calls).toBe(0)
  await page.clock.fastForward(60000)
  await context.setOffline(false)
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.temperature')).toHaveText('22°')
  await expect(page.locator('.retrieval-time time')).not.toHaveAttribute(
    'datetime',
    original!
  )
  expect(calls).toBe(1)
})
test.describe('offline demonstration', () => {
  test.use({ viewport: { width: 1100, height: 1000 } })
  test('demo: switch cached cities offline, show an uncached city honestly, then recover online', async ({
    page,
    context,
  }, testInfo) => {
    await cacheBoth(page)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    // Remove API routing: offline success must come from saved snapshots, not mocks.
    await page.unroute('https://api.open-meteo.com/**')
    await context.setOffline(true)
    await page
      .getByRole('navigation', { name: 'Saved places' })
      .getByRole('button', { name: 'Berlin' })
      .click()
    await expect(page.locator('.temperature')).toHaveText('18°')
    await expect(state(page)).toHaveAttribute('data-state', 'offline')
    await testInfo.attach('offline-berlin', {
      body: await page.screenshot({
        path: testInfo.outputPath('offline-berlin.png'),
      }),
      contentType: 'image/png',
    })
    if (testInfo.config.metadata.offlineDemo) await page.waitForTimeout(1800)
    await page
      .getByRole('navigation', { name: 'Saved places' })
      .getByRole('button', { name: 'Lisbon' })
      .click()
    await expect(page.locator('.temperature')).toHaveText('24°')
    await expect(state(page)).toContainText('Saved on this device')
    await page.reload()
    await expect(page.locator('.temperature')).toHaveText('24°')
    await expect(state(page)).toHaveAttribute('data-state', 'offline')
    await testInfo.attach('offline-lisbon', {
      body: await page.screenshot({
        path: testInfo.outputPath('offline-lisbon.png'),
      }),
      contentType: 'image/png',
    })
    if (testInfo.config.metadata.offlineDemo) await page.waitForTimeout(1800)
    await page
      .getByRole('navigation', { name: 'Saved places' })
      .getByRole('button', { name: 'Tokyo' })
      .click()
    await expect(page.locator('.temperature')).toHaveCount(0)
    await expect(state(page)).toContainText('no forecast saved for this city')
    await testInfo.attach('offline-tokyo-no-cache', {
      body: await page.screenshot({
        path: testInfo.outputPath('offline-tokyo-no-cache.png'),
      }),
      contentType: 'image/png',
    })
    if (testInfo.config.metadata.offlineDemo) await page.waitForTimeout(1800)
    await page.route('https://api.open-meteo.com/**', (route) =>
      route.fulfill({ json: weather(30, 'Asia/Tokyo') })
    )
    await page.clock.fastForward(60000)
    await context.setOffline(false)
    await expect(state(page)).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.temperature')).toHaveText('30°')
    if (testInfo.config.metadata.offlineDemo) await page.waitForTimeout(1800)
  })
})
test('blocked storage retains the in-memory snapshot on failed refresh without promising offline persistence', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('storage blocked')
    }
  })
  await page.reload()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  await expect(state(page)).toContainText('Not saved on this device')
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.getByRole('button', { name: 'Refresh forecast' }).click()
  await expect(state(page)).toHaveAttribute('data-state', 'cached')
  await expect(page.locator('.temperature')).toHaveText('18°')
  await expect(state(page)).toContainText('Not saved on this device')
})
test('a new city selection cancels a pending approximate IP lookup', async ({
  page,
}) => {
  await page.evaluate(() => localStorage.clear())
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://ipwho.is/**', async (route) => {
    await gate
    await route
      .fulfill({
        json: {
          success: true,
          city: 'Wrong city',
          country: 'Germany',
          latitude: 50,
          longitude: 10,
        },
      })
      .catch(() => {})
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('combobox').fill('Lisbon')
  await page.getByRole('option').click()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  release()
  await expect(page.getByRole('heading', { name: 'Lisbon' })).toBeVisible()
})
test('a hanging forecast request times out and leaves the previous forecast usable', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await gate
    await route.fulfill({ json: weather(99) }).catch(() => {})
  })
  await page.getByRole('button', { name: 'Refresh forecast' }).click()
  await expect(state(page)).toHaveAttribute('data-state', 'refreshing')
  await page.clock.fastForward(12000)
  await expect(state(page)).toHaveAttribute('data-state', 'cached')
  await expect(page.locator('.temperature')).toHaveText('18°')
  release()
})

test('autumn DST distinguishes repeated local hours and preserves the correct daylight duration on a device in another timezone', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-25T01:30:00Z'))
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: autumnFixture })
  )
  await page.getByRole('button', { name: 'Refresh forecast' }).click()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.forecast-time')).toContainText(
    '25 Oct 2026, 02:00 GMT+2'
  )
  await expect(page.locator('.retrieval-time')).toContainText(
    '25 Oct 2026, 02:30 GMT+1'
  )
  await expect(page.locator('.hour-offset')).toHaveText(['GMT+2', 'GMT+1'])
  await expect(page.locator('.sun-times')).toContainText('07:00')
  await expect(page.locator('.sun-times')).toContainText('17:00')
  await expect(page.locator('.daylight')).toContainText('10h 0m of daylight')
})
test('a duplicate online event does not cancel a pending refresh or initiate a second request', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let calls = 0
  await page.route('https://api.open-meteo.com/**', async (route) => {
    calls++
    await gate
    await route.fulfill({ json: weather(23) })
  })
  await page.getByRole('button', { name: 'Refresh forecast' }).click()
  await expect.poll(() => calls).toBe(1)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  release()
  await expect(state(page)).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.temperature')).toHaveText('23°')
  expect(calls).toBe(1)
})

test('an expired offline forecast keeps its original retrieval time and cannot suggest a past outdoor hour', async ({
  page,
  context,
}) => {
  const original = await page
    .locator('.retrieval-time time')
    .getAttribute('datetime')
  await context.setOffline(true)
  await page.clock.fastForward(72 * 3600000)
  await expect(page.locator('.expired-forecast')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'A fresh forecast is needed.' })
  ).toBeVisible()
  await expect(page.locator('.retrieval-time time')).toHaveAttribute(
    'datetime',
    original!
  )
  await expect(state(page)).toContainText('3d ago')
})

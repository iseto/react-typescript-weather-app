import type { Page } from '@playwright/test'
import { fixture } from './fixture'

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==',
  'base64'
)

export const radarFrames = Array.from({ length: 5 }, (_, index) => ({
  time: fixture.hourly.time[0] + index * 600,
  path: `/v2/radar/${fixture.hourly.time[0] + index * 600}`,
}))

export async function mockRadar(page: Page) {
  await page.route(
    'https://api.rainviewer.com/public/weather-maps.json',
    (route) =>
      route.fulfill({
        json: {
          version: '2.0.1',
          generated: radarFrames.at(-1)!.time,
          host: 'https://tilecache.rainviewer.com',
          radar: { past: radarFrames },
        },
      })
  )
  for (const pattern of [
    'https://tile.openstreetmap.org/**',
    'https://tilecache.rainviewer.com/**',
  ])
    await page.route(pattern, (route) =>
      route.fulfill({ contentType: 'image/png', body: transparentPixel })
    )
}

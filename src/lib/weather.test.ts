import { describe, expect, it } from 'vitest'
import {
  formatTime,
  isPlace,
  isWeather,
  outdoorWindow,
  temperature,
  weatherLabel,
} from './weather'
import { fixture } from '../../tests/fixture'
describe('weather domain', () => {
  it('converts temperature without changing canonical Celsius data', () => {
    expect(temperature(0, 'F')).toBe(32)
    expect(temperature(-10, 'F')).toBe(14)
    expect(temperature(18.6, 'C')).toBe(19)
  })
  it('formats times in the forecast timezone rather than device timezone', () => {
    expect(formatTime(Date.UTC(2026, 0, 1, 12) / 1000, 'Europe/Berlin')).toBe(
      '13:00'
    )
    expect(
      formatTime(Date.UTC(2026, 0, 1, 12) / 1000, 'America/New_York')
    ).toBe('07:00')
  })
  it('rejects incomplete forecast responses and invalid place coordinates', () => {
    expect(isWeather(fixture)).toBe(true)
    expect(isWeather({ ...fixture, timezone: 'not-a-zone' })).toBe(false)
    expect(
      isWeather({
        ...fixture,
        hourly: { ...fixture.hourly, temperature_2m: [12] },
      })
    ).toBe(false)
    expect(isWeather({ ...fixture, current: {} })).toBe(false)
    expect(isWeather(null)).toBe(false)
    expect(
      isPlace({ name: 'x', country: 'y', latitude: 91, longitude: 12 })
    ).toBe(false)
  })
  it('only suggests mild dry daylight hours', () => {
    expect(outdoorWindow(fixture)?.rain).toBeLessThan(30)
    expect(
      outdoorWindow({
        ...fixture,
        hourly: { ...fixture.hourly, is_day: fixture.hourly.time.map(() => 0) },
      })
    ).toBeUndefined()
    expect(
      outdoorWindow({
        ...fixture,
        hourly: {
          ...fixture.hourly,
          precipitation_probability: fixture.hourly.time.map(() => 100),
        },
      })
    ).toBeUndefined()
  })
  it('labels rain, snow, and thunderstorms distinctly', () => {
    expect(weatherLabel(65)).toBe('Rainy')
    expect(weatherLabel(75)).toBe('Snowy')
    expect(weatherLabel(95)).toBe('Thunderstorms')
  })
})

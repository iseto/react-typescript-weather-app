import { describe, expect, it } from 'vitest'
import { forecastAge, forecastExpired, formatTimestamp } from './forecastTime'
import { formatTime, formatDay, BERLIN } from './weather'
import { fixture } from '../../tests/fixture'
describe('forecast time across timezone and daylight-saving boundaries', () => {
  it.each([
    ['2026-03-29T00:30:00Z', 'Europe/Berlin', '01:30', 'GMT+1'],
    ['2026-03-29T01:30:00Z', 'Europe/Berlin', '03:30', 'GMT+2'],
    ['2026-10-25T00:30:00Z', 'Europe/Berlin', '02:30', 'GMT+2'],
    ['2026-10-25T01:30:00Z', 'Europe/Berlin', '02:30', 'GMT+1'],
    ['2026-03-08T06:30:00Z', 'America/New_York', '01:30', 'GMT-5'],
    ['2026-03-08T07:30:00Z', 'America/New_York', '03:30', 'GMT-4'],
    ['2026-11-01T05:30:00Z', 'America/New_York', '01:30', 'GMT-4'],
    ['2026-11-01T06:30:00Z', 'America/New_York', '01:30', 'GMT-5'],
  ])(
    '%s displays %s with an explicit UTC offset',
    (iso, zone, time, offset) => {
      expect(formatTime(Date.parse(iso) / 1000, zone)).toBe(time)
      expect(formatTimestamp(Date.parse(iso), zone)).toContain(offset)
    }
  )
  it('uses the location date across midnight and the international date line', () => {
    const instant = Date.parse('2026-10-25T00:30:00Z')
    expect(formatDay(instant / 1000, 'America/Los_Angeles')).toBe('Sat')
    expect(formatDay(instant / 1000, 'Pacific/Kiritimati')).toBe('Sun')
    expect(formatTimestamp(instant, 'America/Los_Angeles')).toContain(
      '24 Oct 2026'
    )
  })
  it('measures retrieval age using instants, not the changing local clock', () => {
    const snapshot = {
      place: BERLIN,
      weather: fixture,
      updatedAt: Date.parse('2026-10-25T00:30:00Z'),
    }
    expect(forecastAge(snapshot, Date.parse('2026-10-25T01:30:00Z'))).toBe(
      '1h ago'
    )
    expect(forecastAge(snapshot, snapshot.updatedAt - 1)).toBe(
      'less than a minute ago'
    )
    expect(
      forecastExpired(snapshot, (fixture.hourly.time[47] + 3600) * 1000)
    ).toBe(true)
    expect(forecastExpired(snapshot, fixture.hourly.time[0] * 1000)).toBe(false)
  })
})

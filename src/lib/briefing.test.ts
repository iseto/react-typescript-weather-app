import { describe, expect, it } from 'vitest'
import { buildBriefing, localDateKey } from './briefing'
import { fixture, autumnFixture } from '../../tests/fixture'
const at = (value: string) => Date.parse(value)
describe('today briefing', () => {
  it('summarizes today’s range, warming and the first higher-probability period', () => {
    const w = structuredClone(fixture)
    w.hourly.precipitation_probability = w.hourly.time.map((_, i) =>
      i >= 6 && i <= 8 ? 70 : 10
    )
    const b = buildBriefing(w, 'C', at('2026-10-14T08:15:00Z'))!
    expect(b.summary).toBe("Today's high is 21°C, with a low of 12°C.")
    expect(b.temperature).toContain('Warmer later')
    expect(b.precipitation).toBe(
      'Higher precipitation chances from 16:00 to 19:00 (up to 70%).'
    )
  })
  it('converts temperatures to Fahrenheit without converting probability thresholds', () => {
    const b = buildBriefing(fixture, 'F', at('2026-10-14T08:15:00Z'))!
    expect(b.summary).toBe("Today's high is 70°F, with a low of 54°F.")
    expect(b.temperature).toContain('70°F')
    expect(b.precipitation).toContain('35%')
  })
  it('does not summarize yesterday as today or borrow tomorrow’s rain', () => {
    expect(buildBriefing(fixture, 'C', at('2026-10-22T08:00Z'))).toBeNull()
    const w = structuredClone(fixture)
    w.hourly.precipitation_probability = w.hourly.time.map((time) =>
      localDateKey(time, w.timezone) === '2026-10-14' ? 10 : 100
    )
    expect(
      buildBriefing(w, 'C', at('2026-10-14T21:30Z'))!.precipitation
    ).toContain('Low chance')
    expect(
      buildBriefing(w, 'C', at('2026-10-14T21:30Z'))!.precipitation
    ).toContain('10%')
  })
  it('selects the city’s local today, not the first cached daily row or the device date', () => {
    const b = buildBriefing(fixture, 'C', at('2026-10-14T22:15Z'))!
    expect(b.summary).toContain('19°C')
    expect(localDateKey(at('2026-10-14T22:15Z') / 1000, 'Europe/Berlin')).toBe(
      '2026-10-15'
    )
    expect(
      localDateKey(at('2026-10-14T22:15Z') / 1000, 'America/Los_Angeles')
    ).toBe('2026-10-14')
  })
  it('does not recommend past rain periods or past temperature peaks', () => {
    const w = structuredClone(fixture)
    w.hourly.precipitation_probability = w.hourly.time.map((_, i) =>
      i < 4 ? 100 : 10
    )
    const b = buildBriefing(w, 'C', at('2026-10-14T18:00Z'))!
    expect(b.precipitation).toContain('Low chance')
    expect(b.temperature).toContain('Cooling later')
    expect(b.temperature).not.toContain('15:00')
  })
  it('describes low probability without promising dry weather, and handles missing hourly detail', () => {
    const w = structuredClone(fixture)
    w.hourly.precipitation_probability.fill(0)
    expect(
      buildBriefing(w, 'C', at('2026-10-14T08:15Z'))!.precipitation
    ).toContain('Low chance')
    const b = buildBriefing(w, 'C', at('2026-10-16T08:15Z'))!
    expect(b.summary).toContain('17°C')
    expect(b.temperature).toBeNull()
    expect(b.precipitation).toBeNull()
  })
  it('labels an ongoing period and midnight without suggesting next-day rain belongs to today', () => {
    const w = structuredClone(fixture)
    w.hourly.precipitation_probability.fill(80)
    expect(buildBriefing(w, 'C', at('2026-10-14T21:30Z'))!.precipitation).toBe(
      'Higher precipitation chances until midnight (up to 80%).'
    )
  })
  it('disambiguates a wet period crossing the repeated autumn hour', () => {
    const w = structuredClone(autumnFixture)
    w.hourly.precipitation_probability = w.hourly.time.map((_, i) =>
      i === 0 ? 70 : 10
    )
    expect(buildBriefing(w, 'C', at('2026-10-24T23:45Z'))!.precipitation).toBe(
      'Higher precipitation chances from 02:00 GMT+2 to 02:00 GMT+1 (up to 70%).'
    )
  })
})

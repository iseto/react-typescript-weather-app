import { describe, expect, it } from 'vitest'
import { fixture } from '../../tests/fixture'
import { planActivityWindows } from './activityPlanner'

const copyFixture = () => structuredClone(fixture)

describe('activity planner', () => {
  it('returns ranked, non-overlapping daylight windows within the next 72 hours', () => {
    const windows = planActivityWindows(
      copyFixture(),
      'walk',
      fixture.hourly.time[0] * 1000
    )

    expect(windows).toHaveLength(3)
    expect(windows[0].score).toBeLessThanOrEqual(windows[1].score)
    expect(
      windows.every((window, index) =>
        windows.every(
          (other, otherIndex) =>
            index === otherIndex ||
            window.end <= other.start ||
            window.start >= other.end
        )
      )
    ).toBe(true)
  })

  it('applies activity-specific duration and rain thresholds', () => {
    const weather = copyFixture()
    weather.hourly.precipitation_probability.fill(30)

    expect(
      planActivityWindows(weather, 'walk', weather.hourly.time[0] * 1000)
    ).not.toHaveLength(0)
    expect(
      planActivityWindows(weather, 'cycle', weather.hourly.time[0] * 1000)
    ).toHaveLength(0)

    weather.hourly.precipitation_probability.fill(10)
    const cycle = planActivityWindows(
      weather,
      'cycle',
      weather.hourly.time[0] * 1000
    )
    expect(cycle[0].end - cycle[0].start).toBe(2 * 3600)
  })

  it('does not suggest nighttime, discontinuous, or expired forecast hours', () => {
    const weather = copyFixture()
    weather.hourly.is_day.fill(0)
    expect(
      planActivityWindows(weather, 'walk', weather.hourly.time[0] * 1000)
    ).toHaveLength(0)

    weather.hourly.is_day.fill(1)
    weather.hourly.time[1] += 1800
    const cycle = planActivityWindows(
      weather,
      'cycle',
      weather.hourly.time[0] * 1000
    )
    expect(
      cycle.every((window) => window.start !== weather.hourly.time[0])
    ).toBe(true)

    expect(
      planActivityWindows(
        copyFixture(),
        'walk',
        (fixture.hourly.time.at(-1)! + 3600) * 1000
      )
    ).toHaveLength(0)
  })
})

import { localDateKey } from './briefing'
import type { Weather } from './weather'

export type ActivityId = 'walk' | 'run' | 'cycle' | 'picnic'

export interface ActivityProfile {
  id: ActivityId
  label: string
  duration: number
  temperature: [number, number]
  maxRain: number
  maxWeatherCode: number
}

export interface ActivityWindow {
  start: number
  end: number
  temperatures: number[]
  maxRain: number
  weatherCode: number
  score: number
}

export const activityProfiles: ActivityProfile[] = [
  {
    id: 'walk',
    label: 'Walk',
    duration: 1,
    temperature: [2, 30],
    maxRain: 50,
    maxWeatherCode: 67,
  },
  {
    id: 'run',
    label: 'Run',
    duration: 1,
    temperature: [3, 22],
    maxRain: 35,
    maxWeatherCode: 67,
  },
  {
    id: 'cycle',
    label: 'Cycle',
    duration: 2,
    temperature: [6, 27],
    maxRain: 25,
    maxWeatherCode: 48,
  },
  {
    id: 'picnic',
    label: 'Picnic',
    duration: 2,
    temperature: [12, 30],
    maxRain: 20,
    maxWeatherCode: 3,
  },
]

export const activityProfile = (id: ActivityId) =>
  activityProfiles.find((profile) => profile.id === id)!

export function planActivityWindows(
  weather: Weather,
  activity: ActivityId,
  now: number,
  limit = 3
): ActivityWindow[] {
  const profile = activityProfile(activity)
  const nowSeconds = now / 1000
  const horizon = nowSeconds + 72 * 3600
  const hours = weather.hourly.time.map((time, index) => ({
    time,
    temperature: weather.hourly.temperature_2m[index],
    rain: weather.hourly.precipitation_probability[index],
    code: weather.hourly.weather_code[index],
    daylight: weather.hourly.is_day[index],
  }))
  const candidates: ActivityWindow[] = []

  for (let index = 0; index <= hours.length - profile.duration; index++) {
    const block = hours.slice(index, index + profile.duration)
    const start = block[0].time
    const end = block[block.length - 1].time + 3600
    const sameDay = block.every(
      (hour) =>
        localDateKey(hour.time, weather.timezone) ===
        localDateKey(start, weather.timezone)
    )
    const contiguous = block.every(
      (hour, blockIndex) =>
        blockIndex === 0 || hour.time === block[blockIndex - 1].time + 3600
    )
    const maxRain = Math.max(...block.map((hour) => hour.rain))
    const maxCode = Math.max(...block.map((hour) => hour.code))
    const temperatures = block.map((hour) => hour.temperature)
    const average =
      temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length

    if (
      end <= nowSeconds ||
      start > horizon ||
      !sameDay ||
      !contiguous ||
      block.some((hour) => hour.daylight !== 1) ||
      maxRain > profile.maxRain ||
      maxCode > profile.maxWeatherCode ||
      average < profile.temperature[0] ||
      average > profile.temperature[1]
    )
      continue

    const preferredTemperature =
      (profile.temperature[0] + profile.temperature[1]) / 2
    const startsSoonPenalty = Math.max(0, (start - nowSeconds) / 3600) * 0.08
    candidates.push({
      start,
      end,
      temperatures,
      maxRain,
      weatherCode: block.reduce((worst, hour) =>
        hour.code > worst.code ? hour : worst
      ).code,
      score:
        maxRain * 1.5 +
        Math.abs(average - preferredTemperature) * 2 +
        startsSoonPenalty,
    })
  }

  const selected: ActivityWindow[] = []
  for (const candidate of candidates.sort(
    (a, b) => a.score - b.score || a.start - b.start
  )) {
    if (
      selected.every(
        (window) =>
          candidate.end + 2 * 3600 <= window.start ||
          candidate.start >= window.end + 2 * 3600
      )
    )
      selected.push(candidate)
    if (selected.length === limit) break
  }
  return selected
}

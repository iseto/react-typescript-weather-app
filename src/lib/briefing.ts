import { formatTime, temperature, type Weather } from './weather'
import { formatOffset } from './forecastTime'

export const localDateKey = (seconds: number, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(seconds * 1000)
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join('-')
}
export interface Briefing {
  summary: string
  temperature: string | null
  precipitation: string | null
}
export function buildBriefing(
  weather: Weather,
  unit: 'C' | 'F',
  now: number
): Briefing | null {
  const seconds = now / 1000
  const today = localDateKey(seconds, weather.timezone)
  const day = weather.daily.time.findIndex(
    (time) => localDateKey(time, weather.timezone) === today
  )
  if (day < 0) return null
  const hours = weather.hourly.time
    .map((time, i) => ({
      time,
      temp: weather.hourly.temperature_2m[i],
      chance: weather.hourly.precipitation_probability[i],
    }))
    .filter(
      (hour) =>
        localDateKey(hour.time, weather.timezone) === today &&
        hour.time + 3600 > seconds
    )
  const summary = `Today's high is ${temperature(weather.daily.temperature_2m_max[day], unit)}°${unit}, with a low of ${temperature(weather.daily.temperature_2m_min[day], unit)}°${unit}.`
  if (!hours.length) return { summary, temperature: null, precipitation: null }
  const first = hours[0]
  const peak = hours.reduce((a, b) => (b.temp > a.temp ? b : a))
  const low = hours.reduce((a, b) => (b.temp < a.temp ? b : a))
  const temp = (value: number) => `${temperature(value, unit)}°${unit}`
  const lowLabel = temp(Math.min(...hours.map((h) => h.temp)))
  const highLabel = temp(Math.max(...hours.map((h) => h.temp)))
  const rangeLabel =
    lowLabel === highLabel ? lowLabel : `${lowLabel}–${highLabel}`
  const trend =
    peak.temp - first.temp >= 3
      ? `Warmer later, reaching ${temp(peak.temp)} around ${formatTime(peak.time, weather.timezone)}.`
      : first.temp - low.temp >= 3
        ? `Cooling later, down to ${temp(low.temp)} around ${formatTime(low.time, weather.timezone)}.`
        : `Temperatures stay around ${rangeLabel} across the remaining forecast hours.`
  const wet = hours.findIndex((hour) => hour.chance >= 50)
  const max = Math.max(...hours.map((hour) => hour.chance))
  if (wet < 0)
    return {
      summary,
      temperature: trend,
      precipitation: `${max < 30 ? 'Low' : 'Some'} chance of precipitation across the remaining forecast hours (up to ${Math.round(max)}%).`,
    }
  const block = [hours[wet]]
  for (
    let i = wet + 1;
    i < hours.length &&
    hours[i].chance >= 50 &&
    hours[i].time === block[block.length - 1].time + 3600;
    i++
  )
    block.push(hours[i])
  const start = block[0].time
  const end = block[block.length - 1].time + 3600
  const offsetChanges =
    formatOffset(start, weather.timezone) !==
    formatOffset(end, weather.timezone)
  const timeLabel = (time: number) =>
    `${formatTime(time, weather.timezone)}${offsetChanges ? ` ${formatOffset(time, weather.timezone)}` : ''}`
  const endLabel =
    localDateKey(end, weather.timezone) === today ? timeLabel(end) : 'midnight'
  const period =
    start <= seconds
      ? `until ${endLabel}`
      : `from ${timeLabel(start)} to ${endLabel}`
  return {
    summary,
    temperature: trend,
    precipitation: `Higher precipitation chances ${period} (up to ${Math.round(Math.max(...block.map((hour) => hour.chance)))}%).`,
  }
}

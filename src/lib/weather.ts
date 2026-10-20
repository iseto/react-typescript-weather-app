export interface Place {
  name: string
  country: string
  latitude: number
  longitude: number
  admin1?: string
  source?: 'ip' | 'device'
}
export interface Weather {
  timezone: string
  current: {
    time: number
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
    wind_direction_10m: number
    is_day: number
  }
  hourly: {
    time: number[]
    temperature_2m: number[]
    precipitation_probability: number[]
    weather_code: number[]
    is_day: number[]
  }
  daily: {
    time: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
    precipitation_probability_max: number[]
    sunrise: number[]
    sunset: number[]
    uv_index_max: number[]
  }
}
export interface Snapshot {
  place: Place
  weather: Weather
  updatedAt: number
}
export const BERLIN: Place = {
  name: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.41,
}
export const placeKey = (p: Place) =>
  `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`
export const temperature = (value: number, unit: 'C' | 'F') =>
  Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value)
export const weatherLabel = (code: number) => {
  if (code === 0) return 'Clear skies'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 48) return 'Foggy'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rainy'
  if (code <= 77) return 'Snowy'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  return 'Thunderstorms'
}
export const formatTime = (time: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(time * 1000)
export const formatDay = (time: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: timezone,
  }).format(time * 1000)
export const upcomingHours = (w: Weather, referenceTime = w.current.time) =>
  w.hourly.time
    .map((time, i) => ({
      time,
      temp: w.hourly.temperature_2m[i],
      rain: w.hourly.precipitation_probability[i],
      code: w.hourly.weather_code[i],
      day: w.hourly.is_day[i],
    }))
    .filter((h) => h.time >= referenceTime - 3600)
    .slice(0, 24)
export const outdoorWindow = (w: Weather, referenceTime = w.current.time) =>
  upcomingHours(w, referenceTime)
    .slice(0, 12)
    .find(
      (h) =>
        h.time >= referenceTime &&
        h.day === 1 &&
        h.rain < 30 &&
        h.temp >= 8 &&
        h.temp <= 28 &&
        h.code < 51
    )

async function getJSON(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok)
    throw new Error(
      `Weather service returned ${response.status}. Please try again.`
    )
  return response.json()
}
export async function searchPlaces(
  query: string,
  signal: AbortSignal
): Promise<Place[]> {
  const data = (await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' })}`,
    signal
  )) as { results?: Place[] }
  return (data.results ?? []).filter(isPlace)
}
export function isPlace(value: unknown): value is Place {
  const p = value as Place | null
  return (
    !!p &&
    typeof p.name === 'string' &&
    typeof p.country === 'string' &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  )
}
export function isWeather(value: unknown): value is Weather {
  if (!value || typeof value !== 'object') return false
  const w = value as Weather
  try {
    new Intl.DateTimeFormat('en', { timeZone: w.timezone })
    const currentKeys = [
      'time',
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
    ] as const
    const validArrays = (
      group: Record<string, number[]>,
      keys: string[],
      min: number
    ) =>
      Array.isArray(group.time) &&
      group.time.length >= min &&
      keys.every(
        (key) =>
          Array.isArray(group[key]) &&
          group[key].length === group.time.length &&
          group[key].every(Number.isFinite)
      )
    return (
      typeof w.timezone === 'string' &&
      currentKeys.every((key) => Number.isFinite(w.current[key])) &&
      validArrays(
        w.hourly,
        [
          'time',
          'temperature_2m',
          'precipitation_probability',
          'weather_code',
          'is_day',
        ],
        24
      ) &&
      validArrays(
        w.daily,
        [
          'time',
          'temperature_2m_max',
          'temperature_2m_min',
          'weather_code',
          'precipitation_probability_max',
          'sunrise',
          'sunset',
          'uv_index_max',
        ],
        7
      )
    )
  } catch {
    return false
  }
}
export async function fetchWeather(
  place: Place,
  signal: AbortSignal
): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '7',
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
  })
  const data = await getJSON(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    signal
  )
  if (!isWeather(data))
    throw new Error(
      'The weather service returned incomplete data. Please try again.'
    )
  return data
}

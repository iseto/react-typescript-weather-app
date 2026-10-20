import {
  isPlace,
  isWeather,
  placeKey,
  type Place,
  type Snapshot,
} from './weather'
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}
export function writeStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
export const readPlaces = () => {
  const data = readStorage<unknown>('atmos-places', [])
  return Array.isArray(data) ? data.filter(isPlace).slice(0, 8) : []
}
export function readSnapshot(place: Place): Snapshot | null {
  const value = readStorage<Snapshot | null>(
    `atmos-weather-${placeKey(place)}`,
    null
  )
  return value &&
    isPlace(value.place) &&
    placeKey(value.place) === placeKey(place) &&
    isWeather(value.weather) &&
    Number.isFinite(value.updatedAt) &&
    value.updatedAt > 0 &&
    value.updatedAt <= Date.now() + 5 * 60_000
    ? value
    : null
}

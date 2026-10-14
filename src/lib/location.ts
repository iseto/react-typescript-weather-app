import { isPlace, type Place } from './weather'
export const IP_LOCATION_URL =
  'https://ipwho.is/?fields=success,city,country,latitude,longitude'
export async function fetchIPPlace(signal: AbortSignal): Promise<Place> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) controller.abort()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(IP_LOCATION_URL, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new Error('IP lookup unavailable')
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object')
      throw new Error('Invalid IP location')
    const result = data as Record<string, unknown>
    const place = {
      name: result.city,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      source: 'ip' as const,
    }
    if (
      result.success !== true ||
      !isPlace(place) ||
      !place.name.trim() ||
      !place.country.trim()
    )
      throw new Error('No approximate city found')
    return place
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

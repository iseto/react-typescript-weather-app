import type { Snapshot } from './weather'

// Include the offset so repeated autumn clock times are unambiguous.
export const formatTimestamp = (milliseconds: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    hourCycle: 'h23',
  }).format(milliseconds)
export function forecastAge(snapshot: Snapshot, now: number) {
  const age = Math.max(0, now - snapshot.updatedAt)
  const minutes = Math.floor(age / 60000)
  return minutes < 1
    ? 'less than a minute ago'
    : minutes < 60
      ? `${minutes} min ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`
}
export const forecastExpired = (snapshot: Snapshot, now: number) =>
  now >=
  (snapshot.weather.hourly.time[snapshot.weather.hourly.time.length - 1] +
    3600) *
    1000

export const formatOffset = (seconds: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(seconds * 1000)
    .find((part) => part.type === 'timeZoneName')!.value

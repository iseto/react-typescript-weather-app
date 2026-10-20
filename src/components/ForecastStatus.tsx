import { useMinuteClock } from '../hooks/useMinuteClock'
import {
  forecastAge,
  forecastExpired,
  formatTimestamp,
} from '../lib/forecastTime'
import type { ForecastPhase } from '../lib/forecastState'
import type { Snapshot } from '../lib/weather'
const labels: Record<ForecastPhase, string> = {
  locating: 'Finding your city',
  loading: 'Loading forecast',
  refreshing: 'Refreshing · previous forecast shown',
  ready: 'Latest fetch',
  cached: 'Refresh failed · previous forecast shown',
  offline: 'Offline',
  error: 'Forecast unavailable',
}
export function ForecastStatus({
  phase,
  snapshot,
  persisted,
}: {
  phase: ForecastPhase
  snapshot: Snapshot | null
  persisted: boolean
}) {
  const now = useMinuteClock()
  return (
    <div
      className="forecast-status"
      data-state={phase}
      role="status"
      aria-label="Forecast data status"
    >
      <strong>
        {labels[phase]}
        {phase === 'offline' &&
          (snapshot
            ? ' · previous forecast shown'
            : ' · no forecast saved for this city')}
      </strong>
      {snapshot && (
        <>
          <span className="retrieval-time">
            Retrieved{' '}
            <time dateTime={new Date(snapshot.updatedAt).toISOString()}>
              {formatTimestamp(snapshot.updatedAt, snapshot.weather.timezone)}
            </time>{' '}
            <span>({forecastAge(snapshot, now)})</span>
          </span>
          <span className="forecast-time">
            Conditions forecast for{' '}
            <time
              dateTime={new Date(
                snapshot.weather.current.time * 1000
              ).toISOString()}
            >
              {formatTimestamp(
                snapshot.weather.current.time * 1000,
                snapshot.weather.timezone
              )}
            </time>
          </span>
          <span>
            {snapshot.weather.timezone} ·{' '}
            {persisted
              ? 'Saved on this device'
              : 'Not saved on this device — available in this view only'}
          </span>
          {forecastExpired(snapshot, now) && (
            <strong className="expired-forecast">
              Saved forecast period has ended. Connect and refresh before
              planning.
            </strong>
          )}
        </>
      )}
    </div>
  )
}

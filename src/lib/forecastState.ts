import type { Place, Snapshot } from './weather'

export type ForecastPhase =
  | 'locating'
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'cached'
  | 'offline'
  | 'error'
export interface ForecastState {
  place: Place
  snapshot: Snapshot | null
  phase: ForecastPhase
  online: boolean
  persisted: boolean
  requestId: number
  error: string
  locationHint: string
}
export type ForecastAction =
  | { type: 'select'; place: Place; snapshot: Snapshot | null }
  | { type: 'refresh' }
  | { type: 'connection'; online: boolean }
  | { type: 'location-failed'; requestId: number }
  | {
      type: 'success'
      requestId: number
      snapshot: Snapshot
      persisted: boolean
    }
  | { type: 'failure'; requestId: number; message: string }

export function createForecastState(
  place: Place,
  snapshot: Snapshot | null,
  online: boolean,
  locating = false
): ForecastState {
  return {
    place,
    snapshot,
    online,
    persisted: !!snapshot,
    requestId: 0,
    error: '',
    locationHint: '',
    phase: !online
      ? 'offline'
      : locating
        ? 'locating'
        : snapshot
          ? 'refreshing'
          : 'loading',
  }
}
function requestPhase(state: ForecastState): ForecastPhase {
  return !state.online ? 'offline' : state.snapshot ? 'refreshing' : 'loading'
}
export function forecastReducer(
  state: ForecastState,
  action: ForecastAction
): ForecastState {
  if (
    'requestId' in action &&
    (action.requestId !== state.requestId ||
      !['locating', 'loading', 'refreshing'].includes(state.phase))
  )
    return state
  switch (action.type) {
    case 'select': {
      const next = {
        ...state,
        place: action.place,
        snapshot: action.snapshot,
        persisted: !!action.snapshot,
        requestId: state.requestId + 1,
        error: '',
        locationHint: '',
      }
      return { ...next, phase: requestPhase(next) }
    }
    case 'refresh':
      return {
        ...state,
        requestId: state.requestId + 1,
        phase: requestPhase(state),
        error: '',
      }
    case 'connection': {
      if (action.online === state.online) return state
      const next = {
        ...state,
        online: action.online,
        requestId: state.requestId + 1,
        error: '',
      }
      return { ...next, phase: requestPhase(next) }
    }
    case 'location-failed':
      return {
        ...state,
        phase: requestPhase(state),
        locationHint:
          'Couldn’t estimate your city. Showing Berlin — search for another place anytime.',
      }
    case 'success':
      return {
        ...state,
        snapshot: action.snapshot,
        persisted: action.persisted,
        phase: 'ready',
        error: '',
      }
    case 'failure':
      return {
        ...state,
        phase: state.snapshot ? 'cached' : 'error',
        error: state.snapshot
          ? 'Couldn’t refresh. Keeping the previous forecast; its retrieval time has not changed.'
          : action.message,
      }
  }
}

import { useEffect, useReducer, useRef, useCallback } from 'react'
import {
  BERLIN,
  fetchWeather,
  isPlace,
  placeKey,
  type Place,
} from '../lib/weather'
import { readStorage, readSnapshot, writeStorage } from '../lib/storage'
import { fetchIPPlace } from '../lib/location'
import { createForecastState, forecastReducer } from '../lib/forecastState'

function initialPlace(): Place | null {
  const params = new URLSearchParams(window.location.search)
  const lat = params.get('lat'),
    lon = params.get('lon')
  if (lat?.trim() && lon?.trim()) {
    const shared = {
      name: (params.get('city') || 'Shared place').slice(0, 100),
      country: (params.get('country') || 'Shared forecast').slice(0, 100),
      latitude: Number(lat),
      longitude: Number(lon),
    }
    if (isPlace(shared)) return shared
  }
  const value = readStorage<unknown>('atmos-last-place', null)
  return isPlace(value) ? value : null
}
export function useWeather() {
  const [state, dispatch] = useReducer(forecastReducer, undefined, () => {
    const initial = initialPlace()
    const place = initial ?? BERLIN
    return createForecastState(
      place,
      readSnapshot(place),
      navigator.onLine,
      !initial
    )
  })
  const active = useRef<AbortController | null>(null)
  const connectionState = useRef(state.online)
  const cancel = useCallback(() => {
    active.current?.abort()
    active.current = null
  }, [])
  const refresh = useCallback(() => {
    cancel()
    dispatch({ type: 'refresh' })
  }, [cancel])
  const setPlace = useCallback(
    (place: Place) => {
      // Invalidate before React renders, including promises already queued to settle.
      cancel()
      dispatch({ type: 'select', place, snapshot: readSnapshot(place) })
      writeStorage('atmos-last-place', place)
    },
    [cancel]
  )
  const { phase, place, requestId } = state
  useEffect(() => {
    if (!['locating', 'loading', 'refreshing'].includes(phase)) return
    const controller = new AbortController()
    active.current = controller
    const timer =
      phase === 'locating'
        ? undefined
        : setTimeout(() => {
            if (!controller.signal.aborted) {
              dispatch({
                type: 'failure',
                requestId,
                message: 'The forecast request timed out. Please try again.',
              })
              controller.abort()
            }
          }, 12000)
    if (phase === 'locating') {
      fetchIPPlace(controller.signal)
        .then((next) => {
          if (!controller.signal.aborted) setPlace(next)
        })
        .catch(() => {
          if (!controller.signal.aborted)
            dispatch({ type: 'location-failed', requestId })
        })
    } else {
      fetchWeather(place, controller.signal)
        .then((weather) => {
          if (controller.signal.aborted) return
          const snapshot = { place, weather, updatedAt: Date.now() }
          const persisted = writeStorage(
            `atmos-weather-${placeKey(place)}`,
            snapshot
          )
          dispatch({ type: 'success', requestId, snapshot, persisted })
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            dispatch({
              type: 'failure',
              requestId,
              message:
                e instanceof Error
                  ? e.message
                  : 'Unable to load weather. Please try again.',
            })
        })
    }
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [phase, place, requestId, setPlace])
  useEffect(() => {
    const connection = () => {
      if (connectionState.current === navigator.onLine) return
      connectionState.current = navigator.onLine
      cancel()
      dispatch({ type: 'connection', online: navigator.onLine })
    }
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    return () => {
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
    }
  }, [cancel])
  const loading = ['locating', 'loading', 'refreshing'].includes(state.phase)
  return {
    ...state,
    setPlace,
    refresh,
    loading,
    detecting: state.phase === 'locating',
    cached: !!state.snapshot && state.phase !== 'ready' && state.persisted,
  }
}

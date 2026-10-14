import { useEffect, useState, useCallback } from 'react'
import {
  BERLIN,
  fetchWeather,
  isPlace,
  placeKey,
  type Place,
  type Snapshot,
} from '../lib/weather'
import { readStorage, readSnapshot, writeStorage } from '../lib/storage'
import { fetchIPPlace } from '../lib/location'
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
  const [initial] = useState(initialPlace)
  const [place, changePlace] = useState(initial ?? BERLIN)
  const [detecting, setDetecting] = useState(!initial && navigator.onLine)
  const [locationHint, setLocationHint] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    readSnapshot(place)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(!!snapshot)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => {
    setLoading(true)
    setError('')
    setRevision((r) => r + 1)
  }, [])
  const setPlace = useCallback((next: Place) => {
    const stored = readSnapshot(next)
    changePlace(next)
    setSnapshot(stored)
    setCached(!!stored)
    setLoading(true)
    setError('')
    setDetecting(false)
    setLocationHint('')
    setRevision((r) => r + 1)
    writeStorage('atmos-last-place', next)
  }, [])
  useEffect(() => {
    if (!detecting) return
    const controller = new AbortController()
    fetchIPPlace(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setPlace(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDetecting(false)
          setLocationHint(
            'Couldn’t estimate your city. Showing Berlin — search for another place anytime.'
          )
        }
      })
    return () => controller.abort()
  }, [detecting, setPlace])
  useEffect(() => {
    if (detecting) return
    const controller = new AbortController()
    const stored = readSnapshot(place)
    fetchWeather(place, controller.signal)
      .then((weather) => {
        if (controller.signal.aborted) return
        const next = { place, weather, updatedAt: Date.now() }
        setSnapshot(next)
        setCached(false)
        writeStorage(`atmos-weather-${placeKey(place)}`, next)
        writeStorage('atmos-last-place', place)
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setCached(!!stored)
          setError(
            stored
              ? 'Couldn’t refresh. Showing your last saved forecast.'
              : e instanceof Error
                ? e.message
                : 'Unable to load weather. Please try again.'
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [place, revision, detecting])
  useEffect(() => {
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [refresh])
  return {
    place,
    setPlace,
    snapshot,
    loading,
    error,
    cached,
    refresh,
    detecting,
    locationHint,
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readPlaces, readSnapshot, readStorage, writeStorage } from './storage'
import { BERLIN, placeKey } from './weather'
import { fixture } from '../../tests/fixture'
const data = new Map<string, string>()
beforeEach(() => {
  data.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  })
})
describe('persistent state', () => {
  it('ignores malformed and invalid saved data', () => {
    data.set('atmos-places', 'not-json')
    expect(readPlaces()).toEqual([])
    data.set('atmos-places', '{"name":"wrong shape"}')
    expect(readPlaces()).toEqual([])
    data.set('atmos-places', JSON.stringify([null, BERLIN]))
    expect(readPlaces()).toEqual([BERLIN])
  })
  it('only returns valid snapshots for the requested place', () => {
    const key = `atmos-weather-${placeKey(BERLIN)}`
    writeStorage(key, {
      place: BERLIN,
      weather: fixture,
      updatedAt: Date.now(),
    })
    expect(readSnapshot(BERLIN)?.weather).toEqual(fixture)
    writeStorage(key, {
      place: { ...BERLIN, latitude: 10 },
      weather: fixture,
      updatedAt: Date.now(),
    })
    expect(readSnapshot(BERLIN)).toBeNull()
  })
  it('keeps the app usable when browser storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(readStorage('preference', 'fallback')).toBe('fallback')
    expect(writeStorage('preference', 'value')).toBe(false)
  })
})

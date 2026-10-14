import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchIPPlace } from './location'
const response = {
  success: true,
  city: 'Lisbon',
  country: 'Portugal',
  latitude: 38.72,
  longitude: -9.14,
  ip: 'ignored',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('approximate IP city', () => {
  it('validates a city and discards the raw IP address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => response })
    )
    expect(await fetchIPPlace(new AbortController().signal)).toEqual({
      name: 'Lisbon',
      country: 'Portugal',
      latitude: 38.72,
      longitude: -9.14,
      source: 'ip',
    })
  })
  it.each([
    { ...response, success: false },
    { ...response, city: '' },
    { ...response, latitude: 91 },
    null,
  ])('rejects unusable responses: %j', async (data) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => data })
    )
    await expect(fetchIPPlace(new AbortController().signal)).rejects.toThrow()
  })
  it('handles rate limits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    )
    await expect(fetchIPPlace(new AbortController().signal)).rejects.toThrow(
      'unavailable'
    )
  })
  it('times out instead of leaving the app locating indefinitely', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true }
            )
          )
      )
    )
    const assertion = expect(
      fetchIPPlace(new AbortController().signal)
    ).rejects.toThrow('aborted')
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })
})

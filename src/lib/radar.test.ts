import { describe, expect, it } from 'vitest'
import { parseRadarFrames, radarTileUrl } from './radar'

const frames = Array.from({ length: 7 }, (_, index) => ({
  time: 1_700_000_000 + index * 600,
  path: `/v2/radar/${1_700_000_000 + index * 600}`,
}))

describe('rain radar data', () => {
  it('sorts and limits valid frames to the five most recent', () => {
    const parsed = parseRadarFrames({
      generated: 1_700_004_000,
      host: 'https://tilecache.rainviewer.com',
      radar: { past: [...frames].reverse() },
    })

    expect(parsed?.frames).toHaveLength(5)
    expect(parsed?.frames[0]).toEqual(frames[2])
    expect(parsed?.frames.at(-1)).toEqual(frames[6])
  })

  it('rejects unsafe hosts, malformed paths, and empty responses', () => {
    expect(
      parseRadarFrames({
        generated: 1,
        host: 'http://tilecache.rainviewer.com',
        radar: { past: frames },
      })
    ).toBeNull()
    expect(
      parseRadarFrames({
        generated: 1,
        host: 'https://tilecache.rainviewer.com',
        radar: { past: [{ time: 1, path: '/unexpected' }] },
      })
    ).toBeNull()
  })

  it('accepts current opaque hexadecimal frame identifiers', () => {
    expect(
      parseRadarFrames({
        generated: 1_700_004_000,
        host: 'https://tilecache.rainviewer.com',
        radar: {
          past: [{ time: 1_700_000_000, path: '/v2/radar/f7fb62659e5c' }],
        },
      })?.frames[0].path
    ).toBe('/v2/radar/f7fb62659e5c')
  })

  it('builds a Universal Blue radar tile URL', () => {
    expect(
      radarTileUrl('https://tilecache.rainviewer.com', frames[0].path)
    ).toBe(
      'https://tilecache.rainviewer.com/v2/radar/1700000000/256/{z}/{x}/{y}/2/1_1.png'
    )
  })
})

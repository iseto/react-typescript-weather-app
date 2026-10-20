import { describe, expect, it } from 'vitest'
import { createForecastState, forecastReducer } from './forecastState'
import { BERLIN, type Snapshot } from './weather'
import { fixture } from '../../tests/fixture'
const lisbon = {
  name: 'Lisbon',
  country: 'Portugal',
  latitude: 38.72,
  longitude: -9.14,
}
const snapshot: Snapshot = {
  place: BERLIN,
  weather: fixture,
  updatedAt: Date.UTC(2026, 9, 14, 8, 15),
}
describe('forecast state transitions', () => {
  it('ignores late successes and failures after selecting another city', () => {
    const pending = createForecastState(BERLIN, snapshot, true)
    const selected = forecastReducer(pending, {
      type: 'select',
      place: lisbon,
      snapshot: null,
    })
    expect(selected.snapshot).toBeNull()
    expect(selected.phase).toBe('loading')
    expect(
      forecastReducer(selected, {
        type: 'success',
        requestId: pending.requestId,
        snapshot,
        persisted: true,
      })
    ).toBe(selected)
    expect(
      forecastReducer(selected, {
        type: 'failure',
        requestId: pending.requestId,
        message: 'stale error',
      })
    ).toBe(selected)
  })
  it('retains in-memory data and its retrieval time after a refresh fails, even if persistence failed', () => {
    let state = createForecastState(BERLIN, null, true)
    state = forecastReducer(state, {
      type: 'success',
      requestId: 0,
      snapshot,
      persisted: false,
    })
    state = forecastReducer(state, { type: 'refresh' })
    state = forecastReducer(state, {
      type: 'failure',
      requestId: state.requestId,
      message: '503',
    })
    expect(state.phase).toBe('cached')
    expect(state.snapshot).toBe(snapshot)
    expect(state.persisted).toBe(false)
    expect(state.error).toContain('retrieval time has not changed')
  })
  it('invalidates an in-flight request on disconnect and refreshes only the selected city on reconnect', () => {
    let state = createForecastState(BERLIN, snapshot, true)
    const oldId = state.requestId
    state = forecastReducer(state, { type: 'connection', online: false })
    state = forecastReducer(state, {
      type: 'select',
      place: lisbon,
      snapshot: null,
    })
    expect(state.phase).toBe('offline')
    expect(state.snapshot).toBeNull()
    expect(
      forecastReducer(state, {
        type: 'success',
        requestId: oldId,
        snapshot,
        persisted: true,
      })
    ).toBe(state)
    state = forecastReducer(state, { type: 'connection', online: true })
    expect(state.phase).toBe('loading')
    expect(state.place).toBe(lisbon)
  })
  it('clears refresh failures for a new attempt but preserves the previous data', () => {
    let state = createForecastState(BERLIN, snapshot, true)
    state = forecastReducer(state, {
      type: 'failure',
      requestId: 0,
      message: '503',
    })
    state = forecastReducer(state, { type: 'refresh' })
    expect(state.phase).toBe('refreshing')
    expect(state.error).toBe('')
    expect(state.snapshot).toBe(snapshot)
  })
})

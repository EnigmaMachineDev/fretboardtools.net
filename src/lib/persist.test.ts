import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../config/site'
import type { AppData, SavedQuery } from '../store/types'
import { DEFAULT_QUERY } from './query'
import { makeTuning } from './tuning'
import {
  defaultAppData,
  exportEnvelope,
  gcData,
  migrate,
  refreshFavoriteLabels,
  removeTuning,
  savedQueryCountForTuning,
  validateImport,
} from './persist'

const withTuning = (data: AppData, id: string, pitches = [23, 28, 33, 38]): AppData => ({
  ...data,
  tunings: { ...data.tunings, [id]: makeTuning(id, `Tuning ${id}`, pitches, 1000) },
  tuningIds: [...data.tuningIds, id],
})

const withSavedQuery = (data: AppData, id: string, tuningId: string): AppData => {
  const sq: SavedQuery = { id, name: `Q ${id}`, query: { ...DEFAULT_QUERY, tuningId }, createdAt: 1000 }
  return {
    ...data,
    savedQueries: { ...data.savedQueries, [id]: sq },
    savedQueryIds: [...data.savedQueryIds, id],
  }
}

describe('GC rule 1 — two-way reconcile', () => {
  it('drops ids with no record', () => {
    const data = { ...defaultAppData(), tuningIds: ['ghost'] }
    expect(gcData(data).tuningIds).toEqual([])
  })

  it('appends records missing from the id array, ordered by createdAt', () => {
    const base = defaultAppData()
    const a = makeTuning('a', 'A', [28, 33], 2000)
    const b = makeTuning('b', 'B', [28, 33], 1000)
    const data: AppData = { ...base, tunings: { a, b }, tuningIds: [] }
    expect(gcData(data).tuningIds).toEqual(['b', 'a'])
  })
})

describe('GC rule 2 — saved queries and tuning deletion', () => {
  it('removeTuning remaps saved queries to a gapKey-equivalent built-in', () => {
    let data = withTuning(defaultAppData(), 'u1') // BEAD pitches → gapKey 5,5,5
    data = withSavedQuery(data, 'q1', 'u1')
    const after = removeTuning(data, 'u1')
    expect(after.tunings['u1']).toBeUndefined()
    expect(after.savedQueries['q1']?.query.tuningId).toBe('builtin:standard4')
  })

  it('removeTuning drops queries when no built-in shares the gapKey', () => {
    let data = withTuning(defaultAppData(), 'u2', [28, 29]) // gapKey "1" — no builtin
    data = withSavedQuery(data, 'q2', 'u2')
    const after = removeTuning(data, 'u2')
    expect(after.savedQueryIds).toEqual([])
  })

  it('gcData drops queries whose tuningId resolves nowhere', () => {
    const data = withSavedQuery(defaultAppData(), 'q3', 'vanished')
    expect(gcData(data).savedQueryIds).toEqual([])
  })
})

describe('GC rule 3 — favorite label hints', () => {
  it('refreshes a hint that no longer resolves, via gapKey equivalence', () => {
    const data = defaultAppData()
    data.favorites['5,5,5|0.0-1.2|r0'] = {
      ref: { gapKey: '5,5,5', tuningLabelHint: 'Deleted Tuning', notes: [{ s: 0, f: 0 }, { s: 1, f: 2 }], rootPc: 0 },
      createdAt: 1000,
    }
    data.favoriteKeys = ['5,5,5|0.0-1.2|r0']
    const after = refreshFavoriteLabels(data)
    expect(after.favorites['5,5,5|0.0-1.2|r0']?.ref.tuningLabelHint).toBe('Standard 4 (EADG)')
  })

  it('falls back to the raw gap vector when nothing matches', () => {
    const data = defaultAppData()
    data.favorites['1,1|0.0-1.0|r0'] = {
      ref: { gapKey: '1,1', tuningLabelHint: 'Gone', notes: [{ s: 0, f: 0 }], rootPc: 0 },
      createdAt: 1000,
    }
    data.favoriteKeys = ['1,1|0.0-1.0|r0']
    const after = refreshFavoriteLabels(data)
    expect(after.favorites['1,1|0.0-1.0|r0']?.ref.tuningLabelHint).toBe('1,1')
  })

  it('leaves resolvable hints alone', () => {
    const data = defaultAppData()
    data.favorites['k'] = {
      ref: { gapKey: '5,5,5', tuningLabelHint: 'BEAD', notes: [], rootPc: 0 },
      createdAt: 1000,
    }
    data.favoriteKeys = ['k']
    expect(refreshFavoriteLabels(data).favorites['k']?.ref.tuningLabelHint).toBe('BEAD')
  })
})

describe('GC rule 4 — defaultTuningId', () => {
  it('resets an unresolvable default to builtin:standard4', () => {
    const data = defaultAppData()
    data.prefs.defaultTuningId = 'vanished'
    expect(gcData(data).prefs.defaultTuningId).toBe('builtin:standard4')
  })
})

describe('GC rule 5 — warn before deleting a referenced tuning', () => {
  it('counts saved queries referencing a tuning', () => {
    let data = withTuning(defaultAppData(), 'u1')
    data = withSavedQuery(data, 'q1', 'u1')
    data = withSavedQuery(data, 'q2', 'u1')
    data = withSavedQuery(data, 'q3', 'builtin:standard4')
    expect(savedQueryCountForTuning(data, 'u1')).toBe(2)
  })
})

describe('migrate', () => {
  it('is idempotent', () => {
    const data = withSavedQuery(withTuning(defaultAppData(), 'u1'), 'q1', 'u1')
    const once = migrate(data)
    const twice = migrate(once)
    expect(twice).toEqual(once)
  })

  it('returns defaults for null/garbage', () => {
    expect(migrate(null)).toEqual(defaultAppData())
    expect(migrate('nonsense')).toEqual(defaultAppData())
  })
})

describe('import validation', () => {
  const goodEnvelope = () => exportEnvelope(withTuning(defaultAppData(), 'u1'))

  it('accepts a good envelope', () => {
    const result = validateImport(goodEnvelope())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.tuningIds).toEqual(['u1'])
  })

  it('rejects invalid JSON', () => {
    const result = validateImport('{nope')
    expect(result).toEqual({ ok: false, error: 'Not valid JSON.' })
  })

  it('rejects wrong app/kind', () => {
    const env = JSON.parse(goodEnvelope())
    env.app = 'SomethingElse'
    expect(validateImport(JSON.stringify(env)).ok).toBe(false)
    const env2 = JSON.parse(goodEnvelope())
    env2.kind = 'other.export'
    expect(validateImport(JSON.stringify(env2)).ok).toBe(false)
  })

  it('rejects schemaVersion greater than current, with the newer-version message', () => {
    const env = JSON.parse(goodEnvelope())
    env.schemaVersion = SCHEMA_VERSION + 1
    const result = validateImport(JSON.stringify(env))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('newer version')
  })

  it('rejects a missing or non-integer schemaVersion', () => {
    const env = JSON.parse(goodEnvelope())
    delete env.schemaVersion
    expect(validateImport(JSON.stringify(env)).ok).toBe(false)
  })

  it('rejects structural failures whole — no partial apply', () => {
    const env = JSON.parse(goodEnvelope())
    env.data.tunings.u1.pitches = [33, 28] // descending
    const result = validateImport(JSON.stringify(env))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('u1')
  })

  it('rejects a record whose id does not match its key', () => {
    const env = JSON.parse(goodEnvelope())
    env.data.tunings.u1.id = 'other'
    expect(validateImport(JSON.stringify(env)).ok).toBe(false)
  })

  it('rejects chord defs with out-of-range or duplicate degrees', () => {
    const env = JSON.parse(goodEnvelope())
    env.data.chordDefs = { c1: { id: 'c1', name: 'Bad', symbol: 'x', degrees: [0, 12] } }
    env.data.chordDefIds = ['c1']
    expect(validateImport(JSON.stringify(env)).ok).toBe(false)
  })

  it('round-trip export → import reproduces state', () => {
    const original = withSavedQuery(withTuning(defaultAppData(), 'u1'), 'q1', 'u1')
    const result = validateImport(exportEnvelope(original))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.tunings).toEqual(original.tunings)
      expect(result.data.savedQueries['q1']?.query).toEqual(original.savedQueries['q1']?.query)
    }
  })
})

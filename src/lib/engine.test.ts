import { describe, expect, it } from 'vitest'
import { runQuery } from './engine'
import { DEFAULT_QUERY, type Query } from './query'
import { builtinTuning, type Tuning } from './tuning'

const eadg = builtinTuning('builtin:standard4') as Tuning
const bead = builtinTuning('builtin:bead') as Tuning

describe('runQuery', () => {
  it('finds minor-triad voicings under the default geometry', () => {
    const query: Query = {
      ...DEFAULT_QUERY,
      degrees: { degrees: [0, 3, 7], ordered: false, exact: true },
    }
    const result = runQuery(query, eadg)
    expect(result.truncated).toBe(false)
    expect(result.groups.length).toBeGreaterThan(0)
    // Every group is exactly the minor-triad quality.
    for (const g of result.groups) {
      expect(g.degrees).toEqual([0, 3, 7])
      expect(g.chord?.symbol).toBe('m')
    }
  })

  it('equivalent tunings produce identical results', () => {
    const query: Query = {
      ...DEFAULT_QUERY,
      degrees: { degrees: [0, 4, 7], ordered: false, exact: true },
    }
    const a = runQuery(query, eadg)
    const b = runQuery(query, bead)
    expect(a.groups.map((g) => g.voicings.map((v) => v.voicingKey))).toEqual(
      b.groups.map((g) => g.voicings.map((v) => v.voicingKey)),
    )
  })

  it('difficulty filter hides rows and counts them', () => {
    const query: Query = { ...DEFAULT_QUERY, maxDifficulty: 'easy' }
    const strict = runQuery(query, eadg)
    const open = runQuery({ ...query, maxDifficulty: null }, eadg)
    expect(strict.filteredOut).toBeGreaterThan(0)
    expect(open.filteredOut).toBe(0)
    expect(strict.totalMatched).toBe(open.totalMatched)
  })
})

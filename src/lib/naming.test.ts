import { describe, expect, it } from 'vitest'
import { formatDegrees } from './theory'
import {
  BUILTIN_CHORD_DEFS,
  buildChordIndex,
  degreeSetKey,
  lookupChord,
  lookupRootlessChord,
  type ChordDef,
} from './naming'

describe('BUILTIN_CHORD_DEFS', () => {
  it('ships a substantial library (~60 qualities)', () => {
    expect(BUILTIN_CHORD_DEFS.length).toBeGreaterThanOrEqual(55)
  })

  it('every degree set is unique, deduped, and in 0–11', () => {
    const keys = new Set<string>()
    for (const d of BUILTIN_CHORD_DEFS) {
      const key = degreeSetKey(d.degrees)
      expect(keys.has(key)).toBe(false)
      keys.add(key)
      for (const pc of d.degrees) {
        expect(Number.isInteger(pc)).toBe(true)
        expect(pc).toBeGreaterThanOrEqual(0)
        expect(pc).toBeLessThanOrEqual(11)
      }
      expect(new Set(d.degrees).size).toBe(d.degrees.length)
    }
  })
})

describe('degree-set → name lookup', () => {
  const index = buildChordIndex()

  it('finds the classics', () => {
    expect(lookupChord([0, 4, 7], index)?.symbol).toBe('maj')
    expect(lookupChord([0, 3, 7], index)?.symbol).toBe('m')
    expect(lookupChord([0, 3, 7, 10], index)?.symbol).toBe('m7')
    expect(lookupChord([0, 3, 6], index)?.symbol).toBe('dim')
  })

  it('compares as a set — input order does not matter', () => {
    expect(lookupChord([7, 0, 4], index)?.symbol).toBe('maj')
  })

  it('an unmatched set is not an error and renders as interval labels', () => {
    // The user's '2-6-8' folds to degrees {2, 9, 0}.
    const degrees = [0, 2, 9]
    expect(lookupChord(degrees, index)).toBeUndefined()
    expect(formatDegrees(degrees)).toBe('1-2-6')
  })
})

describe('user defs shadow built-ins', () => {
  it('a user ChordDef with the same degree set wins', () => {
    const user: ChordDef = {
      id: 'u1',
      name: 'My Minor Seven',
      symbol: 'MYm7',
      degrees: [10, 7, 3, 0], // same SET as m7, different order + symbol
    }
    const index = buildChordIndex([user])
    expect(lookupChord([0, 3, 7, 10], index)?.symbol).toBe('MYm7')
    // Unrelated built-ins are untouched.
    expect(lookupChord([0, 4, 7], index)?.symbol).toBe('maj')
  })
})

describe('lookupRootlessChord', () => {
  const index = buildChordIndex()

  it('recognizes {4,7,10} as a rootless dominant 7', () => {
    expect(lookupRootlessChord([4, 7, 10], index)?.symbol).toBe('7')
  })

  it('returns undefined when the root is present', () => {
    expect(lookupRootlessChord([0, 4, 7], index)).toBeUndefined()
  })
})

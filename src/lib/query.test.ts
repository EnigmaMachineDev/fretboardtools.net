import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, encodeQuery, parseQuery, type Query } from './query'

describe('URL round-trip', () => {
  it('parseQuery(encodeQuery(q)) === q for the default query', () => {
    expect(parseQuery(new URLSearchParams(encodeQuery(DEFAULT_QUERY)))).toEqual(DEFAULT_QUERY)
  })

  it('round-trips a fully-specified query', () => {
    const q: Query = {
      tuningId: 'builtin:standard5',
      noteCount: [2, 5],
      windowFrets: 5,
      allowSkips: true,
      maxSkip: 2,
      stringSet: [0, 2, 3, 4],
      degrees: { degrees: [0, 2, 7], ordered: true, exact: false },
      maxDifficulty: null,
      includeRootless: true,
      sort: 'span',
    }
    expect(parseQuery(new URLSearchParams(encodeQuery(q)))).toEqual(q)
  })

  it('round-trips skips-disallowed as sk=0', () => {
    const q: Query = { ...DEFAULT_QUERY, allowSkips: false, maxSkip: 0 }
    const encoded = encodeQuery(q)
    expect(encoded).toContain('sk=0')
    expect(parseQuery(new URLSearchParams(encoded))).toEqual(q)
  })

  it('matches the documented encoding shape', () => {
    const q: Query = {
      ...DEFAULT_QUERY,
      degrees: { degrees: [0, 3, 7], ordered: false, exact: true },
    }
    const encoded = encodeQuery(q)
    expect(encoded).toContain('n=3-4')
    expect(encoded).toContain('w=4')
    expect(encoded).toContain('d=0%2C3%2C7')
    expect(encoded).toContain('md=3')
    expect(encoded).toContain('sort=play')
  })
})

describe('parseQuery is total', () => {
  it('empty params yield the default query', () => {
    expect(parseQuery(new URLSearchParams(''))).toEqual(DEFAULT_QUERY)
  })

  it('garbage values each fall back independently', () => {
    const q = parseQuery(
      new URLSearchParams(
        't=builtin:bead&n=banana&w=99&sk=-3&ss=3,1&d=0,99&ord=2&ex=&md=17&rl=x&sort=nope',
      ),
    )
    expect(q.tuningId).toBe('builtin:bead') // valid → kept
    expect(q.noteCount).toEqual(DEFAULT_QUERY.noteCount) // garbage → default
    expect(q.windowFrets).toBe(8) // out of range → clamped
    expect(q.allowSkips).toBe(DEFAULT_QUERY.allowSkips) // negative → default
    expect(q.stringSet).toBeNull() // non-ascending → default
    expect(q.degrees).toBeNull() // 99 is not a pitch class → default
    expect(q.maxDifficulty).toBe(DEFAULT_QUERY.maxDifficulty) // 17 → default
    expect(q.includeRootless).toBe(false)
    expect(q.sort).toBe('playability')
  })

  it('never throws on hostile input', () => {
    expect(() =>
      parseQuery(new URLSearchParams('t=%00&n=---&w=NaN&d=,,,&ss=&md=-1&sort=%FF')),
    ).not.toThrow()
  })

  it('md=0 means no difficulty filter (show Impossible too)', () => {
    expect(parseQuery(new URLSearchParams('md=0')).maxDifficulty).toBeNull()
    expect(parseQuery(new URLSearchParams('md=5')).maxDifficulty).toBe('impossible')
  })

  it('swaps an inverted noteCount range instead of rejecting it', () => {
    expect(parseQuery(new URLSearchParams('n=5-3')).noteCount).toEqual([3, 5])
  })

  it('preserves degree order for ordered queries and dedupes', () => {
    const q = parseQuery(new URLSearchParams('d=7,0,2,7&ord=1'))
    expect(q.degrees?.degrees).toEqual([7, 0, 2])
    expect(q.degrees?.ordered).toBe(true)
  })
})

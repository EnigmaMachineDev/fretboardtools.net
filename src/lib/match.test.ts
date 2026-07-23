import { describe, expect, it } from 'vitest'
import { matchesDegreeQuery, type DegreeQuery } from './match'

const dq = (degrees: number[], over: Partial<DegreeQuery> = {}): DegreeQuery => ({
  degrees,
  ordered: false,
  exact: true,
  ...over,
})

describe('exact vs superset', () => {
  it('exact requires set equality', () => {
    // Minor triad voicing [0,3,7].
    expect(matchesDegreeQuery([0, 3, 7], 0, dq([0, 3, 7]))).toBe(true)
    expect(matchesDegreeQuery([0, 3, 7, 10], 0, dq([0, 3, 7]))).toBe(false) // extra ♭7
    expect(matchesDegreeQuery([0, 7], 0, dq([0, 3, 7]))).toBe(false) // missing ♭3
  })

  it('superset allows extra degrees', () => {
    expect(matchesDegreeQuery([0, 3, 7, 10], 0, dq([0, 3, 7], { exact: false }))).toBe(true)
    expect(matchesDegreeQuery([0, 7], 0, dq([0, 3, 7], { exact: false }))).toBe(false)
  })

  it('octave doublings do not break exact matching', () => {
    // 1-5-1(octave) has degree set {0,7}.
    expect(matchesDegreeQuery([0, 7, 12], 0, dq([0, 7]))).toBe(true)
  })
})

describe('ordered', () => {
  it('rejects a set-equal voicing whose bottom-up order differs', () => {
    // Query 1-2-5 ordered. [0,7,14] reads 1-5-2 — same SET, wrong order.
    const query = dq([0, 2, 7], { ordered: true })
    expect(matchesDegreeQuery([0, 7, 14], 0, query)).toBe(false)
    // [0,2,7] reads 1-2-5, and so does the spread [0,14,19] (octave folds).
    expect(matchesDegreeQuery([0, 2, 7], 0, query)).toBe(true)
    expect(matchesDegreeQuery([0, 14, 19], 0, query)).toBe(true)
  })

  it('ordered: false accepts every inversion of a minor triad', () => {
    const query = dq([0, 3, 7])
    expect(matchesDegreeQuery([0, 3, 7], 0, query)).toBe(true) // root position
    expect(matchesDegreeQuery([0, 4, 9], 9, query)).toBe(true) // first inversion (♭3 on bottom)
    expect(matchesDegreeQuery([0, 5, 8], 5, query)).toBe(true) // second inversion (5 on bottom)
  })

  it('ordered superset lets extra degrees interleave', () => {
    // Reading 1-♭7-2-5: queried 1-2-5 appear in order; ♭7 interleaves.
    const query = dq([0, 2, 7], { ordered: true, exact: false })
    expect(matchesDegreeQuery([0, 10, 14, 19], 0, query)).toBe(true)
    // Reading 1-5-♭7-2: queried order broken.
    expect(matchesDegreeQuery([0, 7, 10, 14], 0, query)).toBe(false)
  })
})

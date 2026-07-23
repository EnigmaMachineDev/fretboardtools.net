import { describe, expect, it } from 'vitest'
import {
  MAX_CANDIDATES,
  enumerateStringSets,
  estimateCount,
  generate,
  type GenerateInput,
} from './generate'

const base: GenerateInput = {
  stringCount: 4,
  noteCount: [3, 4],
  windowFrets: 4,
  allowSkips: true,
  maxSkip: 1,
  stringSet: null,
}

describe('enumerateStringSets', () => {
  it('maxSkip 0 (or skips disallowed) emits only contiguous string sets', () => {
    const contiguous = enumerateStringSets(4, 3, 3, false, 1, null)
    expect(contiguous).toEqual([
      [0, 1, 2],
      [1, 2, 3],
    ])
    const alsoContiguous = enumerateStringSets(4, 3, 3, true, 0, null)
    expect(alsoContiguous).toEqual(contiguous)
  })

  it('maxSkip 1 adds single-string skips', () => {
    const sets = enumerateStringSets(4, 3, 3, true, 1, null)
    expect(sets).toContainEqual([0, 2, 3])
    expect(sets).toContainEqual([0, 1, 3])
    expect(sets).toHaveLength(4)
  })

  it('respects a pinned string set', () => {
    const sets = enumerateStringSets(4, 3, 4, true, 1, [0, 1, 3])
    expect(sets).toEqual([[0, 1, 3]])
  })
})

describe('estimateCount vs actual enumeration', () => {
  const cases: GenerateInput[] = [
    base,
    { ...base, windowFrets: 2 },
    { ...base, allowSkips: false },
    { ...base, noteCount: [2, 3], maxSkip: 2 },
    { ...base, stringCount: 5, noteCount: [3, 5], windowFrets: 3 },
    { ...base, stringSet: [0, 2, 3] },
  ]

  cases.forEach((input, i) => {
    it(`case ${i} matches`, () => {
      const { shapes, truncated } = generate(input)
      expect(truncated).toBe(false)
      expect(estimateCount(input)).toBe(shapes.length)
    })
  })

  it('default 4-string query enumerates 4×37 + 1×175 = 323 shapes', () => {
    // k=3: 4^3−3^3 = 37 per set × 4 sets; k=4: 4^4−3^4 = 175 × 1 set.
    expect(estimateCount(base)).toBe(323)
  })
})

describe('generate', () => {
  it('every emitted shape has at least one note at fret 0', () => {
    const { shapes } = generate(base)
    expect(shapes.length).toBeGreaterThan(0)
    for (const shape of shapes) {
      expect(Math.min(...shape.frets)).toBe(0)
    }
  })

  it('pins to the given string set', () => {
    const { shapes } = generate({ ...base, stringSet: [0, 2, 3] })
    for (const shape of shapes) {
      expect(shape.stringSet).toEqual([0, 2, 3])
    }
  })

  it('flags truncation at the cap and stops there', () => {
    const { shapes, truncated, loosestConstraint } = generate(base, 100)
    expect(truncated).toBe(true)
    expect(shapes).toHaveLength(100)
    expect(loosestConstraint).not.toBeNull()
  })

  it('default cap is MAX_CANDIDATES', () => {
    expect(MAX_CANDIDATES).toBe(200_000)
  })
})

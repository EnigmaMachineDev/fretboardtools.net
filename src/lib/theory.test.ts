import { describe, expect, it } from 'vitest'
import { DEGREE_LABELS, degreeLabel, formatDegrees, parseDegree, parseDegreeList } from './theory'

describe('DEGREE_LABELS', () => {
  it('has one canonical label per pitch class', () => {
    expect(DEGREE_LABELS).toHaveLength(12)
    expect(DEGREE_LABELS[0]).toBe('1')
    expect(DEGREE_LABELS[6]).toBe('♭5')
    expect(DEGREE_LABELS[11]).toBe('7')
  })
})

describe('parseDegree — canonical labels round-trip', () => {
  it('parses every canonical label back to its pitch class', () => {
    DEGREE_LABELS.forEach((label, pc) => {
      expect(parseDegree(label)).toBe(pc)
    })
  })

  it('degreeLabel inverts parseDegree for all 12 pitch classes', () => {
    for (let pc = 0; pc < 12; pc++) {
      expect(parseDegree(degreeLabel(pc))).toBe(pc)
    }
  })
})

describe('parseDegree — alias folding', () => {
  it('folds compound degrees to their octave-agnostic equivalent', () => {
    expect(parseDegree('8')).toBe(0) // 8 → 1
    expect(parseDegree('9')).toBe(2) // 9 → 2
    expect(parseDegree('♭9')).toBe(1) // ♭9 → ♭2
    expect(parseDegree('♯9')).toBe(3) // ♯9 → ♭3
    expect(parseDegree('11')).toBe(5) // 11 → 4
    expect(parseDegree('♯11')).toBe(6) // ♯11 → ♭5
    expect(parseDegree('13')).toBe(9) // 13 → 6
    expect(parseDegree('♭13')).toBe(8) // ♭13 → ♭6
  })

  it('accepts ASCII accidentals', () => {
    expect(parseDegree('b2')).toBe(1)
    expect(parseDegree('#9')).toBe(3)
    expect(parseDegree('b13')).toBe(8)
    expect(parseDegree('#11')).toBe(6)
  })

  it('accepts enharmonic aliases', () => {
    expect(parseDegree('♯4')).toBe(6)
    expect(parseDegree('♯5')).toBe(8)
  })

  it('ignores surrounding whitespace', () => {
    expect(parseDegree(' 5 ')).toBe(7)
  })
})

describe('parseDegree — garbage rejected', () => {
  it('returns null for non-degrees', () => {
    expect(parseDegree('')).toBeNull()
    expect(parseDegree('x')).toBeNull()
    expect(parseDegree('10')).toBeNull()
    expect(parseDegree('14')).toBeNull()
    expect(parseDegree('-1')).toBeNull()
    expect(parseDegree('♭')).toBeNull()
    expect(parseDegree('5b')).toBeNull()
  })
})

describe('parseDegreeList', () => {
  it('parses a delimited list, deduping and sorting', () => {
    expect(parseDegreeList('1 b3 5')).toEqual([0, 3, 7])
    expect(parseDegreeList('5, 1, b3, 1')).toEqual([0, 3, 7])
    expect(parseDegreeList('1-9-5')).toEqual([0, 2, 7])
  })

  it('returns null when any token is garbage', () => {
    expect(parseDegreeList('1 x 5')).toBeNull()
    expect(parseDegreeList('')).toBeNull()
  })
})

describe('formatDegrees', () => {
  it('renders canonical labels joined by dashes', () => {
    expect(formatDegrees([0, 3, 7])).toBe('1-♭3-5')
    expect(formatDegrees([0, 4, 7, 10])).toBe('1-3-5-♭7')
  })
})

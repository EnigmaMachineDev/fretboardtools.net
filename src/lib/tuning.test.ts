import { describe, expect, it } from 'vitest'
import {
  BUILTIN_TUNINGS,
  builtinTuning,
  equivalentTunings,
  gapKey,
  gaps,
  makeTuning,
  pitchName,
  validateTuningPitches,
  type Tuning,
} from './tuning'

const byId = (id: string): Tuning => {
  const t = builtinTuning(id)
  if (!t) throw new Error(`missing builtin ${id}`)
  return t
}

describe('gaps / gapKey', () => {
  it('computes semitone gaps low → high', () => {
    expect(gaps(byId('builtin:standard4'))).toEqual([5, 5, 5])
    expect(gaps(byId('builtin:standard5'))).toEqual([5, 5, 5, 5])
  })

  it('EADG, BEAD, and F#BEA all produce "5,5,5"', () => {
    expect(gapKey(byId('builtin:standard4'))).toBe('5,5,5')
    expect(gapKey(byId('builtin:bead'))).toBe('5,5,5')
    expect(gapKey(byId('builtin:fsharpbea'))).toBe('5,5,5')
  })

  it('Drop D produces "7,5,5"', () => {
    expect(gapKey(byId('builtin:dropd'))).toBe('7,5,5')
  })

  it('Drop A 5-string produces "7,5,5,5"', () => {
    expect(gapKey(byId('builtin:dropa5'))).toBe('7,5,5,5')
  })

  it('the non-fourths builtin exists for coverage', () => {
    expect(BUILTIN_TUNINGS.some((t) => gaps(t).some((g) => g !== 5))).toBe(true)
  })
})

describe('equivalentTunings', () => {
  it('finds all three all-fourths 4-string tunings for each other', () => {
    const eadg = byId('builtin:standard4')
    const found = equivalentTunings(eadg).map((t) => t.id)
    expect(found).toContain('builtin:bead')
    expect(found).toContain('builtin:fsharpbea')
    expect(found).toContain('builtin:tenor')
    expect(found).not.toContain('builtin:standard4') // never itself
    expect(found).not.toContain('builtin:dropd') // different gaps
  })

  it('includes matching user tunings when provided', () => {
    const user = makeTuning('u1', 'My BEAD clone', [23, 28, 33, 38])
    const found = equivalentTunings(byId('builtin:standard4'), [user])
    expect(found.map((t) => t.id)).toContain('u1')
  })
})

describe('validateTuningPitches', () => {
  it('accepts string counts 2 and 9', () => {
    expect(validateTuningPitches([28, 33])).toBeNull()
    expect(validateTuningPitches([10, 15, 20, 25, 30, 35, 40, 45, 50])).toBeNull()
  })

  it('rejects counts outside 2–9', () => {
    expect(validateTuningPitches([28])).not.toBeNull()
    expect(validateTuningPitches([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).not.toBeNull()
  })

  it('rejects non-ascending, non-integer, and out-of-range pitches', () => {
    expect(validateTuningPitches([33, 28])).not.toBeNull() // descending
    expect(validateTuningPitches([28, 28])).not.toBeNull() // not strictly ascending
    expect(validateTuningPitches([28.5, 33])).not.toBeNull()
    expect(validateTuningPitches([-1, 5])).not.toBeNull()
    expect(validateTuningPitches([120, 130])).not.toBeNull()
  })
})

describe('pitchName', () => {
  it('names MIDI pitches with octave', () => {
    expect(pitchName(28)).toBe('E1')
    expect(pitchName(23)).toBe('B0')
    expect(pitchName(43)).toBe('G2')
  })
})

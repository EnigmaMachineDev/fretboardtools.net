import { describe, expect, it } from 'vitest'
import { groupResults, qualityKeyOf, voicingKeyOf, type VoicingResult } from './group'
import { normalizeShape } from './shape'
import { scoreShape } from './score'

const result = (
  notes: [s: number, f: number][],
  voicing: number[],
  degrees: number[],
  rootPc = 0,
): VoicingResult => {
  const shape = normalizeShape(notes.map(([s, f]) => ({ s, f })))
  return { shape, voicing, rootPc, degrees, score: scoreShape(shape) }
}

describe('groupResults', () => {
  it('fingering variants of one voicing collapse into one voicing node', () => {
    // Same voicing [0,7,12] (minor-third-free 1-5-8) realized on two string sets.
    const a = result([[0, 0], [1, 2], [2, 2]], [0, 7, 12], [0, 7])
    const b = result([[1, 0], [2, 2], [3, 2]], [0, 7, 12], [0, 7])
    const groups = groupResults([a, b])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.voicings).toHaveLength(1)
    expect(groups[0]?.voicings[0]?.shapes).toHaveLength(2)
  })

  it('distinct inversions of one quality stay separate voicings under one quality node', () => {
    // Minor triad quality {0,3,7}: root position vs first inversion.
    const root = result([[0, 0], [1, 2], [2, 2]], [0, 7, 15], [0, 3, 7], 0)
    const inv = result([[0, 0], [1, 1], [2, 2]], [0, 6, 12], [0, 3, 7], 9)
    const groups = groupResults([root, inv])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.voicings).toHaveLength(2)
    expect(groups[0]?.count).toBe(2)
  })

  it('different qualities produce different top-level groups', () => {
    const minor = result([[0, 0], [1, 2], [2, 2]], [0, 7, 15], [0, 3, 7])
    const major = result([[0, 0], [1, 2], [2, 1]], [0, 7, 14], [0, 4, 7])
    expect(groupResults([minor, major])).toHaveLength(2)
  })

  it('group keys are stable across runs and input orders', () => {
    const a = result([[0, 0], [1, 2], [2, 2]], [0, 7, 15], [0, 3, 7])
    const b = result([[0, 0], [1, 1], [2, 2]], [0, 6, 12], [0, 3, 7], 9)
    expect(qualityKeyOf(a)).toBe('0,3,7')
    expect(voicingKeyOf(a)).toBe('0,3,7|0,7,15|r0')
    const forward = groupResults([a, b]).map((g) => g.qualityKey)
    const backward = groupResults([b, a]).map((g) => g.qualityKey)
    expect(forward).toEqual(backward)
  })

  it('orders voicing members best-first by cost', () => {
    // Same voicing; the skipped-string variant costs more.
    const easy = result([[0, 0], [1, 2]], [0, 7], [0, 7])
    const harder = result([[0, 0], [2, 2]], [0, 7], [0, 7])
    // Force them into one voicing node (same voicing + degrees + root).
    const groups = groupResults([harder, easy])
    const node = groups[0]?.voicings[0]
    expect(node?.best.score.score).toBe(easy.score.score)
  })
})

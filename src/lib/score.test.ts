import { describe, expect, it } from 'vitest'
import { normalizeShape } from './shape'
import {
  COST,
  difficultyForScore,
  interiorMutedStrings,
  isLegalAssignment,
  scoreShape,
} from './score'

const shape = (notes: [s: number, f: number][]) =>
  normalizeShape(notes.map(([s, f]) => ({ s, f })))

describe('isLegalAssignment', () => {
  it('enforces monotonicity: lower fret may not take a higher finger', () => {
    const notes = shape([[0, 0], [1, 2]]).notes
    expect(isLegalAssignment(notes, [2, 1])).toBe(false)
    expect(isLegalAssignment(notes, [1, 2])).toBe(true)
    expect(isLegalAssignment(notes, [1, 1])).toBe(false) // same finger, two frets
  })

  it('rejects an illegal barre — lower-fret note between the barred strings', () => {
    // Fret 2 on strings 0/2/3, fret 0 on string 1. Any barre spanning string 1 is illegal.
    const notes = shape([[0, 2], [1, 0], [2, 2], [3, 2]]).notes
    expect(isLegalAssignment(notes, [3, 1, 3, 3])).toBe(false) // barre 0–3 spans string 1
    expect(isLegalAssignment(notes, [2, 1, 3, 3])).toBe(true) // barre 2–3 is clear
  })

  it('allows a barre over a muted interior string', () => {
    // Strings 0 and 2 at fret 0, string 1 muted.
    const notes = shape([[0, 0], [2, 0]]).notes
    expect(isLegalAssignment(notes, [1, 1])).toBe(true)
  })

  it('allows a higher-fret note between barred strings', () => {
    // Barre fret 0 on strings 0/2; string 1 carries fret 2 (a different finger frets it).
    const notes = shape([[0, 0], [1, 2], [2, 0]]).notes
    expect(isLegalAssignment(notes, [1, 2, 1])).toBe(true)
  })
})

describe('scoreShape', () => {
  it('a known-easy shape (minor-triad geometry, 2-fret span, no skips) scores Easy', () => {
    const result = scoreShape(shape([[0, 0], [1, 2], [2, 2]]))
    expect(result.difficulty).toBe('easy')
    expect(result.score).toBe(COST.spanPerFret * 2)
    expect(result.fingering).toHaveLength(3)
  })

  it('finds a legal barre and it costs less than four separate fingers', () => {
    const result = scoreShape(shape([[0, 0], [1, 2], [2, 2], [3, 2]]))
    expect(result.score).toBe(COST.spanPerFret * 2) // barre avoids the stretch penalty
    const f = result.fingering as number[]
    // The three fret-2 notes share one finger — a barre.
    expect(f[1]).toBe(f[2])
    expect(f[2]).toBe(f[3])
    expect(f[0]).not.toBe(f[1])
  })

  it('never barres across a lower-fret interior note', () => {
    const result = scoreShape(shape([[0, 2], [1, 0], [2, 2], [3, 2]]))
    expect(result.difficulty).not.toBe('impossible')
    const f = result.fingering as number[]
    // String 0 (fret 2) may not share a finger with strings 2/3 — that barre
    // would span string 1's lower fret.
    expect(f[0]).not.toBe(f[2])
    expect(f[0]).not.toBe(f[3])
  })

  it('more than 4 distinct frets is Impossible', () => {
    const result = scoreShape(shape([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]))
    expect(result.difficulty).toBe('impossible')
    expect(result.score).toBeNull()
    expect(result.fingering).toBeNull()
  })

  it('interior mutes add exactly their cost', () => {
    const contiguous = scoreShape(shape([[0, 0], [1, 2]]))
    const skipped = scoreShape(shape([[0, 0], [2, 2]]))
    expect((skipped.score as number) - (contiguous.score as number)).toBe(COST.interiorMute)
  })

  it('a known-brutal shape (3 skips, 5-fret span) scores Very Hard or Impossible', () => {
    const result = scoreShape(shape([[0, 0], [2, 4], [4, 2], [6, 3]]))
    expect(['veryHard', 'impossible']).toContain(result.difficulty)
    expect(result.difficulty).toBe('veryHard')
    // span 6 + mutes 4.5 + pinky 2 + one stretch 3 = 15.5
    expect(result.score).toBe(15.5)
  })
})

describe('difficulty bands', () => {
  it('boundaries at 3 / 7 / 12 are exact (inclusive below)', () => {
    expect(difficultyForScore(0)).toBe('easy')
    expect(difficultyForScore(3)).toBe('easy')
    expect(difficultyForScore(3.5)).toBe('moderate')
    expect(difficultyForScore(7)).toBe('moderate')
    expect(difficultyForScore(7.5)).toBe('hard')
    expect(difficultyForScore(12)).toBe('hard')
    expect(difficultyForScore(12.5)).toBe('veryHard')
  })
})

describe('interiorMutedStrings', () => {
  it('finds only strings strictly inside the span without notes', () => {
    expect(interiorMutedStrings(shape([[0, 0], [2, 2], [5, 1]]).notes)).toEqual([1, 3, 4])
    expect(interiorMutedStrings(shape([[0, 0], [1, 2]]).notes)).toEqual([])
  })
})

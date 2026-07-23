import { describe, expect, it } from 'vitest'
import { cumGaps, voice } from './voice'

describe('cumGaps', () => {
  it('prefixes 0 and accumulates', () => {
    expect(cumGaps([5, 5, 5])).toEqual([0, 5, 10, 15])
    expect(cumGaps([7, 5, 5])).toEqual([0, 7, 12, 17])
  })
})

describe('voice', () => {
  it('known case: (5,5,5) tuning, shape [(0,0),(1,2),(2,2)] → [0,7,12]', () => {
    // String offsets 0/5/10; frets 0/2/2 → absolute 0, 7, 12 above the lowest note.
    expect(
      voice(
        [
          { s: 0, f: 0 },
          { s: 1, f: 2 },
          { s: 2, f: 2 },
        ],
        [5, 5, 5],
      ),
    ).toEqual([0, 7, 12])
  })

  it('first element is always 0', () => {
    const v = voice(
      [
        { s: 1, f: 3 },
        { s: 3, f: 0 },
      ],
      [7, 5, 5],
    )
    expect(v[0]).toBe(0)
  })

  it('sorts by sounding pitch, not string order', () => {
    // High fret on a low string can sound above the next string's note.
    // (5,5,5): s0 f7 = 7, s1 f0 = 5 → sorted [0, 2] relative to the lower pitch.
    expect(
      voice(
        [
          { s: 0, f: 7 },
          { s: 1, f: 0 },
        ],
        [5, 5, 5],
      ),
    ).toEqual([0, 2])
  })

  it('keeps unisons (multiset, not set)', () => {
    // (5,5,5): s0 f5 = 5, s1 f0 = 5 — a unison doubles the note.
    expect(
      voice(
        [
          { s: 0, f: 5 },
          { s: 1, f: 0 },
        ],
        [5, 5, 5],
      ),
    ).toEqual([0, 0])
  })

  it('unused higher strings do not affect the voicing', () => {
    const notes = [
      { s: 0, f: 0 },
      { s: 1, f: 2 },
      { s: 2, f: 2 },
    ]
    // Same shape on a 4-string and a 5-string all-fourths tuning.
    expect(voice(notes, [5, 5, 5])).toEqual(voice(notes, [5, 5, 5, 5]))
  })
})

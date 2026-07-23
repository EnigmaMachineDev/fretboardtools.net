import { describe, expect, it } from 'vitest'
import { SCALE_PRESETS, scaleBoxes } from './scale'

const FOURTHS = [5, 5, 5] // 4-string all-fourths
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

describe('scaleBoxes', () => {
  it('every position is a scale tone', () => {
    for (const box of scaleBoxes(MAJOR, FOURTHS, 4)) {
      for (const p of box.positions) {
        expect(MAJOR).toContain(p.pc)
      }
    }
  })

  it('considers all 12 alignments and dedupes identical boxes', () => {
    // The chromatic scale fills every cell for every offset → exactly 1 box.
    const chromatic = SCALE_PRESETS.find((p) => p.id === 'chromatic')!.degrees
    const boxes = scaleBoxes(chromatic, FOURTHS, 4)
    expect(boxes).toHaveLength(1)
    expect(boxes[0]?.positions).toHaveLength(4 * 4)

    // The whole-tone scale has period 2 → at most 2 distinct boxes.
    const wholeTone = SCALE_PRESETS.find((p) => p.id === 'wholeTone')!.degrees
    expect(scaleBoxes(wholeTone, FOURTHS, 4).length).toBeLessThanOrEqual(2)
  })

  it('a major scale in a 4-fret window has covering boxes, sorted first', () => {
    const boxes = scaleBoxes(MAJOR, FOURTHS, 4)
    expect(boxes.length).toBeGreaterThan(1)
    expect(boxes[0]?.covers).toBe(true)
    // Once a non-covering box appears, no covering box follows.
    const firstIncomplete = boxes.findIndex((b) => !b.covers)
    if (firstIncomplete !== -1) {
      expect(boxes.slice(firstIncomplete).every((b) => !b.covers)).toBe(true)
    }
  })

  it('narrow windows produce incomplete boxes, honestly flagged', () => {
    const boxes = scaleBoxes(MAJOR, [5], 1) // 2 strings, 1 fret: 2 cells max
    expect(boxes.every((b) => !b.covers)).toBe(true)
  })

  it('keys are deterministic across runs', () => {
    const a = scaleBoxes(MAJOR, FOURTHS, 4).map((b) => b.key)
    const b = scaleBoxes(MAJOR, FOURTHS, 4).map((b) => b.key)
    expect(a).toEqual(b)
  })

  it('presets are valid degree sets with a root', () => {
    for (const preset of SCALE_PRESETS) {
      expect(preset.degrees[0]).toBe(0)
      expect(new Set(preset.degrees).size).toBe(preset.degrees.length)
      for (const d of preset.degrees) {
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThanOrEqual(11)
      }
    }
  })
})

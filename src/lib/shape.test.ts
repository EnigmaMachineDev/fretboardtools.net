import { describe, expect, it } from 'vitest'
import { normalizeShape, shapeKey, type ShapeRef } from './shape'

describe('normalizeShape', () => {
  it('always puts the minimum fret at 0', () => {
    const shape = normalizeShape([
      { s: 0, f: 3 },
      { s: 1, f: 5 },
      { s: 2, f: 5 },
    ])
    expect(Math.min(...shape.notes.map((n) => n.f))).toBe(0)
    expect(shape.notes).toEqual([
      { s: 0, f: 0 },
      { s: 1, f: 2 },
      { s: 2, f: 2 },
    ])
  })

  it('sorts notes by string ascending', () => {
    const shape = normalizeShape([
      { s: 2, f: 2 },
      { s: 0, f: 0 },
      { s: 1, f: 2 },
    ])
    expect(shape.notes.map((n) => n.s)).toEqual([0, 1, 2])
  })

  it('is a no-op on an already-normalized shape', () => {
    const notes = [
      { s: 0, f: 0 },
      { s: 1, f: 2 },
    ]
    expect(normalizeShape(notes).notes).toEqual(notes)
  })
})

describe('shapeKey', () => {
  const ref = (notes: ShapeRef['notes'], gapKey = '5,5,5', rootPc = 0): ShapeRef => ({
    gapKey,
    tuningLabelHint: 'Standard 4',
    notes,
    rootPc,
  })

  it('is deterministic and order-independent w.r.t. input note order', () => {
    const a = shapeKey(ref([{ s: 0, f: 0 }, { s: 1, f: 2 }, { s: 2, f: 2 }]))
    const b = shapeKey(ref([{ s: 2, f: 2 }, { s: 0, f: 0 }, { s: 1, f: 2 }]))
    expect(a).toBe(b)
    expect(a).toBe('5,5,5|0.0-1.2-2.2|r0')
  })

  it('two identical shapes under equivalent tunings produce the same key', () => {
    // EADG and BEAD are both gapKey '5,5,5' — the label hint is not part of the key.
    const eadg: ShapeRef = {
      gapKey: '5,5,5',
      tuningLabelHint: 'Standard 4',
      notes: [{ s: 0, f: 0 }, { s: 1, f: 2 }],
      rootPc: 0,
    }
    const bead: ShapeRef = { ...eadg, tuningLabelHint: 'BEAD' }
    expect(shapeKey(eadg)).toBe(shapeKey(bead))
  })

  it('differs by rootPc and by gapKey', () => {
    const notes = [{ s: 0, f: 0 }, { s: 1, f: 2 }]
    expect(shapeKey(ref(notes, '5,5,5', 0))).not.toBe(shapeKey(ref(notes, '5,5,5', 7)))
    expect(shapeKey(ref(notes, '5,5,5', 0))).not.toBe(shapeKey(ref(notes, '7,5,5', 0)))
  })
})

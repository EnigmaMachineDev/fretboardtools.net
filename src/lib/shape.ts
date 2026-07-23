/**
 * The central abstraction of the whole site:
 *
 *   a shape is (string set, fret offsets), normalized so the lowest fret used = 0.
 *
 * That normalization makes shapes transposition- and position-invariant by
 * construction — the user gets THE FINGERING, slidable anywhere on the neck.
 * Everything else (pitches, degrees, names, difficulty) is derived from
 * shape + tuning + chosen root and never stored.
 */
import type { PitchClass } from './theory'

export interface ShapeNote {
  s: number // string index, 0 = lowest string
  f: number // fret OFFSET within the window; min across the shape is always 0
}

export interface Shape {
  notes: ShapeNote[] // sorted by s ascending
}

/**
 * A favoriteable reference to a shape. Keyed by gapKey — the tuning's real
 * identity — NOT by tuningId, so favorites dedupe across equivalent tunings
 * and can never orphan when a tuning is renamed or deleted.
 */
export interface ShapeRef {
  gapKey: string // tuning identity
  tuningLabelHint: string // display only, e.g. 'BEAD'
  notes: ShapeNote[]
  rootPc: PitchClass // 0–11, relative to the LOWEST SOUNDING NOTE
}

/** Deterministic and content-addressed. */
export type ShapeKey = string // `${gapKey}|${notes.map(n => `${n.s}.${n.f}`).join('-')}|r${rootPc}`

export interface Favorite {
  ref: ShapeRef
  note?: string
  createdAt: number
}

/** Sort by string ascending and shift frets so the minimum is 0. */
export function normalizeShape(notes: readonly ShapeNote[]): Shape {
  const min = Math.min(...notes.map((n) => n.f))
  return {
    notes: [...notes]
      .sort((a, b) => a.s - b.s)
      .map((n) => ({ s: n.s, f: n.f - min })),
  }
}

/** Content-addressed key. Normalizes note order so it is input-order-independent. */
export function shapeKey(ref: ShapeRef): ShapeKey {
  const notes = normalizeShape(ref.notes).notes
  return `${ref.gapKey}|${notes.map((n) => `${n.s}.${n.f}`).join('-')}|r${ref.rootPc}`
}

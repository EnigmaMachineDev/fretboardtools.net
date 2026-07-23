/**
 * Voicing: shape + tuning gaps → sounding semitone offsets from the lowest
 * SOUNDING note, ascending. This is what distinguishes an inversion or a
 * spread from a close position; two shapes with the same voicing are
 * fingering variants of each other.
 */
import type { ShapeNote } from './shape'

/** [0, g0, g0+g1, …] — semitone offset of each open string above the lowest. */
export function cumGaps(gapsVec: readonly number[]): number[] {
  const out = [0]
  for (const g of gapsVec) out.push((out[out.length - 1] as number) + g)
  return out
}

/**
 * Sounding pitches of a shape, as semitone offsets from the lowest sounding
 * note, sorted ascending. A multiset — unisons are kept. First element is
 * always 0.
 */
export function voice(notes: readonly ShapeNote[], gapsVec: readonly number[]): number[] {
  const cum = cumGaps(gapsVec)
  const abs = notes.map((n) => (cum[n.s] as number) + n.f).sort((a, b) => a - b)
  const min = abs[0] as number
  return abs.map((p) => p - min)
}

/**
 * Degree-constraint matching against a voicing under a chosen root.
 *
 * `ordered: false` is a pure set match, so every inversion of a quality comes
 * back together. `ordered: true` additionally requires the degrees to READ
 * bottom-up in exactly the queried order — '1-2-5' then names one specific
 * voicing family, not a quality.
 */
import { normalizePc, type PitchClass } from './theory'

export interface DegreeQuery {
  degrees: PitchClass[] // e.g. [0, 2, 7] for 1-2-5; order significant when ordered
  ordered: boolean // must read bottom-up in exactly this order?
  exact: boolean // exactly these degrees, or is a superset allowed?
}

/** Degrees of a voicing bottom-up (with octave folds; duplicates kept). */
export function degreeSequence(voicing: readonly number[], rootPc: PitchClass): PitchClass[] {
  return voicing.map((v) => normalizePc(v - rootPc))
}

/** Distinct degrees in order of first appearance, bottom-up. */
export function firstAppearanceOrder(sequence: readonly PitchClass[]): PitchClass[] {
  const seen = new Set<PitchClass>()
  const out: PitchClass[] = []
  for (const d of sequence) {
    if (!seen.has(d)) {
      seen.add(d)
      out.push(d)
    }
  }
  return out
}

/** Does the voicing (under rootPc) satisfy the degree query? */
export function matchesDegreeQuery(
  voicing: readonly number[],
  rootPc: PitchClass,
  dq: DegreeQuery,
): boolean {
  const sequence = degreeSequence(voicing, rootPc)
  const set = new Set(sequence)
  const queried = new Set(dq.degrees)

  if (dq.exact) {
    if (set.size !== queried.size) return false
    for (const d of set) if (!queried.has(d)) return false
  } else {
    for (const d of queried) if (!set.has(d)) return false
  }

  if (dq.ordered) {
    // First occurrences of the QUERIED degrees must appear in the queried
    // order (extra degrees may interleave in superset mode).
    const firsts = firstAppearanceOrder(sequence).filter((d) => queried.has(d))
    if (firsts.length !== dq.degrees.length) return false
    for (let i = 0; i < firsts.length; i++) {
      if (firsts[i] !== dq.degrees[i]) return false
    }
  }
  return true
}

/**
 * Interpretation: voicing + candidate root → degree set, and voicing alone →
 * ALL interpretations, one per candidate root.
 *
 * A small note-set is genuinely ambiguous ([0,3,6] is a diminished triad OR a
 * rootless dominant 7). We never pick one and hide the other — interval labels
 * are primary, names are a secondary annotation, and multiple names may apply
 * across interpretations.
 */
import { normalizePc, type PitchClass } from './theory'
import { lookupChord, lookupRootlessChord, type ChordDef } from './naming'

export interface Interpretation {
  /** Candidate root, as a pitch class relative to the lowest sounding note. */
  rootPc: PitchClass
  /** Whether the root is actually sounded in the voicing. */
  rootPresent: boolean
  /** Sorted unique degree set relative to rootPc. */
  degrees: PitchClass[]
  /** Matched chord def, if the degree set (or set + implied root) is named. */
  chord?: ChordDef
  /** True when the chord name only applies with the root left out. */
  rootless?: boolean
}

/** Degree set of a voicing relative to a chosen root (sorted, deduped). */
export function degreesFor(voicing: readonly number[], rootPc: PitchClass): PitchClass[] {
  return [...new Set(voicing.map((v) => normalizePc(v - rootPc)))].sort((a, b) => a - b)
}

/**
 * All interpretations of a voicing. Candidate roots are the pitch classes
 * present in the voicing; with includeRootless, all 12. Ranked root-present
 * first, then named-before-unnamed, then smaller degree sets, then rootPc for
 * determinism.
 */
export function interpret(
  voicing: readonly number[],
  chordIndex: Map<string, ChordDef>,
  includeRootless = false,
): Interpretation[] {
  const presentPcs = [...new Set(voicing.map((v) => normalizePc(v)))].sort((a, b) => a - b)
  const candidates = includeRootless ? Array.from({ length: 12 }, (_, i) => i) : presentPcs
  const present = new Set(presentPcs)

  const out: Interpretation[] = candidates.map((rootPc) => {
    const degrees = degreesFor(voicing, rootPc)
    const rootPresent = present.has(rootPc)
    const interp: Interpretation = { rootPc, rootPresent, degrees }
    const named = lookupChord(degrees, chordIndex)
    if (named) {
      interp.chord = named
    } else if (!rootPresent) {
      const rootless = lookupRootlessChord(degrees, chordIndex)
      if (rootless) {
        interp.chord = rootless
        interp.rootless = true
      }
    }
    return interp
  })

  return out.sort(
    (a, b) =>
      Number(b.rootPresent) - Number(a.rootPresent) ||
      Number(!!b.chord) - Number(!!a.chord) ||
      a.degrees.length - b.degrees.length ||
      a.rootPc - b.rootPc,
  )
}

/**
 * Interpretation: voicing + candidate root → degree set, and voicing alone →
 * ALL interpretations, one per candidate root.
 *
 * A small note-set is genuinely ambiguous ([0,3,6] is a diminished triad OR a
 * rootless dominant 7). We never pick one and hide the other — interval labels
 * are primary, names are a secondary annotation, and multiple names may apply
 * across interpretations.
 */
import { DEGREE_LABELS, normalizePc, type PitchClass } from './theory'
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

/** Compound spelling for degrees that sound an octave (or more) above the root. */
const COMPOUND_LABELS: Partial<Record<PitchClass, string>> = {
  1: '♭9',
  2: '9',
  3: '♯9',
  5: '11',
  6: '♯11',
  8: '♭13',
  9: '13',
}

export interface SoundingInterval {
  pc: PitchClass // octave-agnostic degree
  label: string // canonical degree label
  soundsAs: string | null // compound label when it sounds ≥ an octave above the root
}

/**
 * Octave placement is an OUTPUT property: '2 sounds as 9'. Reference pitch is
 * the lowest sounding occurrence of the root (or its theoretical position for
 * rootless voicings).
 */
export function soundingIntervals(
  voicing: readonly number[],
  rootPc: PitchClass,
): SoundingInterval[] {
  const rootPitch = voicing.find((v) => normalizePc(v - rootPc) === 0) ?? rootPc
  const seen = new Set<PitchClass>()
  const out: SoundingInterval[] = []
  for (const v of voicing) {
    const pc = normalizePc(v - rootPc)
    if (seen.has(pc)) continue
    seen.add(pc)
    const compound = v - rootPitch >= 12 ? COMPOUND_LABELS[pc] ?? null : null
    out.push({ pc, label: DEGREE_LABELS[pc] as string, soundsAs: compound })
  }
  return out
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

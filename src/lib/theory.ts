/**
 * Theory primitives: pitch classes and degree labels.
 *
 * Everything here is octave-agnostic. Compound degrees (9, 11, 13, …) are INPUT
 * aliases only — octave placement is an OUTPUT property of a voicing, never an
 * input constraint.
 */

/** 0–11, semitones above the root. */
export type PitchClass = number

/** Canonical, octave-agnostic degree labels, indexed by PitchClass. */
export const DEGREE_LABELS = [
  '1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7',
] as const

/**
 * Input aliases. Compound degrees are accepted from the user and folded to their
 * octave-agnostic equivalent. Octave placement is an OUTPUT property, not an input
 * constraint.
 *   8 → 1, 9 → 2, ♭9 → ♭2, ♯9 → ♭3, 11 → 4, ♯11 → ♭5, 13 → 6, ♭13 → ♭6
 * Common enharmonics (♯4, ♯5, ♯2) fold the same way.
 */
export const DEGREE_ALIASES: Record<string, PitchClass> = {
  '8': 0,
  '9': 2,
  '♭9': 1,
  '♯9': 3,
  '11': 5,
  '♯11': 6,
  '13': 9,
  '♭13': 8,
  '♯2': 3,
  '♯4': 6,
  '♯5': 8,
}

/** Canonical label for a pitch class. */
export function degreeLabel(pc: PitchClass): string {
  return DEGREE_LABELS[((pc % 12) + 12) % 12] as string
}

/** Fold any integer (possibly negative) into 0–11. */
export function normalizePc(n: number): PitchClass {
  return ((n % 12) + 12) % 12
}

/**
 * Parse a single degree token — canonical label or alias, unicode or ASCII
 * accidentals. Returns null for anything unrecognized; never throws.
 */
export function parseDegree(input: string): PitchClass | null {
  const token = input.trim().replace(/b/g, '♭').replace(/#/g, '♯')
  if (!token) return null
  const canonical = (DEGREE_LABELS as readonly string[]).indexOf(token)
  if (canonical !== -1) return canonical
  const alias = DEGREE_ALIASES[token]
  return alias === undefined ? null : alias
}

/**
 * Parse a whole degree list ('1 b3 5', '1,3,5', '1-9-5') into a deduped,
 * ascending pitch-class array. Null if empty or if any token is garbage.
 */
export function parseDegreeList(input: string): PitchClass[] | null {
  const tokens = input.split(/[\s,\-–/]+/).filter(Boolean)
  if (tokens.length === 0) return null
  const out = new Set<PitchClass>()
  for (const token of tokens) {
    const pc = parseDegree(token)
    if (pc === null) return null
    out.add(pc)
  }
  return [...out].sort((a, b) => a - b)
}

/** Render a degree set with canonical labels: [0,3,7] → '1-♭3-5'. */
export function formatDegrees(degrees: readonly PitchClass[]): string {
  return degrees.map(degreeLabel).join('-')
}

/**
 * Chord naming: degree sets → names.
 *
 * Names are a secondary annotation on top of interval labels, never the
 * primary identity. An unmatched degree set is NOT an error — it simply
 * renders as its interval labels (e.g. '2-6-8' → '1-2-6').
 *
 * Users can define their own chords with arbitrary degree sets; a user def
 * SHADOWS any built-in with the same degree set (compared as a sorted set,
 * not by symbol).
 */
import { formatDegrees, type PitchClass } from './theory'

export interface ChordDef {
  id: string
  name: string // 'Minor 7'
  symbol: string // 'm7'
  degrees: PitchClass[] // e.g. [0, 3, 7, 10]
  spelling?: string[] // display override, e.g. ['1', '♯9', '5', '♭7']
  aliases?: string[]
  builtin?: true
}

/** Canonical identity of a degree set: sorted, deduped, comma-joined. */
export function degreeSetKey(degrees: readonly PitchClass[]): string {
  return [...new Set(degrees)].sort((a, b) => a - b).join(',')
}

const def = (
  id: string,
  name: string,
  symbol: string,
  degrees: PitchClass[],
  extra?: Partial<Pick<ChordDef, 'spelling' | 'aliases'>>,
): ChordDef => ({ id: `builtin:${id}`, name, symbol, degrees, builtin: true, ...extra })

/** ~60 built-in chord qualities. Kept in code, never in the store. */
export const BUILTIN_CHORD_DEFS: ChordDef[] = [
  // Dyads / stacks
  def('power', 'Power Chord', '5', [0, 7]),
  def('quartal', 'Quartal Stack', '4ths', [0, 5, 10]),
  // Triads
  def('maj', 'Major', 'maj', [0, 4, 7]),
  def('min', 'Minor', 'm', [0, 3, 7], { aliases: ['min', '-'] }),
  def('dim', 'Diminished', 'dim', [0, 3, 6], { aliases: ['°'] }),
  def('aug', 'Augmented', 'aug', [0, 4, 8], { aliases: ['+'] }),
  def('majb5', 'Major Flat 5', 'maj♭5', [0, 4, 6]),
  // Suspensions
  def('sus2', 'Sus2', 'sus2', [0, 2, 7]),
  def('sus4', 'Sus4', 'sus4', [0, 5, 7]),
  def('sus24', 'Sus2/4', 'sus2/4', [0, 2, 5, 7]),
  // Sixths
  def('6', 'Major 6', '6', [0, 4, 7, 9]),
  def('m6', 'Minor 6', 'm6', [0, 3, 7, 9]),
  def('69', '6/9', '6/9', [0, 2, 4, 7, 9], { spelling: ['1', '9', '3', '5', '6'] }),
  def('m69', 'Minor 6/9', 'm6/9', [0, 2, 3, 7, 9], { spelling: ['1', '9', '♭3', '5', '6'] }),
  def('6sus4', '6 Sus4', '6sus4', [0, 5, 7, 9]),
  // Sevenths
  def('maj7', 'Major 7', 'maj7', [0, 4, 7, 11], { aliases: ['Δ7'] }),
  def('7', 'Dominant 7', '7', [0, 4, 7, 10], { aliases: ['dom7'] }),
  def('m7', 'Minor 7', 'm7', [0, 3, 7, 10]),
  def('m7b5', 'Minor 7 Flat 5', 'm7♭5', [0, 3, 6, 10], { aliases: ['ø7', 'half-diminished'] }),
  def('dim7', 'Diminished 7', 'dim7', [0, 3, 6, 9], { aliases: ['°7'] }),
  def('mmaj7', 'Minor Major 7', 'mMaj7', [0, 3, 7, 11]),
  def('maj7s5', 'Augmented Major 7', 'maj7♯5', [0, 4, 8, 11]),
  def('7s5', 'Augmented 7', '7♯5', [0, 4, 8, 10]),
  def('7b5', '7 Flat 5', '7♭5', [0, 4, 6, 10]),
  def('maj7b5', 'Major 7 Flat 5', 'maj7♭5', [0, 4, 6, 11]),
  def('m7s5', 'Minor 7 Sharp 5', 'm7♯5', [0, 3, 8, 10]),
  def('dimmaj7', 'Diminished Major 7', 'dimMaj7', [0, 3, 6, 11]),
  def('7sus4', '7 Sus4', '7sus4', [0, 5, 7, 10]),
  def('7sus2', '7 Sus2', '7sus2', [0, 2, 7, 10]),
  def('maj7sus4', 'Major 7 Sus4', 'maj7sus4', [0, 5, 7, 11]),
  // Adds
  def('add9', 'Add 9', 'add9', [0, 2, 4, 7], { spelling: ['1', '9', '3', '5'] }),
  def('madd9', 'Minor Add 9', 'madd9', [0, 2, 3, 7], { spelling: ['1', '9', '♭3', '5'] }),
  def('add11', 'Add 11', 'add11', [0, 4, 5, 7], { spelling: ['1', '3', '11', '5'] }),
  def('madd11', 'Minor Add 11', 'madd11', [0, 3, 5, 7], { spelling: ['1', '♭3', '11', '5'] }),
  def('mb6', 'Minor Flat 6', 'm♭6', [0, 3, 7, 8]),
  // Ninths
  def('maj9', 'Major 9', 'maj9', [0, 2, 4, 7, 11], { spelling: ['1', '9', '3', '5', '7'] }),
  def('9', 'Dominant 9', '9', [0, 2, 4, 7, 10], { spelling: ['1', '9', '3', '5', '♭7'] }),
  def('m9', 'Minor 9', 'm9', [0, 2, 3, 7, 10], { spelling: ['1', '9', '♭3', '5', '♭7'] }),
  def('mmaj9', 'Minor Major 9', 'mMaj9', [0, 2, 3, 7, 11], { spelling: ['1', '9', '♭3', '5', '7'] }),
  def('9sus4', '9 Sus4', '9sus4', [0, 2, 5, 7, 10], { spelling: ['1', '9', '4', '5', '♭7'] }),
  // Elevenths
  def('maj11', 'Major 11', 'maj11', [0, 2, 4, 5, 7, 11], { spelling: ['1', '9', '3', '11', '5', '7'] }),
  def('11', 'Dominant 11', '11', [0, 2, 4, 5, 7, 10], { spelling: ['1', '9', '3', '11', '5', '♭7'] }),
  def('m11', 'Minor 11', 'm11', [0, 2, 3, 5, 7, 10], { spelling: ['1', '9', '♭3', '11', '5', '♭7'] }),
  // Thirteenths
  def('maj13', 'Major 13', 'maj13', [0, 2, 4, 7, 9, 11], { spelling: ['1', '9', '3', '5', '13', '7'] }),
  def('13', 'Dominant 13', '13', [0, 2, 4, 7, 9, 10], { spelling: ['1', '9', '3', '5', '13', '♭7'] }),
  def('m13', 'Minor 13', 'm13', [0, 2, 3, 7, 9, 10], { spelling: ['1', '9', '♭3', '5', '13', '♭7'] }),
  // Altered dominants
  def('7b9', '7 Flat 9', '7♭9', [0, 1, 4, 7, 10], { spelling: ['1', '♭9', '3', '5', '♭7'] }),
  def('7s9', '7 Sharp 9', '7♯9', [0, 3, 4, 7, 10], { spelling: ['1', '♯9', '3', '5', '♭7'] }),
  def('7b9b5', '7 Flat 9 Flat 5', '7♭9♭5', [0, 1, 4, 6, 10], { spelling: ['1', '♭9', '3', '♭5', '♭7'] }),
  def('7b9s5', '7 Flat 9 Sharp 5', '7♭9♯5', [0, 1, 4, 8, 10], { spelling: ['1', '♭9', '3', '♯5', '♭7'] }),
  def('7s9b5', '7 Sharp 9 Flat 5', '7♯9♭5', [0, 3, 4, 6, 10], { spelling: ['1', '♯9', '3', '♭5', '♭7'] }),
  def('7s9s5', '7 Sharp 9 Sharp 5', '7♯9♯5', [0, 3, 4, 8, 10], { spelling: ['1', '♯9', '3', '♯5', '♭7'] }),
  def('7s11', '7 Sharp 11', '7♯11', [0, 4, 6, 7, 10], { spelling: ['1', '3', '♯11', '5', '♭7'] }),
  def('9s11', '9 Sharp 11', '9♯11', [0, 2, 4, 6, 7, 10], { spelling: ['1', '9', '3', '♯11', '5', '♭7'] }),
  def('7b13', '7 Flat 13', '7♭13', [0, 4, 7, 8, 10], { spelling: ['1', '3', '5', '♭13', '♭7'] }),
  def('13b9', '13 Flat 9', '13♭9', [0, 1, 4, 7, 9, 10], { spelling: ['1', '♭9', '3', '5', '13', '♭7'] }),
  def('13s11', '13 Sharp 11', '13♯11', [0, 2, 4, 6, 7, 9, 10], { spelling: ['1', '9', '3', '♯11', '5', '13', '♭7'] }),
  def('maj9s11', 'Major 9 Sharp 11', 'maj9♯11', [0, 2, 4, 6, 7, 11], { spelling: ['1', '9', '3', '♯11', '5', '7'] }),
  def('maj7s11', 'Major 7 Sharp 11', 'maj7♯11', [0, 4, 6, 7, 11], { spelling: ['1', '3', '♯11', '5', '7'] }),
  def('m9b5', 'Minor 9 Flat 5', 'm9♭5', [0, 2, 3, 6, 10], { spelling: ['1', '9', '♭3', '♭5', '♭7'] }),
  def('9b5', '9 Flat 5', '9♭5', [0, 2, 4, 6, 10], { spelling: ['1', '9', '3', '♭5', '♭7'] }),
]

/**
 * degreeSetKey → defs, with user defs shadowing built-ins that share a degree
 * set. Multiple defs may legitimately share a set only transiently (a user
 * shadow replaces, not appends).
 */
export function buildChordIndex(userDefs: readonly ChordDef[] = []): Map<string, ChordDef> {
  const index = new Map<string, ChordDef>()
  for (const d of BUILTIN_CHORD_DEFS) index.set(degreeSetKey(d.degrees), d)
  for (const d of userDefs) index.set(degreeSetKey(d.degrees), d) // shadow
  return index
}

/** Exact degree-set → chord def lookup. Undefined = unnamed (not an error). */
export function lookupChord(
  degrees: readonly PitchClass[],
  index: Map<string, ChordDef>,
): ChordDef | undefined {
  return index.get(degreeSetKey(degrees))
}

/**
 * Rootless lookup: the degree set is missing 0, but adding the root produces
 * a named quality (e.g. {4,7,10} = rootless dominant 7).
 */
export function lookupRootlessChord(
  degrees: readonly PitchClass[],
  index: Map<string, ChordDef>,
): ChordDef | undefined {
  if (degrees.includes(0)) return undefined
  return index.get(degreeSetKey([0, ...degrees]))
}

/** Display: the chord's own spelling when defined, else canonical labels. */
export function chordSpelling(defn: ChordDef): string {
  return defn.spelling ? defn.spelling.join('-') : formatDegrees([...defn.degrees].sort((a, b) => a - b))
}

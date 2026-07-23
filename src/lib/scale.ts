/**
 * Scale boxes.
 *
 * Chord generation asks "enumerate note-sets under geometric constraints";
 * scale fingering asks the opposite: "given a FIXED note-set, enumerate box
 * coverings" — for each alignment of the scale against the fret window, which
 * positions inside the window are scale tones.
 *
 * Modes are not a feature: Dorian is 1-2-♭3-4-5-6-♭7, a degree-set preset in
 * the same library as m7.
 */
import type { PitchClass } from './theory'
import { normalizePc } from './theory'
import { cumGaps } from './voice'

export interface ScalePosition {
  s: number // string index, 0 = lowest
  f: number // fret offset within the window
  pc: PitchClass // degree relative to the scale root
}

export interface ScaleBox {
  /** Degree sounding at (string 0, fret 0). Identifies the alignment. */
  offset: PitchClass
  positions: ScalePosition[]
  /** Does the box contain every degree of the scale? */
  covers: boolean
  /** Deterministic content key (dedupes symmetric scales). */
  key: string
}

export interface ScalePreset {
  id: string
  name: string
  degrees: PitchClass[]
}

export const SCALE_PRESETS: ScalePreset[] = [
  { id: 'major', name: 'Major (Ionian)', degrees: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'dorian', name: 'Dorian', degrees: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygian', degrees: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', degrees: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', degrees: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'aeolian', name: 'Natural Minor (Aeolian)', degrees: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'locrian', name: 'Locrian', degrees: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'majorPent', name: 'Major Pentatonic', degrees: [0, 2, 4, 7, 9] },
  { id: 'minorPent', name: 'Minor Pentatonic', degrees: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', degrees: [0, 3, 5, 6, 7, 10] },
  { id: 'harmonicMinor', name: 'Harmonic Minor', degrees: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodicMinor', name: 'Melodic Minor', degrees: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'wholeTone', name: 'Whole Tone', degrees: [0, 2, 4, 6, 8, 10] },
  { id: 'dimWH', name: 'Diminished (W–H)', degrees: [0, 2, 3, 5, 6, 8, 9, 11] },
  { id: 'chromatic', name: 'Chromatic', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]

/**
 * Enumerate all distinct boxes of a scale in a fret window. One candidate per
 * alignment offset (12 total), deduped by content — symmetric scales (whole
 * tone, diminished, chromatic) collapse hard.
 */
export function scaleBoxes(
  degrees: readonly PitchClass[],
  gapsVec: readonly number[],
  windowFrets: number,
): ScaleBox[] {
  const degreeSet = new Set(degrees.map(normalizePc))
  const cum = cumGaps(gapsVec)
  const stringCount = gapsVec.length + 1
  const seen = new Set<string>()
  const boxes: ScaleBox[] = []

  for (let offset = 0; offset < 12; offset++) {
    const positions: ScalePosition[] = []
    for (let s = 0; s < stringCount; s++) {
      for (let f = 0; f < windowFrets; f++) {
        const pc = normalizePc(offset + (cum[s] as number) + f)
        if (degreeSet.has(pc)) positions.push({ s, f, pc })
      }
    }
    if (positions.length === 0) continue
    const key = positions.map((p) => `${p.s}.${p.f}`).join('-')
    if (seen.has(key)) continue
    seen.add(key)
    const present = new Set(positions.map((p) => p.pc))
    boxes.push({
      offset,
      positions,
      covers: [...degreeSet].every((d) => present.has(d)),
      key,
    })
  }

  // Covering boxes first, then by how low the root sits, then offset.
  return boxes.sort(
    (a, b) => Number(b.covers) - Number(a.covers) || a.offset - b.offset,
  )
}

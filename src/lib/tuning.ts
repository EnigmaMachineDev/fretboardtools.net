/**
 * Tunings.
 *
 * The engine never sees absolute pitch — only the semitone gaps BETWEEN adjacent
 * strings. Two tunings with the same gap vector (EADG and BEAD are both `5,5,5`)
 * define the exact same shape space and produce identical results. `gapKey` is
 * therefore the real identity of a tuning; absolute pitches only matter for
 * display (note names on the diagram).
 */

export interface Tuning {
  id: string // 'builtin:standard4' | uuid for user tunings
  name: string // 'Standard 4', 'BEAD', 'Drop D', 'My 7-string'
  pitches: number[] // MIDI numbers, LOW → HIGH, length 2–9
  builtin?: true
  createdAt: number
  updatedAt: number
}

/** Allowed string counts. */
export const MIN_STRINGS = 2
export const MAX_STRINGS = 9

/** Derived, never stored. */
export const gaps = (t: Tuning): number[] =>
  t.pitches.slice(1).map((p, i) => p - (t.pitches[i] as number))

/** The real identity of a tuning, as far as the engine is concerned. */
export const gapKey = (t: Tuning): string => gaps(t).join(',')

const builtin = (id: string, name: string, pitches: number[]): Tuning => ({
  id: `builtin:${id}`,
  name,
  pitches,
  builtin: true,
  createdAt: 0,
  updatedAt: 0,
})

/**
 * Built-in tunings live in code, never in the store. MIDI: E1 = 28.
 * The Fifths entry is deliberately non-fourths so tests (and users) cover a
 * gap vector other than all-5s.
 */
export const BUILTIN_TUNINGS: Tuning[] = [
  builtin('standard4', 'Standard 4 (EADG)', [28, 33, 38, 43]),
  builtin('standard5', 'Standard 5 (BEADG)', [23, 28, 33, 38, 43]),
  builtin('standard6', 'Standard 6 (BEADGC)', [23, 28, 33, 38, 43, 48]),
  builtin('bead', 'BEAD', [23, 28, 33, 38]),
  builtin('fsharpbea', 'F♯BEA', [18, 23, 28, 33]),
  builtin('tenor', 'Tenor (ADGC)', [33, 38, 43, 48]),
  builtin('dropd', 'Drop D (DADG)', [26, 33, 38, 43]),
  builtin('dropa5', 'Drop A 5 (AEADG)', [21, 28, 33, 38, 43]),
  builtin('fifths', 'Fifths (CGDA)', [24, 31, 38, 45]),
]

/** Look up a built-in tuning by id. */
export function builtinTuning(id: string): Tuning | undefined {
  return BUILTIN_TUNINGS.find((t) => t.id === id)
}

/** Construct a user tuning (validation is the caller's job — see validateTuningPitches). */
export function makeTuning(id: string, name: string, pitches: number[], now = Date.now()): Tuning {
  return { id, name, pitches: [...pitches], createdAt: now, updatedAt: now }
}

/**
 * Every known tuning (built-ins plus any provided user tunings) sharing this
 * tuning's gapKey — its shape-equivalence class, minus itself. Drives the
 * equivalence badge in the UI.
 */
export function equivalentTunings(t: Tuning, userTunings: Tuning[] = []): Tuning[] {
  const key = gapKey(t)
  return [...BUILTIN_TUNINGS, ...userTunings].filter((o) => o.id !== t.id && gapKey(o) === key)
}

/**
 * Validate a pitches array for a user tuning. Returns a human-readable problem,
 * or null when valid: 2–9 integer MIDI pitches (0–127), strictly ascending.
 */
export function validateTuningPitches(pitches: number[]): string | null {
  if (pitches.length < MIN_STRINGS || pitches.length > MAX_STRINGS) {
    return `A tuning needs ${MIN_STRINGS}–${MAX_STRINGS} strings.`
  }
  for (const p of pitches) {
    if (!Number.isInteger(p) || p < 0 || p > 127) {
      return 'Every pitch must be a MIDI number from 0 to 127.'
    }
  }
  for (let i = 1; i < pitches.length; i++) {
    if ((pitches[i] as number) <= (pitches[i - 1] as number)) {
      return 'Pitches must be strictly ascending, low string to high.'
    }
  }
  return null
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

/** 'E1', 'B0', 'G2' — display name for a MIDI pitch. */
export function pitchName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12] as string
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

/** Compact display of a tuning's open strings: 'E1 A1 D2 G2'. */
export function tuningPitchNames(t: Tuning): string {
  return t.pitches.map(pitchName).join(' ')
}

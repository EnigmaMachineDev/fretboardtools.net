/**
 * Candidate shape enumeration.
 *
 * A candidate is a string set (which strings the chord uses) crossed with a
 * fret-offset combination inside the window. Normalization is built into the
 * enumeration: at least one note sits at fret 0, so each shape is emitted
 * exactly once rather than at every offset within the window.
 */

export const MAX_CANDIDATES = 200_000

export interface GenerateInput {
  stringCount: number
  noteCount: [min: number, max: number] // strings the chord actually uses
  windowFrets: number // 1–8
  allowSkips: boolean
  maxSkip: number // max consecutive strings skipped between used strings
  stringSet: number[] | null // pin to specific strings; null = any
}

export interface GeneratedShape {
  stringSet: number[] // ascending string indices
  frets: number[] // fret offsets aligned to stringSet; min is always 0
}

export interface GenerateResult {
  shapes: GeneratedShape[]
  truncated: boolean
  /** When truncated: the constraint whose tightening would shrink the space most. */
  loosestConstraint: 'windowFrets' | 'noteCount' | 'maxSkip' | null
}

/**
 * All ascending string subsets satisfying the size and skip constraints.
 * A pinned set short-circuits everything — the user said exactly these strings.
 */
export function enumerateStringSets(
  stringCount: number,
  minNotes: number,
  maxNotes: number,
  allowSkips: boolean,
  maxSkip: number,
  pinned: number[] | null,
): number[][] {
  if (pinned) {
    const valid =
      pinned.length >= 2 &&
      pinned.every((s) => Number.isInteger(s) && s >= 0 && s < stringCount) &&
      pinned.every((s, i) => i === 0 || s > (pinned[i - 1] as number))
    return valid ? [[...pinned]] : []
  }

  const maxGap = allowSkips ? maxSkip + 1 : 1 // allowed index step between used strings
  const out: number[][] = []
  const walk = (current: number[]) => {
    if (current.length >= minNotes && current.length >= 2) out.push([...current])
    if (current.length >= maxNotes) return
    const last = current[current.length - 1] as number
    for (let next = last + 1; next <= Math.min(last + maxGap, stringCount - 1); next++) {
      current.push(next)
      walk(current)
      current.pop()
    }
  }
  for (let first = 0; first < stringCount; first++) walk([first])
  return out
}

/** Fret combinations for k strings in a w-fret window with ≥1 note at fret 0. */
const fretComboCount = (w: number, k: number): number => Math.pow(w, k) - Math.pow(w - 1, k)

/**
 * Closed-form candidate count — no shape enumeration — so the UI can warn
 * BEFORE generating. (String sets are counted directly; only the fret-combo
 * cross product, which is where the explosion lives, is computed by formula.)
 */
export function estimateCount(input: GenerateInput): number {
  const sets = enumerateStringSets(
    input.stringCount,
    Math.max(2, input.noteCount[0]),
    Math.min(input.stringCount, input.noteCount[1]),
    input.allowSkips,
    input.maxSkip,
    input.stringSet,
  )
  return sets.reduce((sum, set) => sum + fretComboCount(input.windowFrets, set.length), 0)
}

/** Identify the constraint most worth tightening when the space overflows. */
function loosest(input: GenerateInput): GenerateResult['loosestConstraint'] {
  if (input.windowFrets > 4) return 'windowFrets'
  if (input.noteCount[1] >= 5) return 'noteCount'
  if (input.allowSkips && input.maxSkip > 1) return 'maxSkip'
  return 'noteCount'
}

/** Enumerate all candidate shapes, stopping (and flagging) at the cap. */
export function generate(input: GenerateInput, cap: number = MAX_CANDIDATES): GenerateResult {
  const sets = enumerateStringSets(
    input.stringCount,
    Math.max(2, input.noteCount[0]),
    Math.min(input.stringCount, input.noteCount[1]),
    input.allowSkips,
    input.maxSkip,
    input.stringSet,
  )
  const w = input.windowFrets
  const shapes: GeneratedShape[] = []

  for (const set of sets) {
    const k = set.length
    const frets = new Array<number>(k).fill(0)
    // Odometer over w^k, keeping only combos containing at least one 0.
    let hasWork = true
    while (hasWork) {
      if (frets.includes(0)) {
        shapes.push({ stringSet: set, frets: [...frets] })
        if (shapes.length >= cap) {
          return { shapes, truncated: true, loosestConstraint: loosest(input) }
        }
      }
      let i = k - 1
      while (i >= 0 && (frets[i] as number) === w - 1) {
        frets[i] = 0
        i--
      }
      if (i < 0) hasWork = false
      else frets[i] = (frets[i] as number) + 1
    }
  }
  return { shapes, truncated: false, loosestConstraint: null }
}

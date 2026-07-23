/**
 * The fingering solver — a real solver, not a heuristic. Its output is what
 * the fretboard renders.
 *
 * Each note is assigned a finger 1–4 subject to:
 *  - Monotonicity: if fret(a) < fret(b) then finger(a) ≤ finger(b). Equivalent
 *    formulation used here: the finger→fret map is non-decreasing.
 *  - Same finger ⇒ barre: two notes share a finger only on the same fret. A
 *    barre is ILLEGAL if any string strictly between the barred strings
 *    carries a note at a LOWER fret (a higher fret between is fine — another
 *    finger frets it; a muted string between is fine).
 *  - More than 4 distinct frets can never be covered (a finger holds exactly
 *    one fret, barred or not) → Impossible.
 *
 * The best (lowest-cost) valid assignment is scored and returned along with
 * the winning fingering. Difficult and impossible shapes are still generated
 * upstream — the rating is a filter the USER controls, never an engine gate.
 */
import type { Shape, ShapeNote } from './shape'

/** Every tunable constant in one place. Touch these, not the solver. */
export const COST = {
  spanPerFret: 1.5, // × (maxFret - minFret)
  extraBarre: 2.0, // per barre beyond the first
  interiorMute: 1.5, // per muted string inside the string span
  pinkyAtFullSpan: 2.0, // finger 4 required at span ≥ 4
  stretchPenalty: 3.0, // per adjacent finger pair exceeding nominal spacing
} as const

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'veryHard' | 'impossible'

export const DIFFICULTY_LEVEL: Record<Difficulty, 1 | 2 | 3 | 4 | 5> = {
  easy: 1,
  moderate: 2,
  hard: 3,
  veryHard: 4,
  impossible: 5,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  veryHard: 'Very Hard',
  impossible: 'Impossible',
}

/** Ordered easiest → hardest, for filter UIs. */
export const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard', 'veryHard', 'impossible']

/** Band boundaries at 3 / 7 / 12, inclusive on the lower band. */
export function difficultyForScore(score: number): Exclude<Difficulty, 'impossible'> {
  if (score <= 3) return 'easy'
  if (score <= 7) return 'moderate'
  if (score <= 12) return 'hard'
  return 'veryHard'
}

export interface ScoreResult {
  difficulty: Difficulty
  level: 1 | 2 | 3 | 4 | 5
  /** Best cost, or null when no valid assignment exists. */
  score: number | null
  /** Winning finger (1–4) per note, aligned to notes sorted by string. Null when impossible. */
  fingering: number[] | null
}

/** Strings strictly inside the shape's string span that carry no note. */
export function interiorMutedStrings(notes: readonly ShapeNote[]): number[] {
  const used = new Set(notes.map((n) => n.s))
  const min = Math.min(...notes.map((n) => n.s))
  const max = Math.max(...notes.map((n) => n.s))
  const out: number[] = []
  for (let s = min + 1; s < max; s++) if (!used.has(s)) out.push(s)
  return out
}

/**
 * Full legality check for a complete assignment (fingers aligned to notes).
 * Exported for tests; the solver enforces the same rules incrementally.
 */
export function isLegalAssignment(notes: readonly ShapeNote[], fingers: readonly number[]): boolean {
  const fretOfFinger = new Map<number, number>()
  for (let i = 0; i < notes.length; i++) {
    const g = fingers[i] as number
    const f = (notes[i] as ShapeNote).f
    if (g < 1 || g > 4 || !Number.isInteger(g)) return false
    const existing = fretOfFinger.get(g)
    if (existing !== undefined && existing !== f) return false // same finger, two frets
    fretOfFinger.set(g, f)
  }
  // Monotonic finger→fret map.
  const used = [...fretOfFinger.keys()].sort((a, b) => a - b)
  for (let i = 1; i < used.length; i++) {
    const lo = fretOfFinger.get(used[i - 1] as number) as number
    const hi = fretOfFinger.get(used[i] as number) as number
    if (lo > hi) return false
  }
  // Barre legality.
  const fretOfString = new Map<number, number>()
  for (const n of notes) fretOfString.set(n.s, n.f)
  for (const g of used) {
    const barredStrings = notes.filter((_, i) => fingers[i] === g).map((n) => n.s)
    if (barredStrings.length < 2) continue
    const fret = fretOfFinger.get(g) as number
    const minS = Math.min(...barredStrings)
    const maxS = Math.max(...barredStrings)
    for (let s = minS + 1; s < maxS; s++) {
      const noteFret = fretOfString.get(s)
      if (noteFret !== undefined && noteFret < fret) return false // lower fret under the barre
    }
  }
  return true
}

function costOf(notes: readonly ShapeNote[], fingers: readonly number[], muteCount: number): number {
  const frets = notes.map((n) => n.f)
  const span = Math.max(...frets) - Math.min(...frets)
  let cost = COST.spanPerFret * span + COST.interiorMute * muteCount

  const notesPerFinger = new Map<number, number>()
  const fretOfFinger = new Map<number, number>()
  for (let i = 0; i < notes.length; i++) {
    const g = fingers[i] as number
    notesPerFinger.set(g, (notesPerFinger.get(g) ?? 0) + 1)
    fretOfFinger.set(g, (notes[i] as ShapeNote).f)
  }

  const barres = [...notesPerFinger.values()].filter((n) => n >= 2).length
  if (barres > 1) cost += COST.extraBarre * (barres - 1)

  if (notesPerFinger.has(4) && span >= 4) cost += COST.pinkyAtFullSpan

  const used = [...fretOfFinger.keys()].sort((a, b) => a - b)
  for (let i = 1; i < used.length; i++) {
    const gLo = used[i - 1] as number
    const gHi = used[i] as number
    const df = (fretOfFinger.get(gHi) as number) - (fretOfFinger.get(gLo) as number)
    if (df > gHi - gLo) cost += COST.stretchPenalty
  }
  return cost
}

/** Memo: identical fret/mute patterns recur constantly across string sets. */
const cache = new Map<string, ScoreResult>()
const CACHE_LIMIT = 100_000

const IMPOSSIBLE: ScoreResult = {
  difficulty: 'impossible',
  level: 5,
  score: null,
  fingering: null,
}

/**
 * Score a normalized shape: best valid finger assignment, its cost, and the
 * difficulty band. Brute-force over ≤4^k assignments with incremental pruning;
 * the distinct-fret early reject fires long before k matters in practice.
 */
export function scoreShape(shape: Shape): ScoreResult {
  const notes = shape.notes
  const mutes = interiorMutedStrings(notes)
  const key = `${notes.map((n) => `${n.s}.${n.f}`).join('-')}|m${mutes.join('.')}`
  const cached = cache.get(key)
  if (cached) return cached

  const distinctFrets = new Set(notes.map((n) => n.f)).size
  let result: ScoreResult
  if (distinctFrets > 4) {
    result = IMPOSSIBLE // a finger holds one fret; no barre reduces distinct frets
  } else {
    // Process notes sorted by fret so the monotonic map can prune early.
    const order = notes
      .map((_, i) => i)
      .sort((a, b) => (notes[a] as ShapeNote).f - (notes[b] as ShapeNote).f || (notes[a] as ShapeNote).s - (notes[b] as ShapeNote).s)
    const fingers = new Array<number>(notes.length).fill(0)
    let best: number[] | null = null
    let bestCost = Infinity

    const fretOfFinger = new Map<number, number>()
    const walk = (idx: number) => {
      if (idx === order.length) {
        if (!isLegalAssignment(notes, fingers)) return // final barre legality
        const cost = costOf(notes, fingers, mutes.length)
        if (cost < bestCost) {
          bestCost = cost
          best = [...fingers]
        }
        return
      }
      const noteIdx = order[idx] as number
      const fret = (notes[noteIdx] as ShapeNote).f
      for (let g = 1; g <= 4; g++) {
        const existing = fretOfFinger.get(g)
        if (existing !== undefined && existing !== fret) continue // finger already on another fret
        // Monotonic prune: no lower finger may sit on a higher fret, and vice versa.
        let ok = true
        for (const [og, of] of fretOfFinger) {
          if ((og < g && of > fret) || (og > g && of < fret)) {
            ok = false
            break
          }
        }
        if (!ok) continue
        const had = existing !== undefined
        fretOfFinger.set(g, fret)
        fingers[noteIdx] = g
        walk(idx + 1)
        if (!had) fretOfFinger.delete(g)
      }
    }
    walk(0)

    if (best === null) {
      result = IMPOSSIBLE
    } else {
      const difficulty = difficultyForScore(bestCost)
      result = {
        difficulty,
        level: DIFFICULTY_LEVEL[difficulty],
        score: bestCost,
        fingering: best,
      }
    }
  }

  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, result)
  return result
}

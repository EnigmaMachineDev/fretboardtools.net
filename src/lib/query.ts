/**
 * The Query object and its URL codec.
 *
 * Query state lives in the URL, NOT the store — every result set is shareable
 * and stateless. Encoding uses short, stable, hand-editable keys:
 *
 *   /?t=builtin:standard4&n=3-4&w=4&sk=1&d=0,3,7&ord=0&ex=1&md=3&rl=0&sort=play
 *
 * `parseQuery` is TOTAL: unknown or garbage values fall back to the default
 * for that field rather than throwing. A shared link never renders an error.
 */
import type { PitchClass } from './theory'
import type { DegreeQuery } from './match'
import { DIFFICULTIES, DIFFICULTY_LEVEL, type Difficulty } from './score'
import { MAX_STRINGS, MIN_STRINGS } from './tuning'

export interface Query {
  tuningId: string
  noteCount: [min: number, max: number] // strings the chord actually uses
  windowFrets: number // 1–8
  allowSkips: boolean
  maxSkip: number // max consecutive strings skipped
  stringSet: number[] | null // pin to specific strings; null = any
  degrees: DegreeQuery | null // null = no degree constraint
  maxDifficulty: Difficulty | null // null = no filter (includes Impossible)
  includeRootless: boolean
  sort: 'playability' | 'span' | 'quality'
}

export const MIN_WINDOW = 1
export const MAX_WINDOW = 8
export const MAX_SKIP_LIMIT = MAX_STRINGS - 2

/** The front-door defaults: playable-only, set-match, root required. */
export const DEFAULT_QUERY: Query = {
  tuningId: 'builtin:standard4',
  noteCount: [3, 4],
  windowFrets: 4, // one finger per fret
  allowSkips: true,
  maxSkip: 1,
  stringSet: null,
  degrees: null, // ordered: false by default → all inversions come back together
  maxDifficulty: 'hard', // playable-only by default
  includeRootless: false,
  sort: 'playability',
}

const SORT_CODES: Record<Query['sort'], string> = {
  playability: 'play',
  span: 'span',
  quality: 'qual',
}

const clampInt = (raw: string | null, min: number, max: number, fallback: number): number => {
  if (raw === null) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

const parseBool = (raw: string | null, fallback: boolean): boolean =>
  raw === '1' ? true : raw === '0' ? false : fallback

/** Serialize a query to a URLSearchParams string (all fields, stable order). */
export function encodeQuery(q: Query): string {
  const p = new URLSearchParams()
  p.set('t', q.tuningId)
  p.set('n', `${q.noteCount[0]}-${q.noteCount[1]}`)
  p.set('w', String(q.windowFrets))
  p.set('sk', String(q.allowSkips ? q.maxSkip : 0))
  if (q.stringSet) p.set('ss', q.stringSet.join(','))
  if (q.degrees) {
    p.set('d', q.degrees.degrees.join(','))
    p.set('ord', q.degrees.ordered ? '1' : '0')
    p.set('ex', q.degrees.exact ? '1' : '0')
  }
  p.set('md', String(q.maxDifficulty === null ? 0 : DIFFICULTY_LEVEL[q.maxDifficulty]))
  p.set('rl', q.includeRootless ? '1' : '0')
  p.set('sort', SORT_CODES[q.sort])
  return p.toString()
}

/**
 * Parse a query from search params. Total: every malformed, missing, or
 * out-of-range value independently falls back to its default.
 */
export function parseQuery(params: URLSearchParams): Query {
  const q: Query = { ...DEFAULT_QUERY, noteCount: [...DEFAULT_QUERY.noteCount] }

  const t = params.get('t')
  if (t && t.length <= 128) q.tuningId = t

  const n = params.get('n')
  if (n) {
    const m = /^(\d+)-(\d+)$/.exec(n)
    if (m) {
      let lo = clampInt(m[1] ?? null, MIN_STRINGS, MAX_STRINGS, DEFAULT_QUERY.noteCount[0])
      let hi = clampInt(m[2] ?? null, MIN_STRINGS, MAX_STRINGS, DEFAULT_QUERY.noteCount[1])
      if (lo > hi) [lo, hi] = [hi, lo]
      q.noteCount = [lo, hi]
    }
  }

  q.windowFrets = clampInt(params.get('w'), MIN_WINDOW, MAX_WINDOW, DEFAULT_QUERY.windowFrets)

  const sk = params.get('sk')
  if (sk !== null) {
    const v = Number(sk)
    if (Number.isInteger(v) && v >= 0) {
      q.allowSkips = v > 0
      q.maxSkip = Math.min(MAX_SKIP_LIMIT, v)
    }
  }

  const ss = params.get('ss')
  if (ss) {
    const parts = ss.split(',').map(Number)
    const valid =
      parts.length >= 2 &&
      parts.every((s) => Number.isInteger(s) && s >= 0 && s < MAX_STRINGS) &&
      parts.every((s, i) => i === 0 || s > (parts[i - 1] as number))
    if (valid) q.stringSet = parts
  }

  const d = params.get('d')
  if (d) {
    const seen = new Set<PitchClass>()
    const degrees: PitchClass[] = []
    let ok = true
    for (const part of d.split(',')) {
      const v = Number(part)
      if (!Number.isInteger(v) || v < 0 || v > 11) {
        ok = false
        break
      }
      if (!seen.has(v)) {
        seen.add(v)
        degrees.push(v)
      }
    }
    if (ok && degrees.length > 0) {
      q.degrees = {
        degrees,
        ordered: parseBool(params.get('ord'), false),
        exact: parseBool(params.get('ex'), true),
      }
    }
  }

  const md = params.get('md')
  if (md !== null) {
    const v = Number(md)
    if (v === 0) q.maxDifficulty = null
    else if (Number.isInteger(v) && v >= 1 && v <= 5) {
      q.maxDifficulty = DIFFICULTIES[v - 1] as Difficulty
    }
  }

  q.includeRootless = parseBool(params.get('rl'), DEFAULT_QUERY.includeRootless)

  const sort = params.get('sort')
  const sortEntry = (Object.entries(SORT_CODES) as [Query['sort'], string][]).find(
    ([, code]) => code === sort,
  )
  if (sortEntry) q.sort = sortEntry[0]

  return q
}

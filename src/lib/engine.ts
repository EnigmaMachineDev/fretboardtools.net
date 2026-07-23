/**
 * Pipeline composition:
 *
 *   Query → generate() → voice() → analyze()/match() → score() → group()
 *
 * Pure; the UI calls runQuery and renders. Nothing here is ever stored.
 */
import { generate, type GenerateResult } from './generate'
import { normalizeShape } from './shape'
import { voice } from './voice'
import { degreesFor, interpret } from './analyze'
import { matchesDegreeQuery } from './match'
import { scoreShape, DIFFICULTY_LEVEL } from './score'
import { buildChordIndex, type ChordDef } from './naming'
import { normalizePc } from './theory'
import { gaps, type Tuning } from './tuning'
import type { Query } from './query'
import { groupResults, type QualityGroup, type VoicingResult } from './group'

export interface RunResult {
  groups: QualityGroup[]
  /** Total rows surviving the degree match, before the difficulty filter. */
  totalMatched: number
  /** Rows hidden by the difficulty filter. */
  filteredOut: number
  truncated: boolean
  loosestConstraint: GenerateResult['loosestConstraint']
}

/** Execute a query against a tuning. Pure and synchronous. */
export function runQuery(query: Query, tuning: Tuning, userChordDefs: readonly ChordDef[] = []): RunResult {
  const gapsVec = gaps(tuning)
  const chordIndex = buildChordIndex(userChordDefs)
  const { shapes, truncated, loosestConstraint } = generate({
    stringCount: tuning.pitches.length,
    noteCount: query.noteCount,
    windowFrets: query.windowFrets,
    allowSkips: query.allowSkips,
    maxSkip: query.maxSkip,
    stringSet: query.stringSet,
  })

  const results: VoicingResult[] = []
  let totalMatched = 0
  let filteredOut = 0
  const maxLevel = query.maxDifficulty === null ? 5 : DIFFICULTY_LEVEL[query.maxDifficulty]

  for (const g of shapes) {
    const shape = normalizeShape(g.stringSet.map((s, i) => ({ s, f: g.frets[i] as number })))
    const voicing = voice(shape.notes, gapsVec)

    // One result row per matching interpretation of the shape.
    if (query.degrees) {
      const dq = query.degrees
      const candidates = query.includeRootless
        ? Array.from({ length: 12 }, (_, i) => i)
        : [...new Set(voicing.map((v) => normalizePc(v)))]
      for (const rootPc of candidates) {
        if (!matchesDegreeQuery(voicing, rootPc, dq)) continue
        totalMatched++
        const score = scoreShape(shape)
        if (score.level > maxLevel) {
          filteredOut++
          continue
        }
        const degrees = degreesFor(voicing, rootPc)
        const interps = interpret(voicing, chordIndex, query.includeRootless)
        const interp = interps.find((i) => i.rootPc === rootPc)
        const row: VoicingResult = { shape, voicing, rootPc, degrees, score }
        if (interp?.chord) row.chord = interp.chord
        if (interp?.rootless) row.rootless = interp.rootless
        results.push(row)
      }
    } else {
      // No degree constraint: present the shape under its best interpretation.
      totalMatched++
      const score = scoreShape(shape)
      if (score.level > maxLevel) {
        filteredOut++
        continue
      }
      const interp = interpret(voicing, chordIndex, query.includeRootless)[0]
      if (!interp) continue
      const row: VoicingResult = {
        shape,
        voicing,
        rootPc: interp.rootPc,
        degrees: interp.degrees,
        score,
      }
      if (interp.chord) row.chord = interp.chord
      if (interp.rootless) row.rootless = interp.rootless
      results.push(row)
    }
  }

  return {
    groups: groupResults(results, query.sort),
    totalMatched,
    filteredOut,
    truncated,
    loosestConstraint,
  }
}

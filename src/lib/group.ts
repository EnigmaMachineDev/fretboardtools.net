/**
 * Result grouping:
 *
 *   quality (the degree set, e.g. 1-♭3-5)
 *     → voicing (actual bottom-up pitches — inversions/spreads are distinct)
 *       → shape (the string set + fret offsets realizing that voicing)
 *
 * Different shapes of one voicing are fingering variants. Different voicings
 * of one quality are musically distinct. Group keys are derived,
 * deterministic strings — stable across runs.
 */
import type { PitchClass } from './theory'
import type { Shape } from './shape'
import type { ChordDef } from './naming'
import type { ScoreResult } from './score'

/** One fully-derived result row: a shape with its interpretation and rating. */
export interface VoicingResult {
  shape: Shape
  voicing: number[]
  rootPc: PitchClass // relative to the lowest sounding note
  degrees: PitchClass[] // sorted unique, relative to rootPc
  chord?: ChordDef
  rootless?: boolean
  score: ScoreResult
}

export interface VoicingGroup {
  voicingKey: string
  voicing: number[]
  /** Fingering variants of this voicing, best (lowest cost) first. */
  shapes: VoicingResult[]
  best: VoicingResult
}

export interface QualityGroup {
  qualityKey: string
  degrees: PitchClass[]
  chord?: ChordDef
  rootless?: boolean
  voicings: VoicingGroup[]
  /** Total shapes under this quality. */
  count: number
}

export type SortMode = 'playability' | 'span' | 'quality'

export const qualityKeyOf = (r: VoicingResult): string => r.degrees.join(',')
export const voicingKeyOf = (r: VoicingResult): string =>
  `${qualityKeyOf(r)}|${r.voicing.join(',')}|r${r.rootPc}`

const spanOf = (shape: Shape): number => Math.max(...shape.notes.map((n) => n.f))

/** Impossible shapes sort after everything scoreable. */
const sortScore = (r: VoicingResult): number => r.score.score ?? Infinity

function compareResults(a: VoicingResult, b: VoicingResult, mode: SortMode): number {
  if (mode === 'span') {
    return spanOf(a.shape) - spanOf(b.shape) || sortScore(a) - sortScore(b)
  }
  // 'playability' and 'quality' both order members by cost.
  return sortScore(a) - sortScore(b) || spanOf(a.shape) - spanOf(b.shape)
}

function compareGroups(a: QualityGroup, b: QualityGroup, mode: SortMode): number {
  if (mode === 'quality') {
    // Named before unnamed, then smaller degree sets, then key for stability.
    return (
      Number(!!b.chord) - Number(!!a.chord) ||
      a.degrees.length - b.degrees.length ||
      a.qualityKey.localeCompare(b.qualityKey)
    )
  }
  const bestOf = (g: QualityGroup) =>
    Math.min(...g.voicings.map((v) => sortScore(v.best)))
  return bestOf(a) - bestOf(b) || a.qualityKey.localeCompare(b.qualityKey)
}

/** Build the quality → voicing → shape hierarchy. Pure and deterministic. */
export function groupResults(results: readonly VoicingResult[], mode: SortMode = 'playability'): QualityGroup[] {
  const qualities = new Map<string, Map<string, VoicingResult[]>>()
  const meta = new Map<string, VoicingResult>()

  for (const r of results) {
    const qk = qualityKeyOf(r)
    const vk = voicingKeyOf(r)
    let voicings = qualities.get(qk)
    if (!voicings) {
      voicings = new Map()
      qualities.set(qk, voicings)
      meta.set(qk, r)
    }
    const list = voicings.get(vk)
    if (list) list.push(r)
    else voicings.set(vk, [r])
  }

  const groups: QualityGroup[] = []
  for (const [qk, voicingMap] of qualities) {
    const sample = meta.get(qk) as VoicingResult
    const voicings: VoicingGroup[] = []
    for (const [vk, shapes] of voicingMap) {
      const sorted = [...shapes].sort((a, b) => compareResults(a, b, mode))
      voicings.push({
        voicingKey: vk,
        voicing: (sorted[0] as VoicingResult).voicing,
        shapes: sorted,
        best: sorted[0] as VoicingResult,
      })
    }
    voicings.sort(
      (a, b) => compareResults(a.best, b.best, mode) || a.voicingKey.localeCompare(b.voicingKey),
    )
    const group: QualityGroup = {
      qualityKey: qk,
      degrees: sample.degrees,
      voicings,
      count: voicings.reduce((n, v) => n + v.shapes.length, 0),
    }
    if (sample.chord) group.chord = sample.chord
    if (sample.rootless) group.rootless = sample.rootless
    groups.push(group)
  }
  return groups.sort((a, b) => compareGroups(a, b, mode))
}

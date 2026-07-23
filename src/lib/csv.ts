/**
 * CSV export of the results table (RFC 4180 escaping). Exports the CURRENT
 * filtered, sorted result set — never the whole space.
 */
import type { VoicingResult } from './group'
import { DIFFICULTY_LABEL, DIFFICULTY_LEVEL } from './score'
import { degreeLabel, formatDegrees } from './theory'
import type { Tuning } from './tuning'
import { gapKey } from './tuning'

/** Quote a field when it contains a comma, quote, or newline. */
export function csvEscape(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/** Join a header and rows into CRLF-terminated CSV text. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','))
  return lines.join('\r\n')
}

/** Stable column set — changing this breaks downstream spreadsheets. */
export const RESULTS_CSV_HEADER = [
  'tuning',
  'gap_key',
  'strings',
  'shape',
  'root_degree',
  'degrees',
  'chord_name',
  'voicing_intervals',
  'span_frets',
  'difficulty',
  'difficulty_label',
  'fingering',
] as const

/** Flatten result rows (already filtered + sorted by the caller) to CSV. */
export function resultsToCsv(results: readonly VoicingResult[], tuning: Tuning): string {
  const key = gapKey(tuning)
  const rows = results.map((r) => {
    const strings = r.shape.notes.map((n) => n.s)
    return [
      tuning.name,
      key,
      strings.join('+'),
      r.shape.notes.map((n) => `${n.s}.${n.f}`).join('-'),
      // Degree of the lowest sounding note relative to the root ('1' = root
      // position, '♭3' = first inversion, …).
      degreeLabel(((0 - r.rootPc) % 12 + 12) % 12),
      formatDegrees(r.degrees),
      r.chord ? `${r.chord.name}${r.rootless ? ' (rootless)' : ''}` : '',
      r.voicing.join(','),
      String(Math.max(...r.shape.notes.map((n) => n.f))),
      String(r.score.score === null ? DIFFICULTY_LEVEL[r.score.difficulty] : r.score.score),
      DIFFICULTY_LABEL[r.score.difficulty],
      r.score.fingering ? r.score.fingering.join('') : '',
    ]
  })
  return toCsv(RESULTS_CSV_HEADER, rows)
}

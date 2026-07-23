/**
 * Persistence: localStorage sync, versioned migration, GC, and the
 * import/export envelope.
 *
 * - `migrate` is idempotent and runs on LOAD and on IMPORT.
 * - Import is validate → migrate → REPLACE-ONLY. Never merge. Any structural
 *   failure rejects the whole import with a specific message.
 * - GC rules (§ run on every save):
 *   1. Two-way reconcile every id array against its record.
 *   2. Saved queries with unresolvable tuningIds are dropped here; remapping
 *      to a gapKey-equivalent built-in happens at DELETE time (removeTuning),
 *      while the gap vector is still known.
 *   3. Favorites cannot orphan by construction (keyed by gapKey); label hints
 *      are refreshed on load only if they no longer resolve.
 *   4. Unresolvable prefs.defaultTuningId resets to builtin:standard4.
 *   5. Deleting a tuning that saved queries reference warns first — the UI
 *      uses savedQueryCountForTuning before calling removeTuning.
 */
import { SCHEMA_VERSION, SITE_NAME, STORAGE_KEY } from '../config/site'
import type { AppData, Prefs, SavedQuery } from '../store/types'
import {
  BUILTIN_TUNINGS,
  builtinTuning,
  gapKey,
  validateTuningPitches,
  type Tuning,
} from './tuning'
import type { ChordDef } from './naming'
import type { Favorite } from './shape'
import { DEFAULT_QUERY, parseQuery, encodeQuery } from './query'

export const EXPORT_KIND = 'fretboardtools.export'

export function defaultPrefs(): Prefs {
  return {
    leftHanded: false,
    defaultTuningId: 'builtin:standard4',
    showEquivalenceBadge: true,
  }
}

export function defaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    tunings: {},
    tuningIds: [],
    chordDefs: {},
    chordDefIds: [],
    favorites: {},
    favoriteKeys: [],
    savedQueries: {},
    savedQueryIds: [],
    prefs: defaultPrefs(),
  }
}

// ── GC ──────────────────────────────────────────────────────────

/** Rule 1: drop ids without records; append records missing from the array (by createdAt). */
function reconcile<T>(
  record: Record<string, T & { createdAt?: number }>,
  ids: string[],
): string[] {
  const kept = ids.filter((id, i) => record[id] !== undefined && ids.indexOf(id) === i)
  const missing = Object.keys(record)
    .filter((id) => !kept.includes(id))
    .sort((a, b) => ((record[a]?.createdAt ?? 0) - (record[b]?.createdAt ?? 0)) || a.localeCompare(b))
  return [...kept, ...missing]
}

/** Does a tuningId resolve against built-ins or stored tunings? */
function tuningResolves(data: AppData, id: string): boolean {
  return builtinTuning(id) !== undefined || data.tunings[id] !== undefined
}

/** All GC rules that need no external knowledge. Run on every save. */
export function gcData(input: AppData): AppData {
  const data: AppData = { ...input }
  data.tuningIds = reconcile(data.tunings, input.tuningIds)
  data.chordDefIds = reconcile(data.chordDefs, input.chordDefIds)
  data.favoriteKeys = reconcile(data.favorites, input.favoriteKeys)
  data.savedQueryIds = reconcile(data.savedQueries, input.savedQueryIds)

  // Rule 2 (residual): saved queries pointing at tunings that no longer exist
  // anywhere. Remap-by-gapKey already happened at delete time; anything still
  // unresolvable here has no recoverable gap vector — drop it.
  const dropped = data.savedQueryIds.filter(
    (id) => !tuningResolves(data, (data.savedQueries[id] as SavedQuery).query.tuningId),
  )
  if (dropped.length > 0) {
    data.savedQueries = { ...data.savedQueries }
    for (const id of dropped) delete data.savedQueries[id]
    data.savedQueryIds = data.savedQueryIds.filter((id) => !dropped.includes(id))
  }

  // Rule 4.
  if (!tuningResolves(data, data.prefs.defaultTuningId)) {
    data.prefs = { ...data.prefs, defaultTuningId: 'builtin:standard4' }
  }
  return data
}

/** Rule 3: refresh favorite label hints that no longer resolve. Run on load. */
export function refreshFavoriteLabels(input: AppData): AppData {
  const known = [...BUILTIN_TUNINGS, ...Object.values(input.tunings)]
  let changed = false
  const favorites: Record<string, Favorite> = { ...input.favorites }
  for (const key of input.favoriteKeys) {
    const fav = favorites[key]
    if (!fav) continue
    if (known.some((t) => t.name === fav.ref.tuningLabelHint)) continue
    const equivalent = known.find((t) => gapKey(t) === fav.ref.gapKey)
    favorites[key] = {
      ...fav,
      ref: { ...fav.ref, tuningLabelHint: equivalent?.name ?? fav.ref.gapKey },
    }
    changed = true
  }
  return changed ? { ...input, favorites } : input
}

/** Rule 5 support: how many saved queries reference this tuning? The UI warns first. */
export function savedQueryCountForTuning(data: AppData, tuningId: string): number {
  return data.savedQueryIds.filter(
    (id) => data.savedQueries[id]?.query.tuningId === tuningId,
  ).length
}

/**
 * Rule 2 (at delete time, gap vector still known): remove a tuning, remapping
 * saved queries to a gapKey-equivalent built-in when one exists; queries with
 * no equivalent are dropped.
 */
export function removeTuning(input: AppData, tuningId: string): AppData {
  const removed = input.tunings[tuningId]
  const data: AppData = { ...input, tunings: { ...input.tunings } }
  delete data.tunings[tuningId]
  data.tuningIds = data.tuningIds.filter((id) => id !== tuningId)

  if (removed) {
    const equivalent = BUILTIN_TUNINGS.find((t) => gapKey(t) === gapKey(removed))
    data.savedQueries = { ...data.savedQueries }
    for (const id of data.savedQueryIds) {
      const sq = data.savedQueries[id]
      if (sq && sq.query.tuningId === tuningId) {
        if (equivalent) {
          data.savedQueries[id] = { ...sq, query: { ...sq.query, tuningId: equivalent.id } }
        } else {
          delete data.savedQueries[id]
        }
      }
    }
    data.savedQueryIds = data.savedQueryIds.filter((id) => data.savedQueries[id] !== undefined)
  }
  return gcData(data)
}

// ── Migration ───────────────────────────────────────────────────

/**
 * Total and idempotent. At v1 it is an identity function with a version
 * check — it exists so v2 has somewhere to land. Runs on load AND on import.
 */
export function migrate(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) return defaultAppData()
  const data = raw as Partial<AppData>
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) {
    return defaultAppData()
  }
  // v1 → v1: identity. Future migrations chain here, lowest version first.
  const base = defaultAppData()
  const merged: AppData = {
    schemaVersion: SCHEMA_VERSION,
    tunings: data.tunings ?? base.tunings,
    tuningIds: data.tuningIds ?? base.tuningIds,
    chordDefs: data.chordDefs ?? base.chordDefs,
    chordDefIds: data.chordDefIds ?? base.chordDefIds,
    favorites: data.favorites ?? base.favorites,
    favoriteKeys: data.favoriteKeys ?? base.favoriteKeys,
    savedQueries: data.savedQueries ?? base.savedQueries,
    savedQueryIds: data.savedQueryIds ?? base.savedQueryIds,
    prefs: { ...base.prefs, ...(data.prefs ?? {}) },
  }
  return refreshFavoriteLabels(gcData(merged))
}

// ── Import / export envelope ────────────────────────────────────

export interface ExportEnvelope {
  app: string
  kind: string
  schemaVersion: number
  exportedAt: string
  data: AppData
}

export function exportEnvelope(data: AppData, now = new Date()): string {
  const envelope: ExportEnvelope = {
    app: SITE_NAME,
    kind: EXPORT_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  }
  return JSON.stringify(envelope, null, 2)
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Structural validation of AppData. Returns a specific problem or null. */
export function validateAppData(raw: unknown): string | null {
  if (!isRecord(raw)) return 'data is not an object.'
  const d = raw as Partial<AppData>

  const pairs: [string, unknown, unknown][] = [
    ['tunings', d.tunings, d.tuningIds],
    ['chordDefs', d.chordDefs, d.chordDefIds],
    ['favorites', d.favorites, d.favoriteKeys],
    ['savedQueries', d.savedQueries, d.savedQueryIds],
  ]
  for (const [name, record, ids] of pairs) {
    if (!isRecord(record)) return `${name} is not a record.`
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return `${name} id array is malformed.`
    }
    for (const id of ids as string[]) {
      if ((record as Record<string, unknown>)[id] === undefined) {
        return `${name} id "${id}" has no record.`
      }
    }
  }

  for (const [key, value] of Object.entries(d.tunings as Record<string, unknown>)) {
    if (!isRecord(value)) return `tuning "${key}" is not an object.`
    const t = value as Partial<Tuning>
    if (t.id !== key) return `tuning "${key}" id does not match its key.`
    if (typeof t.name !== 'string' || !t.name) return `tuning "${key}" has no name.`
    if (!Array.isArray(t.pitches)) return `tuning "${key}" has no pitches array.`
    const problem = validateTuningPitches(t.pitches as number[])
    if (problem) return `tuning "${key}": ${problem}`
  }

  for (const [key, value] of Object.entries(d.chordDefs as Record<string, unknown>)) {
    if (!isRecord(value)) return `chord def "${key}" is not an object.`
    const c = value as Partial<ChordDef>
    if (c.id !== key) return `chord def "${key}" id does not match its key.`
    if (typeof c.name !== 'string' || !c.name) return `chord def "${key}" has no name.`
    if (
      !Array.isArray(c.degrees) ||
      c.degrees.length === 0 ||
      c.degrees.some((pc) => !Number.isInteger(pc) || pc < 0 || pc > 11) ||
      new Set(c.degrees).size !== c.degrees.length
    ) {
      return `chord def "${key}" degrees must be unique integers 0–11.`
    }
  }

  for (const [key, value] of Object.entries(d.favorites as Record<string, unknown>)) {
    if (!isRecord(value) || !isRecord((value as unknown as Favorite).ref)) {
      return `favorite "${key}" is malformed.`
    }
    const ref = (value as unknown as Favorite).ref
    if (typeof ref.gapKey !== 'string' || !Array.isArray(ref.notes)) {
      return `favorite "${key}" ref is malformed.`
    }
  }

  if (!isRecord(d.prefs)) return 'prefs is missing.'
  const p = d.prefs as Partial<Prefs>
  if (typeof p.leftHanded !== 'boolean') return 'prefs.leftHanded must be a boolean.'
  if (typeof p.defaultTuningId !== 'string') return 'prefs.defaultTuningId must be a string.'
  if (typeof p.showEquivalenceBadge !== 'boolean') {
    return 'prefs.showEquivalenceBadge must be a boolean.'
  }

  // Saved queries: re-parse through the total codec so imported queries can
  // never carry out-of-range values into the engine.
  for (const [key, value] of Object.entries(d.savedQueries as Record<string, unknown>)) {
    if (!isRecord(value)) return `saved query "${key}" is not an object.`
    const sq = value as Partial<SavedQuery>
    if (sq.id !== key) return `saved query "${key}" id does not match its key.`
    if (typeof sq.name !== 'string' || !isRecord(sq.query)) {
      return `saved query "${key}" is malformed.`
    }
  }
  return null
}

/** Validate → migrate → (caller replaces). Rejects with a specific message. */
export function validateImport(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Not valid JSON.' }
  }
  if (!isRecord(parsed)) return { ok: false, error: 'Not a FretboardTools export.' }
  const env = parsed as Partial<ExportEnvelope>
  if (env.app !== SITE_NAME || env.kind !== EXPORT_KIND) {
    return { ok: false, error: 'Not a FretboardTools export.' }
  }
  if (!Number.isInteger(env.schemaVersion)) {
    return { ok: false, error: 'Export is missing a valid schemaVersion.' }
  }
  if ((env.schemaVersion as number) > SCHEMA_VERSION) {
    return { ok: false, error: 'This file was exported from a newer version of FretboardTools.' }
  }
  const structural = validateAppData(env.data)
  if (structural) return { ok: false, error: `Invalid export: ${structural}` }

  const migrated = migrate({ ...(env.data as AppData), schemaVersion: env.schemaVersion as number })
  // Normalize saved queries through the total codec (defense in depth).
  for (const id of migrated.savedQueryIds) {
    const sq = migrated.savedQueries[id] as SavedQuery
    const roundTripped = parseQuery(new URLSearchParams(encodeQuery({ ...DEFAULT_QUERY, ...sq.query })))
    migrated.savedQueries[id] = { ...sq, query: roundTripped }
  }
  return { ok: true, data: gcData(migrated) }
}

// ── localStorage sync ───────────────────────────────────────────

/** Load and normalize persisted state. Always returns valid AppData. */
export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return migrate(raw ? JSON.parse(raw) : null)
  } catch {
    return migrate(null)
  }
}

/** Persist immediately (GC first). Swallows quota errors. */
export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gcData(data)))
  } catch {
    // Storage full or unavailable — nothing actionable here.
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

/** Debounced persist, to coalesce bursts of state changes. */
export function saveAppDataDebounced(data: AppData, delayMs = 300): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveAppData(data), delayMs)
}

/** Wipe persisted state. */
export function clearAppData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

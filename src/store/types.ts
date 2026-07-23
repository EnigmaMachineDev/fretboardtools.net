/**
 * Durable state. ONLY user-created entities are persisted — built-in tunings
 * and chord defs live in code and are merged in at read time, never written
 * to localStorage.
 *
 * Data is normalized: entities in Record<id, T> dictionaries referenced by
 * ordered id arrays. Orphans are GC'd on save (src/lib/persist.ts).
 */
import type { Tuning } from '../lib/tuning'
import type { ChordDef } from '../lib/naming'
import type { Favorite, ShapeKey } from '../lib/shape'
import type { Query } from '../lib/query'
import type { SCHEMA_VERSION } from '../config/site'

export interface Prefs {
  leftHanded: boolean // pure mirror at render time — never touches the model
  defaultTuningId: string
  showEquivalenceBadge: boolean
}

export interface SavedQuery {
  id: string
  name: string
  query: Query
  createdAt: number
}

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION
  tunings: Record<string, Tuning>
  tuningIds: string[]
  chordDefs: Record<string, ChordDef>
  chordDefIds: string[]
  favorites: Record<ShapeKey, Favorite>
  favoriteKeys: ShapeKey[]
  savedQueries: Record<string, SavedQuery>
  savedQueryIds: string[]
  prefs: Prefs
}

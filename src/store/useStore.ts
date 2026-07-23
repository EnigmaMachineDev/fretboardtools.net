/**
 * Single typed Zustand store, backed by the localStorage sync layer under
 * `fretboardtools:appData:v1` with debounced writes.
 *
 * The store holds ONLY user-created entities (tunings, chord defs, favorites,
 * saved queries) plus prefs. Query state lives in the URL, and everything the
 * engine derives is computed on demand — never stored.
 */
import { create } from 'zustand'
import type { AppData, Prefs, SavedQuery } from './types'
import {
  defaultAppData,
  loadAppData,
  removeTuning,
  saveAppDataDebounced,
  savedQueryCountForTuning,
} from '../lib/persist'
import { newId } from '../lib/id'
import { BUILTIN_TUNINGS, makeTuning, type Tuning } from '../lib/tuning'
import type { ChordDef } from '../lib/naming'
import { shapeKey, type Favorite, type ShapeRef } from '../lib/shape'
import type { Query } from '../lib/query'

interface StoreState {
  data: AppData

  // ── Tunings ─────────────────────────────────────────────────
  addTuning: (name: string, pitches: number[]) => string
  updateTuning: (id: string, patch: Partial<Pick<Tuning, 'name' | 'pitches'>>) => void
  /** Rule 5: the UI shows this count in a confirm before deleting. */
  savedQueryCount: (tuningId: string) => number
  deleteTuning: (id: string) => void

  // ── Chord defs ──────────────────────────────────────────────
  addChordDef: (def: Omit<ChordDef, 'id' | 'builtin'>) => string
  updateChordDef: (id: string, patch: Partial<Omit<ChordDef, 'id' | 'builtin'>>) => void
  deleteChordDef: (id: string) => void

  // ── Favorites ───────────────────────────────────────────────
  toggleFavorite: (ref: ShapeRef) => void
  setFavoriteNote: (key: string, note: string) => void
  isFavorite: (ref: ShapeRef) => boolean

  // ── Saved queries ───────────────────────────────────────────
  saveQuery: (name: string, query: Query) => string
  renameSavedQuery: (id: string, name: string) => void
  deleteSavedQuery: (id: string) => void

  // ── Prefs / data ────────────────────────────────────────────
  setPrefs: (patch: Partial<Prefs>) => void
  importReplace: (incoming: AppData) => void
  clearAll: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  data: loadAppData(),

  addTuning: (name, pitches) => {
    const id = newId()
    set((s) => ({
      data: {
        ...s.data,
        tunings: { ...s.data.tunings, [id]: makeTuning(id, name.trim() || 'New Tuning', pitches) },
        tuningIds: [...s.data.tuningIds, id],
      },
    }))
    return id
  },

  updateTuning: (id, patch) =>
    set((s) => {
      const tuning = s.data.tunings[id]
      if (!tuning || tuning.builtin) return s
      const next: Tuning = { ...tuning, updatedAt: Date.now() }
      if (patch.name !== undefined) next.name = patch.name.trim() || tuning.name
      if (patch.pitches !== undefined) next.pitches = [...patch.pitches]
      return { data: { ...s.data, tunings: { ...s.data.tunings, [id]: next } } }
    }),

  savedQueryCount: (tuningId) => savedQueryCountForTuning(get().data, tuningId),

  deleteTuning: (id) => set((s) => ({ data: removeTuning(s.data, id) })),

  addChordDef: (def) => {
    const id = newId()
    set((s) => ({
      data: {
        ...s.data,
        chordDefs: { ...s.data.chordDefs, [id]: { ...def, id } },
        chordDefIds: [...s.data.chordDefIds, id],
      },
    }))
    return id
  },

  updateChordDef: (id, patch) =>
    set((s) => {
      const def = s.data.chordDefs[id]
      if (!def) return s
      return {
        data: {
          ...s.data,
          chordDefs: { ...s.data.chordDefs, [id]: { ...def, ...patch, id } },
        },
      }
    }),

  deleteChordDef: (id) =>
    set((s) => {
      const chordDefs = { ...s.data.chordDefs }
      delete chordDefs[id]
      return {
        data: {
          ...s.data,
          chordDefs,
          chordDefIds: s.data.chordDefIds.filter((c) => c !== id),
        },
      }
    }),

  toggleFavorite: (ref) =>
    set((s) => {
      const key = shapeKey(ref)
      const favorites = { ...s.data.favorites }
      let favoriteKeys: string[]
      if (favorites[key]) {
        delete favorites[key]
        favoriteKeys = s.data.favoriteKeys.filter((k) => k !== key)
      } else {
        const favorite: Favorite = { ref, createdAt: Date.now() }
        favorites[key] = favorite
        favoriteKeys = [...s.data.favoriteKeys, key]
      }
      return { data: { ...s.data, favorites, favoriteKeys } }
    }),

  setFavoriteNote: (key, note) =>
    set((s) => {
      const fav = s.data.favorites[key]
      if (!fav) return s
      const next: Favorite = { ...fav }
      const trimmed = note.trim()
      if (trimmed) next.note = trimmed
      else delete next.note
      return { data: { ...s.data, favorites: { ...s.data.favorites, [key]: next } } }
    }),

  isFavorite: (ref) => get().data.favorites[shapeKey(ref)] !== undefined,

  saveQuery: (name, query) => {
    const id = newId()
    const sq: SavedQuery = { id, name: name.trim() || 'Saved Search', query, createdAt: Date.now() }
    set((s) => ({
      data: {
        ...s.data,
        savedQueries: { ...s.data.savedQueries, [id]: sq },
        savedQueryIds: [...s.data.savedQueryIds, id],
      },
    }))
    return id
  },

  renameSavedQuery: (id, name) =>
    set((s) => {
      const sq = s.data.savedQueries[id]
      if (!sq) return s
      return {
        data: {
          ...s.data,
          savedQueries: { ...s.data.savedQueries, [id]: { ...sq, name: name.trim() || sq.name } },
        },
      }
    }),

  deleteSavedQuery: (id) =>
    set((s) => {
      const savedQueries = { ...s.data.savedQueries }
      delete savedQueries[id]
      return {
        data: {
          ...s.data,
          savedQueries,
          savedQueryIds: s.data.savedQueryIds.filter((q) => q !== id),
        },
      }
    }),

  setPrefs: (patch) =>
    set((s) => ({ data: { ...s.data, prefs: { ...s.data.prefs, ...patch } } })),

  importReplace: (incoming) => set({ data: incoming }),
  clearAll: () => set({ data: defaultAppData() }),
}))

// Persist (debounced) whenever the data slice changes.
useStore.subscribe((state, prev) => {
  if (state.data !== prev.data) saveAppDataDebounced(state.data)
})

/** All tunings visible to the UI: built-ins merged with user tunings. */
export function allTunings(data: AppData): Tuning[] {
  return [...BUILTIN_TUNINGS, ...data.tuningIds.map((id) => data.tunings[id] as Tuning)]
}

/** Resolve a tuning id against built-ins then user tunings. */
export function resolveTuning(data: AppData, id: string): Tuning | undefined {
  return BUILTIN_TUNINGS.find((t) => t.id === id) ?? data.tunings[id]
}

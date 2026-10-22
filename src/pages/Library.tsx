/**
 * The Library: user tunings, custom chord defs, favorites, saved searches,
 * prefs, and JSON import/export. Import is validate → migrate → REPLACE-only,
 * with a confirm stating exactly what is about to be replaced.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useStore, allTunings } from '../store/useStore'
import {
  BUILTIN_TUNINGS,
  equivalentTunings,
  gapKey,
  parsePitches,
  tuningPitchNames,
  validateTuningPitches,
  type Tuning,
} from '../lib/tuning'
import { degreeSetKey, BUILTIN_CHORD_DEFS } from '../lib/naming'
import { parseDegreeList, formatDegrees } from '../lib/theory'
import { encodeQuery } from '../lib/query'
import { exportEnvelope, validateImport } from '../lib/persist'
import Fretboard, { type FretboardNote } from '../components/Fretboard'
import { interiorMutedStrings } from '../lib/score'

type Tab = 'tunings' | 'chords' | 'favorites' | 'searches' | 'data'

const inputCls =
  'w-full bg-brand-panel border border-brand-border rounded-lg px-2 py-1.5 text-sm text-brand-text focus:border-brand-green'
const btnCls =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-card border border-brand-border text-brand-muted hover:text-brand-bright transition-colors'
const cardCls = 'bg-brand-card border border-brand-border rounded-xl p-4'

function TuningsTab() {
  const data = useStore((s) => s.data)
  const addTuning = useStore((s) => s.addTuning)
  const updateTuning = useStore((s) => s.updateTuning)
  const deleteTuning = useStore((s) => s.deleteTuning)
  const savedQueryCount = useStore((s) => s.savedQueryCount)

  const [name, setName] = useState('')
  const [pitchText, setPitchText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const userTunings = data.tuningIds.map((id) => data.tunings[id] as Tuning)

  const submit = () => {
    const pitches = parsePitches(pitchText)
    if (!pitches) {
      setError('Could not read those pitches — use note names (B0 E1 A1 D2) or MIDI numbers.')
      return
    }
    const problem = validateTuningPitches(pitches)
    if (problem) {
      setError(problem)
      return
    }
    if (editing) {
      updateTuning(editing, { name, pitches })
      setEditing(null)
    } else {
      addTuning(name, pitches)
    }
    setName('')
    setPitchText('')
    setError(null)
  }

  const onDelete = (t: Tuning) => {
    const refs = savedQueryCount(t.id)
    const message =
      refs > 0
        ? `${refs} saved search${refs === 1 ? '' : 'es'} use this tuning. They will be remapped to an equivalent built-in where possible, or removed. Delete "${t.name}"?`
        : `Delete "${t.name}"?`
    if (window.confirm(message)) deleteTuning(t.id)
  }

  const badge = (t: Tuning) => {
    const eq = equivalentTunings(t, userTunings)
    if (eq.length === 0) return null
    return (
      <p className="text-xs text-brand-muted mt-1">
        Same shapes as {eq.map((o) => o.name).join(', ')} ({gapKey(t)})
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-3">
          {editing ? 'Edit tuning' : 'Add a tuning'}
        </h3>
        <div className="flex flex-col gap-2">
          <input
            className={inputCls}
            placeholder="Name (e.g. My 7-string)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Tuning name"
          />
          <input
            className={inputCls}
            placeholder="Pitches low → high (e.g. B0 E1 A1 D2 G2)"
            value={pitchText}
            onChange={(e) => setPitchText(e.target.value)}
            aria-label="Tuning pitches"
            spellCheck={false}
          />
          {error && <p className="text-xs text-diff-veryhard">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submit} className={btnCls}>
              <Plus size={14} />
              {editing ? 'Save' : 'Add tuning'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setName('')
                  setPitchText('')
                  setError(null)
                }}
                className={btnCls}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {userTunings.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm text-brand-bright mb-3">Your tunings</h3>
          <ul className="flex flex-col divide-y divide-brand-border">
            {userTunings.map((t) => (
              <li key={t.id} className="py-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm text-brand-text">{t.name}</div>
                  <div className="text-xs text-brand-muted">{tuningPitchNames(t)}</div>
                  {badge(t)}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${t.name}`}
                    onClick={() => {
                      setEditing(t.id)
                      setName(t.name)
                      setPitchText(tuningPitchNames(t))
                    }}
                    className="p-1.5 text-brand-dim hover:text-brand-bright transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${t.name}`}
                    onClick={() => onDelete(t)}
                    className="p-1.5 text-brand-dim hover:text-diff-veryhard transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-3">Built-in tunings</h3>
        <ul className="flex flex-col divide-y divide-brand-border">
          {BUILTIN_TUNINGS.map((t) => (
            <li key={t.id} className="py-3">
              <div className="text-sm text-brand-text">{t.name}</div>
              <div className="text-xs text-brand-muted">{tuningPitchNames(t)}</div>
              {badge(t)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ChordsTab() {
  const data = useStore((s) => s.data)
  const addChordDef = useStore((s) => s.addChordDef)
  const updateChordDef = useStore((s) => s.updateChordDef)
  const deleteChordDef = useStore((s) => s.deleteChordDef)

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [degreeText, setDegreeText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const userDefs = data.chordDefIds.map((id) => data.chordDefs[id]!)

  const shadowed = useMemo(() => {
    const degrees = parseDegreeList(degreeText)
    if (!degrees) return null
    return BUILTIN_CHORD_DEFS.find((d) => degreeSetKey(d.degrees) === degreeSetKey(degrees)) ?? null
  }, [degreeText])

  const submit = () => {
    const degrees = parseDegreeList(degreeText)
    if (!degrees) {
      setError('Could not read those degrees — try 1 b3 5, or 2 6 8.')
      return
    }
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Give the chord a name.')
      return
    }
    if (editing) {
      updateChordDef(editing, { name: trimmedName, symbol: symbol.trim() || trimmedName, degrees })
      setEditing(null)
    } else {
      addChordDef({ name: trimmedName, symbol: symbol.trim() || trimmedName, degrees })
    }
    setName('')
    setSymbol('')
    setDegreeText('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-1">
          {editing ? 'Edit chord' : 'Define a chord'}
        </h3>
        <p className="text-xs text-brand-muted mb-3">
          Any degree set you want — compound degrees fold to their octave-agnostic equivalent
          (9 → 2, ♯11 → ♭5). A set no textbook names is still valid; it renders as its intervals.
        </p>
        <div className="flex flex-col gap-2">
          <input
            className={inputCls}
            placeholder="Name (e.g. My weird one)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Chord name"
          />
          <input
            className={inputCls}
            placeholder="Symbol (e.g. 2-6-8)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            aria-label="Chord symbol"
          />
          <input
            className={inputCls}
            placeholder="Degrees (e.g. 2 6 8)"
            value={degreeText}
            onChange={(e) => setDegreeText(e.target.value)}
            aria-label="Chord degrees"
            spellCheck={false}
          />
          {shadowed && (
            <p className="text-xs text-brand-muted">
              Same degree set as the built-in <strong>{shadowed.name}</strong> — yours will shadow
              it.
            </p>
          )}
          {error && <p className="text-xs text-diff-veryhard">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submit} className={btnCls}>
              <Plus size={14} />
              {editing ? 'Save' : 'Add chord'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setName('')
                  setSymbol('')
                  setDegreeText('')
                  setError(null)
                }}
                className={btnCls}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {userDefs.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm text-brand-bright mb-3">Your chords</h3>
          <ul className="flex flex-col divide-y divide-brand-border">
            {userDefs.map((d) => (
              <li key={d.id} className="py-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm text-brand-text">
                    {d.name} <span className="text-brand-muted">({d.symbol})</span>
                  </div>
                  <div className="text-xs text-brand-muted">{formatDegrees([...d.degrees].sort((a, b) => a - b))}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${d.name}`}
                    onClick={() => {
                      setEditing(d.id)
                      setName(d.name)
                      setSymbol(d.symbol)
                      setDegreeText(formatDegrees([...d.degrees].sort((a, b) => a - b)).replace(/-/g, ' '))
                    }}
                    className="p-1.5 text-brand-dim hover:text-brand-bright transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => window.confirm(`Delete "${d.name}"?`) && deleteChordDef(d.id)}
                    className="p-1.5 text-brand-dim hover:text-diff-veryhard transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FavoritesTab() {
  const data = useStore((s) => s.data)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const setFavoriteNote = useStore((s) => s.setFavoriteNote)

  if (data.favoriteKeys.length === 0) {
    return (
      <div className={`${cardCls} text-center text-sm text-brand-muted`}>
        No favorites yet — star a voicing in the{' '}
        <Link to="/" className="text-brand-green hover:text-brand-bright">
          Chord Finder
        </Link>
        .
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
      {data.favoriteKeys.map((key) => {
        const fav = data.favorites[key]
        if (!fav) return null
        const stringCount = fav.ref.gapKey.split(',').length + 1
        const maxFret = Math.max(0, ...fav.ref.notes.map((n) => n.f))
        const notes: FretboardNote[] = fav.ref.notes.map((n) => ({ s: n.s, f: n.f }))
        return (
          <div key={key} className="bg-brand-card border border-brand-border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-brand-muted truncate">{fav.ref.tuningLabelHint}</span>
              <button
                type="button"
                aria-label="Remove favorite"
                onClick={() => toggleFavorite(fav.ref)}
                className="p-1 text-brand-dim hover:text-diff-veryhard transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <Fretboard
              stringCount={stringCount}
              windowFrets={maxFret + 1}
              notes={notes}
              mutedStrings={fav.ref.notes.length > 1 ? interiorMutedStrings(fav.ref.notes) : []}
              leftHanded={data.prefs.leftHanded}
              compact
            />
            <input
              className={`${inputCls} mt-2 text-xs`}
              placeholder="Note…"
              defaultValue={fav.note ?? ''}
              onBlur={(e) => setFavoriteNote(key, e.target.value)}
              aria-label="Favorite note"
            />
          </div>
        )
      })}
    </div>
  )
}

function SearchesTab() {
  const data = useStore((s) => s.data)
  const renameSavedQuery = useStore((s) => s.renameSavedQuery)
  const deleteSavedQuery = useStore((s) => s.deleteSavedQuery)

  if (data.savedQueryIds.length === 0) {
    return (
      <div className={`${cardCls} text-center text-sm text-brand-muted`}>
        No saved searches yet — save one from the{' '}
        <Link to="/" className="text-brand-green hover:text-brand-bright">
          Chord Finder
        </Link>
        .
      </div>
    )
  }

  return (
    <div className={cardCls}>
      <ul className="flex flex-col divide-y divide-brand-border">
        {data.savedQueryIds.map((id) => {
          const sq = data.savedQueries[id]
          if (!sq) return null
          return (
            <li key={id} className="py-3 flex items-center justify-between gap-2">
              <Link
                to={`/?${encodeQuery(sq.query)}`}
                className="text-sm text-brand-text hover:text-brand-bright transition-colors truncate"
              >
                {sq.name}
              </Link>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Rename ${sq.name}`}
                  onClick={() => {
                    const name = window.prompt('New name:', sq.name)
                    if (name) renameSavedQuery(id, name)
                  }}
                  className="p-1.5 text-brand-dim hover:text-brand-bright transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${sq.name}`}
                  onClick={() => window.confirm(`Delete "${sq.name}"?`) && deleteSavedQuery(id)}
                  className="p-1.5 text-brand-dim hover:text-diff-veryhard transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DataTab() {
  const data = useStore((s) => s.data)
  const setPrefs = useStore((s) => s.setPrefs)
  const importReplace = useStore((s) => s.importReplace)
  const clearAll = useStore((s) => s.clearAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const exportJson = () => {
    const blob = new Blob([exportEnvelope(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fretboardtools-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File) => {
    setImportError(null)
    const text = await file.text()
    const result = validateImport(text)
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    const incoming = result.data
    const summary = [
      `${incoming.tuningIds.length} tuning${incoming.tuningIds.length === 1 ? '' : 's'}`,
      `${incoming.chordDefIds.length} chord def${incoming.chordDefIds.length === 1 ? '' : 's'}`,
      `${incoming.favoriteKeys.length} favorite${incoming.favoriteKeys.length === 1 ? '' : 's'}`,
      `${incoming.savedQueryIds.length} saved search${incoming.savedQueryIds.length === 1 ? '' : 'es'}`,
    ].join(', ')
    if (
      window.confirm(
        `Replace ALL current data with this file? It contains ${summary}. This cannot be undone.`,
      )
    ) {
      importReplace(incoming)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-3">Preferences</h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-sm text-brand-text">
            <input
              type="checkbox"
              className="accent-brand-green"
              checked={data.prefs.leftHanded}
              onChange={(e) => setPrefs({ leftHanded: e.target.checked })}
            />
            Left-handed diagrams (mirrored at render time)
          </label>
          <label className="flex items-center gap-1.5 text-sm text-brand-text">
            <input
              type="checkbox"
              className="accent-brand-green"
              checked={data.prefs.showEquivalenceBadge}
              onChange={(e) => setPrefs({ showEquivalenceBadge: e.target.checked })}
            />
            Show tuning-equivalence badges
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-text">
            Default tuning
            <select
              className={inputCls}
              value={data.prefs.defaultTuningId}
              onChange={(e) => setPrefs({ defaultTuningId: e.target.value })}
              aria-label="Default tuning"
            >
              {allTunings(data).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-1">Import / export</h3>
        <p className="text-xs text-brand-muted mb-3">
          Everything you&apos;ve created — tunings, chords, favorites, saved searches, preferences —
          as one JSON file. Import replaces all current data (never merges).
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className={btnCls}>
            <Download size={14} />
            Export JSON
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={btnCls}>
            <Upload size={14} />
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {importError && <p className="mt-2 text-xs text-diff-veryhard">{importError}</p>}
      </div>

      <div className={cardCls}>
        <h3 className="text-sm text-brand-bright mb-3">Danger zone</h3>
        <button
          type="button"
          onClick={() =>
            window.confirm('Delete ALL local data — tunings, chords, favorites, saved searches?') &&
            clearAll()
          }
          className={`${btnCls} hover:text-diff-veryhard`}
        >
          <Trash2 size={14} />
          Clear all data
        </button>
      </div>
    </div>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'tunings', label: 'Tunings' },
  { id: 'chords', label: 'Chords' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'searches', label: 'Saved Searches' },
  { id: 'data', label: 'Data' },
]

export default function Library() {
  const [tab, setTab] = useState<Tab>('tunings')

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl text-brand-bright mb-4">Library</h1>
      <div className="flex flex-wrap gap-1.5 mb-6" role="tablist" aria-label="Library sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === id
                ? 'bg-brand-accent/30 text-brand-bright'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'tunings' && <TuningsTab />}
      {tab === 'chords' && <ChordsTab />}
      {tab === 'favorites' && <FavoritesTab />}
      {tab === 'searches' && <SearchesTab />}
      {tab === 'data' && <DataTab />}
    </div>
  )
}

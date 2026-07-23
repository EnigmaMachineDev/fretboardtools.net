/**
 * The parameter panel. Genuinely interdependent state — every control writes
 * a patch of the Query, which the page serializes back into the URL.
 */
import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import type { Query } from '../lib/query'
import { MAX_WINDOW, MIN_WINDOW } from '../lib/query'
import { equivalentTunings, gapKey, type Tuning } from '../lib/tuning'
import { parseDegree, formatDegrees, type PitchClass } from '../lib/theory'
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../lib/score'
import type { ChordDef } from '../lib/naming'
import { BUILTIN_CHORD_DEFS } from '../lib/naming'

interface ParamPanelProps {
  query: Query
  tuning: Tuning
  tunings: Tuning[] // built-ins + user, in display order
  userChordDefs: ChordDef[]
  showEquivalenceBadge: boolean
  onChange: (patch: Partial<Query>) => void
}

/** Order-preserving degree list parse for the free-text input. */
function parseDegreeSequence(input: string): PitchClass[] | null {
  const tokens = input.split(/[\s,/]+/).filter(Boolean)
  if (tokens.length === 0) return null
  const out: PitchClass[] = []
  for (const token of tokens) {
    const pc = parseDegree(token)
    if (pc === null) return null
    if (!out.includes(pc)) out.push(pc)
  }
  return out
}

const labelCls = 'block text-xs text-brand-muted mb-1'
const inputCls =
  'w-full bg-brand-panel border border-brand-border rounded-lg px-2 py-1.5 text-sm text-brand-text focus:border-brand-green'
const checkCls = 'accent-[#4a8c4a]'

export default function ParamPanel({
  query,
  tuning,
  tunings,
  userChordDefs,
  showEquivalenceBadge,
  onChange,
}: ParamPanelProps) {
  const stringCount = tuning.pitches.length
  const [degreeText, setDegreeText] = useState(
    query.degrees ? formatDegrees(query.degrees.degrees) : '',
  )
  const [degreeError, setDegreeError] = useState(false)
  // Local pin state: a single pin is not yet a valid stringSet (the query
  // needs ≥2), but it must survive until the second click lands.
  const [pins, setPins] = useState<number[]>(query.stringSet ?? [])

  useEffect(() => {
    setPins(query.stringSet ?? [])
  }, [query.stringSet])

  // Keep the text field in sync when the query changes from outside (URL nav).
  useEffect(() => {
    setDegreeText(query.degrees ? query.degrees.degrees.map((pc) => formatDegrees([pc])).join(' ') : '')
    setDegreeError(false)
  }, [query.degrees])

  const equivalents = useMemo(
    () => equivalentTunings(tuning, tunings.filter((t) => !t.builtin)),
    [tuning, tunings],
  )

  const applyDegrees = (text: string) => {
    setDegreeText(text)
    const trimmed = text.trim()
    if (!trimmed) {
      setDegreeError(false)
      onChange({ degrees: null })
      return
    }
    const parsed = parseDegreeSequence(trimmed)
    if (parsed === null) {
      setDegreeError(true)
      return
    }
    setDegreeError(false)
    onChange({
      degrees: {
        degrees: parsed,
        ordered: query.degrees?.ordered ?? false,
        exact: query.degrees?.exact ?? true,
      },
    })
  }

  const chordPresets = [...BUILTIN_CHORD_DEFS, ...userChordDefs]

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col gap-4">
      {/* Tuning */}
      <div>
        <label htmlFor="pp-tuning" className={labelCls}>
          Tuning
        </label>
        <select
          id="pp-tuning"
          className={inputCls}
          value={query.tuningId}
          onChange={(e) => onChange({ tuningId: e.target.value, stringSet: null })}
        >
          <optgroup label="Built-in">
            {tunings.filter((t) => t.builtin).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {tunings.some((t) => !t.builtin) && (
            <optgroup label="Custom">
              {tunings.filter((t) => !t.builtin).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {showEquivalenceBadge && equivalents.length > 0 && (
          <p className="mt-1.5 text-xs text-brand-muted flex items-start gap-1">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              Same shapes as{' '}
              <span className="text-brand-text">
                {equivalents.map((t) => t.name).join(', ')}
              </span>{' '}
              — identical gap vector ({gapKey(tuning)}).
            </span>
          </p>
        )}
      </div>

      {/* Geometry */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="pp-min" className={labelCls}>
            Min notes
          </label>
          <select
            id="pp-min"
            className={inputCls}
            value={query.noteCount[0]}
            onChange={(e) => {
              const min = Number(e.target.value)
              onChange({ noteCount: [min, Math.max(min, query.noteCount[1])] })
            }}
          >
            {Array.from({ length: Math.max(1, stringCount - 1) }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pp-max" className={labelCls}>
            Max notes
          </label>
          <select
            id="pp-max"
            className={inputCls}
            value={query.noteCount[1]}
            onChange={(e) => {
              const max = Number(e.target.value)
              onChange({ noteCount: [Math.min(max, query.noteCount[0]), max] })
            }}
          >
            {Array.from({ length: Math.max(1, stringCount - 1) }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pp-window" className={labelCls}>
            Fret window
          </label>
          <select
            id="pp-window"
            className={inputCls}
            value={query.windowFrets}
            onChange={(e) => onChange({ windowFrets: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_WINDOW - MIN_WINDOW + 1 }, (_, i) => i + MIN_WINDOW).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* Skips */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-brand-text">
          <input
            type="checkbox"
            className={checkCls}
            checked={query.allowSkips}
            onChange={(e) => onChange({ allowSkips: e.target.checked, maxSkip: e.target.checked ? Math.max(1, query.maxSkip) : query.maxSkip })}
          />
          Allow string skips
        </label>
        {query.allowSkips && (
          <label className="flex items-center gap-1.5 text-sm text-brand-muted">
            max
            <select
              className={inputCls}
              value={query.maxSkip}
              onChange={(e) => onChange({ maxSkip: Number(e.target.value) })}
              aria-label="Maximum consecutive skipped strings"
            >
              {Array.from({ length: Math.max(1, stringCount - 2) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* String pin */}
      <div>
        <span className={labelCls}>Pin to strings (optional)</span>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: stringCount }, (_, s) => {
            const active = pins.includes(s)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const current = new Set(pins)
                  if (current.has(s)) current.delete(s)
                  else current.add(s)
                  const next = [...current].sort((a, b) => a - b)
                  setPins(next)
                  const patch = next.length >= 2 ? next : null
                  if (patch !== null || query.stringSet !== null) {
                    onChange({ stringSet: patch })
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  active
                    ? 'bg-brand-accent/40 text-brand-bright'
                    : 'bg-brand-panel text-brand-muted hover:text-brand-text'
                }`}
              >
                {s + 1}
              </button>
            )
          })}
          {pins.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPins([])
                onChange({ stringSet: null })
              }}
              className="px-2.5 py-1 rounded-lg text-xs text-brand-muted hover:text-brand-bright"
            >
              Clear
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-brand-dim">
          String 1 is the lowest. Fewer than two pins means any strings.
        </p>
      </div>

      {/* Degrees */}
      <div>
        <label htmlFor="pp-degrees" className={labelCls}>
          Scale degrees (e.g. 1 b3 5 — blank for all)
        </label>
        <input
          id="pp-degrees"
          type="text"
          className={`${inputCls} ${degreeError ? 'border-diff-veryhard' : ''}`}
          value={degreeText}
          onChange={(e) => applyDegrees(e.target.value)}
          placeholder="1 b3 5"
          spellCheck={false}
        />
        {degreeError && (
          <p className="mt-1 text-xs text-diff-veryhard">Unrecognized degree — try 1, b3, #9, 11…</p>
        )}
        <select
          className={`${inputCls} mt-2`}
          value=""
          aria-label="Chord preset"
          onChange={(e) => {
            const def = chordPresets.find((c) => c.id === e.target.value)
            if (def) {
              onChange({
                degrees: {
                  degrees: [...def.degrees].sort((a, b) => a - b),
                  ordered: false,
                  exact: query.degrees?.exact ?? true,
                },
              })
            }
          }}
        >
          <option value="">Preset…</option>
          {chordPresets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.symbol})
            </option>
          ))}
        </select>
        {query.degrees && (
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm text-brand-text">
              <input
                type="checkbox"
                className={checkCls}
                checked={query.degrees.exact}
                onChange={(e) =>
                  onChange({ degrees: { ...query.degrees!, exact: e.target.checked } })
                }
              />
              Exactly these degrees
            </label>
            <label className="flex items-center gap-1.5 text-sm text-brand-text">
              <input
                type="checkbox"
                className={checkCls}
                checked={query.degrees.ordered}
                onChange={(e) =>
                  onChange({ degrees: { ...query.degrees!, ordered: e.target.checked } })
                }
              />
              In this exact bottom-up order
            </label>
          </div>
        )}
        <label className="mt-2 flex items-center gap-1.5 text-sm text-brand-text">
          <input
            type="checkbox"
            className={checkCls}
            checked={query.includeRootless}
            onChange={(e) => onChange({ includeRootless: e.target.checked })}
          />
          Include rootless interpretations
        </label>
      </div>

      {/* Difficulty + sort */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="pp-difficulty" className={labelCls}>
            Max difficulty
          </label>
          <select
            id="pp-difficulty"
            className={inputCls}
            value={query.maxDifficulty ?? 'all'}
            onChange={(e) =>
              onChange({
                maxDifficulty:
                  e.target.value === 'all' ? null : (e.target.value as Query['maxDifficulty']),
              })
            }
          >
            {DIFFICULTIES.filter((d) => d !== 'impossible').map((d) => (
              <option key={d} value={d}>
                ≤ {DIFFICULTY_LABEL[d]}
              </option>
            ))}
            <option value="all">All (incl. Impossible)</option>
          </select>
        </div>
        <div>
          <label htmlFor="pp-sort" className={labelCls}>
            Sort
          </label>
          <select
            id="pp-sort"
            className={inputCls}
            value={query.sort}
            onChange={(e) => onChange({ sort: e.target.value as Query['sort'] })}
          >
            <option value="playability">Playability</option>
            <option value="span">Span</option>
            <option value="quality">Quality</option>
          </select>
        </div>
      </div>
    </div>
  )
}

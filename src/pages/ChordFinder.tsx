/**
 * The Chord Finder. Query state lives in the URL (shareable, stateless);
 * everything rendered is derived on demand by the pure engine.
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, BookmarkPlus, Download, Eye } from 'lucide-react'
import { parseQuery, encodeQuery, type Query } from '../lib/query'
import { estimateCount, MAX_CANDIDATES } from '../lib/generate'
import { runQuery } from '../lib/engine'
import { resultsToCsv } from '../lib/csv'
import { builtinTuning } from '../lib/tuning'
import { useStore, allTunings, resolveTuning } from '../store/useStore'
import ParamPanel from '../components/ParamPanel'
import ResultsList from '../components/ResultsList'
import { SITE_TAGLINE } from '../config/site'

/** Above this estimate, ask before generating instead of freezing the tab. */
const SOFT_LIMIT = 60_000

export default function ChordFinder() {
  const [searchParams, setSearchParams] = useSearchParams()
  const data = useStore((s) => s.data)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const isFavorite = useStore((s) => s.isFavorite)
  const saveQuery = useStore((s) => s.saveQuery)

  const query = useMemo(() => parseQuery(searchParams), [searchParams])
  const tuning =
    resolveTuning(data, query.tuningId) ?? (builtinTuning('builtin:standard4') as NonNullable<ReturnType<typeof builtinTuning>>)
  const userChordDefs = data.chordDefIds.map((id) => data.chordDefs[id]!)

  const setQuery = (patch: Partial<Query>) => {
    setSearchParams(new URLSearchParams(encodeQuery({ ...query, ...patch })), { replace: true })
  }

  const estimate = useMemo(
    () =>
      estimateCount({
        stringCount: tuning.pitches.length,
        noteCount: query.noteCount,
        windowFrets: query.windowFrets,
        allowSkips: query.allowSkips,
        maxSkip: query.maxSkip,
        stringSet: query.stringSet,
      }),
    [query, tuning],
  )

  // The firehose guard: big spaces need explicit confirmation per query.
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null)
  const queryKey = encodeQuery(query)
  const needsConfirm = estimate > SOFT_LIMIT && confirmedKey !== queryKey

  const run = useMemo(
    () => (needsConfirm ? null : runQuery(query, tuning, userChordDefs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, tuning, data.chordDefs, needsConfirm],
  )

  const exportCsv = () => {
    if (!run) return
    const flat = run.groups.flatMap((g) => g.voicings.flatMap((v) => v.shapes))
    const csv = resultsToCsv(flat, tuning)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fretboardtools-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onSaveQuery = () => {
    const name = window.prompt('Name this search:')
    if (name) saveQuery(name, query)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl text-brand-bright">Chord Finder</h1>
        <p className="text-sm text-brand-muted mt-1">{SITE_TAGLINE}</p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        <aside>
          <ParamPanel
            query={query}
            tuning={tuning}
            tunings={allTunings(data)}
            userChordDefs={userChordDefs}
            showEquivalenceBadge={data.prefs.showEquivalenceBadge}
            onChange={setQuery}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onSaveQuery}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-card border border-brand-border text-brand-muted hover:text-brand-bright transition-colors"
            >
              <BookmarkPlus size={14} />
              Save search
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!run}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-card border border-brand-border text-brand-muted hover:text-brand-bright transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </aside>

        <section aria-label="Results">
          {needsConfirm ? (
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center">
              <AlertTriangle size={24} className="mx-auto text-diff-hard mb-3" />
              <p className="text-sm text-brand-text mb-1">
                These parameters describe roughly{' '}
                <strong className="text-brand-bright">{estimate.toLocaleString()}</strong> candidate
                shapes{estimate > MAX_CANDIDATES ? ` (capped at ${MAX_CANDIDATES.toLocaleString()})` : ''}.
              </p>
              <p className="text-xs text-brand-muted mb-4">
                Try narrowing the fret window or note count — or run it anyway.
              </p>
              <button
                type="button"
                onClick={() => setConfirmedKey(queryKey)}
                className="px-4 py-2 rounded-lg bg-brand-accent/30 text-brand-bright hover:bg-brand-accent/50 transition-colors text-sm"
              >
                Generate anyway
              </button>
            </div>
          ) : run ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-brand-muted">
                <span>
                  <strong className="text-brand-text">{run.totalMatched.toLocaleString()}</strong>{' '}
                  matching shape{run.totalMatched === 1 ? '' : 's'} ·{' '}
                  {run.groups.length.toLocaleString()} quality group
                  {run.groups.length === 1 ? '' : 's'}
                </span>
                {run.filteredOut > 0 && (
                  <span className="flex items-center gap-2">
                    {run.filteredOut.toLocaleString()} hidden by the difficulty filter
                    <button
                      type="button"
                      onClick={() => setQuery({ maxDifficulty: null })}
                      className="flex items-center gap-1 text-brand-green hover:text-brand-bright transition-colors"
                    >
                      <Eye size={12} />
                      show the impossible ones too
                    </button>
                  </span>
                )}
                {run.truncated && (
                  <span className="text-diff-hard">
                    Result space truncated at {MAX_CANDIDATES.toLocaleString()} — try narrowing{' '}
                    {run.loosestConstraint === 'windowFrets'
                      ? 'the fret window'
                      : run.loosestConstraint === 'maxSkip'
                        ? 'string skips'
                        : 'the note count'}
                    .
                  </span>
                )}
              </div>
              {run.groups.length === 0 ? (
                <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center text-sm text-brand-muted">
                  No shapes match. Loosen the degree constraint, widen the window, or raise the
                  difficulty ceiling.
                </div>
              ) : (
                <ResultsList
                  groups={run.groups}
                  tuning={tuning}
                  windowFrets={query.windowFrets}
                  leftHanded={data.prefs.leftHanded}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}

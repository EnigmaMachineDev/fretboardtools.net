/**
 * Identify: click notes onto a blank fretboard, get every interpretation of
 * the resulting shape, ranked root-present-first. The same engine as the
 * finder, run backwards.
 */
import { useMemo, useState } from 'react'
import { Eraser } from 'lucide-react'
import { useStore, allTunings, resolveTuning } from '../store/useStore'
import { builtinTuning, gaps, type Tuning } from '../lib/tuning'
import { normalizeShape, type ShapeNote } from '../lib/shape'
import { voice, cumGaps } from '../lib/voice'
import { interpret, soundingIntervals } from '../lib/analyze'
import { buildChordIndex } from '../lib/naming'
import { degreeLabel, formatDegrees, normalizePc } from '../lib/theory'
import { scoreShape, interiorMutedStrings, DIFFICULTY_LABEL } from '../lib/score'
import Fretboard, { type FretboardNote } from '../components/Fretboard'
import DifficultyBadge from '../components/DifficultyBadge'

const WINDOW = 6

export default function Identify() {
  const data = useStore((s) => s.data)
  const [tuningId, setTuningId] = useState(data.prefs.defaultTuningId)
  const [includeRootless, setIncludeRootless] = useState(false)
  const [picked, setPicked] = useState<Map<number, number>>(new Map()) // string → fret

  const tuning: Tuning =
    resolveTuning(data, tuningId) ??
    (builtinTuning('builtin:standard4') as NonNullable<ReturnType<typeof builtinTuning>>)
  const stringCount = tuning.pitches.length

  const onCellClick = (s: number, f: number) => {
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.get(s) === f) next.delete(s) // same cell → remove
      else next.set(s, f) // one note per string
      return next
    })
  }

  const notes: FretboardNote[] = [...picked.entries()].map(([s, f]) => ({ s, f }))

  const analysis = useMemo(() => {
    if (picked.size < 2) return null
    const rawNotes: ShapeNote[] = [...picked.entries()].map(([s, f]) => ({ s, f }))
    const shape = normalizeShape(rawNotes)
    const gapsVec = gaps(tuning)
    const voicing = voice(shape.notes, gapsVec)
    const chordIndex = buildChordIndex(data.chordDefIds.map((id) => data.chordDefs[id]!))
    const interps = interpret(voicing, chordIndex, includeRootless)
    const score = scoreShape(shape)
    const cum = cumGaps(gapsVec)
    const absolutes = shape.notes.map((n) => (cum[n.s] as number) + n.f)
    const minAbs = Math.min(...absolutes)
    return { shape, voicing, interps, score, absolutes, minAbs }
  }, [picked, tuning, includeRootless, data.chordDefs, data.chordDefIds])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl text-brand-bright">Identify a Shape</h1>
        <p className="text-sm text-brand-muted mt-1">
          Click notes onto the board — one per string. The window is position-invariant, so only
          the offsets matter, not where on the neck you imagine it.
        </p>
      </header>

      <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
        <aside className="bg-brand-card border border-brand-border rounded-xl p-4">
          <label htmlFor="id-tuning" className="block text-xs text-brand-muted mb-1">
            Tuning
          </label>
          <select
            id="id-tuning"
            className="w-full bg-brand-panel border border-brand-border rounded-lg px-2 py-1.5 text-sm text-brand-text focus:border-brand-green mb-3"
            value={tuning.id}
            onChange={(e) => {
              setTuningId(e.target.value)
              setPicked(new Map())
            }}
          >
            {allTunings(data).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <Fretboard
            stringCount={stringCount}
            windowFrets={WINDOW}
            notes={notes}
            mutedStrings={notes.length > 1 ? interiorMutedStrings(notes) : []}
            leftHanded={data.prefs.leftHanded}
            onCellClick={onCellClick}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-sm text-brand-text">
              <input
                type="checkbox"
                className="accent-[#4a8c4a]"
                checked={includeRootless}
                onChange={(e) => setIncludeRootless(e.target.checked)}
              />
              Rootless roots too
            </label>
            <button
              type="button"
              onClick={() => setPicked(new Map())}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-brand-muted hover:text-brand-bright transition-colors"
            >
              <Eraser size={14} />
              Clear
            </button>
          </div>
        </aside>

        <section aria-label="Interpretations">
          {!analysis ? (
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center text-sm text-brand-muted">
              Add at least two notes to analyze the shape.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-brand-muted">
                  Voicing <span className="text-brand-text">{analysis.voicing.join('-')}</span>
                </span>
                <DifficultyBadge difficulty={analysis.score.difficulty} />
                {analysis.score.fingering && (
                  <span className="text-xs text-brand-muted">
                    fingering {analysis.score.fingering.join('')}
                  </span>
                )}
                {analysis.score.difficulty === 'impossible' && (
                  <span className="text-xs text-diff-impossible">
                    {DIFFICULTY_LABEL.impossible} — no valid finger assignment exists.
                  </span>
                )}
              </div>

              <ol className="flex flex-col gap-2">
                {analysis.interps.map((interp, rank) => {
                  const compounds = soundingIntervals(analysis.voicing, interp.rootPc).filter(
                    (si) => si.soundsAs,
                  )
                  const bassDegree = degreeLabel(normalizePc(0 - interp.rootPc))
                  return (
                    <li
                      key={interp.rootPc}
                      className="bg-brand-card border border-brand-border rounded-xl p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-brand-dim w-5">{rank + 1}.</span>
                        <span className="text-sm text-brand-bright font-medium">
                          {interp.chord
                            ? `${interp.chord.name}${interp.rootless ? ' (rootless)' : ''}`
                            : formatDegrees(interp.degrees)}
                        </span>
                        <span className="text-xs text-brand-muted">
                          {formatDegrees(interp.degrees)}
                        </span>
                        {!interp.rootPresent && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-brand-panel text-brand-muted">
                            root not sounded
                          </span>
                        )}
                        {interp.rootPresent && bassDegree !== '1' && (
                          <span className="text-xs text-brand-muted">bass is the {bassDegree}</span>
                        )}
                      </div>
                      {compounds.length > 0 && (
                        <p className="mt-1 text-xs text-brand-muted">
                          {compounds
                            .map((si) => `${si.label} sounds as ${si.soundsAs}`)
                            .join(' · ')}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

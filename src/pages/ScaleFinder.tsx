/**
 * Scale Finder: degree-set presets → box coverings in a fret window. Shares
 * the fretboard renderer and degree vocabulary with the chord engine, and
 * almost nothing else — see src/lib/scale.ts.
 */
import { useMemo, useState } from 'react'
import { useStore, allTunings, resolveTuning } from '../store/useStore'
import { builtinTuning, gaps, type Tuning } from '../lib/tuning'
import { SCALE_PRESETS, scaleBoxes } from '../lib/scale'
import { degreeLabel, formatDegrees, parseDegreeList } from '../lib/theory'
import Fretboard, { type FretboardNote } from '../components/Fretboard'

const inputCls =
  'w-full bg-brand-panel border border-brand-border rounded-lg px-2 py-1.5 text-sm text-brand-text focus:border-brand-green'

export default function ScaleFinder() {
  const data = useStore((s) => s.data)
  const [tuningId, setTuningId] = useState(data.prefs.defaultTuningId)
  const [presetId, setPresetId] = useState('major')
  const [customText, setCustomText] = useState('')
  const [windowFrets, setWindowFrets] = useState(4)

  const tuning: Tuning =
    resolveTuning(data, tuningId) ??
    (builtinTuning('builtin:standard4') as NonNullable<ReturnType<typeof builtinTuning>>)

  const degrees = useMemo(() => {
    if (presetId === 'custom') {
      const parsed = parseDegreeList(customText)
      return parsed && parsed.includes(0) ? parsed : null
    }
    return SCALE_PRESETS.find((p) => p.id === presetId)?.degrees ?? null
  }, [presetId, customText])

  const boxes = useMemo(
    () => (degrees ? scaleBoxes(degrees, gaps(tuning), windowFrets) : []),
    [degrees, tuning, windowFrets],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl text-brand-bright">Scale Finder</h1>
        <p className="text-sm text-brand-muted mt-1">
          Every distinct box a scale makes inside a fret window. Boxes are position-invariant —
          slide them to put the root wherever you need it.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        <aside className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col gap-3">
          <div>
            <label htmlFor="sf-tuning" className="block text-xs text-brand-muted mb-1">
              Tuning
            </label>
            <select
              id="sf-tuning"
              className={inputCls}
              value={tuning.id}
              onChange={(e) => setTuningId(e.target.value)}
            >
              {allTunings(data).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sf-scale" className="block text-xs text-brand-muted mb-1">
              Scale
            </label>
            <select
              id="sf-scale"
              className={inputCls}
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {SCALE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>
          {presetId === 'custom' && (
            <div>
              <label htmlFor="sf-custom" className="block text-xs text-brand-muted mb-1">
                Degrees (must include 1)
              </label>
              <input
                id="sf-custom"
                className={inputCls}
                placeholder="1 2 b3 4 5 6 b7"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
          <div>
            <label htmlFor="sf-window" className="block text-xs text-brand-muted mb-1">
              Fret window
            </label>
            <select
              id="sf-window"
              className={inputCls}
              value={windowFrets}
              onChange={(e) => setWindowFrets(Number(e.target.value))}
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {degrees && (
            <p className="text-xs text-brand-muted">
              {formatDegrees(degrees)} · {boxes.length} distinct box
              {boxes.length === 1 ? '' : 'es'}
            </p>
          )}
        </aside>

        <section aria-label="Scale boxes">
          {!degrees ? (
            <div className="bg-brand-card border border-brand-border rounded-xl p-6 text-center text-sm text-brand-muted">
              Enter a valid degree set including the root (1).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
              {boxes.map((box, i) => {
                const notes: FretboardNote[] = box.positions.map((p) => ({
                  s: p.s,
                  f: p.f,
                  isRoot: p.pc === 0,
                }))
                return (
                  <div
                    key={box.key}
                    className="bg-brand-card border border-brand-border rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-brand-bright">Box {i + 1}</span>
                      {!box.covers && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-panel text-brand-muted">
                          partial
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-brand-muted mb-2">
                      low string starts on the {degreeLabel(box.offset)}
                    </p>
                    <Fretboard
                      stringCount={tuning.pitches.length}
                      windowFrets={windowFrets}
                      notes={notes}
                      leftHanded={data.prefs.leftHanded}
                      compact
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

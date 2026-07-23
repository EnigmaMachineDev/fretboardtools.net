import { Star } from 'lucide-react'
import type { VoicingResult } from '../lib/group'
import { cumGaps } from '../lib/voice'
import { normalizePc, degreeLabel, formatDegrees } from '../lib/theory'
import { soundingIntervals } from '../lib/analyze'
import { interiorMutedStrings } from '../lib/score'
import { gaps, type Tuning } from '../lib/tuning'
import type { ShapeRef } from '../lib/shape'
import Fretboard, { type FretboardNote } from './Fretboard'
import DifficultyBadge from './DifficultyBadge'

interface VoicingCardProps {
  result: VoicingResult
  tuning: Tuning
  windowFrets: number
  leftHanded: boolean
  isFavorite: (ref: ShapeRef) => boolean
  onToggleFavorite: (ref: ShapeRef) => void
}

export default function VoicingCard({
  result,
  tuning,
  windowFrets,
  leftHanded,
  isFavorite,
  onToggleFavorite,
}: VoicingCardProps) {
  const gapsVec = gaps(tuning)
  const cum = cumGaps(gapsVec)
  const absolutes = result.shape.notes.map((n) => (cum[n.s] as number) + n.f)
  const minAbs = Math.min(...absolutes)

  const notes: FretboardNote[] = result.shape.notes.map((n, i) => {
    const degree = normalizePc((absolutes[i] as number) - minAbs - result.rootPc)
    const note: FretboardNote = {
      s: n.s,
      f: n.f,
      label: degreeLabel(degree),
      isRoot: degree === 0,
    }
    const finger = result.score.fingering?.[i]
    if (finger !== undefined) note.finger = finger
    return note
  })

  const span = Math.max(...result.shape.notes.map((n) => n.f))
  const compounds = soundingIntervals(result.voicing, result.rootPc).filter((si) => si.soundsAs)
  const ref: ShapeRef = {
    gapKey: gapsVec.join(','),
    tuningLabelHint: tuning.name,
    notes: result.shape.notes,
    rootPc: result.rootPc,
  }
  const favorited = isFavorite(ref)

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm text-brand-bright font-medium truncate">
            {result.chord
              ? `${result.chord.name}${result.rootless ? ' (rootless)' : ''}`
              : formatDegrees(result.degrees)}
          </div>
          <div className="text-xs text-brand-muted">{formatDegrees(result.degrees)}</div>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(ref)}
          aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
          aria-pressed={favorited}
          className={`p-1 rounded transition-colors ${
            favorited ? 'text-brand-bright' : 'text-brand-dim hover:text-brand-muted'
          }`}
        >
          <Star size={16} fill={favorited ? 'currentColor' : 'none'} />
        </button>
      </div>

      <Fretboard
        stringCount={tuning.pitches.length}
        windowFrets={Math.max(windowFrets, span + 1)}
        notes={notes}
        mutedStrings={interiorMutedStrings(result.shape.notes)}
        leftHanded={leftHanded}
        compact
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
        <DifficultyBadge difficulty={result.score.difficulty} />
        <span>span {span + 1}f</span>
        <span className="text-brand-dim">·</span>
        <span>{result.voicing.join('-')}</span>
      </div>
      {compounds.length > 0 && (
        <div className="text-xs text-brand-muted">
          {compounds.map((si) => `${si.label} sounds as ${si.soundsAs}`).join(' · ')}
        </div>
      )}
    </div>
  )
}

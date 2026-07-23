/**
 * Grouped result rendering: quality → voicing → shape.
 *
 * Result sets can run to thousands of rows, so rendering is progressive: an
 * IntersectionObserver sentinel grows the visible voicing count as the user
 * scrolls, instead of mounting every SVG at once.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { QualityGroup, VoicingGroup } from '../lib/group'
import { formatDegrees } from '../lib/theory'
import type { Tuning } from '../lib/tuning'
import type { ShapeRef } from '../lib/shape'
import VoicingCard from './VoicingCard'

const PAGE = 24

interface ResultsListProps {
  groups: QualityGroup[]
  tuning: Tuning
  windowFrets: number
  leftHanded: boolean
  isFavorite: (ref: ShapeRef) => boolean
  onToggleFavorite: (ref: ShapeRef) => void
}

function VoicingNode({
  voicingGroup,
  tuning,
  windowFrets,
  leftHanded,
  isFavorite,
  onToggleFavorite,
}: {
  voicingGroup: VoicingGroup
} & Omit<ResultsListProps, 'groups'>) {
  const [expanded, setExpanded] = useState(false)
  const variants = voicingGroup.shapes.length - 1

  return (
    <div className="flex flex-col gap-2">
      <VoicingCard
        result={voicingGroup.best}
        tuning={tuning}
        windowFrets={windowFrets}
        leftHanded={leftHanded}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
      {variants > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-brand-muted hover:text-brand-bright transition-colors self-start"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? 'Hide' : 'Show'} {variants} fingering variant{variants === 1 ? '' : 's'}
        </button>
      )}
      {expanded &&
        voicingGroup.shapes.slice(1).map((shape, i) => (
          <VoicingCard
            key={i}
            result={shape}
            tuning={tuning}
            windowFrets={windowFrets}
            leftHanded={leftHanded}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
    </div>
  )
}

export default function ResultsList({
  groups,
  tuning,
  windowFrets,
  leftHanded,
  isFavorite,
  onToggleFavorite,
}: ResultsListProps) {
  const [visible, setVisible] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  const total = groups.reduce((n, g) => n + g.voicings.length, 0)

  // Reset pagination when the result set changes.
  useEffect(() => setVisible(PAGE), [groups])

  useEffect(() => {
    const el = sentinel.current
    if (!el || visible >= total) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible((v) => Math.min(v + PAGE, total))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, total])

  let remaining = visible
  const rendered: JSX.Element[] = []
  for (const group of groups) {
    if (remaining <= 0) break
    const shown = group.voicings.slice(0, remaining)
    remaining -= shown.length
    rendered.push(
      <section key={group.qualityKey} aria-label={group.qualityKey}>
        <h2 className="text-lg text-brand-bright mb-1">
          {group.chord
            ? `${group.chord.name} (${group.chord.symbol})${group.rootless ? ' — rootless' : ''}`
            : formatDegrees(group.degrees)}
        </h2>
        <p className="text-xs text-brand-muted mb-3">
          {formatDegrees(group.degrees)} · {group.voicings.length} voicing
          {group.voicings.length === 1 ? '' : 's'} · {group.count} shape
          {group.count === 1 ? '' : 's'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
          {shown.map((v) => (
            <VoicingNode
              key={v.voicingKey}
              voicingGroup={v}
              tuning={tuning}
              windowFrets={windowFrets}
              leftHanded={leftHanded}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </section>,
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {rendered}
      {visible < total && (
        <div ref={sentinel} className="py-4 text-center text-xs text-brand-muted">
          Loading more…
        </div>
      )}
    </div>
  )
}

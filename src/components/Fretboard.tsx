/**
 * SVG fretboard diagram.
 *
 * CSP note: styling uses SVG PRESENTATION ATTRIBUTES (fill=, stroke=), which
 * CSP does not govern — never style="" attributes, which style-src 'self'
 * would block. Do not "simplify" these into style props.
 *
 * Left-handed mode is a pure render-time mirror: it remaps x positions only
 * and never touches the model or the solver.
 */
import { Fragment } from 'react'

// Shared dark-green theme (mirrors tailwind.config.js brand tokens).
const C = {
  board: '#0f1a0f',
  line: '#3a5a3a',
  fretLine: '#1e3a1e',
  note: '#4a8c4a',
  root: '#6abf6a',
  noteText: '#0a0f0a',
  label: '#c8e6c8',
  muted: '#7a9f7a',
  hover: '#1a2e1a',
} as const

export interface FretboardNote {
  s: number // string index, 0 = lowest string
  f: number // fret offset, 0 = top of window
  finger?: number // 1–4 from the solver
  label?: string // degree label, e.g. '♭3'
  isRoot?: boolean
}

export interface FretboardProps {
  stringCount: number
  windowFrets: number
  notes: readonly FretboardNote[]
  mutedStrings?: readonly number[] // interior mutes, rendered ×
  leftHanded?: boolean
  onCellClick?: (s: number, f: number) => void
  /** Compact mode shrinks paddings for result-list cards. */
  compact?: boolean
}

const CELL_W = 28
const CELL_H = 34
const PAD_X = 14
const PAD_TOP = 22
const PAD_BOTTOM = 24

/**
 * X position of a string column. Exported pure for tests: the left-handed
 * mirror is exactly a string-index flip.
 */
export function stringX(s: number, stringCount: number, leftHanded: boolean): number {
  const index = leftHanded ? stringCount - 1 - s : s
  return PAD_X + index * CELL_W
}

const fretY = (f: number): number => PAD_TOP + f * CELL_H + CELL_H / 2

export default function Fretboard({
  stringCount,
  windowFrets,
  notes,
  mutedStrings = [],
  leftHanded = false,
  onCellClick,
  compact = false,
}: FretboardProps) {
  const width = PAD_X * 2 + (stringCount - 1) * CELL_W
  const height = PAD_TOP + windowFrets * CELL_H + PAD_BOTTOM
  const r = compact ? 9 : 11

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Fretboard diagram: ${notes
        .map((n) => `string ${n.s + 1} fret ${n.f}${n.label ? ` (${n.label})` : ''}`)
        .join(', ')}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Board */}
      <rect
        x={PAD_X}
        y={PAD_TOP}
        width={(stringCount - 1) * CELL_W}
        height={windowFrets * CELL_H}
        fill={C.board}
        stroke={C.fretLine}
      />
      {/* Fret lines */}
      {Array.from({ length: windowFrets - 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={PAD_X}
          x2={PAD_X + (stringCount - 1) * CELL_W}
          y1={PAD_TOP + (i + 1) * CELL_H}
          y2={PAD_TOP + (i + 1) * CELL_H}
          stroke={C.fretLine}
        />
      ))}
      {/* Strings */}
      {Array.from({ length: stringCount }, (_, s) => (
        <line
          key={`string-${s}`}
          x1={stringX(s, stringCount, leftHanded)}
          x2={stringX(s, stringCount, leftHanded)}
          y1={PAD_TOP}
          y2={PAD_TOP + windowFrets * CELL_H}
          stroke={C.line}
          strokeWidth={s === 0 ? 2 : 1}
        />
      ))}
      {/* Interior mutes */}
      {mutedStrings.map((s) => (
        <text
          key={`mute-${s}`}
          x={stringX(s, stringCount, leftHanded)}
          y={PAD_TOP - 8}
          textAnchor="middle"
          fill={C.muted}
          fontSize={12}
        >
          ×
        </text>
      ))}
      {/* Click targets (Identify page) */}
      {onCellClick &&
        Array.from({ length: stringCount }, (_, s) =>
          Array.from({ length: windowFrets }, (_, f) => (
            <rect
              key={`cell-${s}-${f}`}
              x={stringX(s, stringCount, leftHanded) - CELL_W / 2}
              y={PAD_TOP + f * CELL_H}
              width={CELL_W}
              height={CELL_H}
              fill="transparent"
              cursor="pointer"
              onClick={() => onCellClick(s, f)}
              role="button"
              aria-label={`String ${s + 1}, fret ${f}`}
            />
          )),
        )}
      {/* Notes */}
      {notes.map((n) => {
        const x = stringX(n.s, stringCount, leftHanded)
        const y = fretY(n.f)
        return (
          <Fragment key={`note-${n.s}`}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={n.isRoot ? C.root : C.note}
              pointerEvents="none"
            />
            {n.finger !== undefined && (
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill={C.noteText}
                fontSize={11}
                fontWeight="bold"
                pointerEvents="none"
              >
                {n.finger}
              </text>
            )}
            {n.label && (
              <text
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill={n.isRoot ? C.root : C.label}
                fontSize={11}
              >
                {n.label}
              </text>
            )}
          </Fragment>
        )
      })}
    </svg>
  )
}

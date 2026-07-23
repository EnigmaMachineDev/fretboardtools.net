import { describe, expect, it } from 'vitest'
import { csvEscape, resultsToCsv, RESULTS_CSV_HEADER, toCsv } from './csv'
import { normalizeShape } from './shape'
import { scoreShape } from './score'
import { builtinTuning, type Tuning } from './tuning'
import type { VoicingResult } from './group'

describe('csvEscape', () => {
  it('passes plain fields through', () => {
    expect(csvEscape('plain')).toBe('plain')
  })

  it('quotes commas, quotes, and newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"')
  })
})

describe('toCsv', () => {
  it('joins with CRLF and escapes per-field', () => {
    const csv = toCsv(['a', 'b'], [['1', 'x,y']])
    expect(csv).toBe('a,b\r\n1,"x,y"')
  })
})

describe('resultsToCsv', () => {
  const tuning = builtinTuning('builtin:standard4') as Tuning
  const shape = normalizeShape([
    { s: 0, f: 0 },
    { s: 1, f: 2 },
    { s: 2, f: 2 },
  ])
  const row: VoicingResult = {
    shape,
    voicing: [0, 7, 12],
    rootPc: 0,
    degrees: [0, 7],
    score: scoreShape(shape),
  }

  it('has a stable header row', () => {
    const csv = resultsToCsv([row], tuning)
    expect(csv.split('\r\n')[0]).toBe(RESULTS_CSV_HEADER.join(','))
  })

  it('renders one line per result with derived columns', () => {
    const lines = resultsToCsv([row], tuning).split('\r\n')
    expect(lines).toHaveLength(2)
    // Gap key contains commas → quoted.
    expect(lines[1]?.startsWith('Standard 4 (EADG),"5,5,5",')).toBe(true)
    expect(lines[1]).toContain('Easy')
  })

  it('escapes user-hostile content in derived names', () => {
    const evil: VoicingResult = {
      ...row,
      chord: { id: 'u1', name: 'My "weird", chord', symbol: 'x', degrees: [0, 7] },
    }
    const csv = resultsToCsv([evil], tuning)
    expect(csv).toContain('"My ""weird"", chord"')
  })
})

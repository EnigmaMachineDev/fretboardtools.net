import { describe, expect, it } from 'vitest'
import { degreesFor, interpret } from './analyze'
import { buildChordIndex } from './naming'

const index = buildChordIndex()

describe('degreesFor', () => {
  it('[0,4,7] at root 0 → [0,4,7] (major triad)', () => {
    expect(degreesFor([0, 4, 7], 0)).toEqual([0, 4, 7])
  })

  it('folds octaves and dedupes', () => {
    expect(degreesFor([0, 7, 12, 16], 0)).toEqual([0, 4, 7])
  })

  it('is relative to the chosen root', () => {
    // [0,4,7] seen from root 4: {8, 0, 3} → first-inversion reading.
    expect(degreesFor([0, 4, 7], 4)).toEqual([0, 3, 8])
  })
})

describe('interpret', () => {
  it('[0,4,7] top interpretation is the root-position major triad', () => {
    const interps = interpret([0, 4, 7], index)
    expect(interps[0]?.rootPc).toBe(0)
    expect(interps[0]?.degrees).toEqual([0, 4, 7])
    expect(interps[0]?.chord?.symbol).toBe('maj')
    // One interpretation per sounded pitch class.
    expect(interps).toHaveLength(3)
  })

  it('[0,3,6] returns BOTH dim triad and rootless dom7 interpretations', () => {
    const interps = interpret([0, 3, 6], index, true)
    const dim = interps.find((i) => i.chord?.symbol === 'dim')
    expect(dim).toBeDefined()
    expect(dim?.rootPc).toBe(0)
    expect(dim?.rootless).toBeUndefined()

    // Root a major third below the bottom note (pc 8): {4,7,10} = rootless 7.
    const rootless7 = interps.find((i) => i.chord?.symbol === '7' && i.rootless)
    expect(rootless7).toBeDefined()
    expect(rootless7?.rootPc).toBe(8)
    expect(rootless7?.rootPresent).toBe(false)
  })

  it('rootless candidates appear only when includeRootless is true', () => {
    const withoutRootless = interpret([0, 3, 6], index, false)
    expect(withoutRootless.every((i) => i.rootPresent)).toBe(true)
    expect(withoutRootless).toHaveLength(3)

    const withRootless = interpret([0, 3, 6], index, true)
    expect(withRootless).toHaveLength(12)
  })

  it('ranking is root-present-first', () => {
    const interps = interpret([0, 3, 6], index, true)
    const firstRootless = interps.findIndex((i) => !i.rootPresent)
    const lastPresent = interps.map((i) => i.rootPresent).lastIndexOf(true)
    expect(lastPresent).toBeLessThan(firstRootless)
  })

  it('named interpretations rank before unnamed within a tier', () => {
    const interps = interpret([0, 3, 6], index, true)
    const rootlessTier = interps.filter((i) => !i.rootPresent)
    const firstUnnamed = rootlessTier.findIndex((i) => !i.chord)
    const lastNamed = rootlessTier.map((i) => !!i.chord).lastIndexOf(true)
    expect(lastNamed).toBeLessThan(firstUnnamed === -1 ? rootlessTier.length : firstUnnamed)
  })
})

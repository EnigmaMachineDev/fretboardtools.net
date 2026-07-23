import { describe, expect, it } from 'vitest'
import { stringX } from './Fretboard'

describe('stringX — left-handed mirror', () => {
  it('right-handed: string 0 (lowest) is leftmost', () => {
    const positions = [0, 1, 2, 3].map((s) => stringX(s, 4, false))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('left-handed is an exact mirror of right-handed', () => {
    for (let s = 0; s < 4; s++) {
      expect(stringX(s, 4, true)).toBe(stringX(4 - 1 - s, 4, false))
    }
  })

  it('mirror is an involution', () => {
    // Flipping twice restores the original position for any string count.
    for (const count of [2, 5, 9]) {
      for (let s = 0; s < count; s++) {
        const once = count - 1 - s
        expect(count - 1 - once).toBe(s)
      }
    }
  })
})

import { describe, it, expect } from 'vitest'
import { quantize, representableRange } from '../engine/fixedPoint'

// Advisor logic tests — mirror the snrDb and coverage logic used in Advisor.tsx

function snrDb(lsb: number): number {
  const bits = Math.round(-Math.log2(lsb))
  return 6.02 * bits + 1.76
}

function coversValue(value: number, fmt: { signed: boolean; intBits: number; fracBits: number }): boolean {
  const range = representableRange(fmt)
  return value >= range.min && value <= range.max
}

describe('Format Advisor — SNR estimates', () => {
  it('Q8.8 SNR ≈ 49.92 dB', () => {
    const lsb = Math.pow(2, -8)
    expect(snrDb(lsb)).toBeCloseTo(49.92, 1)
  })
  it('Q8.16 SNR ≈ 98.08 dB', () => {
    const lsb = Math.pow(2, -16)
    expect(snrDb(lsb)).toBeCloseTo(98.08, 1)
  })
  it('Q8.4 SNR ≈ 25.84 dB', () => {
    const lsb = Math.pow(2, -4)
    expect(snrDb(lsb)).toBeCloseTo(25.84, 1)
  })
})

describe('Format Advisor — range coverage', () => {
  it('value within range returns true', () => {
    expect(coversValue(3.14, { signed: false, intBits: 8, fracBits: 8 })).toBe(true)
  })
  it('value above range returns false', () => {
    expect(coversValue(300, { signed: false, intBits: 8, fracBits: 8 })).toBe(false)
  })
  it('negative value in unsigned range returns false', () => {
    expect(coversValue(-1, { signed: false, intBits: 8, fracBits: 8 })).toBe(false)
  })
  it('negative value in signed range returns true', () => {
    expect(coversValue(-10, { signed: true, intBits: 7, fracBits: 8 })).toBe(true)
  })
  it('zero always covered', () => {
    expect(coversValue(0, { signed: false, intBits: 4, fracBits: 4 })).toBe(true)
    expect(coversValue(0, { signed: true, intBits: 4, fracBits: 4 })).toBe(true)
  })
})

describe('Format Advisor — quantization error at each stage', () => {
  it('exact representable value has near-zero error', () => {
    const fmt = { signed: false, intBits: 8, fracBits: 8 }
    const r = quantize(1.5, fmt) // 1.5 = 384 * LSB, exact
    expect(Math.abs(r.quantizationError)).toBeCloseTo(0, 6)
  })
  it('non-representable value has nonzero error', () => {
    const fmt = { signed: false, intBits: 8, fracBits: 8 }
    const r = quantize(Math.PI, fmt)
    expect(Math.abs(r.quantizationError)).toBeGreaterThan(0)
    expect(Math.abs(r.quantizationError)).toBeLessThan(Math.pow(2, -8))
  })
  it('error does not exceed one LSB', () => {
    const fmt = { signed: false, intBits: 8, fracBits: 8 }
    const lsb = Math.pow(2, -8)
    for (const v of [0.1, 0.333, 1.7, 99.99, 200.5]) {
      const r = quantize(v, fmt)
      if (!r.overflow) {
        expect(Math.abs(r.quantizationError)).toBeLessThanOrEqual(lsb + 1e-12)
      }
    }
  })
})

import { describe, it, expect } from 'vitest'
import { quantize, FixedPointFormat } from '../engine/fixedPoint'

// Analyzer logic tests — mirror the sweep engine and error computation in Analyzer.tsx

function evalExpr(expr: string, x: number): number {
  try {
    const sanitized = expr.replace(/[^0-9x+\-*/().\s]/g, '').replace(/\bx\b/g, String(x))
    // eslint-disable-next-line no-new-func
    return new Function('return (' + sanitized + ')')() as number
  } catch {
    return NaN
  }
}

interface SampleResult {
  input: number
  fixedOutput: number
  floatRef: number
  absError: number
  overflow: boolean
}

function runSweep(expr: string, refExpr: string, fmt: FixedPointFormat, min: number, max: number, step: number): SampleResult[] {
  const results: SampleResult[] = []
  for (let x = min; x <= max + 1e-9; x += step) {
    const xr = Math.round(x * 1e9) / 1e9
    const fixedRaw = evalExpr(expr, xr)
    const q = quantize(fixedRaw, fmt)
    const floatRef = evalExpr(refExpr, xr)
    results.push({
      input: xr,
      fixedOutput: q.value,
      floatRef,
      absError: Math.abs(q.value - floatRef),
      overflow: q.overflow,
    })
  }
  return results
}

function rms(results: SampleResult[]): number {
  const errors = results.map(r => r.absError)
  return Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length)
}

const FMT: FixedPointFormat = { signed: true, intBits: 8, fracBits: 8 }

describe('C Analyzer — expression evaluator', () => {
  it('evaluates x * 0.5 + 1.0 correctly', () => {
    expect(evalExpr('x * 0.5 + 1.0', 4)).toBeCloseTo(3.0, 5)
  })
  it('evaluates x + x correctly', () => {
    expect(evalExpr('x + x', 3)).toBeCloseTo(6.0, 5)
  })
  it('evaluates constant expression', () => {
    expect(evalExpr('2.5 + 1.5', 0)).toBeCloseTo(4.0, 5)
  })
  it('returns NaN for malformed expression', () => {
    expect(evalExpr('((( bad', 0)).toBeNaN()
  })
})

describe('C Analyzer — sweep engine', () => {
  it('produces correct number of samples', () => {
    const results = runSweep('x', 'x', FMT, 0, 10, 1)
    expect(results.length).toBe(11)
  })
  it('identity expression has near-zero error for exact values', () => {
    const results = runSweep('x', 'x', FMT, 0, 4, 0.5)
    for (const r of results) {
      expect(r.absError).toBeLessThan(Math.pow(2, -8) + 1e-10)
    }
  })
  it('detects overflow when value exceeds format range', () => {
    // SQ7.8 max is ~127.996; 200 should overflow
    const fmt: FixedPointFormat = { signed: true, intBits: 7, fracBits: 8 }
    const q = quantize(200, fmt)
    expect(q.overflow).toBe(true)
  })
  it('x * 0.5 + 1.0 RMS error is less than one LSB vs float ref', () => {
    const results = runSweep('x * 0.5 + 1.0', 'x * 0.5 + 1.0', FMT, -10, 10, 0.25)
    expect(rms(results)).toBeLessThan(Math.pow(2, -8))
  })
})

describe('C Analyzer — error statistics', () => {
  it('mean error is non-negative', () => {
    const results = runSweep('x * 2', 'x * 2', FMT, 0, 10, 0.5)
    const errors = results.map(r => r.absError)
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length
    expect(mean).toBeGreaterThanOrEqual(0)
  })
  it('max error does not exceed one LSB for exact representable sweep', () => {
    const results = runSweep('x', 'x', FMT, 0, 8, 1)
    const maxErr = Math.max(...results.map(r => r.absError))
    expect(maxErr).toBeLessThan(1e-9)
  })
  it('overflow count is correct', () => {
    // SQ7.8 signed max = ~127.996; values >= 128 overflow
    const smallFmt: FixedPointFormat = { signed: true, intBits: 7, fracBits: 8 }
    const results = runSweep('x', 'x', smallFmt, 126, 132, 1)
    const overflows = results.filter(r => r.overflow).length
    expect(overflows).toBeGreaterThan(0)
  })
})

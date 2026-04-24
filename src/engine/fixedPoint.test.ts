import { describe, it, expect } from 'vitest'
import { quantize, operate, formatLabel, representableRange, FixedPointFormat } from './fixedPoint'

const Q8_8: FixedPointFormat = { signed: false, intBits: 8, fracBits: 8 }
const SQ7_8: FixedPointFormat = { signed: true, intBits: 7, fracBits: 8 }

describe('representableRange', () => {
  it('Q8.8 min/max/lsb', () => {
    const r = representableRange(Q8_8)
    expect(r.min).toBe(0)
    expect(r.max).toBeCloseTo(255.99609375, 5)
    expect(r.lsb).toBeCloseTo(1 / 256, 10)
    expect(r.levels).toBe(65536)
  })
  it('SQ7.8 min/max/lsb', () => {
    const r = representableRange(SQ7_8)
    expect(r.min).toBe(-128)
    expect(r.max).toBeCloseTo(127.99609375, 5)
    expect(r.lsb).toBeCloseTo(1 / 256, 10)
  })
})

describe('quantize', () => {
  it('basic positive value', () => {
    const r = quantize(3.5, Q8_8)
    expect(r.value).toBeCloseTo(3.5, 5)
    expect(r.overflow).toBe(false)
    expect(r.underflow).toBe(false)
  })
  it('zero', () => {
    const r = quantize(0, Q8_8)
    expect(r.value).toBe(0)
    expect(r.bitString).toBe('0'.repeat(16))
    expect(r.segments.signBit).toBeNull()
  })
  it('overflow detected', () => {
    const r = quantize(300, Q8_8)
    expect(r.overflow).toBe(true)
  })
  it('underflow detected (precision loss)', () => {
    const r = quantize(0.001, Q8_8)
    expect(r.underflow).toBe(true)
  })
  it('negative signed value', () => {
    const r = quantize(-1.5, SQ7_8)
    expect(r.value).toBeCloseTo(-1.5, 5)
    expect(r.overflow).toBe(false)
    expect(r.segments.signBit).toBe('1')
  })
  it('exact boundary max', () => {
    const range = representableRange(Q8_8)
    const r = quantize(range.max, Q8_8)
    expect(r.overflow).toBe(false)
    expect(r.value).toBeCloseTo(range.max, 5)
  })
  it('bit segments unsigned', () => {
    const r = quantize(1.5, Q8_8)
    expect(r.segments.signBit).toBeNull()
    expect(r.segments.intPart).toHaveLength(8)
    expect(r.segments.fracPart).toHaveLength(8)
  })
  it('bit segments signed', () => {
    const r = quantize(1.5, SQ7_8)
    expect(r.segments.signBit).toBe('0')
    expect(r.segments.intPart).toHaveLength(7)
    expect(r.segments.fracPart).toHaveLength(8)
  })
})

describe('operate', () => {
  it('add', () => {
    const { ideal, result } = operate(1.5, 2.25, 'add', Q8_8)
    expect(ideal).toBeCloseTo(3.75, 5)
    expect(result.value).toBeCloseTo(3.75, 5)
  })
  it('sub', () => {
    const { ideal, result } = operate(5.0, 2.5, 'sub', Q8_8)
    expect(ideal).toBeCloseTo(2.5, 5)
    expect(result.value).toBeCloseTo(2.5, 5)
  })
  it('mul', () => {
    const { ideal, result } = operate(2.0, 3.0, 'mul', Q8_8)
    expect(ideal).toBeCloseTo(6.0, 5)
    expect(result.value).toBeCloseTo(6.0, 5)
  })
  it('div', () => {
    const { ideal, result } = operate(7.0, 2.0, 'div', Q8_8)
    expect(ideal).toBeCloseTo(3.5, 5)
    expect(result.value).toBeCloseTo(3.5, 5)
  })
})

describe('formatLabel', () => {
  it('unsigned', () => expect(formatLabel(Q8_8)).toBe('Q8.8'))
  it('signed', () => expect(formatLabel(SQ7_8)).toBe('SQ7.8'))
})
export interface FixedPointFormat {
  signed: boolean
  intBits: number
  fracBits: number
}

export interface FixedPointResult {
  value: number
  rawBits: bigint
  bitString: string
  overflow: boolean
  underflow: boolean
  quantizationError: number
  lsbValue: number
  totalBits: number
  segments: {
    signBit: string | null
    intPart: string
    fracPart: string
  }
}

export type Operation = 'add' | 'sub' | 'mul' | 'div'

export function representableRange(fmt: FixedPointFormat): { min: number; max: number; lsb: number; levels: number } {
  const lsb = Math.pow(2, -fmt.fracBits)
  const totalIntBits = fmt.intBits
  if (fmt.signed) {
    const min = -Math.pow(2, totalIntBits)
    const max = Math.pow(2, totalIntBits) - lsb
    const levels = Math.pow(2, totalIntBits + fmt.fracBits + 1)
    return { min, max, lsb, levels }
  } else {
    const min = 0
    const max = Math.pow(2, totalIntBits) - lsb
    const levels = Math.pow(2, totalIntBits + fmt.fracBits)
    return { min, max, lsb, levels }
  }
}

export function quantize(value: number, fmt: FixedPointFormat): FixedPointResult {
  const lsb = Math.pow(2, -fmt.fracBits)
  const scale = Math.pow(2, fmt.fracBits)
  const totalBits = (fmt.signed ? 1 : 0) + fmt.intBits + fmt.fracBits
  const range = representableRange(fmt)

  const overflow = value > range.max || value < range.min
  const clampedValue = Math.max(range.min, Math.min(range.max, value))

  // Truncate toward zero
  const scaled = clampedValue * scale
  const truncated = scaled >= 0 ? Math.floor(scaled) : Math.ceil(scaled)
  const quantizedValue = truncated / scale

  const underflow = Math.abs(value - quantizedValue) > 0 && Math.abs(value - quantizedValue) < lsb * 0.9999

  const quantizationError = quantizedValue - value

  // Build raw bits
  let rawInt: bigint
  if (fmt.signed && quantizedValue < 0) {
    const totalLevels = BigInt(1) << BigInt(totalBits)
    rawInt = totalLevels + BigInt(truncated)
  } else {
    rawInt = BigInt(truncated)
  }

  const bitString = rawInt.toString(2).padStart(totalBits, '0')

  let signBit: string | null = null
  let intPart: string
  let fracPart: string

  if (fmt.signed) {
    signBit = bitString[0]
    intPart = bitString.slice(1, 1 + fmt.intBits)
    fracPart = bitString.slice(1 + fmt.intBits)
  } else {
    intPart = bitString.slice(0, fmt.intBits)
    fracPart = bitString.slice(fmt.intBits)
  }

  return {
    value: quantizedValue,
    rawBits: rawInt,
    bitString,
    overflow,
    underflow,
    quantizationError,
    lsbValue: lsb,
    totalBits,
    segments: { signBit, intPart, fracPart }
  }
}

export function operate(
  a: number,
  b: number,
  op: Operation,
  fmt: FixedPointFormat
): { ideal: number; result: FixedPointResult } {
  let ideal: number
  switch (op) {
    case 'add': ideal = a + b; break
    case 'sub': ideal = a - b; break
    case 'mul': ideal = a * b; break
    case 'div': ideal = b !== 0 ? a / b : 0; break
  }
  return { ideal, result: quantize(ideal, fmt) }
}

export function formatLabel(fmt: FixedPointFormat): string {
  const prefix = fmt.signed ? 'SQ' : 'Q'
  return `${prefix}${fmt.intBits}.${fmt.fracBits}`
}

import { useState } from 'react'
import {
  quantize,
  operate,
  formatLabel,
  representableRange,
  FixedPointFormat,
  FixedPointResult,
  Operation,
} from '../engine/fixedPoint'

interface BitFieldProps {
  result: FixedPointResult
  label: string
  fmt: FixedPointFormat
}

function BitField({ result, label, fmt }: BitFieldProps) {
  const bits = result.bitString.split('')
  const totalBits = result.totalBits
  const signCount = fmt.signed ? 1 : 0
  const intEnd = signCount + fmt.intBits

  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-600 mb-1 font-mono">{label}</div>
      <div className="flex gap-0.5 flex-wrap">
        {bits.map((bit, i) => {
          let bg = 'bg-teal-400'
          let groupLabel = ''
          if (fmt.signed && i === 0) { bg = 'bg-blue-400'; groupLabel = 'S' }
          else if (i < intEnd) { bg = 'bg-green-500'; groupLabel = 'I' }
          else { groupLabel = 'F' }
          if (result.overflow) bg = 'bg-red-400'
          return (
            <div key={i} className="flex flex-col items-center">
              <div className="text-xs text-gray-400 font-mono">{groupLabel}</div>
              <div className={`w-7 h-7 flex items-center justify-center text-white text-xs font-mono font-bold rounded ${bg}`}>
                {bit}
              </div>
              <div className="text-xs text-gray-400 font-mono">{totalBits - 1 - i}</div>
            </div>
          )
        })}
      </div>
      {result.overflow && (
        <div className="text-xs text-red-600 mt-1 font-medium">⚠ Overflow — value clamped</div>
      )}
      {result.underflow && !result.overflow && (
        <div className="text-xs text-yellow-600 mt-1 font-medium">⚠ Precision loss — LSBs truncated</div>
      )}
    </div>
  )
}

function formatValue(value: number, rawBits: bigint, mode: 'decimal' | 'hex' | 'binary', totalBits: number): string {
  if (mode === 'decimal') return value.toFixed(6)
  if (mode === 'hex') return '0x' + rawBits.toString(16).toUpperCase().padStart(Math.ceil(totalBits / 4), '0')
  return rawBits.toString(2).padStart(totalBits, '0')
}

export default function Calculator() {
  const [fmt, setFmt] = useState<FixedPointFormat>({ signed: false, intBits: 8, fracBits: 8 })
  const [operandA, setOperandA] = useState('3.5')
  const [operandB, setOperandB] = useState('1.25')
  const [op, setOp] = useState<Operation>('add')
  const [displayMode, setDisplayMode] = useState<'decimal' | 'hex' | 'binary'>('decimal')

  const a = parseFloat(operandA) || 0
  const b = parseFloat(operandB) || 0
  const { ideal, result } = operate(a, b, op, fmt)
  const resultA = quantize(a, fmt)
  const resultB = quantize(b, fmt)
  const range = representableRange(fmt)

  const opSymbols: { op: Operation; label: string }[] = [
    { op: 'add', label: '+' },
    { op: 'sub', label: '−' },
    { op: 'mul', label: '×' },
    { op: 'div', label: '÷' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary-dark">Bit Visualizer</h1>

      {/* Format Configuration */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Format Configuration</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fmt.signed}
              onChange={e => setFmt(f => ({ ...f, signed: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">Signed (two&apos;s complement)</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Integer bits</span>
            <input
              type="number" min={1} max={32} value={fmt.intBits}
              onChange={e => setFmt(f => ({ ...f, intBits: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Fractional bits</span>
            <input
              type="number" min={1} max={32} value={fmt.fracBits}
              onChange={e => setFmt(f => ({ ...f, fracBits: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
            />
          </label>
        </div>
        <div className="font-mono text-sm text-primary-dark font-semibold">
          Format: {formatLabel(fmt)}
        </div>
        <div className="text-sm text-gray-600 font-mono">
          Range: {range.min.toFixed(4)} to {range.max.toFixed(4)}&nbsp;|&nbsp;LSB = 2<sup>-{fmt.fracBits}</sup> = {range.lsb.toFixed(8)}&nbsp;|&nbsp;{range.levels.toLocaleString()} levels
        </div>
      </section>

      {/* Operands & Operation */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Operands &amp; Operation</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <input
            value={operandA}
            onChange={e => setOperandA(e.target.value)}
            className="w-32 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            placeholder="Operand A"
          />
          <div className="flex gap-1">
            {opSymbols.map(({ op: o, label }) => (
              <button
                key={o}
                onClick={() => setOp(o)}
                className={`w-10 h-10 rounded font-bold text-lg transition-colors ${op === o ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={operandB}
            onChange={e => setOperandB(e.target.value)}
            className="w-32 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            placeholder="Operand B"
          />
        </div>
      </section>

      {/* Bit Visualization */}
      <section className="bg-white rounded-xl shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">Bit Fields</h2>
        <BitField result={resultA} label={`A = ${a}`} fmt={fmt} />
        <BitField result={resultB} label={`B = ${b}`} fmt={fmt} />
        <div className="border-t pt-4">
          <BitField result={result} label={`Result = A ${opSymbols.find(s => s.op === op)?.label} B`} fmt={fmt} />
        </div>
      </section>

      {/* Results */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Results</h2>
        <div className="flex gap-2">
          {(['decimal', 'hex', 'binary'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${displayMode === mode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="font-mono text-sm space-y-2">
          <div className="flex gap-4">
            <span className="text-gray-500 w-40">Result ({displayMode}):</span>
            <span className="text-primary-dark font-bold">{formatValue(result.value, result.rawBits, displayMode, result.totalBits)}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-500 w-40">Ideal (float):</span>
            <span>{ideal.toFixed(8)}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-500 w-40">Quantization error:</span>
            <span className={Math.abs(result.quantizationError) > range.lsb ? 'text-yellow-600' : 'text-green-600'}>
              {result.quantizationError.toFixed(8)} ({ideal !== 0 ? ((result.quantizationError / ideal) * 100).toFixed(4) : '0.0000'}%)
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-500 w-40">LSB value:</span>
            <span>2<sup>-{fmt.fracBits}</sup> = {result.lsbValue.toFixed(8)}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {result.overflow && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full border border-red-300">OVERFLOW</span>
          )}
          {result.underflow && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-300">PRECISION LOSS</span>
          )}
          {!result.overflow && !result.underflow && (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-300">EXACT</span>
          )}
        </div>
      </section>
    </div>
  )
}

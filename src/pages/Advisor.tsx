import { useState } from 'react'
import { quantize, formatLabel, representableRange, FixedPointFormat } from '../engine/fixedPoint'

interface Stage {
  id: number
  label: string
  fmt: FixedPointFormat
  idealValue: string
}

function snrDb(lsb: number): number {
  const bits = Math.round(-Math.log2(lsb))
  return 6.02 * bits + 1.76
}

function precisionColor(error: number, lsb: number): string {
  const ratio = Math.abs(error) / lsb
  if (ratio < 0.01) return 'text-green-600'
  if (ratio < 1) return 'text-yellow-600'
  return 'text-red-600'
}

function badgeColor(error: number, lsb: number): string {
  const ratio = Math.abs(error) / lsb
  if (ratio < 0.01) return 'bg-green-100 text-green-700 border-green-300'
  if (ratio < 1) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  return 'bg-red-100 text-red-700 border-red-300'
}

function FmtInput({ fmt, onChange }: { fmt: FixedPointFormat; onChange: (f: FixedPointFormat) => void }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={fmt.signed} onChange={e => onChange({ ...fmt, signed: e.target.checked })} className="accent-primary" />
        Signed
      </label>
      <label className="flex items-center gap-1 text-sm">
        Int bits
        <input type="number" min={1} max={32} value={fmt.intBits}
          onChange={e => onChange({ ...fmt, intBits: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) })}
          className="w-14 border border-gray-300 rounded px-2 py-0.5 font-mono text-sm" />
      </label>
      <label className="flex items-center gap-1 text-sm">
        Frac bits
        <input type="number" min={0} max={32} value={fmt.fracBits}
          onChange={e => onChange({ ...fmt, fracBits: Math.max(0, Math.min(32, parseInt(e.target.value) || 0)) })}
          className="w-14 border border-gray-300 rounded px-2 py-0.5 font-mono text-sm" />
      </label>
      <span className="font-mono text-sm text-primary-dark font-semibold">{formatLabel(fmt)}</span>
    </div>
  )
}

export default function Advisor() {
  const [stages, setStages] = useState<Stage[]>([
    { id: 1, label: 'Stage 1', fmt: { signed: false, intBits: 8, fracBits: 8 }, idealValue: '3.14159' },
  ])
  const [outputFmt, setOutputFmt] = useState<FixedPointFormat>({ signed: false, intBits: 8, fracBits: 8 })
  const [nextId, setNextId] = useState(2)

  const addStage = () => {
    setStages(s => [...s, { id: nextId, label: 'Stage ' + nextId, fmt: { signed: false, intBits: 8, fracBits: 8 }, idealValue: '1.0' }])
    setNextId(n => n + 1)
  }

  const removeStage = (id: number) => setStages(s => s.filter(st => st.id !== id))
  const updateStage = (id: number, patch: Partial<Stage>) =>
    setStages(s => s.map(st => st.id === id ? { ...st, ...patch } : st))

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary-dark">Format Advisor</h1>
      <p className="text-gray-600">
        Chain computation stages and see how quantization error propagates. Enter ideal floating-point values at each stage to get format recommendations.
      </p>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const ideal = parseFloat(stage.idealValue) || 0
          const result = quantize(ideal, stage.fmt)
          const range = representableRange(stage.fmt)
          const snr = snrDb(range.lsb)
          const covers = ideal >= range.min && ideal <= range.max

          return (
            <section key={stage.id} className="bg-white rounded-xl shadow p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">{idx + 1}</span>
                  <input
                    value={stage.label}
                    onChange={e => updateStage(stage.id, { label: e.target.value })}
                    className="text-lg font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-primary outline-none bg-transparent"
                  />
                </div>
                {stages.length > 1 && (
                  <button onClick={() => removeStage(stage.id)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
                )}
              </div>

              <FmtInput fmt={stage.fmt} onChange={fmt => updateStage(stage.id, { fmt })} />

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-32">Ideal value</label>
                <input
                  value={stage.idealValue}
                  onChange={e => updateStage(stage.id, { idealValue: e.target.value })}
                  className="w-40 border border-gray-300 rounded px-3 py-1.5 font-mono text-sm"
                  placeholder="e.g. 3.14159"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Quantized value</div>
                  <div className="font-mono text-sm font-bold text-gray-800">{result.value.toFixed(6)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Quantization error</div>
                  <div className={'font-mono text-sm font-bold ' + precisionColor(result.quantizationError, range.lsb)}>
                    {result.quantizationError.toFixed(6)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">SNR (theoretical)</div>
                  <div className="font-mono text-sm font-bold text-gray-800">{snr.toFixed(1)} dB</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">LSB</div>
                  <div className="font-mono text-sm font-bold text-gray-800">{range.lsb.toFixed(8)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={'text-xs font-semibold px-3 py-1 rounded-full border ' + (covers ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300')}>
                  {covers ? '✓ Range OK' : '✗ Out of range'}
                </span>
                <span className={'text-xs font-semibold px-3 py-1 rounded-full border ' + badgeColor(result.quantizationError, range.lsb)}>
                  {Math.abs(result.quantizationError) < range.lsb * 0.001 ? '✓ Exact' : Math.abs(result.quantizationError) < range.lsb ? '~ Marginal precision' : '✗ Precision loss'}
                </span>
                {result.overflow && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-red-100 text-red-700 border-red-300">OVERFLOW</span>
                )}
              </div>

              {!covers && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  💡 <strong>Suggestion:</strong> Value {ideal} is outside range [{range.min.toFixed(4)}, {range.max.toFixed(4)}].
                  Consider increasing integer bits to accommodate this value.
                </div>
              )}
            </section>
          )
        })}
      </div>

      <button
        onClick={addStage}
        className="w-full py-3 border-2 border-dashed border-primary-dark text-primary-dark rounded-xl font-semibold hover:bg-primary-light transition-colors"
      >
        + Add Stage
      </button>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Output Format</h2>
        <FmtInput fmt={outputFmt} onChange={setOutputFmt} />
        <div className="text-sm text-gray-600 font-mono">
          Range: {representableRange(outputFmt).min.toFixed(4)} to {representableRange(outputFmt).max.toFixed(4)}&nbsp;|&nbsp;
          SNR: {snrDb(representableRange(outputFmt).lsb).toFixed(1)} dB&nbsp;|&nbsp;
          LSB: {representableRange(outputFmt).lsb.toFixed(8)}
        </div>
      </section>
    </div>
  )
}

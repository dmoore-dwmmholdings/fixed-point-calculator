import { useState, useCallback } from 'react'
import { quantize, FixedPointFormat, formatLabel } from '../engine/fixedPoint'

interface SampleResult {
  input: number
  fixedOutput: number
  floatRef: number | null
  absError: number | null
  relError: number | null
  overflow: boolean
}

interface Stats {
  mean: number
  max: number
  rms: number
  overflowCount: number
}

// Minimal C expression interpreter for fixed-point expressions
// Supports: +, -, *, /, integer literals, the variable 'x'
function evalCExpression(expr: string, x: number, fmt: FixedPointFormat): number {
  // Replace fixed-point-style casts with quantized values
  // Simple safe eval via Function constructor (sandboxed to expression only)
  try {
    const scale = Math.pow(2, fmt.fracBits)
    // Replace 'x' with the quantized input value
    const qx = Math.round(x * scale) / scale
    // Very restricted expression evaluation
    const sanitized = expr
      .replace(/[^0-9x+\-*/().\s]/g, '') // strip anything not math
      .replace(/\bx\b/g, String(qx))
    // eslint-disable-next-line no-new-func
    const result = new Function('return (' + sanitized + ')')()
    return typeof result === 'number' ? result : NaN
  } catch {
    return NaN
  }
}

function computeStats(results: SampleResult[]): Stats {
  const errors = results.filter(r => r.absError !== null).map(r => r.absError as number)
  if (errors.length === 0) return { mean: 0, max: 0, rms: 0, overflowCount: 0 }
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length
  const max = Math.max(...errors.map(Math.abs))
  const rms = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length)
  const overflowCount = results.filter(r => r.overflow).length
  return { mean, max, rms, overflowCount }
}

function exportCsv(results: SampleResult[]) {
  const header = 'input,fixed_output,float_ref,abs_error,rel_error,overflow'
  const rows = results.map(r =>
    [r.input, r.fixedOutput, r.floatRef ?? '', r.absError ?? '', r.relError ?? '', r.overflow].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'fixedflow-analysis.csv'; a.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_CODE = `// Fixed-point expression using variable 'x'
// Supported: +, -, *, /, parentheses, numeric literals
// Example: multiply x by 0.5 then add 1.0
x * 0.5 + 1.0`

const DEFAULT_REF = `// Floating-point reference (ideal result for x)
x * 0.5 + 1.0`

export default function Analyzer() {
  const [fmt, setFmt] = useState<FixedPointFormat>({ signed: true, intBits: 8, fracBits: 8 })
  const [codeExpr, setCodeExpr] = useState(DEFAULT_CODE)
  const [refExpr, setRefExpr] = useState(DEFAULT_REF)
  const [rangeMin, setRangeMin] = useState('-10')
  const [rangeMax, setRangeMax] = useState('10')
  const [rangeStep, setRangeStep] = useState('0.5')
  const [results, setResults] = useState<SampleResult[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(() => {
    setRunning(true)
    setError(null)
    try {
      const min = parseFloat(rangeMin)
      const max = parseFloat(rangeMax)
      const step = parseFloat(rangeStep)
      if (isNaN(min) || isNaN(max) || isNaN(step) || step <= 0 || min >= max) {
        setError('Invalid range parameters.')
        setRunning(false)
        return
      }

      // Extract just the expression (strip comments)
      const stripComments = (s: string) => s.replace(/\/\/[^\n]*/g, '').trim()
      const fixedExpr = stripComments(codeExpr)
      const floatRefExpr = stripComments(refExpr)

      const newResults: SampleResult[] = []
      for (let x = min; x <= max + 1e-9; x += step) {
        const xRounded = Math.round(x * 1e9) / 1e9
        const fixedRaw = evalCExpression(fixedExpr, xRounded, fmt)
        const qResult = quantize(fixedRaw, fmt)
        const floatRef = floatRefExpr ? evalCExpression(floatRefExpr, xRounded, { ...fmt, fracBits: 0 }) : null

        // For float ref, use full precision (no quantization)
        let floatRefVal: number | null = null
        try {
          const sanitized = floatRefExpr.replace(/[^0-9x+\-*/().\s]/g, '').replace(/\bx\b/g, String(xRounded))
          // eslint-disable-next-line no-new-func
          floatRefVal = new Function('return (' + sanitized + ')')() as number
        } catch { floatRefVal = null }

        const absError = floatRefVal !== null ? Math.abs(qResult.value - floatRefVal) : null
        const relError = floatRefVal !== null && floatRefVal !== 0 ? absError! / Math.abs(floatRefVal) : null

        newResults.push({
          input: xRounded,
          fixedOutput: qResult.value,
          floatRef: floatRefVal,
          absError,
          relError,
          overflow: qResult.overflow,
        })
      }

      setResults(newResults)
      setStats(computeStats(newResults))
    } catch (e) {
      setError(String(e))
    }
    setRunning(false)
  }, [codeExpr, refExpr, rangeMin, rangeMax, rangeStep, fmt])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary-dark">C Code Analyzer</h1>
      <p className="text-gray-600">
        Enter a fixed-point expression using variable <code className="bg-gray-100 px-1 rounded font-mono">x</code>, sweep over a value range, and compare against a floating-point reference.
      </p>

      {/* Format */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Fixed-Point Format</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fmt.signed} onChange={e => setFmt(f => ({ ...f, signed: e.target.checked }))} className="accent-primary" />
            Signed
          </label>
          <label className="flex items-center gap-2 text-sm">
            Int bits
            <input type="number" min={1} max={32} value={fmt.intBits}
              onChange={e => setFmt(f => ({ ...f, intBits: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Frac bits
            <input type="number" min={0} max={32} value={fmt.fracBits}
              onChange={e => setFmt(f => ({ ...f, fracBits: Math.max(0, Math.min(32, parseInt(e.target.value) || 0)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
          </label>
          <span className="font-mono text-sm text-primary-dark font-bold">{formatLabel(fmt)}</span>
        </div>
      </section>

      {/* Code Input */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Fixed-Point Expression</h2>
        <textarea
          value={codeExpr}
          onChange={e => setCodeExpr(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:border-primary outline-none resize-y"
          spellCheck={false}
        />
        <h2 className="text-lg font-semibold text-gray-800">Float Reference (optional)</h2>
        <textarea
          value={refExpr}
          onChange={e => setRefExpr(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:border-primary outline-none resize-y"
          spellCheck={false}
        />
      </section>

      {/* Range */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Input Range</h2>
        <div className="flex flex-wrap gap-4 items-center">
          {([['Min', rangeMin, setRangeMin], ['Max', rangeMax, setRangeMax], ['Step', rangeStep, setRangeStep]] as [string, string, (v: string) => void][]).map(([label, val, set]) => (
            <label key={label} className="flex items-center gap-2 text-sm">
              {label}
              <input value={val} onChange={e => set(e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
            </label>
          ))}
        </div>
        {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
        <button
          onClick={runAnalysis}
          disabled={running}
          className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Analysis'}
        </button>
      </section>

      {/* Stats */}
      {stats && (
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Error Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Mean |error|', stats.mean.toExponential(3)],
              ['Max |error|', stats.max.toExponential(3)],
              ['RMS error', stats.rms.toExponential(3)],
              ['Overflow samples', String(stats.overflowCount)],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`font-mono text-base font-bold ${label === 'Overflow samples' && parseInt(val) > 0 ? 'text-red-600' : 'text-gray-800'}`}>{val}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => exportCsv(results)}
            className="text-sm text-primary-dark underline hover:text-primary font-medium"
          >
            Export CSV
          </button>
        </section>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Sample Results ({results.length} points)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Input (x)</th>
                  <th className="pb-2 pr-4">Fixed Output</th>
                  <th className="pb-2 pr-4">Float Ref</th>
                  <th className="pb-2 pr-4">|Error|</th>
                  <th className="pb-2 pr-4">Rel Error</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 100).map((r, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${r.overflow ? 'bg-red-50' : ''}`}>
                    <td className="py-1 pr-4">{r.input.toFixed(4)}</td>
                    <td className="py-1 pr-4">{r.fixedOutput.toFixed(6)}</td>
                    <td className="py-1 pr-4">{r.floatRef !== null ? r.floatRef.toFixed(6) : '—'}</td>
                    <td className={`py-1 pr-4 ${r.absError !== null && r.absError > 0.01 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {r.absError !== null ? r.absError.toExponential(3) : '—'}
                    </td>
                    <td className="py-1 pr-4">{r.relError !== null ? (r.relError * 100).toFixed(3) + '%' : '—'}</td>
                    <td className="py-1">
                      {r.overflow
                        ? <span className="text-red-600 font-semibold">OVF</span>
                        : <span className="text-green-600">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 100 && (
              <div className="text-sm text-gray-500 mt-2">Showing first 100 of {results.length} samples. Export CSV for full data.</div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

import { useState, useCallback, useMemo, useRef } from 'react'
import { quantize, FixedPointFormat, formatLabel } from '../engine/fixedPoint'

const JS_KEYWORDS = new Set(['return','if','else','for','while','do','switch','case','break','continue','new','typeof','instanceof','void','delete','in','of','let','const','var','function','class','import','export','default','true','false','null','undefined','Math','Number','parseInt','parseFloat','NaN','Infinity','this','super'])

function detectVariables(expr: string): string[] {
  const tokens = expr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []
  const seen = new Set<string>()
  const vars: string[] = []
  for (const t of tokens) {
    if (!JS_KEYWORDS.has(t) && !seen.has(t)) { seen.add(t); vars.push(t) }
  }
  return vars
}

function stripComments(s: string) { return s.replace(/\/\/[^\n]*/g, '').trim() }

function evalExpr(expr: string, vars: Record<string, number>): number {
  try {
    let sanitized = stripComments(expr)
    for (const [k, v] of Object.entries(vars)) {
      sanitized = sanitized.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v))
    }
    sanitized = sanitized.replace(/[^0-9+\-*/().\s]/g, '')
    // eslint-disable-next-line no-new-func
    const r = new Function('return (' + sanitized + ')')()
    return typeof r === 'number' && isFinite(r) ? r : NaN
  } catch { return NaN }
}

function quantizeVar(value: number, type: string): number {
  const limits: Record<string, [number, number]> = {
    'int8_t': [-128, 127], 'int16_t': [-32768, 32767], 'int32_t': [-2147483648, 2147483647],
    'uint8_t': [0, 255], 'uint16_t': [0, 65535], 'uint32_t': [0, 4294967295],
  }
  const [lo, hi] = limits[type] ?? [-Infinity, Infinity]
  return Math.max(lo, Math.min(hi, Math.trunc(value)))
}

interface VarConfig {
  name: string
  type: string
  min: string
  max: string
  step: string
}

interface SampleResult {
  vars: Record<string, number>
  fixedOutput: number
  floatRef: number
  absError: number
  relError: number
  overflow: boolean
}

function cartesian(arrays: number[][]): number[][] {
  return arrays.reduce<number[][]>((acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])), [[]])
}

interface LineChartProps {
  data: { x: number; fixed: number; ref: number }[]
  width?: number
  height?: number
}

function LineChart({ data, width = 600, height = 200 }: LineChartProps) {
  if (data.length === 0) return null
  const pad = { top: 16, right: 16, bottom: 32, left: 48 }
  const W = width - pad.left - pad.right
  const H = height - pad.top - pad.bottom
  const xs = data.map(d => d.x)
  const ys = data.flatMap(d => [d.fixed, d.ref])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const px = (x: number) => pad.left + ((x - minX) / rangeX) * W
  const py = (y: number) => pad.top + (1 - (y - minY) / rangeY) * H
  const fixedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(d.x).toFixed(1)},${py(d.fixed).toFixed(1)}`).join(' ')
  const refPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(d.x).toFixed(1)},${py(d.ref).toFixed(1)}`).join(' ')
  const yTicks = [minY, (minY + maxY) / 2, maxY]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {yTicks.map(y => (
        <g key={y}>
          <line x1={pad.left} y1={py(y)} x2={pad.left + W} y2={py(y)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={pad.left - 4} y={py(y)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">{y.toFixed(2)}</text>
        </g>
      ))}
      <path d={refPath} fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d={fixedPath} fill="none" stroke="#00C853" strokeWidth="2" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke="#d1d5db" strokeWidth="1" />
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke="#d1d5db" strokeWidth="1" />
      {[minX, (minX + maxX) / 2, maxX].map(x => (
        <text key={x} x={px(x)} y={pad.top + H + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">{x.toFixed(2)}</text>
      ))}
      <text x={pad.left + W / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#6b7280">— Fixed  - - Float ref</text>
    </svg>
  )
}

interface ErrorChartProps {
  data: { x: number; error: number }[]
  width?: number
  height?: number
}

function ErrorChart({ data, width = 600, height = 150 }: ErrorChartProps) {
  if (data.length === 0) return null
  const pad = { top: 16, right: 16, bottom: 32, left: 48 }
  const W = width - pad.left - pad.right
  const H = height - pad.top - pad.bottom
  const xs = data.map(d => d.x)
  const errs = data.map(d => d.error)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const maxE = Math.max(...errs, 1e-10)
  const px = (x: number) => pad.left + ((x - minX) / (maxX - minX || 1)) * W
  const py = (e: number) => pad.top + (1 - e / maxE) * H
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(d.x).toFixed(1)},${py(d.error).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <line x1={pad.left} y1={pad.top + H} x2={pad.left + W} y2={pad.top + H} stroke="#d1d5db" strokeWidth="1" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + H} stroke="#d1d5db" strokeWidth="1" />
      <text x={pad.left - 4} y={pad.top} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">{maxE.toExponential(2)}</text>
      <text x={pad.left - 4} y={pad.top + H} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">0</text>
      <path d={path} fill="none" stroke="#ef4444" strokeWidth="1.5" />
      <text x={pad.left + W / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#6b7280">Absolute Error</text>
    </svg>
  )
}

function exportCsv(results: SampleResult[], varNames: string[]) {
  const header = [...varNames, 'fixed_output', 'float_ref', 'abs_error', 'rel_error', 'overflow'].join(',')
  const rows = results.map(r => [...varNames.map(v => r.vars[v]), r.fixedOutput, r.floatRef, r.absError, r.relError, r.overflow].join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'fixedflow-analysis.csv'; a.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_EXPR = `// Enter a fixed-point expression using variable names (e.g. x, gain, offset)
// Supported: +, -, *, /, parentheses, numeric literals
x * 0.5 + 1.0`

export default function Analyzer() {
  const [fmt, setFmt] = useState<FixedPointFormat>({ signed: true, intBits: 8, fracBits: 8 })
  const [expr, setExpr] = useState(DEFAULT_EXPR)
  const [varConfigs, setVarConfigs] = useState<VarConfig[]>([{ name: 'x', type: 'int16_t', min: '-10', max: '10', step: '0.5' }])
  const [results, setResults] = useState<SampleResult[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const cancelRef = useRef(false)

  const detectedVars = useMemo(() => detectVariables(stripComments(expr)), [expr])

  const syncedConfigs = useMemo(() => {
    return detectedVars.map(name => varConfigs.find(c => c.name === name) ?? { name, type: 'int16_t', min: '-10', max: '10', step: '1' })
  }, [detectedVars, varConfigs])

  const updateVarConfig = (name: string, patch: Partial<VarConfig>) => {
    setVarConfigs(prev => {
      const existing = prev.find(c => c.name === name)
      if (existing) return prev.map(c => c.name === name ? { ...c, ...patch } : c)
      return [...prev, { name, type: 'int16_t', min: '-10', max: '10', step: '1', ...patch }]
    })
  }

  const stats = useMemo(() => {
    if (results.length === 0) return null
    const errors = results.map(r => r.absError)
    return {
      mean: errors.reduce((a, b) => a + b, 0) / errors.length,
      max: Math.max(...errors),
      rms: Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length),
      overflowCount: results.filter(r => r.overflow).length,
    }
  }, [results])

  const chartData = useMemo(() => {
    if (results.length === 0 || detectedVars.length === 0) return { line: [], error: [] }
    const primaryVar = detectedVars[0]
    return {
      line: results.map(r => ({ x: r.vars[primaryVar] ?? 0, fixed: r.fixedOutput, ref: r.floatRef })),
      error: results.map(r => ({ x: r.vars[primaryVar] ?? 0, error: r.absError })),
    }
  }, [results, detectedVars])

  const BATCH_SIZE = 500

  const cancelAnalysis = useCallback(() => {
    cancelRef.current = true
  }, [])

  const runAnalysis = useCallback(() => {
    setRunning(true)
    setError(null)
    setResults([])
    setProgress(null)
    cancelRef.current = false

    const cleanExpr = stripComments(expr)
    const configs = syncedConfigs

    if (configs.length === 0) {
      setError('No variables detected in expression.')
      setRunning(false)
      return
    }

    const ranges: number[][] = configs.map(cfg => {
      const min = parseFloat(cfg.min), max = parseFloat(cfg.max), step = parseFloat(cfg.step)
      if (isNaN(min) || isNaN(max) || isNaN(step) || step <= 0) return [min]
      const pts: number[] = []
      for (let v = min; v <= max + 1e-9; v += step) pts.push(Math.round(v * 1e9) / 1e9)
      return pts
    })

    const combinations = cartesian(ranges)

    if (combinations.length > 50000) {
      setError(`Warning: ${combinations.length.toLocaleString()} combinations — this may take a while. Hit Cancel if it's too slow, then reduce your range or increase step size.`)
    }

    const total = combinations.length
    setProgress({ done: 0, total })

    const processBatch = (startIdx: number, accumulated: SampleResult[]) => {
      if (startIdx === 0) {
        ;(processBatch as unknown as { startTime?: number }).startTime = Date.now()
      }
      const elapsed = Date.now() - ((processBatch as unknown as { startTime?: number }).startTime ?? Date.now())
      if (elapsed > 8000 && startIdx > 0 && startIdx < total * 0.5) {
        setError(`Still running (${Math.round(elapsed / 1000)}s elapsed, ${progress?.done?.toLocaleString() ?? 0}/${total.toLocaleString()} done). Hit Cancel to stop and retry with fewer combinations.`)
      }
      if (cancelRef.current) {
        setResults(accumulated)
        setRunning(false)
        setProgress(null)
        return
      }

      const endIdx = Math.min(startIdx + BATCH_SIZE, total)
      const batch: SampleResult[] = []

      for (let i = startIdx; i < endIdx; i++) {
        const combo = combinations[i]
        const rawVars: Record<string, number> = {}
        const fixedVars: Record<string, number> = {}
        configs.forEach((cfg, j) => {
          rawVars[cfg.name] = combo[j]
          fixedVars[cfg.name] = quantizeVar(combo[j], cfg.type)
        })
        const fixedRaw = evalExpr(cleanExpr, fixedVars)
        const floatRef = evalExpr(cleanExpr, rawVars)
        const q = quantize(fixedRaw, fmt)
        const absError = isNaN(floatRef) ? 0 : Math.abs(q.value - floatRef)
        const relError = floatRef !== 0 && !isNaN(floatRef) ? absError / Math.abs(floatRef) : 0
        batch.push({ vars: rawVars, fixedOutput: q.value, floatRef: isNaN(floatRef) ? 0 : floatRef, absError, relError, overflow: q.overflow })
      }

      const next = [...accumulated, ...batch]
      setProgress({ done: endIdx, total })

      if (endIdx >= total) {
        setResults(next)
        setRunning(false)
        setProgress(null)
      } else {
        setTimeout(() => processBatch(endIdx, next), 0)
      }
    }

    setTimeout(() => processBatch(0, []), 0)
  }, [expr, syncedConfigs, fmt])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary-dark">C Code Analyzer</h1>
      <p className="text-gray-600">
        Enter a fixed-point expression using variable names. Variables are auto-detected — configure their C type and sweep range below.
        The float reference is automatically derived by re-running the same expression with unquantized values.
      </p>

      {/* Format */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Fixed-Point Output Format</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fmt.signed} onChange={e => setFmt(f => ({ ...f, signed: e.target.checked }))} className="accent-primary" />
            Signed
          </label>
          <label className="flex items-center gap-2 text-sm">Int bits
            <input type="number" min={1} max={32} value={fmt.intBits} onChange={e => setFmt(f => ({ ...f, intBits: Math.max(1, Math.min(32, parseInt(e.target.value) || 1)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">Frac bits
            <input type="number" min={0} max={32} value={fmt.fracBits} onChange={e => setFmt(f => ({ ...f, fracBits: Math.max(0, Math.min(32, parseInt(e.target.value) || 0)) }))}
              className="w-16 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
          </label>
          <span className="font-mono text-sm text-primary-dark font-bold">{formatLabel(fmt)}</span>
        </div>
      </section>

      {/* Expression */}
      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Expression</h2>
        <textarea value={expr} onChange={e => setExpr(e.target.value)} rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:border-primary outline-none resize-y" spellCheck={false} />
        {detectedVars.length > 0 && (
          <div className="text-xs text-gray-500">Detected variables: <span className="font-mono font-semibold text-primary-dark">{detectedVars.join(', ')}</span></div>
        )}
      </section>

      {/* Variable configs */}
      {syncedConfigs.length > 0 && (
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Variable Configuration &amp; Sweep Range</h2>
          {syncedConfigs.map(cfg => (
            <div key={cfg.name} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary-dark bg-primary-light px-2 py-0.5 rounded">{cfg.name}</span>
                <select value={cfg.type} onChange={e => updateVarConfig(cfg.name, { type: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1 text-sm font-mono">
                  {['int8_t','int16_t','int32_t','uint8_t','uint16_t','uint32_t'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-4">
                {(['min','max','step'] as const).map(field => (
                  <label key={field} className="flex items-center gap-2 text-sm capitalize">
                    {field}
                    <input value={cfg[field]} onChange={e => updateVarConfig(cfg.name, { [field]: e.target.value })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 font-mono text-sm" />
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
          {progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>Processing... {progress.done.toLocaleString()} / {progress.total.toLocaleString()}</span>
                <span>{Math.round((progress.done / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={runAnalysis} disabled={running}
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50">
              {running ? 'Running...' : 'Run Analysis'}
            </button>
            {running && (
              <button onClick={cancelAnalysis}
                className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      {/* Charts */}
      {results.length > 0 && (
        <section className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Output vs Reference</h2>
          <LineChart data={chartData.line} />
          <h2 className="text-lg font-semibold text-gray-800">Absolute Error</h2>
          <ErrorChart data={chartData.error} />
        </section>
      )}

      {/* Stats */}
      {stats && (
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Error Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([['Mean |error|', stats.mean.toExponential(3)],['Max |error|', stats.max.toExponential(3)],['RMS error', stats.rms.toExponential(3)],['Overflow samples', String(stats.overflowCount)]] as [string,string][]).map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`font-mono text-base font-bold ${label === 'Overflow samples' && parseInt(val) > 0 ? 'text-red-600' : 'text-gray-800'}`}>{val}</div>
              </div>
            ))}
          </div>
          <button onClick={() => exportCsv(results, detectedVars)} className="text-sm text-primary-dark underline hover:text-primary font-medium">Export CSV</button>
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
                  {detectedVars.map(v => <th key={v} className="pb-2 pr-4">{v}</th>)}
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
                    {detectedVars.map(v => <td key={v} className="py-1 pr-4">{r.vars[v]?.toFixed(4)}</td>)}
                    <td className="py-1 pr-4">{r.fixedOutput.toFixed(6)}</td>
                    <td className="py-1 pr-4">{r.floatRef.toFixed(6)}</td>
                    <td className={`py-1 pr-4 ${r.absError > 0.01 ? 'text-yellow-600' : 'text-green-600'}`}>{r.absError.toExponential(3)}</td>
                    <td className="py-1 pr-4">{(r.relError * 100).toFixed(3)}%</td>
                    <td className="py-1">{r.overflow ? <span className="text-red-600 font-semibold">OVF</span> : <span className="text-green-600">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 100 && <div className="text-sm text-gray-500 mt-2">Showing first 100 of {results.length} samples. Export CSV for full data.</div>}
          </div>
        </section>
      )}
    </div>
  )
}

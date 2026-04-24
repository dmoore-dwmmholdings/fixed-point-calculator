import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Section {
  id: string
  title: string
  content: ReactNode
}

const sections: Section[] = [
  {
    id: 'what-is-fixed-point',
    title: 'What is Fixed-Point Arithmetic?',
    content: (
      <div className="space-y-3 text-gray-700">
        <p>
          Fixed-point arithmetic represents fractional numbers using integers by scaling all values by a constant
          power of 2. Instead of storing <code className="bg-gray-100 px-1 rounded font-mono">3.14</code>, you store{' '}
          <code className="bg-gray-100 px-1 rounded font-mono">804</code> (= 3.14 × 256) and remember that the scale
          factor is 256.
        </p>
        <p>
          This allows fractional math on processors without an FPU — microcontrollers, DSPs, FPGAs — using only
          integer ALU operations.
        </p>
      </div>
    ),
  },
  {
    id: 'format-notation',
    title: 'Format Notation (Q notation)',
    content: (
      <div className="space-y-3 text-gray-700">
        <p>FixedFlow uses the following notation:</p>
        <ul className="list-disc list-inside space-y-1 font-mono text-sm">
          <li><strong>Q8.8</strong> — unsigned, 8 integer bits, 8 fractional bits (16 bits total)</li>
          <li><strong>SQ7.8</strong> — signed (two's complement), 7 integer bits, 8 fractional bits (16 bits total)</li>
          <li><strong>Q0.16</strong> — unsigned, 0 integer bits, 16 fractional bits (pure fraction 0–0.99998)</li>
        </ul>
        <p>
          The <strong>LSB value</strong> (resolution) is always <code className="bg-gray-100 px-1 rounded font-mono">2^(-fracBits)</code>.
          For Q8.8 this is <code className="bg-gray-100 px-1 rounded font-mono">1/256 ≈ 0.00390625</code>.
        </p>
      </div>
    ),
  },
  {
    id: 'bit-visualizer',
    title: 'Bit Visualizer',
    content: (
      <div className="space-y-3 text-gray-700">
        <p>
          The <Link to="/calculator" className="text-primary-dark font-semibold underline">Bit Visualizer</Link> lets
          you enter two operands and an operation (+, −, ×, ÷), then shows:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="inline-block w-3 h-3 bg-blue-400 rounded mr-1" />Sign bit (blue)</li>
          <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-1" />Integer bits (green)</li>
          <li><span className="inline-block w-3 h-3 bg-teal-400 rounded mr-1" />Fractional bits (teal)</li>
          <li><span className="inline-block w-3 h-3 bg-red-400 rounded mr-1" />Overflow (red — all bits)</li>
        </ul>
        <p>
          Results are shown in decimal, hex, or binary. Quantization error is reported as both absolute and relative
          values. Overflow and precision-loss badges appear automatically.
        </p>
      </div>
    ),
  },
  {
    id: 'format-advisor',
    title: 'Format Advisor',
    content: (
      <div className="space-y-3 text-gray-700">
        <p>
          The <Link to="/advisor" className="text-primary-dark font-semibold underline">Format Advisor</Link> lets
          you model a chain of computation stages. At each stage you specify:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>The fixed-point format (signed, int bits, frac bits)</li>
          <li>The ideal floating-point value at that stage</li>
        </ul>
        <p>FixedFlow then shows:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Whether the format covers the value (range check)</li>
          <li>Quantization error at this stage</li>
          <li>Theoretical SNR: <code className="bg-gray-100 px-1 rounded font-mono">6.02N + 1.76 dB</code></li>
          <li>Format improvement suggestions when range is exceeded</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'c-analyzer',
    title: 'C Code Analyzer',
    content: (
      <div className="space-y-3 text-gray-700">
        <p>
          The <Link to="/analyzer" className="text-primary-dark font-semibold underline">C Code Analyzer</Link> is
          the signature feature. Enter a fixed-point expression using variable{' '}
          <code className="bg-gray-100 px-1 rounded font-mono">x</code>, a floating-point reference, and a sweep
          range. FixedFlow evaluates both over the range and reports:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Per-sample: input, fixed output, float reference, absolute error, relative error</li>
          <li>Statistics: mean error, max error, RMS error, overflow sample count</li>
          <li>CSV export of all results</li>
        </ul>
        <p className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
          <strong>Note:</strong> The current MVP uses a TypeScript expression interpreter supporting{' '}
          <code className="font-mono">+, -, *, /, (, )</code> and the variable{' '}
          <code className="font-mono">x</code>. Full C compilation via WebAssembly is planned for a future release.
        </p>
      </div>
    ),
  },
  {
    id: 'tips',
    title: 'Tips & Best Practices',
    content: (
      <div className="space-y-3 text-gray-700">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Choose frac bits based on required resolution:</strong> If you need 0.001 accuracy, you need at least <code className="bg-gray-100 px-1 rounded font-mono">log2(1/0.001) ≈ 10</code> fractional bits.</li>
          <li><strong>Choose int bits based on dynamic range:</strong> If your values can reach 100, you need at least <code className="bg-gray-100 px-1 rounded font-mono">log2(100) ≈ 7</code> integer bits (plus 1 for signed).</li>
          <li><strong>Watch for accumulator growth:</strong> Multiplying two Q8.8 numbers produces a Q16.16 result — make sure your accumulator format is wide enough.</li>
          <li><strong>Saturate, don't wrap:</strong> Overflow that wraps produces wildly incorrect results. Use saturation arithmetic in safety-critical code.</li>
          <li><strong>Verify with the C Analyzer:</strong> Sweep your full expected input range before committing to a format.</li>
        </ul>
      </div>
    ),
  },
]

export default function Docs() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary-dark">Documentation</h1>
        <p className="text-gray-500 mt-2">FixedFlow reference and usage guide</p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-white rounded-xl shadow p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contents</h2>
        <ol className="space-y-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={'#' + s.id} className="text-primary-dark hover:text-primary text-sm font-medium">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="bg-white rounded-xl shadow p-6 space-y-4 scroll-mt-6">
          <h2 className="text-xl font-bold text-gray-800">
            <span className="text-primary mr-2">{i + 1}.</span>{s.title}
          </h2>
          {s.content}
        </section>
      ))}
    </div>
  )
}

import { Link } from 'react-router-dom'

const features = [
  {
    title: 'Bit Visualizer',
    href: '/calculator',
    icon: '🔢',
    description:
      'Visualize exactly how your fixed-point values are stored in memory. See sign, integer, and fractional bit fields color-coded, detect overflow and precision loss instantly.',
    cta: 'Open Visualizer',
  },
  {
    title: 'Format Advisor',
    href: '/advisor',
    icon: '🎯',
    description:
      'Chain computation stages and track how quantization error propagates. Get SNR estimates, range coverage checks, and format improvement suggestions at every step.',
    cta: 'Open Advisor',
  },
  {
    title: 'C Code Analyzer',
    href: '/analyzer',
    icon: '⚙️',
    description:
      'Paste a fixed-point expression, sweep over an input range, and compare against a floating-point reference. Get per-sample error tables, RMS/max error stats, and CSV export.',
    cta: 'Open Analyzer',
    badge: 'Signature Feature',
  },
]

const facts = [
  { label: 'Pure TypeScript', desc: 'No WASM, no server — all math runs in your browser.' },
  { label: 'Bit-accurate', desc: 'Two\'s complement arithmetic with truncation toward zero.' },
  { label: 'Format-aware', desc: 'Supports signed/unsigned, any I/F bit split, up to 64 bits.' },
  { label: 'Open source', desc: 'Built for embedded engineers, by embedded engineers.' },
]

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="text-center py-16 space-y-6">
        <div className="inline-block bg-primary-light border border-primary rounded-full px-4 py-1 text-sm font-medium text-primary-dark mb-2">
          Fixed-point arithmetic tools for embedded engineers
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-primary-dark leading-tight">
          Precision<br />
          <span className="text-primary">by design.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          FixedFlow gives you instant visibility into fixed-point number representation,
          quantization error, and format suitability — without leaving your browser.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/calculator"
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors shadow"
          >
            Get Started
          </Link>
          <Link
            to="/docs"
            className="border-2 border-primary-dark text-primary-dark px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary-light transition-colors"
          >
            Read the Docs
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Three tools. One workflow.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.href} className="bg-white rounded-2xl shadow-md p-6 space-y-4 flex flex-col">
              <div className="flex items-start justify-between">
                <span className="text-4xl">{f.icon}</span>
                {f.badge && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">{f.badge}</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{f.title}</h3>
              <p className="text-gray-600 text-sm flex-1">{f.description}</p>
              <Link
                to={f.href}
                className="inline-block bg-primary-light text-primary-dark font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-colors text-center"
              >
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Facts Strip */}
      <section className="bg-primary-dark rounded-2xl p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {facts.map(f => (
            <div key={f.label} className="text-center space-y-1">
              <div className="text-primary font-bold text-sm uppercase tracking-wide">{f.label}</div>
              <div className="text-gray-300 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Example */}
      <section className="bg-white rounded-2xl shadow-md p-8 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">What is fixed-point arithmetic?</h2>
        <p className="text-gray-600">
          Fixed-point numbers represent fractional values using integer hardware by assigning a fixed number of bits
          to the fractional part. A <strong>Q8.8</strong> format uses 8 bits for the integer part and 8 bits for the
          fraction, giving a resolution of <strong>2⁻⁸ ≈ 0.00390625</strong>.
        </p>
        <p className="text-gray-600">
          This is how most embedded DSP, motor controllers, and audio codecs work internally — floating-point is too
          slow or unavailable on the target hardware. Getting the format wrong means overflow, precision loss, or
          both. FixedFlow helps you get it right before you write the firmware.
        </p>
        <Link to="/docs" className="text-primary-dark font-semibold hover:text-primary underline text-sm">
          Learn more in the docs →
        </Link>
      </section>
    </div>
  )
}

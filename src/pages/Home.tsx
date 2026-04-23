export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-primary-dark mb-4">FixedFlow</h1>
      <p className="text-xl text-gray-600 mb-8">Precision by design. Fixed-point arithmetic tools for embedded engineers.</p>
      <div className="flex justify-center gap-4">
        <a href="/calculator" className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors">Bit Visualizer</a>
        <a href="/advisor" className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors">Format Advisor</a>
        <a href="/analyzer" className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors">C Analyzer</a>
      </div>
    </div>
  )
}

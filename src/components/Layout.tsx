import { NavLink } from 'react-router-dom'
import { ReactNode } from 'react'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/calculator', label: 'Bit Visualizer' },
  { to: '/advisor', label: 'Format Advisor' },
  { to: '/analyzer', label: 'C Analyzer' },
  { to: '/docs', label: 'Docs' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-primary-light">
      <nav className="bg-primary-dark text-white px-6 py-4 flex items-center gap-8">
        <span className="text-xl font-bold tracking-tight text-primary">FixedFlow</span>
        <div className="flex gap-6">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-300 hover:text-white'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-10">
        {children}
      </main>

      <footer className="bg-primary-dark text-gray-400 text-center text-xs py-4">
        FixedFlow © {new Date().getFullYear()} — Precision by design.
      </footer>
    </div>
  )
}

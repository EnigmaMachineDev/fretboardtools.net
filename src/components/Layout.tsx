import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Coffee, Library, ListMusic, Menu, Search, SlidersHorizontal, Waves, X } from 'lucide-react'
import { ORG_NAME, SITE_NAME, SITE_NAME_SHORT } from '../config/site'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { path: '/', label: 'Chord Finder', icon: SlidersHorizontal },
  { path: '/identify', label: 'Identify', icon: Search },
  { path: '/scales', label: 'Scales', icon: ListMusic },
  { path: '/library', label: 'Library', icon: Library },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-brand-card focus:px-3 focus:py-2 focus:text-brand-bright"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 bg-brand-panel/95 backdrop-blur-sm border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-green flex items-center justify-center">
              <Waves size={16} className="text-brand-bg" />
            </div>
            <span className="text-lg font-bold text-brand-bright tracking-wider hidden sm:inline">
              {SITE_NAME}
            </span>
            <span className="text-lg font-bold text-brand-bright tracking-wider sm:hidden">
              {SITE_NAME_SHORT}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-brand-accent/30 text-brand-bright'
                      : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              )
            })}
            <a
              href="https://buymeacoffee.com/EnigmaMachineDev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors text-brand-muted hover:text-brand-text hover:bg-brand-hover"
            >
              <Coffee size={14} />
              <span>Support</span>
            </a>
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle className="p-2 rounded-lg text-brand-muted hover:text-brand-bright hover:bg-brand-hover transition-colors" />

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 text-brand-muted hover:text-brand-bright transition-colors"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-brand-border bg-brand-panel px-4 py-2" aria-label="Mobile">
            {navItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-brand-accent/30 text-brand-bright'
                      : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              )
            })}
            <a
              href="https://buymeacoffee.com/EnigmaMachineDev"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-brand-muted hover:text-brand-text hover:bg-brand-hover"
            >
              <Coffee size={16} />
              <span>Support</span>
            </a>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-brand-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-brand-muted">
          <div className="flex flex-wrap justify-center gap-4 mb-3">
            <Link to="/about" className="hover:text-brand-bright transition-colors">About</Link>
          </div>
          <p>
            {SITE_NAME} — a free, browser-only tool. No account required. Your data stays on
            your device.
          </p>
          <p className="mt-1">
            Built by <strong className="text-brand-bright">{ORG_NAME}</strong>
          </p>
        </div>
      </footer>
    </div>
  )
}

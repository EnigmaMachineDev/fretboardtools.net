import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

// Cycles the site theme: match system → light → dark. The state lives in
// public/theme.js (window.siteTheme), which runs before React so the first
// paint is already in the right palette.
type ThemePref = 'system' | 'light' | 'dark'

declare global {
  interface Window {
    siteTheme?: {
      get(): ThemePref
      set(pref: ThemePref): void
      resolved(): 'light' | 'dark'
      subscribe(fn: (pref: ThemePref, theme: 'light' | 'dark') => void): () => void
    }
  }
}

const ORDER: ThemePref[] = ['system', 'light', 'dark']
const META: Record<ThemePref, { icon: LucideIcon; label: string }> = {
  system: { icon: Monitor, label: 'Match system' },
  light: { icon: Sun, label: 'Light' },
  dark: { icon: Moon, label: 'Dark' },
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>(() => window.siteTheme?.get() ?? 'system')

  useEffect(() => window.siteTheme?.subscribe((p) => setPref(p)), [])

  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length] ?? 'system'
  const { icon: Icon, label } = META[pref]

  return (
    <button
      type="button"
      onClick={() => window.siteTheme?.set(next)}
      title={`Theme: ${label} — switch to ${META[next].label.toLowerCase()}`}
      aria-label={`Theme: ${label}. Switch to ${META[next].label.toLowerCase()}.`}
      className={className}
    >
      <Icon size={18} />
    </button>
  )
}

// The resolved theme ('light' | 'dark') for places a class can't reach, such
// as the fretboard's SVG presentation attributes.
export function useResolvedTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.siteTheme?.resolved() ?? 'light')
  useEffect(() => window.siteTheme?.subscribe((_, t) => setTheme(t)), [])
  return theme
}

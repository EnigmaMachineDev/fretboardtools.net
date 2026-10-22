// Theme colors are CSS variables (space-separated RGB channels, so opacity
// modifiers like bg-brand-accent/30 keep working). src/index.css defines them:
// :root is the light theme, [data-theme="dark"] the original dark green.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Shared EnigmaMachineDev dark-green palette (same values as SoulframeTools'
      // `sf` tokens and StreamDial's `brand` tokens). Namespaced as `brand` so it
      // survives a site rename.
      colors: {
        brand: {
          bg: token('brand-bg'),
          panel: token('brand-panel'),
          card: token('brand-card'),
          border: token('brand-border'),
          hover: token('brand-hover'),
          accent: token('brand-accent'),
          green: token('brand-green'),
          bright: token('brand-bright'),
          text: token('brand-text'),
          muted: token('brand-muted'),
          dim: token('brand-dim'),
        },
        // Difficulty badge accents (not part of the green theme surface).
        diff: {
          easy: '#4a8c4a',
          moderate: '#a8b84a',
          hard: '#c8964a',
          veryhard: '#c85a4a',
          impossible: '#8a4a4a',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // CSP is img-src 'self' with no data: — Vite's default (4096) would inline small
    // assets as data: URIs and silently break image loading in production.
    // If you ever need data: URIs, widen img-src in netlify.toml in the same commit.
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
})

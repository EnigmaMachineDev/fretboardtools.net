import { defineConfig } from '@playwright/test'

/**
 * E2E suite. Runs against the PRODUCTION build via `vite preview` — build
 * first (`npm run build`) or let the webServer command do it. Unit tests
 * (Vitest) live in src/**; these live in e2e/ and never overlap.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
  },
})

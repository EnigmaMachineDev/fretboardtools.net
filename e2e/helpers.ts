import { expect, type Page } from '@playwright/test'

/** Collect console errors + uncaught exceptions for the life of the page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  return errors
}

export function expectNoErrors(errors: string[]): void {
  expect(errors, errors.join('\n')).toEqual([])
}

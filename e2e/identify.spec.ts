import { expect, test } from '@playwright/test'
import { expectNoErrors, trackErrors } from './helpers'

test('empty board asks for at least two notes', async ({ page }) => {
  await page.goto('/identify')
  await expect(page.getByText('Add at least two notes to analyze the shape.')).toBeVisible()
})

test('1-5-8 shape identifies as a Power Chord with barre fingering', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/identify')
  await page.getByRole('button', { name: 'String 1, fret 0' }).click()
  await page.getByRole('button', { name: 'String 2, fret 2' }).click()
  await page.getByRole('button', { name: 'String 3, fret 2' }).click()
  await expect(page.getByText('0-7-12')).toBeVisible()
  await expect(page.getByText('Power Chord')).toBeVisible()
  await expect(page.getByText('fingering 133')).toBeVisible()
  await expect(page.getByText('Easy')).toBeVisible()
  expectNoErrors(errors)
})

test('the dim-triad / rootless-dom7 ambiguity is kept, ranked root-present first', async ({
  page,
}) => {
  await page.goto('/identify')
  // Voicing [0,3,6] on EADG: frets 4 / 2 / 0 on strings 1-3.
  await page.getByRole('button', { name: 'String 1, fret 4' }).click()
  await page.getByRole('button', { name: 'String 2, fret 2' }).click()
  await page.getByRole('button', { name: 'String 3, fret 0' }).click()
  await expect(page.getByText('0-3-6')).toBeVisible()
  await expect(page.getByText('Diminished', { exact: true })).toBeVisible()
  // Rootless interpretations appear only when asked for.
  await expect(page.getByText('Dominant 7 (rootless)')).not.toBeVisible()
  await page.getByRole('checkbox', { name: 'Rootless roots too' }).check()
  await expect(page.getByText('Dominant 7 (rootless)')).toBeVisible()
  await expect(page.getByText('root not sounded').first()).toBeVisible()
  // Root-present interpretations rank above rootless ones.
  const items = page.getByRole('listitem').filter({ hasText: /1-|root/ })
  const firstItem = items.first()
  await expect(firstItem).not.toContainText('root not sounded')
})

test('one note per string: clicking another fret moves the note, same fret removes it', async ({
  page,
}) => {
  await page.goto('/identify')
  await page.getByRole('button', { name: 'String 1, fret 0' }).click()
  await page.getByRole('button', { name: 'String 2, fret 2' }).click()
  await expect(page.getByText('0-7')).toBeVisible()
  // Move the string-2 note from fret 2 to fret 1 → voicing changes.
  await page.getByRole('button', { name: 'String 2, fret 1' }).click()
  await expect(page.getByText('0-6')).toBeVisible()
  // Clicking the occupied cell removes it → back under two notes.
  await page.getByRole('button', { name: 'String 2, fret 1' }).click()
  await expect(page.getByText('Add at least two notes to analyze the shape.')).toBeVisible()
})

test('Clear empties the board; changing tuning resets it', async ({ page }) => {
  await page.goto('/identify')
  await page.getByRole('button', { name: 'String 1, fret 0' }).click()
  await page.getByRole('button', { name: 'String 2, fret 2' }).click()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Add at least two notes to analyze the shape.')).toBeVisible()

  await page.getByRole('button', { name: 'String 1, fret 0' }).click()
  await page.getByRole('button', { name: 'String 2, fret 2' }).click()
  await page.getByLabel('Tuning').selectOption('builtin:standard5')
  await expect(page.getByText('Add at least two notes to analyze the shape.')).toBeVisible()
})

test('an unplayable shape is honestly marked Impossible', async ({ page }) => {
  await page.goto('/identify')
  // 5 distinct frets on a 5-string tuning → no valid finger assignment.
  await page.getByLabel('Tuning').selectOption('builtin:standard5')
  await page.getByRole('button', { name: 'String 1, fret 0' }).click()
  await page.getByRole('button', { name: 'String 2, fret 1' }).click()
  await page.getByRole('button', { name: 'String 3, fret 2' }).click()
  await page.getByRole('button', { name: 'String 4, fret 3' }).click()
  await page.getByRole('button', { name: 'String 5, fret 4' }).click()
  await expect(page.getByText(/no valid finger assignment exists/)).toBeVisible()
})

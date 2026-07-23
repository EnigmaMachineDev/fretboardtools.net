import { expect, test } from '@playwright/test'
import { expectNoErrors, trackErrors } from './helpers'

test('major scale on standard 4 yields 12 distinct boxes', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/scales')
  await expect(page.getByText('12 distinct boxes')).toBeVisible()
  await expect(page.getByText('Box 1', { exact: true })).toBeVisible()
  // Narrow windows produce honestly-flagged partial boxes.
  await expect(page.getByText('partial').first()).toBeVisible()
  expectNoErrors(errors)
})

test('symmetric scales collapse: chromatic → 1 box', async ({ page }) => {
  await page.goto('/scales')
  await page.getByLabel('Scale', { exact: true }).selectOption({ label: 'Chromatic' })
  await expect(page.getByText(/· 1 distinct box$/)).toBeVisible()
  await expect(page.getByText('Box 2', { exact: true })).toHaveCount(0)
})

test('custom degree sets work; missing root is rejected', async ({ page }) => {
  await page.goto('/scales')
  await page.getByLabel('Scale', { exact: true }).selectOption('custom')
  await page.getByLabel(/Degrees/).fill('1 2 3')
  await expect(page.getByText(/· \d+ distinct box/)).toBeVisible()
  await page.getByLabel(/Degrees/).fill('2 3')
  await expect(page.getByText('Enter a valid degree set including the root (1).')).toBeVisible()
})

test('window size changes the box set', async ({ page }) => {
  await page.goto('/scales')
  await page.getByLabel('Fret window').selectOption('3')
  await expect(page.getByText(/· \d+ distinct box/)).toBeVisible()
  // A 3-fret window over a 7-note scale can't cover everything everywhere —
  // some partials must exist; boxes still render.
  await expect(page.getByText('Box 1', { exact: true })).toBeVisible()
})

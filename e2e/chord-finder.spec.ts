import { expect, test } from '@playwright/test'
import { expectNoErrors, trackErrors } from './helpers'

test('default landing state: playable-only, grouped, 323 candidates', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page.getByText('323')).toBeVisible()
  await expect(page.getByText(/matching shapes/)).toBeVisible()
  await expect(page.getByText(/quality groups/)).toBeVisible()
  // Grouped results with at least one section heading and diagrams.
  await expect(page.locator('svg[role="img"]').first()).toBeVisible()
  expectNoErrors(errors)
})

test('degree query narrows results and round-trips through the URL', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/Scale degrees/).fill('1 b3 5')
  // URL picks up the degree constraint.
  await expect(page).toHaveURL(/d=0%2C3%2C7|d=0,3,7/)
  // Exactly the minor-triad quality: 17 shapes, 1 group on default geometry.
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  await expect(page.getByText(/1 quality group/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Minor \(m\)/ })).toBeVisible()
})

test('a shared URL reproduces the same result set', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/?t=builtin%3Astandard4&n=3-4&w=4&sk=1&d=0%2C3%2C7&ord=0&ex=1&md=3&rl=0&sort=play')
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Minor \(m\)/ })).toBeVisible()
  expectNoErrors(errors)
})

test('garbage URL params fall back to defaults instead of erroring', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/?t=nonsense&n=banana&w=99&d=0,99&md=17&sort=nope')
  await expect(page.getByText(/matching shapes/)).toBeVisible()
  expectNoErrors(errors)
})

test('difficulty filter hides shapes and "show impossible" reveals them', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Max difficulty').selectOption('easy')
  await expect(page.getByText(/hidden by the difficulty filter/)).toBeVisible()
  await page.getByRole('button', { name: /show the impossible ones too/ }).click()
  await expect(page).toHaveURL(/md=0/)
  await expect(page.getByText(/hidden by the difficulty filter/)).not.toBeVisible()
})

test('equivalent tunings produce identical result counts, and the badge says so', async ({
  page,
}) => {
  await page.goto('/?d=0,3,7')
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  await page.getByLabel('Tuning', { exact: true }).selectOption('builtin:bead')
  // Same gap vector → same shape space.
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  await expect(page.getByText(/Same shapes as/)).toBeVisible()
  await expect(page.getByText(/identical gap vector \(5,5,5\)/)).toBeVisible()
})

test('ordered matching restricts to one voicing family', async ({ page }) => {
  await page.goto('/?d=0,3,7')
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  await page.getByRole('checkbox', { name: 'In this exact bottom-up order' }).check()
  await expect(page).toHaveURL(/ord=1/)
  // Strictly fewer shapes than the full set of inversions.
  const counter = page.getByText(/matching shapes/)
  await expect(counter).not.toContainText('17')
})

test('string pinning writes ss= to the URL and constrains results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '1', exact: true }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await expect(page).toHaveURL(/ss=0%2C1%2C2|ss=0,1,2/)
  // Pinned 3 strings in a 4-fret window → exactly 37 candidates.
  await expect(page.getByText(/37 matching shape/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page).not.toHaveURL(/ss=/)
})

test('chord preset fills the degree constraint', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Chord preset').selectOption({ label: 'Minor 7 (m7)' })
  await expect(page).toHaveURL(/d=0%2C3%2C7%2C10|d=0,3,7,10/)
  await expect(page.getByRole('heading', { name: /Minor 7 \(m7\)/ })).toBeVisible()
})

test('the firehose guard blocks huge spaces until confirmed', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Tuning', { exact: true }).selectOption('builtin:standard6')
  await page.getByLabel('Max notes').selectOption('6')
  await page.getByLabel('Fret window').selectOption('8')
  await expect(page.getByText(/candidate\s+shapes/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate anyway' })).toBeVisible()
  // Results are NOT rendered until the user opts in.
  await expect(page.getByText(/matching shapes/)).not.toBeVisible()
})

test('voicing cards show fingering, difficulty, span, and favorite toggle', async ({ page }) => {
  await page.goto('/?d=0,3,7')
  const results = page.getByRole('region', { name: 'Results' })
  const firstCard = results.locator('svg[role="img"]').first()
  await expect(firstCard).toBeVisible()
  await expect(results.getByText('Easy', { exact: true }).first()).toBeVisible()
  await expect(results.getByText(/span \df/).first()).toBeVisible()
  const star = page.getByRole('button', { name: 'Add favorite' }).first()
  await star.click()
  await expect(page.getByRole('button', { name: 'Remove favorite' }).first()).toBeVisible()
})

test('fingering variants expand and collapse', async ({ page }) => {
  await page.goto('/?d=0,3,7')
  const toggle = page.getByRole('button', { name: /Show \d+ fingering variant/ }).first()
  await toggle.click()
  await expect(page.getByRole('button', { name: /Hide \d+ fingering variant/ }).first()).toBeVisible()
})

test('CSV export downloads the current result set', async ({ page }) => {
  await page.goto('/?d=0,3,7')
  await expect(page.getByText(/17 matching shape/)).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('fretboardtools-results.csv')
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const content = readFileSync(path, 'utf-8')
  expect(content.split('\r\n')[0]).toBe(
    'tuning,gap_key,strings,shape,root_degree,degrees,chord_name,voicing_intervals,span_frets,difficulty,difficulty_label,fingering',
  )
  expect(content).toContain('Minor')
})

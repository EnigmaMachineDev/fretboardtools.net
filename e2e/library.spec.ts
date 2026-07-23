import { expect, test, type Page } from '@playwright/test'
import { expectNoErrors, trackErrors } from './helpers'

const addTuning = async (page: Page, name: string, pitches: string) => {
  await page.goto('/library')
  await page.getByRole('tab', { name: 'Tunings' }).click()
  await page.getByLabel('Tuning name').fill(name)
  await page.getByLabel('Tuning pitches').fill(pitches)
  await page.getByRole('button', { name: 'Add tuning' }).click()
}

/** Persistence is debounced (300ms) — flush before any full page load. */
const flush = (page: Page) => page.waitForTimeout(450)

test('add a custom tuning; equivalence badge finds the built-ins', async ({ page }) => {
  const errors = trackErrors(page)
  await addTuning(page, 'Clone BEAD', 'B0 E1 A1 D2')
  // The name shows in "Your tunings" (and in built-in badges, hence .first()).
  await expect(page.getByText('Clone BEAD').first()).toBeVisible()
  await expect(page.getByText('B0 E1 A1 D2').first()).toBeVisible()
  // gapKey 5,5,5 → equivalent to the all-fourths built-ins.
  await expect(
    page.getByText(/Same shapes as .*Standard 4 \(EADG\)/).first(),
  ).toBeVisible()
  expectNoErrors(errors)
})

test('tuning validation rejects garbage and non-ascending pitches', async ({ page }) => {
  await page.goto('/library')
  await page.getByLabel('Tuning name').fill('Bad')
  await page.getByLabel('Tuning pitches').fill('E9 X2')
  await page.getByRole('button', { name: 'Add tuning' }).click()
  await expect(page.getByText(/Could not read those pitches/)).toBeVisible()
  await page.getByLabel('Tuning pitches').fill('G2 E1')
  await page.getByRole('button', { name: 'Add tuning' }).click()
  await expect(page.getByText(/strictly ascending/)).toBeVisible()
})

test('custom chord defs: arbitrary degree sets and built-in shadowing', async ({ page }) => {
  await page.goto('/library')
  await page.getByRole('tab', { name: 'Chords' }).click()
  // The plan's canonical example: 2-6-8 folds to 1-2-6.
  await page.getByLabel('Chord name').fill('My weird one')
  await page.getByLabel('Chord symbol').fill('2-6-8')
  await page.getByLabel('Chord degrees').fill('2 6 8')
  await page.getByRole('button', { name: 'Add chord' }).click()
  await expect(page.getByText('My weird one')).toBeVisible()
  await expect(page.getByText('1-2-6')).toBeVisible()

  // A set colliding with a built-in warns about shadowing.
  await page.getByLabel('Chord degrees').fill('1 b3 5 b7')
  await expect(page.getByText(/yours will shadow/)).toBeVisible()
  await expect(page.getByText('Minor 7', { exact: true })).toBeVisible()
})

test('favorite round trip: star in finder → appears in Library → remove', async ({ page }) => {
  await page.goto('/?d=0,3,7')
  await page.getByRole('button', { name: 'Add favorite' }).first().click()
  // Client-side navigation — no reload, so no debounce race.
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Library' }).click()
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await expect(page.getByText('Standard 4 (EADG)')).toBeVisible()
  await expect(page.locator('svg[role="img"]')).toBeVisible()
  // Notes persist on blur.
  await page.getByLabel('Favorite note').fill('the good one')
  await page.getByLabel('Favorite note').blur()
  await flush(page)
  await page.reload()
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await expect(page.getByLabel('Favorite note')).toHaveValue('the good one')
  // Remove.
  await page.getByRole('button', { name: 'Remove favorite' }).click()
  await expect(page.getByText(/No favorites yet/)).toBeVisible()
})

test('saved search round trip, and deleting its tuning remaps it with a warning', async ({
  page,
}) => {
  await addTuning(page, 'Clone BEAD', 'B0 E1 A1 D2')
  await flush(page)

  // Save a search that uses the custom tuning.
  await page.goto('/?d=0,3,7')
  await page.getByLabel('Tuning', { exact: true }).selectOption({ label: 'Clone BEAD' })
  page.once('dialog', (d) => void d.accept('My minor search'))
  await page.getByRole('button', { name: 'Save search' }).click()
  await flush(page)

  // It appears in the Library and links back to the finder.
  await page.goto('/library')
  await page.getByRole('tab', { name: 'Saved Searches' }).click()
  await page.getByRole('link', { name: 'My minor search' }).click()
  await expect(page).toHaveURL(/d=0%2C3%2C7|d=0,3,7/)
  await expect(page.getByRole('heading', { name: /Minor \(m\)/ })).toBeVisible()

  // Deleting the tuning warns with the reference count (GC rule 5)…
  await page.goto('/library')
  let dialogMessage = ''
  page.once('dialog', (d) => {
    dialogMessage = d.message()
    void d.accept()
  })
  await page.getByRole('button', { name: 'Delete Clone BEAD' }).click()
  await expect(page.getByText('Clone BEAD')).toHaveCount(0)
  expect(dialogMessage).toContain('1 saved search')

  // …and the saved search survives, remapped to a gapKey-equivalent built-in.
  await page.getByRole('tab', { name: 'Saved Searches' }).click()
  await expect(page.getByRole('link', { name: 'My minor search' })).toBeVisible()
})

test('JSON export → clear all → import restores state exactly', async ({ page }) => {
  await addTuning(page, 'Round Trip', 'B0 E1 A1 D2')
  await page.getByRole('tab', { name: 'Data' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('fretboardtools-export.json')
  const exportPath = await download.path()

  // Clear everything.
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Clear all data' }).click()
  await page.getByRole('tab', { name: 'Tunings' }).click()
  await expect(page.getByText('Round Trip')).toHaveCount(0)

  // Import replaces (with a confirm stating what's inside).
  await page.getByRole('tab', { name: 'Data' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import JSON' }).click()
  const chooser = await chooserPromise
  let confirmText = ''
  page.once('dialog', (d) => {
    confirmText = d.message()
    void d.accept()
  })
  await chooser.setFiles(exportPath)
  await expect
    .poll(() => confirmText)
    .toContain('1 tuning')

  await page.getByRole('tab', { name: 'Tunings' }).click()
  await expect(page.getByText('Round Trip').first()).toBeVisible()
})

test('import rejects a foreign file with a specific message', async ({ page }) => {
  await page.goto('/library')
  await page.getByRole('tab', { name: 'Data' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import JSON' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'foreign.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'SomethingElse', kind: 'x', schemaVersion: 1 })),
  })
  await expect(page.getByText('Not a FretboardTools export.')).toBeVisible()
})

test('left-handed preference persists across reload', async ({ page }) => {
  await page.goto('/library')
  await page.getByRole('tab', { name: 'Data' }).click()
  const checkbox = page.getByRole('checkbox', { name: /Left-handed diagrams/ })
  await checkbox.check()
  await flush(page)
  await page.reload()
  await page.getByRole('tab', { name: 'Data' }).click()
  await expect(page.getByRole('checkbox', { name: /Left-handed diagrams/ })).toBeChecked()
})

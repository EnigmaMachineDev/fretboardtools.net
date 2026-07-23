import { expect, test } from '@playwright/test'
import { expectNoErrors, trackErrors } from './helpers'

const ROUTES = ['/', '/identify', '/scales', '/library', '/about']

for (const route of ROUTES) {
  test(`route ${route} renders with no console errors`, async ({ page }) => {
    const errors = trackErrors(page)
    await page.goto(route)
    await expect(page).toHaveTitle('FretboardTools')
    await expect(page.getByRole('main')).toBeVisible()
    expectNoErrors(errors)
  })
}

test('unknown route shows the NotFound page', async ({ page }) => {
  await page.goto('/definitely-not-a-page')
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the Chord Finder' }).click()
  await expect(page.getByRole('heading', { name: 'Chord Finder' })).toBeVisible()
})

test('primary nav reaches every page', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await nav.getByRole('link', { name: 'Identify' }).click()
  await expect(page.getByRole('heading', { name: 'Identify a Shape' })).toBeVisible()
  await nav.getByRole('link', { name: 'Scales' }).click()
  await expect(page.getByRole('heading', { name: 'Scale Finder' })).toBeVisible()
  await nav.getByRole('link', { name: 'Library' }).click()
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
  await page.getByRole('contentinfo').getByRole('link', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: /How FretboardTools Works/ })).toBeVisible()
})

test('About page carries the required explainers', async ({ page }) => {
  await page.goto('/about')
  await expect(
    page.getByRole('heading', { name: /BEAD and EADG are the same shapes/ }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /Why open strings are excluded/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /position matters/ })).toBeVisible()
})

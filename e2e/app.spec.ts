import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('loads and shows hero text', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Precision')).toBeVisible()
    await expect(page.getByText('by design.')).toBeVisible()
  })

  test('nav links are present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Bit Visualizer' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Format Advisor' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'C Analyzer' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()
  })

  test('Get Started button navigates to calculator', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Get Started' }).click()
    await expect(page).toHaveURL(/.*calculator/)
    await expect(page.getByRole('heading', { name: 'Bit Visualizer' })).toBeVisible()
  })
})

test.describe('Bit Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator')
  })

  test('page loads with default state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bit Visualizer' })).toBeVisible()
    await expect(page.getByText('Format: Q8.8')).toBeVisible()
  })

  test('bit field renders 16 bit boxes for Q8.8', async ({ page }) => {
    // Q8.8 = 16 bits total — each bit rendered as a colored box
    const bitBoxes = page.locator('.font-mono.font-bold.rounded').filter({ hasText: /^[01]$/ })
    await expect(bitBoxes).toHaveCount(48) // 3 operands × 16 bits
  })

  test('operation buttons work', async ({ page }) => {
    await page.getByRole('button', { name: '×' }).click()
    await expect(page.getByRole('button', { name: '×' })).toHaveClass(/bg-primary/)
  })

  test('signed toggle changes format label', async ({ page }) => {
    await page.getByRole('checkbox').click()
    await expect(page.getByText('Format: SQ8.8')).toBeVisible()
  })

  test('overflow badge appears for large values', async ({ page }) => {
    await page.getByPlaceholder('Operand A').fill('300')
    await expect(page.getByText('OVERFLOW')).toBeVisible()
  })
})

test.describe('Format Advisor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/advisor')
  })

  test('page loads with one stage', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Format Advisor' })).toBeVisible()
    await expect(page.getByText('Stage 1')).toBeVisible()
  })

  test('can add a stage', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Stage' }).click()
    await expect(page.getByText('Stage 2')).toBeVisible()
  })

  test('shows range OK badge for in-range value', async ({ page }) => {
    await expect(page.getByText('✓ Range OK')).toBeVisible()
  })
})

test.describe('C Code Analyzer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analyzer')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'C Code Analyzer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run Analysis' })).toBeVisible()
  })

  test('runs analysis and shows results table', async ({ page }) => {
    await page.getByRole('button', { name: 'Run Analysis' }).click()
    await expect(page.getByText('Sample Results')).toBeVisible()
    await expect(page.getByText('Error Statistics')).toBeVisible()
  })

  test('export CSV button appears after analysis', async ({ page }) => {
    await page.getByRole('button', { name: 'Run Analysis' }).click()
    await expect(page.getByText('Export CSV')).toBeVisible()
  })
})

test.describe('Docs page', () => {
  test('loads and shows table of contents', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible()
    await expect(page.getByText('What is Fixed-Point Arithmetic?')).toBeVisible()
    await expect(page.getByText('C Code Analyzer')).toBeVisible()
  })
})

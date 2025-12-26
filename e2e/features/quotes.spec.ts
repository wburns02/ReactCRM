import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

test.describe('Quotes Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/quotes`);
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Quotes', { timeout: 15000 });
  });

  test('should load the quotes page', async ({ page }) => {
    // Verify page header
    await expect(page.locator('h1')).toContainText('Quotes');
    await expect(page.locator('p').filter({ hasText: 'Create and manage customer quotes' })).toBeVisible();
  });

  test('should have a Create Quote button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /Create Quote/i });
    await expect(createButton).toBeVisible();
  });

  test('should have status filter dropdown', async ({ page }) => {
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();

    // Check that filter options exist
    await expect(statusFilter.locator('option', { hasText: 'All Statuses' })).toBeVisible();
  });

  test('should display quotes list or empty state', async ({ page }) => {
    // Either shows quotes table or empty state message
    const table = page.locator('table');
    const emptyState = page.locator('text=No quotes found');

    // One of these should be visible
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to quotes page from sidebar', async ({ page }) => {
    // Go to dashboard first
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('aside nav')).toBeVisible({ timeout: 10000 });

    // Expand Financial group if needed
    const sidebar = page.locator('aside nav');
    const quotesLink = sidebar.getByRole('link', { name: 'Quotes' });

    const isVisible = await quotesLink.isVisible().catch(() => false);
    if (!isVisible) {
      await sidebar.getByRole('button', { name: /Financial/i }).click();
      await expect(quotesLink).toBeVisible({ timeout: 5000 });
    }

    await quotesLink.click();
    await expect(page).toHaveURL(/\/quotes$/);
    await expect(page.locator('h1')).toContainText('Quotes');
  });
});

test.describe('Quote Detail Page', () => {
  test('should show quote details when viewing a quote', async ({ page }) => {
    // Go to quotes list
    await page.goto(`${BASE_URL}/quotes`);
    await expect(page.locator('h1')).toContainText('Quotes', { timeout: 15000 });

    // If there are quotes, click on the first one
    const firstQuoteLink = page.locator('table tbody tr:first-child a').first();
    const hasQuotes = await firstQuoteLink.isVisible().catch(() => false);

    if (hasQuotes) {
      await firstQuoteLink.click();

      // Should show quote detail page with line items
      await expect(page.locator('text=Line Items')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Customer')).toBeVisible();
    } else {
      // Skip if no quotes exist
      test.skip();
    }
  });

  test('should have Convert to Contract button for sent/accepted quotes', async ({ page }) => {
    await page.goto(`${BASE_URL}/quotes`);
    await expect(page.locator('h1')).toContainText('Quotes', { timeout: 15000 });

    // Try to find a sent or accepted quote
    const sentQuoteRow = page.locator('table tbody tr').filter({ hasText: /Sent|Accepted/ }).first();
    const hasSentQuote = await sentQuoteRow.isVisible().catch(() => false);

    if (hasSentQuote) {
      // Click view on that quote
      await sentQuoteRow.getByRole('button', { name: 'View' }).click();

      // Should show Convert to Contract button
      await expect(page.getByRole('button', { name: /Convert to Contract/i })).toBeVisible({ timeout: 10000 });
    } else {
      // Skip if no sent/accepted quotes exist
      test.skip();
    }
  });
});

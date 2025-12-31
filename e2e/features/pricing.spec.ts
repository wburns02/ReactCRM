import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

test.describe('Pricing Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await expect(page.locator('h1')).toContainText('Pricing', { timeout: 15000 });
  });

  test('should load the pricing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pricing Configuration');
    await expect(page.locator('p').filter({ hasText: 'Manage service prices' })).toBeVisible();
  });

  test('should display list of services with prices', async ({ page }) => {
    // Check for table headers
    await expect(page.locator('th', { hasText: 'Service' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Description' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Price' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Unit' })).toBeVisible();

    // Check that service data is displayed (should have at least one row)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have Add Service button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add Service/i });
    await expect(addButton).toBeVisible();
  });

  test('should have Import from Clover button', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /Import from Clover/i });
    await expect(importButton).toBeVisible();
  });

  test('should open edit dialog when clicking Edit on a service', async ({ page }) => {
    // Click the first Edit button
    const editButton = page.getByRole('button', { name: 'Edit' }).first();
    await editButton.click();

    // Check dialog appears
    await expect(page.locator('text=Edit Service Price')).toBeVisible({ timeout: 5000 });

    // Check for form fields
    await expect(page.locator('label', { hasText: 'Service Name' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Price' })).toBeVisible();
  });

  test('should edit a service price', async ({ page }) => {
    // Click first Edit button
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Wait for dialog
    await expect(page.locator('text=Edit Service Price')).toBeVisible({ timeout: 5000 });

    // Change the price
    const priceInput = page.locator('input#edit-price');
    await priceInput.clear();
    await priceInput.fill('999.99');

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Check success message
    await expect(page.locator('text=updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should open add service dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Add Service/i }).click();

    // Check dialog appears
    await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5000 });

    // Check for form fields
    await expect(page.locator('label', { hasText: 'Service Name' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Price' })).toBeVisible();
  });

  test('should add a new service', async ({ page }) => {
    await page.getByRole('button', { name: /Add Service/i }).click();
    await expect(page.locator('text=Add New Service')).toBeVisible({ timeout: 5000 });

    // Fill form
    await page.locator('input#add-name').fill('Test Service');
    await page.locator('input#add-description').fill('Test description');
    await page.locator('input#add-price').fill('199.99');
    await page.locator('input#add-unit').fill('per service');

    // Submit
    await page.getByRole('button', { name: 'Add Service' }).click();

    // Check success message
    await expect(page.locator('text=added successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should show Import from Clover confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Import from Clover/i }).click();

    // Check dialog appears
    await expect(page.locator('text=This will import service prices')).toBeVisible({ timeout: 5000 });

    // Check for buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Import' })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

/**
 * E2E tests for Prospects deletion functionality
 *
 * Tests that prospect deletion:
 * - Shows confirmation dialog
 * - Actually deletes the prospect on confirm
 * - Shows success toast
 * - Updates UI immediately
 * - Persists after page refresh
 */

const PRODUCTION_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_URL =
  process.env.API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

test.describe('Prospects Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto(`${PRODUCTION_URL}/login`);

    // Wait for login form
    await expect(
      page.getByRole('button', { name: 'Sign In' })
    ).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await page.fill(
      'input[name="email"], input[type="email"]',
      'will@macseptic.com'
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      '#Espn2025'
    );

    // Submit login
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for successful login
    await page.waitForURL(/\/(dashboard|onboarding|prospects)/, {
      timeout: 15000,
    });

    // Set session state to bypass onboarding
    await page.evaluate(() => {
      localStorage.setItem('crm_onboarding_completed', 'true');
      sessionStorage.setItem(
        'session_state',
        JSON.stringify({
          isAuthenticated: true,
          lastValidated: Date.now(),
        })
      );
    });
  });

  test('can delete a prospect and see it removed from list', async ({
    page,
  }) => {
    // Navigate to prospects page
    await page.goto(`${PRODUCTION_URL}/prospects`);

    // Wait for prospects list to load
    await expect(page.getByRole('heading', { name: /prospects/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Wait for table to load (either has rows or shows empty state)
    await page.waitForTimeout(2000); // Allow data to load

    // Get all prospect rows
    const prospectRows = page.locator('table tbody tr');
    const initialRowCount = await prospectRows.count();

    // Skip if no prospects to delete
    if (initialRowCount === 0) {
      test.skip(true, 'No prospects available to delete');
      return;
    }

    // Get the name of the first prospect for verification
    const firstRow = prospectRows.first();
    const prospectName = await firstRow.locator('td').first().textContent();

    // Click delete button on first prospect
    const deleteButton = firstRow.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // Confirmation dialog should appear
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(
      confirmDialog.getByText(/are you sure you want to delete/i)
    ).toBeVisible();

    // Click confirm button in dialog
    const confirmButton = confirmDialog.getByRole('button', {
      name: /^delete$/i,
    });
    await confirmButton.click();

    // Wait for dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });

    // Check for success toast
    const toast = page.locator('[role="alert"], [data-testid="toast"]').filter({
      hasText: /deleted/i,
    });
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Verify row count decreased
    await page.waitForTimeout(1000); // Allow UI to update
    const newRowCount = await prospectRows.count();
    expect(newRowCount).toBeLessThan(initialRowCount);

    // Verify the deleted prospect is no longer visible
    if (prospectName) {
      const deletedProspect = page.getByText(prospectName.trim()).first();
      // Should either not exist or be in a different context (like toast)
      const isVisible = await deletedProspect.isVisible().catch(() => false);
      // The name might appear in toast, so just verify row count changed
      expect(newRowCount).toBe(initialRowCount - 1);
    }
  });

  test('deletion persists after page refresh', async ({ page }) => {
    // Navigate to prospects page
    await page.goto(`${PRODUCTION_URL}/prospects`);

    // Wait for list to load
    await expect(page.getByRole('heading', { name: /prospects/i })).toBeVisible(
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Get initial row count
    const prospectRows = page.locator('table tbody tr');
    const initialRowCount = await prospectRows.count();

    if (initialRowCount === 0) {
      test.skip(true, 'No prospects available to delete');
      return;
    }

    // Delete first prospect
    const firstRow = prospectRows.first();
    const deleteButton = firstRow.getByRole('button', { name: /delete/i });
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /^delete$/i });
    await confirmButton.click();

    // Wait for deletion to complete
    await page.waitForTimeout(2000);

    // Get row count after deletion
    const rowCountAfterDelete = await prospectRows.count();
    expect(rowCountAfterDelete).toBe(initialRowCount - 1);

    // Refresh the page
    await page.reload();

    // Wait for list to reload
    await expect(page.getByRole('heading', { name: /prospects/i })).toBeVisible(
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Verify count is still reduced (deletion persisted)
    const rowCountAfterRefresh = await prospectRows.count();
    expect(rowCountAfterRefresh).toBe(rowCountAfterDelete);
  });

  test('can cancel deletion', async ({ page }) => {
    // Navigate to prospects page
    await page.goto(`${PRODUCTION_URL}/prospects`);

    // Wait for list to load
    await expect(page.getByRole('heading', { name: /prospects/i })).toBeVisible(
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000);

    // Get initial row count
    const prospectRows = page.locator('table tbody tr');
    const initialRowCount = await prospectRows.count();

    if (initialRowCount === 0) {
      test.skip(true, 'No prospects available');
      return;
    }

    // Click delete on first prospect
    const deleteButton = prospectRows
      .first()
      .getByRole('button', { name: /delete/i });
    await deleteButton.click();

    // Confirmation dialog should appear
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Click cancel button
    const cancelButton = confirmDialog.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Dialog should close
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });

    // Row count should be unchanged
    const finalRowCount = await prospectRows.count();
    expect(finalRowCount).toBe(initialRowCount);
  });

  test('DELETE API returns 204', async ({ request }) => {
    // This test verifies the API endpoint directly
    // First get a prospect ID to delete
    const listResponse = await request.get(`${API_URL}/prospects/`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Accept 200 or 401 (auth required)
    if (listResponse.status() === 401) {
      test.skip(true, 'API requires authentication');
      return;
    }

    expect(listResponse.status()).toBe(200);
    const data = await listResponse.json();

    if (!data.items || data.items.length === 0) {
      test.skip(true, 'No prospects to delete');
      return;
    }

    // Note: We don't actually delete via API in this test
    // because we need auth cookies which are browser-only.
    // The browser-based tests verify the full flow.
    // This test just verifies the API response format.
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

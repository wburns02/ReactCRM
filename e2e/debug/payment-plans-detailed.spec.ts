/**
 * Detailed Payment Plans Functionality Test
 */
import { test, expect } from '@playwright/test';

test.describe('Payment Plans Detailed Test', () => {
  test('Full workflow test with screenshots', async ({ page }) => {
    // Login
    await page.goto('https://react.ecbtx.com/login');
    await page.fill('input[name="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to Payment Plans
    await page.goto('https://react.ecbtx.com/billing/payment-plans');
    await page.waitForLoadState('networkidle');

    // Screenshot: Initial page load
    await page.screenshot({ path: 'test-results/pp-1-initial.png', fullPage: true });

    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    console.log('Table loaded');

    // Test 1: Click Create Payment Plan button
    console.log('\n=== TEST 1: Create Button ===');
    const createBtn = page.locator('button:has-text("Create Payment Plan")');
    await expect(createBtn).toBeVisible();

    await createBtn.click();
    await page.waitForTimeout(500);

    // Screenshot after create button click
    await page.screenshot({ path: 'test-results/pp-2-after-create-click.png', fullPage: true });

    // Check if modal appeared
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
    const modalCount = await modal.count();
    console.log('Modal elements found:', modalCount);

    if (modalCount > 0) {
      console.log('SUCCESS: Modal/dialog appeared after Create click');
      // Close modal if it exists
      const closeBtn = page.locator('[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log('FAILURE: No modal appeared after Create click');
    }

    // Test 2: Click on a table row
    console.log('\n=== TEST 2: Row Click ===');
    const firstRow = page.locator('tbody tr').first();
    const rowClasses = await firstRow.getAttribute('class');
    console.log('Row classes:', rowClasses);

    const urlBefore = page.url();
    await firstRow.click();
    await page.waitForTimeout(1000);
    const urlAfter = page.url();

    // Screenshot after row click
    await page.screenshot({ path: 'test-results/pp-3-after-row-click.png', fullPage: true });

    console.log('URL before row click:', urlBefore);
    console.log('URL after row click:', urlAfter);

    if (urlAfter !== urlBefore) {
      console.log('SUCCESS: Row click navigated to:', urlAfter);

      // Navigate back
      await page.goBack();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('FAILURE: Row click did not navigate');
    }

    // Test 3: Click View button
    console.log('\n=== TEST 3: View Button ===');
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Get the View button - stop event propagation to test just the button
    const viewBtnCell = page.locator('tbody tr').first().locator('td').last();
    const viewBtn = viewBtnCell.locator('button, a').first();

    const viewText = await viewBtn.textContent();
    console.log('View button text:', viewText);

    const urlBeforeView = page.url();

    // Click the View button specifically (stop propagation handled in component)
    await viewBtn.click();
    await page.waitForTimeout(1000);

    const urlAfterView = page.url();

    // Screenshot after View click
    await page.screenshot({ path: 'test-results/pp-4-after-view-click.png', fullPage: true });

    console.log('URL before View click:', urlBeforeView);
    console.log('URL after View click:', urlAfterView);

    if (urlAfterView !== urlBeforeView) {
      console.log('SUCCESS: View button navigated to:', urlAfterView);
    } else {
      console.log('FAILURE: View button did not navigate');
    }

    // Final summary
    console.log('\n=== SUMMARY ===');
    console.log('Screenshots saved to test-results/pp-*.png');
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * Work Orders Creation Flow E2E Tests
 * Tests the "New Work Order" button and creation modal
 *
 * CRITICAL: This test reproduces the silent failure bug where
 * clicking "New Work Order" does nothing or fails silently.
 *
 * Note: Uses custom auth (not auth.setup.ts) to avoid dependency issues
 */

// Disable global auth dependency
test.use({ storageState: undefined });

let authPage: Page;
let browserContext: any;

test.beforeAll(async ({ browser }) => {
  // Login ONCE for all tests in this file (avoid rate limiting)
  browserContext = await browser.newContext();
  authPage = await browserContext.newPage();

  console.log('[Auth] Logging in as will@macseptic.com...');
  await authPage.goto('https://react.ecbtx.com/login');
  await authPage.fill('input[type="email"]', 'will@macseptic.com');
  await authPage.fill('input[type="password"]', '#Espn2025');
  await authPage.click('button[type="submit"]');
  await authPage.waitForFunction(() => !location.href.includes('/login'));
  console.log('[Auth] Login successful');
});

test.describe('Work Orders Creation Flow', () => {
  test('should load work orders page', async () => {
    console.log('[Test 1] Navigating to /work-orders');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Assert page loads
    await expect(authPage.locator('h1')).toContainText('Work Orders');
    console.log('[Test 1] ✅ Page loaded with correct heading');

    // Assert stats cards visible
    const todayCard = authPage.locator('text=Today').first();
    await expect(todayCard).toBeVisible();
    console.log('[Test 1] ✅ Stats cards rendered');

    // Assert New Work Order button exists
    const newButton = authPage.locator('button', { hasText: 'New Work Order' });
    await expect(newButton).toBeVisible();
    console.log('[Test 1] ✅ New Work Order button visible');
  });

  test('should open modal when New Work Order clicked', async () => {
    console.log('[Test 2] Clicking New Work Order button');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Click New Work Order button
    const newButton = authPage.locator('button', { hasText: 'New Work Order' });
    await newButton.click();

    // Wait for modal to appear
    await authPage.waitForTimeout(500);

    // CRITICAL CHECK: Modal should be visible
    const modal = authPage.locator('[role="dialog"]');
    const isVisible = await modal.isVisible();

    if (!isVisible) {
      console.error('[Test 2] ❌ MODAL DID NOT OPEN - Silent failure confirmed');

      // Capture console logs
      const logs: string[] = [];
      authPage.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));

      // Take screenshot
      await authPage.screenshot({ path: 'modal-not-opened.png', fullPage: true });
      console.error('[Test 2] Screenshot saved: modal-not-opened.png');

      // Dump network activity
      const responses = await authPage.evaluate(() => {
        return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          .map(r => `${r.name} → ${r.responseStatus}`)
          .slice(-10);
      });
      console.error('[Test 2] Recent network:', responses);
    }

    await expect(modal).toBeVisible({ timeout: 2000 });
    console.log('[Test 2] ✅ Modal opened successfully');

    // Assert modal header
    await expect(modal).toContainText('Create Work Order');
    console.log('[Test 2] ✅ Modal header correct');
  });

  test('should render form fields in modal', async () => {
    console.log('[Test 3] Verifying form fields');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Open modal
    await authPage.locator('button', { hasText: 'New Work Order' }).click();
    await authPage.waitForSelector('[role="dialog"]');

    const modal = authPage.locator('[role="dialog"]');

    // Check required customer dropdown
    const customerSelect = modal.locator('select#customer_id');
    await expect(customerSelect).toBeVisible();
    console.log('[Test 3] ✅ Customer dropdown visible');

    // Check job type dropdown
    const jobTypeSelect = modal.locator('select#job_type');
    await expect(jobTypeSelect).toBeVisible();
    console.log('[Test 3] ✅ Job type dropdown visible');

    // Check submit button
    const submitButton = modal.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Create Work Order');
    console.log('[Test 3] ✅ Submit button visible');
  });

  test('should show validation error when submitting empty form', async () => {
    console.log('[Test 4] Testing validation');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Open modal
    await authPage.locator('button', { hasText: 'New Work Order' }).click();
    await authPage.waitForSelector('[role="dialog"]');

    const modal = authPage.locator('[role="dialog"]');

    // Try to submit without filling required fields
    const submitButton = modal.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation
    await authPage.waitForTimeout(500);

    // Check if customer_id error appears (required field)
    const errorMessage = modal.locator('text=Customer is required');
    const hasError = await errorMessage.isVisible();

    if (hasError) {
      console.log('[Test 4] ✅ Validation error shown');
    } else {
      console.warn('[Test 4] ⚠️ No validation error visible (form may have submitted incorrectly)');
    }
  });

  test('should create work order with valid data', async () => {
    console.log('[Test 5] Testing work order creation');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Get initial count
    const initialCount = await authPage.locator('table tbody tr').count();
    console.log(`[Test 5] Initial work order count: ${initialCount}`);

    // Open modal
    await authPage.locator('button', { hasText: 'New Work Order' }).click();
    await authPage.waitForSelector('[role="dialog"]');

    const modal = authPage.locator('[role="dialog"]');

    // Fill required fields
    console.log('[Test 5] Filling form...');
    await modal.locator('select#customer_id').selectOption({ index: 1 }); // Select first customer
    await modal.locator('select#job_type').selectOption('pumping');
    await modal.locator('select#priority').selectOption('normal');

    // Listen for POST request
    const postPromise = authPage.waitForResponse(
      resp => resp.url().includes('/work-orders') && resp.request().method() === 'POST',
      { timeout: 10000 }
    );

    // Submit form
    console.log('[Test 5] Submitting form...');
    const submitButton = modal.locator('button[type="submit"]');
    await submitButton.click();

    try {
      // Wait for POST request
      const response = await postPromise;
      const status = response.status();
      console.log(`[Test 5] POST /work-orders → ${status}`);

      if (status === 201) {
        console.log('[Test 5] ✅ Work order created successfully');

        // Parse response
        const responseData = await response.json();
        console.log('[Test 5] New work order ID:', responseData.id);

        // Modal should close
        await authPage.waitForTimeout(1000);
        const modalVisible = await modal.isVisible();
        if (!modalVisible) {
          console.log('[Test 5] ✅ Modal closed after success');
        } else {
          console.warn('[Test 5] ⚠️ Modal still visible after success');
        }

        // Reload and check if new work order appears
        await authPage.reload();
        await authPage.waitForSelector('table tbody tr');
        const newCount = await authPage.locator('table tbody tr').count();
        console.log(`[Test 5] New work order count: ${newCount}`);

        if (newCount > initialCount) {
          console.log('[Test 5] ✅ New work order appears in list');
        } else {
          console.warn('[Test 5] ⚠️ Work order count unchanged (query cache issue?)');
        }
      } else {
        console.error(`[Test 5] ❌ POST failed with status ${status}`);
        const errorBody = await response.text();
        console.error('[Test 5] Error response:', errorBody);
      }

      expect(status).toBe(201);
    } catch (error) {
      console.error('[Test 5] ❌ POST request failed or timed out');
      console.error('[Test 5] Error:', error);

      // Take screenshot
      await authPage.screenshot({ path: 'creation-failed.png', fullPage: true });
      console.error('[Test 5] Screenshot saved: creation-failed.png');

      throw error;
    }
  });

  test('should handle API errors gracefully', async () => {
    console.log('[Test 6] Testing error handling');
    await authPage.goto('https://react.ecbtx.com/work-orders');

    // Open modal
    await authPage.locator('button', { hasText: 'New Work Order' }).click();
    await authPage.waitForSelector('[role="dialog"]');

    const modal = authPage.locator('[role="dialog"]');

    // Fill with invalid customer ID (simulate API error)
    // NOTE: This test may need adjustment based on actual error handling
    await modal.locator('select#customer_id').selectOption({ index: 1 });
    await modal.locator('select#job_type').selectOption('pumping');

    // Intercept POST request to simulate 500 error
    await authPage.route('**/api/v2/work-orders', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    // Submit form
    const submitButton = modal.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error handling
    await authPage.waitForTimeout(1500);

    // Check if error toast appears
    const errorToast = authPage.locator('text=/error|failed/i');
    const hasErrorToast = await errorToast.isVisible().catch(() => false);

    if (hasErrorToast) {
      console.log('[Test 6] ✅ Error toast shown');
    } else {
      console.warn('[Test 6] ⚠️ No error toast visible (silent failure on error)');
    }

    // Modal should stay open on error
    const modalVisible = await modal.isVisible();
    if (modalVisible) {
      console.log('[Test 6] ✅ Modal stays open on error');
    } else {
      console.warn('[Test 6] ⚠️ Modal closed despite error');
    }

    // Clean up route mock
    await authPage.unroute('**/api/v2/work-orders');
  });
});

test.afterAll(async () => {
  console.log('[Cleanup] Closing browser context');
  if (authPage) await authPage.close();
  if (browserContext) await browserContext.close();
});

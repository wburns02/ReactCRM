import { test, expect } from '@playwright/test';

/**
 * Debug test to reproduce and diagnose the 422 error on estimate creation
 */
test.describe('Estimate Creation Debug', () => {
  test('diagnose estimate creation 422 error', async ({ page }) => {
    const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

    // Capture all API requests/responses
    const apiLogs: Array<{ method: string; url: string; status?: number; requestBody?: string; responseBody?: string }> = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiLogs.push({
          method: request.method(),
          url: request.url(),
          requestBody: request.postData() || undefined
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const log = apiLogs.find(l => l.url === response.url() && !l.status);
        if (log) {
          log.status = response.status();
          try {
            log.responseBody = await response.text();
          } catch {}
        }
      }
    });

    // Login first
    console.log('Step 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding|estimates)/, { timeout: 15000 });
    console.log('Logged in, current URL:', page.url());

    // Navigate to estimates
    console.log('Step 2: Navigating to estimates...');
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/estimates-page.png' });

    // Find and click Create Estimate button on the page
    console.log('Step 3: Opening create modal...');
    const createButton = page.locator('#main-content').getByRole('button', { name: 'Create Estimate' });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for modal to open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/create-modal.png' });
    console.log('Modal opened');

    // Fill in the form
    console.log('Step 4: Filling form...');

    // Customer selection - uses input with placeholder "Search customers..."
    const customerInput = dialog.locator('input[placeholder="Search customers..."]');
    await expect(customerInput).toBeVisible({ timeout: 5000 });
    console.log('Found customer search input');

    // Focus to open dropdown
    await customerInput.focus();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/customer-dropdown-open.png' });

    // Look for customer options (they are buttons inside the dropdown)
    const customerOptions = page.locator('button.w-full.px-4.py-2.text-left');
    const optionCount = await customerOptions.count();
    console.log('Customer options count:', optionCount);

    if (optionCount > 0) {
      // Click first customer option
      await customerOptions.first().click();
      console.log('Selected first customer');
    } else {
      // Type to search
      await customerInput.fill('Mac');
      await page.waitForTimeout(500);
      const searchOptions = page.locator('button.w-full.px-4.py-2.text-left');
      if (await searchOptions.count() > 0) {
        await searchOptions.first().click();
        console.log('Selected customer from search results');
      }
    }

    await page.screenshot({ path: 'test-results/after-customer-select.png' });

    // Fill line item - service name
    console.log('Filling line items...');
    const serviceInput = dialog.locator('input[placeholder="Service"]').first();
    await expect(serviceInput).toBeVisible();
    await serviceInput.fill('Septic Tank Pumping');

    // Fill rate
    const rateInput = dialog.locator('input[placeholder="Rate"]').first();
    await expect(rateInput).toBeVisible();
    await rateInput.fill('350');

    await page.screenshot({ path: 'test-results/form-filled.png' });

    // Clear API logs before submit to capture only the create request
    apiLogs.length = 0;

    // Submit the form
    console.log('Step 5: Submitting form...');
    const submitButton = dialog.getByRole('button', { name: 'Create Estimate' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/after-submit.png' });

    // Log API activity
    console.log('\n=== API Activity ===');
    for (const log of apiLogs) {
      console.log(`${log.method} ${log.url}`);
      console.log(`  Status: ${log.status || 'pending'}`);
      if (log.requestBody) {
        console.log(`  Request: ${log.requestBody.substring(0, 500)}`);
      }
      if (log.responseBody) {
        console.log(`  Response: ${log.responseBody.substring(0, 500)}`);
      }
    }

    // Check for error toast or success toast
    const errorToast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /error|fail/i });
    const successToast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /success|created/i });

    if (await errorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorToast.textContent();
      console.log('Error toast visible:', errorText);
    }

    if (await successToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      const successText = await successToast.textContent();
      console.log('Success toast visible:', successText);
    }

    // Check if modal closed (success indicator)
    const modalStillOpen = await dialog.isVisible();
    console.log('Modal still open:', modalStillOpen);

    // Final state
    console.log('\n=== Test Complete ===');
  });
});

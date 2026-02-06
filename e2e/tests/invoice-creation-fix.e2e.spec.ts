/**
 * Invoice Creation Fix E2E Test
 *
 * Verifies that invoice creation works without 500 errors.
 * This test was written to confirm the fix for the PostgreSQL ENUM case mismatch issue.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://react.ecbtx.com';

test.describe('Invoice Creation', () => {
  test.beforeEach(async ({ context }) => {
    // Add init script to restore session_state before page JS runs
    await context.addInitScript(() => {
      const sessionState = localStorage.getItem('session_state');
      if (sessionState) sessionStorage.setItem('session_state', sessionState);
    });
  });

  test('should create invoice successfully without 500 error', async ({ page }) => {
    // Collect network errors
    const networkErrors: { url: string; status: number }[] = [];
    const consoleErrors: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 500) {
        networkErrors.push({ url: response.url(), status: response.status() });
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to invoices page
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState('networkidle');

    // Check if we're on login page - if so, the test will be skipped
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // Wait for page to load and find Create Invoice button
    const createButton = page.getByRole('button', { name: /create invoice/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });

    // Click Create Invoice button
    await createButton.click();

    // Wait for modal to appear - the dialog has role="dialog"
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Wait for the dialog header text (it's in a div with specific class, not a heading element)
    await expect(page.locator('[role="dialog"] .font-semibold.text-lg').first()).toBeVisible({ timeout: 5000 });
    console.log('Dialog opened successfully');

    // Fill in customer - it's a <select> element with id="customer_id"
    const customerSelect = page.locator('select#customer_id');
    await expect(customerSelect).toBeVisible({ timeout: 5000 });

    // Wait for options to load
    await page.waitForTimeout(1000);

    // Get all options and select the first non-empty one
    const options = customerSelect.locator('option');
    const optionsCount = await options.count();
    console.log(`Found ${optionsCount} customer options`);

    if (optionsCount > 1) {
      // Select the second option (first one is "Select customer...")
      const secondOption = options.nth(1);
      const value = await secondOption.getAttribute('value');
      if (value) {
        await customerSelect.selectOption(value);
        console.log(`Selected customer with value: ${value}`);
      }
    }

    // Fill line item fields
    // Service name input (placeholder="Service name")
    const serviceInput = page.locator('[role="dialog"] input[placeholder="Service name"]').first();
    if (await serviceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await serviceInput.fill('Test Pump Out Service');
      console.log('Filled service input');
    } else {
      console.log('Service input not found by placeholder, trying by type');
      const textInput = page.locator('[role="dialog"] table input[type="text"]').first();
      if (await textInput.isVisible().catch(() => false)) {
        await textInput.fill('Test Pump Out Service');
        console.log('Filled service via table text input');
      }
    }

    // The line items table has quantity and rate as number inputs
    // They are inside the table rows
    const tableRow = page.locator('[role="dialog"] table tbody tr').first();

    // Quantity input (third column in the row)
    const qtyInput = tableRow.locator('input[type="number"]').first();
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.clear();
      await qtyInput.fill('1');
      console.log('Filled quantity');
    }

    // Rate input (fourth column in the row)
    const rateInput = tableRow.locator('input[type="number"]').nth(1);
    if (await rateInput.isVisible().catch(() => false)) {
      await rateInput.clear();
      await rateInput.fill('350');
      console.log('Filled rate');
    }

    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/invoice-before-submit.png' });

    // Click Create Invoice button in modal (the submit button)
    const submitButton = page.locator('[role="dialog"] button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    console.log('Found submit button, clicking...');

    // Set up response promise BEFORE clicking
    const responsePromise = page.waitForResponse(
      (response) => {
        const isInvoiceEndpoint = response.url().includes('/invoices');
        const isPost = response.request().method() === 'POST';
        // Accept 201, 200, or any redirect (307) - but not the initial OPTIONS
        const isRelevant = isInvoiceEndpoint && isPost;
        if (isRelevant) {
          console.log(`Captured response: ${response.status()} ${response.url()}`);
        }
        return isRelevant;
      },
      { timeout: 15000 }
    );

    // Now click
    await submitButton.click();

    // Wait for the POST response
    const response = await responsePromise.catch((err) => {
      console.log('No POST response captured:', err.message);
      return null;
    });

    if (response) {
      const status = response.status();
      console.log(`POST /invoices returned status: ${status}`);

      // 307 is acceptable (redirect), but ultimately should succeed
      // Check for 500 error specifically
      expect(status).not.toBe(500);
      expect(status).not.toBe(400);
      expect(status).not.toBe(422);

      // If it's a success response, verify the body
      if (status === 200 || status === 201) {
        const body = await response.json().catch(() => null);
        console.log('Created invoice:', body?.id, body?.invoice_number);

        // Verify invoice has expected fields
        if (body) {
          expect(body.id).toBeTruthy();
          expect(body.invoice_number).toBeTruthy();
          expect(body.status).toBe('draft');
        }
      }
    }

    // Wait for the dialog to close (indicates success)
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    console.log('Dialog closed - invoice creation completed');

    // Wait a moment for UI to update
    await page.waitForTimeout(1000);

    // Take screenshot after submit
    await page.screenshot({ path: 'test-results/invoice-after-submit.png' });

    // Check no 500 errors occurred
    const invoiceErrors = networkErrors.filter(e => e.url.includes('/invoices'));
    expect(invoiceErrors.length).toBe(0);

    // Log console errors for debugging (but don't fail test for minor errors)
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });

  test('should list invoices after creation', async ({ page }) => {
    // Navigate to invoices page
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) {
      test.skip();
      return;
    }

    // Wait for invoices to load
    await page.waitForTimeout(2000);

    // Look for invoice list or table
    const invoiceTable = page.locator('table, [data-testid="invoice-list"], [role="grid"]').first();
    const invoiceCount = page.locator('text=/\\d+ invoice/i').first();

    // Should show either invoice table or count
    const hasTable = await invoiceTable.isVisible().catch(() => false);
    const hasCount = await invoiceCount.isVisible().catch(() => false);

    // At least one indicator should be visible
    expect(hasTable || hasCount).toBe(true);

    // Verify the GET /invoices endpoint returns 200
    const response = await page.request.get('https://react-crm-api-production.up.railway.app/api/v2/invoices/', {
      headers: {
        'Cookie': `session=${await page.context().cookies().then(c => c.find(x => x.name === 'session')?.value || '')}`
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    console.log(`Found ${data.total || data.items?.length || 0} invoices`);
  });
});

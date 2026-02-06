import { test, expect } from '@playwright/test';

/**
 * Debug test to reproduce and diagnose the Work Order Edit Save bug
 *
 * Bug: Editing a work order does not save changes
 * - User clicks Edit button
 * - Makes changes in the form
 * - Clicks Save
 * - Changes are not persisted
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const API_URL = 'https://react-crm-api-production.up.railway.app/api/v2';

test.describe('Work Order Edit Save Bug Diagnosis', () => {

  test('reproduce work order edit save bug', async ({ page }) => {
    // Track all API requests
    const apiRequests: { method: string; url: string; status?: number; requestBody?: any; responseBody?: any }[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('railway.app')) {
        const body = request.postData();
        apiRequests.push({
          method: request.method(),
          url: request.url(),
          requestBody: body ? JSON.parse(body) : null,
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/') || response.url().includes('railway.app')) {
        const req = apiRequests.find(r => r.url === response.url() && !r.status);
        if (req) {
          req.status = response.status();
          try {
            req.responseBody = await response.json();
          } catch {
            req.responseBody = null;
          }
        }
      }
    });

    // Step 1: Login
    console.log('Step 1: Logging in...');
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|work-orders|onboarding)/, { timeout: 15000 });
    console.log('Login complete, current URL:', page.url());

    // Step 2: Navigate to work orders list
    console.log('Step 2: Navigating to work orders...');
    await page.goto(`${PRODUCTION_URL}/work-orders`);
    await page.waitForLoadState('networkidle');

    // Step 3: Click on first work order to open detail page
    console.log('Step 3: Opening first work order...');

    // Get the work order ID from the first "View" link
    const workOrderLink = page.locator('a[href*="/work-orders/"]').first();
    await expect(workOrderLink).toBeVisible({ timeout: 10000 });
    const href = await workOrderLink.getAttribute('href');
    const workOrderId = href?.split('/work-orders/')[1];
    console.log('Work order ID:', workOrderId);

    // Navigate directly to the work order detail page
    await page.goto(`${PRODUCTION_URL}/work-orders/${workOrderId}`);
    await page.waitForLoadState('networkidle');
    console.log('Work order detail page loaded:', page.url());

    // Verify we're on the detail page by checking for the back link
    const backLink = page.locator('a:has-text("Back")');
    await expect(backLink).toBeVisible({ timeout: 10000 });

    // Step 4: Record initial values - skip this step, go straight to edit
    console.log('Step 4: Skipping initial values, going to edit...');

    // Step 5: Click Edit button
    console.log('Step 5: Clicking Edit button...');
    const editButton = page.getByRole('button', { name: 'Edit' });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for edit modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('Edit modal opened');

    // Step 6: Make a change to the notes field
    const testNote = `Test edit at ${new Date().toISOString()}`;
    console.log('Step 6: Changing notes to:', testNote);

    const notesTextarea = page.locator('textarea[id="notes"], textarea[name="notes"]');
    await notesTextarea.clear();
    await notesTextarea.fill(testNote);

    // Step 7: Click Save
    console.log('Step 7: Clicking Save button...');
    apiRequests.length = 0; // Clear previous requests

    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();

    // Wait for modal to close and network to settle
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Step 8: Analyze API requests
    console.log('\n=== API Requests During Save ===');
    for (const req of apiRequests) {
      console.log(`${req.method} ${req.url}`);
      console.log('  Status:', req.status);
      if (req.requestBody) console.log('  Request body:', JSON.stringify(req.requestBody, null, 2));
      if (req.responseBody) console.log('  Response body:', JSON.stringify(req.responseBody, null, 2));
    }

    // Check if PATCH was called
    const patchRequest = apiRequests.find(r => r.method === 'PATCH' && r.url.includes('work-orders'));
    if (!patchRequest) {
      console.log('\n!!! CRITICAL: No PATCH request was made !!!');
    } else {
      console.log('\nPATCH request found:');
      console.log('  URL:', patchRequest.url);
      console.log('  Status:', patchRequest.status);
      console.log('  Request body:', JSON.stringify(patchRequest.requestBody, null, 2));
    }

    // Step 9: Verify the change persisted via API (skip UI verification)
    console.log('\nStep 9: Verifying changes persisted via API...');

    // Check via API directly
    const workOrderResponse = await page.request.get(`${API_URL}/work-orders/${workOrderId}`);
    const workOrderData = await workOrderResponse.json();
    console.log('Work order notes from API:', workOrderData.notes);

    // Assert
    const notesSaved = workOrderData.notes === testNote;
    if (!notesSaved) {
      console.log('\n!!! BUG CONFIRMED: Notes were not saved !!!');
      console.log('Expected:', testNote);
      console.log('Actual:', workOrderData.notes);
    } else {
      console.log('\nNotes were saved successfully');
    }

    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log('PATCH request made:', !!patchRequest);
    if (patchRequest) {
      console.log('PATCH status:', patchRequest.status);
      console.log('PATCH included notes:', patchRequest.requestBody?.notes === testNote);
    }
    console.log('Notes persisted:', notesSaved);

    // Assert - test should fail if notes were not saved
    expect(notesSaved).toBe(true);
  });

  test('check roles endpoint 401', async ({ page }) => {
    // Login first
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|work-orders|onboarding)/, { timeout: 15000 });

    // Check roles endpoint
    const rolesResponse = await page.request.get(`${API_URL}/roles`);
    console.log('GET /api/v2/roles status:', rolesResponse.status());
    if (rolesResponse.status() !== 200) {
      const body = await rolesResponse.text();
      console.log('Response body:', body);
    }
  });

  test('check work order photos endpoint 500', async ({ page }) => {
    // Login first
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|work-orders|onboarding)/, { timeout: 15000 });

    // Get a work order ID
    await page.goto(`${PRODUCTION_URL}/work-orders`);
    await page.waitForLoadState('networkidle');

    const workOrderLink = page.locator('a[href*="/work-orders/"]').first();
    const href = await workOrderLink.getAttribute('href');
    const workOrderId = href?.split('/work-orders/')[1];
    console.log('Testing photos endpoint for work order:', workOrderId);

    // Check photos endpoint
    const photosResponse = await page.request.get(`${API_URL}/work-orders/${workOrderId}/photos`);
    console.log('GET /api/v2/work-orders/{id}/photos status:', photosResponse.status());
    if (photosResponse.status() !== 200) {
      const body = await photosResponse.text();
      console.log('Response body:', body);
    }
  });
});

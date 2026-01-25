import { test, expect } from '@playwright/test';

/**
 * Debug test to understand prospects deletion behavior
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';

test('debug: prospects deletion network traffic', async ({ page }) => {
  // Capture all network requests
  const requests: string[] = [];
  const responses: { url: string; status: number; body?: string }[] = [];

  page.on('request', (req) => {
    if (req.url().includes('prospects')) {
      requests.push(`${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('prospects')) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        body = '[could not read body]';
      }
      responses.push({
        url: res.url(),
        status: res.status(),
        body: body.substring(0, 500),
      });
    }
  });

  // Login
  await page.goto(`${PRODUCTION_URL}/login`);
  await page.fill('input[type="email"]', 'will@macseptic.com');
  await page.fill('input[type="password"]', '#Espn2025');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects)/, { timeout: 15000 });

  // Set session state
  await page.evaluate(() => {
    localStorage.setItem('crm_onboarding_completed', 'true');
    sessionStorage.setItem(
      'session_state',
      JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
    );
  });

  // Go to prospects
  await page.goto(`${PRODUCTION_URL}/prospects`);
  await page.waitForTimeout(3000);

  console.log('\n=== INITIAL LOAD ===');
  console.log('Requests:', requests);
  console.log('Responses:', responses.map((r) => `${r.status} ${r.url}`));

  // Get row count
  const rows = page.locator('table tbody tr');
  const initialCount = await rows.count();
  console.log(`\nInitial row count: ${initialCount}`);

  if (initialCount === 0) {
    console.log('No prospects to delete');
    return;
  }

  // Get first prospect info
  const firstRow = rows.first();
  const cells = await firstRow.locator('td').allTextContents();
  console.log('First prospect:', cells.join(' | '));

  // Clear request/response logs
  requests.length = 0;
  responses.length = 0;

  // Click delete
  console.log('\n=== CLICKING DELETE ===');
  const deleteBtn = firstRow.getByRole('button', { name: /delete/i });
  await deleteBtn.click();

  // Wait for dialog
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  console.log('Dialog appeared');

  // Get dialog content
  const dialogText = await dialog.textContent();
  console.log('Dialog text:', dialogText?.substring(0, 200));

  // Click confirm
  console.log('\n=== CONFIRMING DELETE ===');
  const confirmBtn = dialog.getByRole('button', { name: /^delete$/i });
  await confirmBtn.click();

  // Wait for something to happen
  await page.waitForTimeout(3000);

  console.log('\n=== AFTER DELETE ===');
  console.log('Requests:', requests);
  console.log(
    'Responses:',
    responses.map((r) => ({ status: r.status, url: r.url, body: r.body }))
  );

  // Check dialog state
  const dialogStillVisible = await dialog.isVisible();
  console.log('Dialog still visible:', dialogStillVisible);

  // Check row count
  const finalCount = await rows.count();
  console.log(`Final row count: ${finalCount}`);
  console.log(`Rows changed: ${initialCount !== finalCount}`);

  // Check for toast
  const toast = page.locator('[role="alert"], [data-testid="toast"], .toast');
  const toastVisible = await toast.first().isVisible().catch(() => false);
  console.log('Toast visible:', toastVisible);
  if (toastVisible) {
    console.log('Toast text:', await toast.first().textContent());
  }

  // Check for error messages
  const errorElements = page.locator('[class*="error"], [class*="Error"]');
  const errorCount = await errorElements.count();
  console.log('Error elements found:', errorCount);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`DELETE request sent: ${requests.some((r) => r.includes('DELETE'))}`);
  const deleteResponse = responses.find((r) => r.url.includes('DELETE') || r.status === 204);
  console.log('DELETE response:', deleteResponse || 'NOT FOUND');
  console.log(
    `Result: ${finalCount < initialCount ? 'SUCCESS - row deleted' : 'FAILED - row not deleted'}`
  );
});

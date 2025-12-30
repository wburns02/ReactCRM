import { test, expect } from '@playwright/test';

test('Capture network traffic on work orders and schedule pages', async ({ page }) => {
  const apiCalls: Array<{url: string, status: number, method: string, body?: string}> = [];
  const errors: string[] = [];

  // Capture all API calls
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      let body = '';
      try {
        const text = await response.text();
        body = text.substring(0, 500);
      } catch {}
      apiCalls.push({
        url,
        status: response.status(),
        method: response.request().method(),
        body,
      });
    }
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('\n=== WORK ORDERS PAGE ===');
  await page.goto('https://react.ecbtx.com/app/work-orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('URL:', page.url());
  console.log('API calls:');
  apiCalls.forEach(call => {
    console.log(`  ${call.method} ${call.url} -> ${call.status}`);
    if (call.status >= 400) {
      console.log(`    Body: ${call.body}`);
    }
  });

  // Check page state
  const workOrdersVisible = await page.locator('table tbody tr').count();
  const noDataVisible = await page.locator('text=/no.*work.*order|no.*data|empty/i').first().isVisible().catch(() => false);
  const loadingVisible = await page.locator('.animate-spin').first().isVisible().catch(() => false);

  console.log('Work order rows:', workOrdersVisible);
  console.log('No data message:', noDataVisible);
  console.log('Loading spinner:', loadingVisible);

  // Check localStorage for auth
  const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
  console.log('Auth token exists:', !!authToken);
  console.log('Auth token length:', authToken?.length || 0);

  await page.screenshot({ path: 'work-orders-network.png', fullPage: true });

  // Clear for next page
  apiCalls.length = 0;

  console.log('\n=== SCHEDULE PAGE ===');
  await page.goto('https://react.ecbtx.com/app/schedule');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('URL:', page.url());
  console.log('API calls:');
  apiCalls.forEach(call => {
    console.log(`  ${call.method} ${call.url} -> ${call.status}`);
    if (call.status >= 400) {
      console.log(`    Body: ${call.body}`);
    }
  });

  // Check schedule page state
  const unscheduledPanel = await page.locator('text=/unscheduled/i').first().isVisible().catch(() => false);
  const unscheduledItems = await page.locator('[draggable="true"]').count();

  console.log('Unscheduled panel visible:', unscheduledPanel);
  console.log('Draggable items:', unscheduledItems);

  await page.screenshot({ path: 'schedule-network.png', fullPage: true });

  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach(e => console.log('  -', e.substring(0, 300)));
  }

  // ASSERT: We should have valid auth and some API responses
  expect(authToken).toBeTruthy();
});

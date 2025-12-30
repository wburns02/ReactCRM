import { test, expect } from '@playwright/test';

test('Check all data endpoints', async ({ page }) => {
  await page.goto('https://react.ecbtx.com/app/dashboard');
  await page.waitForLoadState('networkidle');

  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const baseUrl = 'https://react-crm-api-production.up.railway.app/api/v2';

  const endpoints = [
    '/customers/?page=1&page_size=100',
    '/work-orders?page=1&page_size=100',
    '/technicians/?page=1&page_size=100',
    '/invoices/?page=1&page_size=100',
  ];

  console.log('\n=== DATABASE CONTENT CHECK ===\n');

  for (const endpoint of endpoints) {
    const response = await page.request.get(baseUrl + endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status();
    let data: any = {};
    try {
      data = await response.json();
    } catch {}

    const total = data.total ?? data.length ?? 0;
    const count = data.items?.length ?? data.length ?? 0;
    console.log(`${endpoint.split('?')[0]}: ${status} - Total: ${total}, Items: ${count}`);
  }
});

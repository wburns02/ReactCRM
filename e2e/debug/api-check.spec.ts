import { test, expect } from '@playwright/test';

test('Check work orders API with auth', async ({ page }) => {
  // Navigate to app to get auth token
  await page.goto('https://react.ecbtx.com/app/dashboard');
  await page.waitForLoadState('networkidle');

  // Get auth token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  console.log('Token:', token ? 'present' : 'missing');

  // Make API call with auth
  const response = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/work-orders?page=1&page_size=50',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('Status:', response.status());
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('Total work orders:', data.total);
  console.log('Items count:', data.items?.length);

  if (data.items?.length > 0) {
    console.log('First work order:', JSON.stringify(data.items[0], null, 2));
  }
});

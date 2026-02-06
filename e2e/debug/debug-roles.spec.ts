import { test, expect } from '@playwright/test';

test('Debug roles and data endpoints', async ({ page }) => {
  // Login first
  await page.goto('https://react.ecbtx.com/login');
  await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
  await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects)/, { timeout: 15000 });
  
  console.log('Logged in, current URL:', page.url());
  
  // Now make request to /roles with the authenticated session
  const response = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/roles/'
  );
  
  console.log('=== ROLES ===');
  console.log('Status:', response.status());
  const body = await response.text();
  console.log('Response:', body);
  
  // Also check customers
  const customersResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/customers/'
  );
  console.log('=== CUSTOMERS ===');
  console.log('Status:', customersResponse.status());
  const customersBody = await customersResponse.text();
  console.log('Response (first 500):', customersBody.substring(0, 500));
  
  // Check invoices
  const invoicesResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/invoices/'
  );
  console.log('=== INVOICES ===');
  console.log('Status:', invoicesResponse.status());
  const invoicesBody = await invoicesResponse.text();
  console.log('Response (first 500):', invoicesBody.substring(0, 500));

  // Check work orders
  const workOrdersResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/work-orders/'
  );
  console.log('=== WORK ORDERS ===');
  console.log('Status:', workOrdersResponse.status());
  const workOrdersBody = await workOrdersResponse.text();
  console.log('Response (first 500):', workOrdersBody.substring(0, 500));
});

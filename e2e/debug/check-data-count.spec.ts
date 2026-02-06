import { test, expect } from '@playwright/test';

test('Check actual data in database', async ({ page }) => {
  // Login
  await page.goto('https://react.ecbtx.com/login');
  await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
  await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects)/, { timeout: 15000 });
  
  // Try customers without pagination
  const customersResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/customers/?page_size=100'
  );
  console.log('Customers:', customersResponse.status());
  const customersData = await customersResponse.json();
  console.log('Total customers:', customersData.total);
  
  // Try prospects
  const prospectsResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/prospects/?page_size=100'
  );
  console.log('Prospects:', prospectsResponse.status());
  const prospectsData = await prospectsResponse.json();
  console.log('Total prospects:', prospectsData.total);
  
  // Try technicians
  const techResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/technicians/'
  );
  console.log('Technicians:', techResponse.status());
  const techBody = await techResponse.text();
  console.log('Technicians response:', techBody.substring(0, 500));
  
  // Check dashboard
  const dashResponse = await page.request.get(
    'https://react-crm-api-production.up.railway.app/api/v2/dashboard/stats/'
  );
  console.log('Dashboard stats:', dashResponse.status());
  const dashBody = await dashResponse.text();
  console.log('Dashboard response:', dashBody.substring(0, 1000));
});

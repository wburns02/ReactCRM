import { test, expect } from '@playwright/test';

test('Check work orders API and page', async ({ page, request }) => {
  const apiUrl = 'https://react-crm-api-production.up.railway.app/api/v2';

  console.log('\n=== API Checks ===');

  // Work orders list
  const woResponse = await request.get(apiUrl + '/work-orders/?page=1&page_size=50');
  console.log('Work orders API:', woResponse.status());
  if (woResponse.ok()) {
    const data = await woResponse.json();
    console.log('Work orders count:', data.items?.length || 0);
    console.log('Total in DB:', data.total);
    if (data.items?.length > 0) {
      console.log('Sample work order:', JSON.stringify(data.items[0], null, 2));
    }
  } else {
    console.log('Error:', await woResponse.text());
  }

  // Schedule endpoint
  const schedResponse = await request.get(apiUrl + '/schedule/?start_date=2025-01-01&end_date=2025-12-31');
  console.log('Schedule API:', schedResponse.status());
  if (schedResponse.ok()) {
    const schedData = await schedResponse.json();
    console.log('Schedule items:', schedData.items?.length || schedData.length || 0);
  }

  // Technicians
  const techResponse = await request.get(apiUrl + '/technicians/');
  console.log('Technicians API:', techResponse.status());
  if (techResponse.ok()) {
    const data = await techResponse.json();
    console.log('Technicians count:', data.items?.length || data.length || 0);
  }

  console.log('\n=== Page Checks ===');

  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Capture network failures
  const networkErrors: string[] = [];
  page.on('requestfailed', req => {
    networkErrors.push(req.url() + ' - ' + req.failure()?.errorText);
  });

  // Navigate to work orders page
  await page.goto('https://react.ecbtx.com/work-orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('Page title:', await page.title());
  console.log('URL:', page.url());

  // Check for various states
  const noDataMsg = await page.locator('text=/no work orders|no data|empty/i').first().isVisible().catch(() => false);
  const tableRows = await page.locator('table tbody tr').count();
  const cardItems = await page.locator('[data-testid*="work-order"], .work-order-card, .work-order-item').count();
  const loadingSpinner = await page.locator('.animate-spin, .loading, [role="progressbar"]').first().isVisible().catch(() => false);
  const errorBanner = await page.locator('[role="alert"], .error, .error-message').first().isVisible().catch(() => false);

  console.log('"No work orders" message:', noDataMsg);
  console.log('Table rows:', tableRows);
  console.log('Card items:', cardItems);
  console.log('Loading spinner:', loadingSpinner);
  console.log('Error banner:', errorBanner);

  if (errors.length > 0) {
    console.log('\nConsole errors:');
    errors.forEach(e => console.log('  -', e.substring(0, 200)));
  }

  if (networkErrors.length > 0) {
    console.log('\nNetwork errors:');
    networkErrors.forEach(e => console.log('  -', e));
  }

  // Take screenshot
  await page.screenshot({ path: 'work-orders-check.png', fullPage: true });
  console.log('\nScreenshot saved');

  // Now check schedule page
  console.log('\n=== Schedule Page ===');
  await page.goto('https://react.ecbtx.com/schedule');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const unscheduledPanel = await page.locator('text=/unscheduled/i').first().isVisible().catch(() => false);
  const unscheduledItems = await page.locator('[data-testid*="unscheduled"], .unscheduled-item').count();
  const calendarEvents = await page.locator('[data-testid*="event"], .calendar-event, .fc-event').count();

  console.log('Unscheduled panel:', unscheduledPanel);
  console.log('Unscheduled items:', unscheduledItems);
  console.log('Calendar events:', calendarEvents);

  await page.screenshot({ path: 'schedule-check.png', fullPage: true });

  if (errors.length > 0) {
    console.log('\nSchedule page errors:');
    errors.slice(-5).forEach(e => console.log('  -', e.substring(0, 200)));
  }
});

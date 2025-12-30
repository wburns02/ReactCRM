import { test, expect } from '@playwright/test';

test('Debug page rendering', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  // Capture all console messages
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to work orders
  console.log('Navigating to work orders page...');
  await page.goto('https://react.ecbtx.com/app/work-orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Extra wait

  // Debug info
  console.log('\n=== PAGE DEBUG ===');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Check what components are rendered
  const h1Text = await page.locator('h1').first().textContent().catch(() => 'none');
  const h2Text = await page.locator('h2').first().textContent().catch(() => 'none');
  console.log('H1:', h1Text);
  console.log('H2:', h2Text);

  // Check for specific elements
  const workOrdersHeading = await page.locator('text=Work Orders').first().isVisible().catch(() => false);
  const createButton = await page.locator('button:has-text("Create")').first().isVisible().catch(() => false);
  const table = await page.locator('table').first().isVisible().catch(() => false);
  const loading = await page.locator('.animate-spin').first().isVisible().catch(() => false);
  const errorMsg = await page.locator('[role="alert"], .error').first().isVisible().catch(() => false);

  console.log('Work Orders heading:', workOrdersHeading);
  console.log('Create button:', createButton);
  console.log('Table visible:', table);
  console.log('Loading:', loading);
  console.log('Error message:', errorMsg);

  // Check body content
  const bodyText = await page.locator('body').textContent();
  console.log('Body text length:', bodyText?.length);
  console.log('Body preview:', bodyText?.substring(0, 500));

  // Check auth state
  const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
  console.log('Auth token:', authToken ? 'present' : 'missing');

  // Check React DevTools for component tree (if available)
  const reactRoot = await page.locator('#root').innerHTML();
  console.log('\nReact root HTML length:', reactRoot.length);

  // Check for 404 page
  const notFound = await page.locator('text=404').first().isVisible().catch(() => false);
  const pageNotFound = await page.locator('text=Page not found').first().isVisible().catch(() => false);
  console.log('404 visible:', notFound);
  console.log('Page not found visible:', pageNotFound);

  // Dump console logs
  if (logs.length > 0) {
    console.log('\n=== CONSOLE LOGS ===');
    logs.slice(-20).forEach(l => console.log(l));
  }

  await page.screenshot({ path: 'page-debug.png', fullPage: true });

  // Also check the schedule page
  console.log('\n=== SCHEDULE PAGE ===');
  await page.goto('https://react.ecbtx.com/app/schedule');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const scheduleHeading = await page.locator('text=Schedule').first().isVisible().catch(() => false);
  const calendarView = await page.locator('[class*="calendar"], [class*="schedule"]').first().isVisible().catch(() => false);

  console.log('Schedule heading:', scheduleHeading);
  console.log('Calendar view:', calendarView);

  await page.screenshot({ path: 'schedule-debug.png', fullPage: true });
});

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://react.ecbtx.com';
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test('debug estimates detail page', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  // Login
  await page.goto(`${PRODUCTION_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/(dashboard|estimates)/, { timeout: 15000 });
  
  // Navigate to estimates list
  await page.goto(`${PRODUCTION_URL}/estimates`);
  await page.waitForLoadState('networkidle');
  console.log('Estimates list loaded');
  
  // Find first estimate row and click
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  console.log(`Found ${count} estimate rows`);
  
  if (count > 0) {
    await rows.first().click();
    await page.waitForTimeout(3000);
    
    // Check URL
    console.log('Current URL:', page.url());
    
    // Check for error boundary
    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible({ timeout: 1000 }).catch(() => false);
    console.log('ERROR BOUNDARY DETECTED:', hasError);
    
    // Check if estimate content is visible
    const h1 = await page.locator('h1').textContent({ timeout: 1000 }).catch(() => 'not found');
    console.log('H1 content:', h1);
    
    // Print all console errors
    console.log('Console Errors:', JSON.stringify(errors, null, 2));
    
    // The test should fail if error boundary is shown
    expect(hasError).toBe(false);
  }
});

import { test, expect } from '@playwright/test';

test('debug work orders page', async ({ page }) => {
  // Navigate directly to work orders
  await page.goto('https://react.ecbtx.com/work-orders');
  
  // Wait and capture state
  await page.waitForTimeout(5000);
  
  // Log current URL
  console.log('Current URL:', page.url());
  
  // Log page title
  const title = await page.title();
  console.log('Page Title:', title);
  
  // Check if login form is visible
  const signInButton = await page.getByRole('button', { name: 'Sign In' }).isVisible();
  console.log('Sign In button visible:', signInButton);
  
  // Check for any headings
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('Headings:', headings);
  
  // Check for sidebar/nav
  const sidebar = await page.locator('[class*="sidebar"], nav, [role="navigation"]').count();
  console.log('Sidebar/nav elements:', sidebar);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/work-orders-debug.png' });
  console.log('Screenshot saved to /tmp/work-orders-debug.png');
});

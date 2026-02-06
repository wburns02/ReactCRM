import { test, expect } from '@playwright/test';

test('Create dump site', async ({ page }) => {
  // Navigate to login
  await page.goto('https://macseptic.up.railway.app/login');
  
  // Take screenshot to see what we get
  await page.screenshot({ path: 'test-results/01-login-page.png' });
  
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Check if login form is visible
  const loginForm = await page.locator('input[type="email"]').isVisible({ timeout: 10000 }).catch(() => false);
  console.log('Login form visible:', loginForm);
  
  if (!loginForm) {
    console.log('Login form not found - page might be down');
    await page.screenshot({ path: 'test-results/02-page-state.png' });
    return;
  }
  
  // Fill login credentials
  await page.fill('input[type="email"]', 'will@macseptic.com');
  await page.fill('input[type="password"]', '#Espn2025');
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/.*dashboard.*|.*\/$/, { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: 'test-results/03-after-login.png' });
  
  console.log('After login URL:', page.url());
  
  // Navigate to Dump Sites
  await page.goto('https://macseptic.up.railway.app/admin/dump-sites');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/04-dump-sites-page.png' });
  
  console.log('Dump sites URL:', page.url());
  
  // Click Add New Site button
  const addButton = await page.locator('button:has-text("Add New Site")').isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Add button visible:', addButton);
  
  if (addButton) {
    await page.click('button:has-text("Add New Site")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/05-add-form-open.png' });
    
    // Fill in the form
    await page.fill('input[name="name"]', 'Test Dump Site');
    await page.fill('input[name="address_city"]', 'Austin');
    await page.selectOption('select[name="address_state"]', 'TX');
    await page.fill('input[name="fee_per_gallon"]', '7');
    
    await page.screenshot({ path: 'test-results/06-form-filled.png' });
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/07-after-submit.png' });
    
    // Check for success or error
    const successToast = await page.locator('text=successfully').isVisible().catch(() => false);
    const errorToast = await page.locator('[class*="error"], [class*="Error"]').isVisible().catch(() => false);
    
    console.log('Success toast:', successToast);
    console.log('Error visible:', errorToast);
  }
});

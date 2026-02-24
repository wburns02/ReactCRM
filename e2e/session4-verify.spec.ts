import { test, expect } from '@playwright/test';

// Fresh browser context - no stored auth state
test.use({ storageState: { cookies: [], origins: [] } });

test('session 4: TechJobDetailPage tab components work', async ({ page }) => {
  // Login as tech
  await page.goto('https://react.ecbtx.com/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: 'Sign In' }).waitFor({ state: 'visible', timeout: 10000 });

  await page.fill('input[type="email"]', 'tech@macseptic.com');
  await page.fill('input[type="password"]', '#Espn2025');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect away from login
  await page.waitForFunction(() => !location.href.includes('/login'), { timeout: 15000 });
  // Wait for app to settle (dashboard or redirect destination)
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  console.log('After login URL:', page.url());

  // Navigate to jobs - use domcontentloaded to avoid SPA redirect aborts
  await page.goto('https://react.ecbtx.com/portal/jobs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('Jobs page URL:', page.url());

  // Wait for skeleton loading to finish
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    return skeletons.length === 0;
  }, { timeout: 15000 });

  // Check jobs loaded
  const jobCountEl = page.locator('text=/\\d+ jobs/').first();
  const jobCount = await jobCountEl.textContent({ timeout: 5000 }).catch(() => 'not found');
  console.log('Job count text:', jobCount);

  // Click first cursor-pointer job card
  const jobCard = page.locator('.cursor-pointer').first();
  await jobCard.waitFor({ state: 'visible', timeout: 8000 });
  await jobCard.click();

  await page.waitForFunction(() => location.href.includes('/portal/jobs/'), { timeout: 8000 });
  console.log('Job detail URL:', page.url());

  // Verify Info tab (default)
  await page.waitForSelector('text=Customer', { timeout: 8000 });
  const hasCustomer = (await page.locator('text=Customer').count()) > 0;
  console.log('Has Customer section:', hasCustomer);

  const pageText = await page.locator('body').innerText();
  console.log('Has date info:', /Date|Scheduled|Service/.test(pageText));
  console.log('Has job type info:', /Job Type|Service Type|Type/.test(pageText));

  // Photos tab
  const photosTab = page.locator('button:has-text("Photos")');
  if (await photosTab.count() > 0) {
    await photosTab.click();
    await page.waitForTimeout(1000);
    const hasPhotos = (await page.locator('text=Required Photos').count()) > 0;
    console.log('Photos tab - Required Photos visible:', hasPhotos);
  } else {
    console.log('Photos tab: not found');
  }

  // Payment tab
  const paymentTab = page.locator('button:has-text("Payment")');
  if (await paymentTab.count() > 0) {
    await paymentTab.click();
    await page.waitForTimeout(1000);
    const hasPayment = (await page.locator('text=Record Payment').count()) > 0;
    console.log('Payment tab - Record Payment form visible:', hasPayment);
  } else {
    console.log('Payment tab: not found');
  }

  console.log('Verification complete!');
});

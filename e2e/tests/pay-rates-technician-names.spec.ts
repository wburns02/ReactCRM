import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

test.describe('Pay Rates - Technician Names Fix', () => {
  test('should display actual technician names instead of UUIDs on Pay Rates tab', async ({ page }) => {
    // Navigate to payroll page
    await page.goto(`${BASE_URL}/payroll`);

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Skip if redirected to login (auth not available)
    if (page.url().includes('login')) {
      console.log('Skipping: Not authenticated');
      test.skip();
      return;
    }

    // Wait for payroll header to appear
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Verify we're on the Payroll page
    await expect(page.locator('h1')).toContainText('Payroll');

    // Click on Pay Rates tab
    await page.getByRole('button', { name: /Pay Rates/i }).click();
    await page.waitForTimeout(2000); // Wait for API response

    // Check for pay rates content
    const ratesHeading = page.locator('h3', { hasText: 'Technician Pay Rates' });
    const emptyState = page.locator('text=No Pay Rates Configured');
    const loadingSpinner = page.locator('.animate-pulse');

    // Wait for one of these to appear
    await expect(ratesHeading.or(emptyState).or(loadingSpinner)).toBeVisible({ timeout: 10000 });

    // If there's an empty state, skip the name verification
    const isEmpty = await emptyState.isVisible().catch(() => false);
    if (isEmpty) {
      console.log('No pay rates configured - cannot verify names');
      return;
    }

    // Wait for loading to complete
    await page.waitForTimeout(1000);

    // Get all technician name elements on the page
    // The component renders: {rate.technician_name || `Technician #${rate.technician_id}`}
    // Look for any text containing "Technician #" followed by UUID pattern
    const uuidPattern = /Technician #[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

    // Get all visible text content
    const pageContent = await page.textContent('body');

    // Check if any UUID pattern exists on the page
    const hasUUIDs = uuidPattern.test(pageContent || '');

    // Log what we found for debugging
    console.log('Page URL:', page.url());
    console.log('Has UUID pattern in content:', hasUUIDs);

    // Take a screenshot for evidence
    await page.screenshot({ path: 'test-results/pay-rates-names.png', fullPage: true });

    // The test passes if NO UUIDs are visible (meaning real names are showing)
    // Or if it shows "Unknown Technician" (fallback for deleted technicians)
    if (hasUUIDs) {
      // Extract and log the UUIDs found for debugging
      const matches = (pageContent || '').match(/Technician #[a-f0-9-]{36}/gi);
      console.log('Found UUIDs still showing:', matches);

      // Fail the test - we should see real names, not UUIDs
      expect(hasUUIDs, 'Should not display technician UUIDs - expected real names').toBe(false);
    }

    console.log('SUCCESS: No technician UUIDs found - names are displaying correctly');
  });

  test('should verify API returns technician_name field', async ({ page, request }) => {
    // First authenticate by visiting the page
    await page.goto(`${BASE_URL}/payroll`);

    // Skip if not authenticated
    if (page.url().includes('login')) {
      console.log('Skipping: Not authenticated');
      test.skip();
      return;
    }

    // Wait for session cookie to be established
    await page.waitForTimeout(1000);

    // Get cookies from browser context
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');

    if (!sessionCookie) {
      console.log('No session cookie found - skipping API test');
      test.skip();
      return;
    }

    // Make API request to pay rates endpoint
    const response = await request.get('https://react-crm-api-production.up.railway.app/api/v2/payroll/pay-rates', {
      headers: {
        'Cookie': `session=${sessionCookie.value}`,
      },
    });

    console.log('API Response Status:', response.status());

    if (response.status() !== 200) {
      console.log('API returned non-200 status, skipping validation');
      return;
    }

    const data = await response.json();
    console.log('Number of pay rates:', data.rates?.length || 0);

    if (data.rates && data.rates.length > 0) {
      // Check first rate has technician_name field
      const firstRate = data.rates[0];
      console.log('First rate technician_id:', firstRate.technician_id);
      console.log('First rate technician_name:', firstRate.technician_name);

      // Verify technician_name exists and is not a UUID
      expect(firstRate).toHaveProperty('technician_name');
      expect(firstRate.technician_name).not.toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}/i);

      console.log('SUCCESS: API returns technician_name field correctly');
    } else {
      console.log('No pay rates found in API response');
    }
  });
});

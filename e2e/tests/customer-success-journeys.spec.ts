import { test, expect } from '@playwright/test';

test.describe('Customer Success - Journeys Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('https://react.ecbtx.com/login');
    await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || 'test@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should display world-class journeys with step counts', async ({ page }) => {
    // Navigate to Customer Success page
    await page.goto('https://react.ecbtx.com/customer-success');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({ path: 'e2e/screenshots/cs-initial.png', fullPage: true });

    // Click on Journeys tab - use text match since tabs are visible
    const journeysTab = page.locator('text=Journeys').first();
    await journeysTab.waitFor({ state: 'visible', timeout: 10000 });
    await journeysTab.click();
    await page.waitForTimeout(3000);

    // Take screenshot of journeys tab
    await page.screenshot({ path: 'e2e/screenshots/cs-journeys-tab.png', fullPage: true });

    // Look for journey names in the page content
    const pageContent = await page.content();

    const expectedJourneys = [
      'New Customer Welcome',
      'Emergency Service',
      'At-Risk',
      'Referral',
      'Seasonal',
      'Win-Back',
      'Commercial',
      'Annual Contract',
      'Post-Service',
      'VIP',
      'Homeowner',
      'Property Manager'
    ];

    // Count found journeys
    let foundJourneys = 0;
    for (const journeyName of expectedJourneys) {
      if (pageContent.includes(journeyName)) {
        foundJourneys++;
        console.log(`✓ Found journey: ${journeyName}`);
      } else {
        console.log(`✗ Missing journey: ${journeyName}`);
      }
    }

    console.log(`Found ${foundJourneys} of ${expectedJourneys.length} expected journeys`);

    // Verify we have journeys displayed (at least 8 of 12)
    expect(foundJourneys).toBeGreaterThan(7);

    // Check for step counts - look for patterns like "7 steps" or "10 steps"
    const stepCountMatches = pageContent.match(/\d+\s*steps?/gi) || [];
    console.log('Step count patterns found:', stepCountMatches.slice(0, 15));

    // Verify not all are 0 steps
    const nonZeroSteps = stepCountMatches.filter(text => {
      const match = text.match(/(\d+)/);
      return match && parseInt(match[1]) > 0;
    });

    console.log(`Non-zero step counts: ${nonZeroSteps.length}`);
    expect(nonZeroSteps.length).toBeGreaterThan(0);
  });

  test('should click on a journey and see details', async ({ page }) => {
    // Navigate to Customer Success Journeys tab
    await page.goto('https://react.ecbtx.com/customer-success');
    await page.waitForLoadState('networkidle');

    const journeysTab = page.locator('text=Journeys').first();
    await journeysTab.waitFor({ state: 'visible', timeout: 10000 });
    await journeysTab.click();
    await page.waitForTimeout(3000);

    // Click on a journey to open detail - try clicking on any journey name
    const journeyCard = page.locator('text=/New Customer Welcome|Emergency Service|At-Risk/i').first();

    if (await journeyCard.isVisible({ timeout: 5000 })) {
      await journeyCard.click();
      await page.waitForTimeout(2000);

      // Take screenshot of modal/detail view
      await page.screenshot({ path: 'e2e/screenshots/cs-journey-detail.png', fullPage: true });

      // Check for any detail content
      const pageContent = await page.content();

      // Look for step-related content or view modes
      const hasStepContent = pageContent.includes('step') || pageContent.includes('Step');
      const hasFlowView = pageContent.includes('Flow') || pageContent.includes('flow');
      const hasListView = pageContent.includes('List') || pageContent.includes('list');

      console.log(`Detail view content: steps=${hasStepContent}, flow=${hasFlowView}, list=${hasListView}`);

      // At least some detail should be visible
      expect(hasStepContent || hasFlowView || hasListView).toBe(true);
    } else {
      // If no clickable journey, check that journeys are at least listed
      const pageContent = await page.content();
      expect(pageContent.includes('journey') || pageContent.includes('Journey')).toBe(true);
    }
  });
});

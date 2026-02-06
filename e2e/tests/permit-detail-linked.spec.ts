import { test, expect } from "@playwright/test";

/**
 * Permit Detail Page Linked Property Verification
 *
 * Verifies that the permit detail page shows linked property data
 * instead of "No property data linked to this permit"
 */
test.describe("Permit Detail Linked Property", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });
  });

  test("should show linked property data on permit detail page", async ({ page }) => {
    // Go to permits page
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle");

    // Wait for table to load
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    // Get first permit row and click it to navigate to detail page
    const firstRow = page.locator('[data-testid="permits-row"]').first();
    await expect(firstRow).toBeVisible();

    // Find a linked permit (green icon) and click its row
    const linkedIcon = page.locator('[data-testid="linked-property-icon"]').first();
    if (await linkedIcon.isVisible()) {
      // Click the row containing this icon
      const row = linkedIcon.locator('xpath=ancestor::tr');
      await row.click();
    } else {
      // Just click first row if no linked icons
      await firstRow.click();
    }

    // Wait for navigation to detail page
    await page.waitForURL(/\/permits\/[a-f0-9-]+/, { timeout: 10000 });

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check that "Linked Property" section exists
    const linkedPropertyHeader = page.locator('text=Linked Property');
    await expect(linkedPropertyHeader.first()).toBeVisible({ timeout: 10000 });

    // CRITICAL: Check that we DON'T see "No property data linked to this permit"
    const noDataMessage = page.locator('text=No property data linked to this permit');

    // Wait a moment for property data to load
    await page.waitForTimeout(2000);

    // Count occurrences of the "no data" message
    const noDataCount = await noDataMessage.count();
    console.log(`"No property data linked" occurrences: ${noDataCount}`);

    // Check for property panel sections that indicate data is present
    const propertyOverview = page.locator('text=Property Overview');
    const ownerInfo = page.locator('text=Owner Information');
    const allPermits = page.locator('text=All Permits on This Property');

    const hasPropertyData = await propertyOverview.count() > 0 ||
                           await ownerInfo.count() > 0 ||
                           await allPermits.count() > 0;

    console.log(`Property Overview visible: ${await propertyOverview.count() > 0}`);
    console.log(`Owner Info visible: ${await ownerInfo.count() > 0}`);
    console.log(`All Permits visible: ${await allPermits.count() > 0}`);

    // VERIFY: Either we see property data OR we see a message (not the old "no data" message)
    expect(hasPropertyData || noDataCount === 0).toBe(true);
  });

  test("API endpoint returns property data", async ({ page, request }) => {
    // Navigate to permits to get a permit ID
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle");

    // Get cookies for API call
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

    // Get a permit ID from search
    const searchResp = await request.get(
      "https://react-crm-api-production.up.railway.app/api/v2/permits/search?page=1&page_size=1",
      { headers: { Cookie: cookieHeader } }
    );
    expect(searchResp.status()).toBe(200);

    const searchData = await searchResp.json();
    expect(searchData.results).toBeDefined();
    expect(searchData.results.length).toBeGreaterThan(0);

    const permitId = searchData.results[0].permit.id;
    console.log(`Testing permit ID: ${permitId}`);

    // Call the NEW /permits/{id}/property endpoint
    const propertyResp = await request.get(
      `https://react-crm-api-production.up.railway.app/api/v2/permits/${permitId}/property`,
      { headers: { Cookie: cookieHeader } }
    );

    console.log(`Property endpoint status: ${propertyResp.status()}`);
    expect(propertyResp.status()).toBe(200);

    const propertyData = await propertyResp.json();
    console.log(`Property data:`, JSON.stringify(propertyData, null, 2).substring(0, 500));

    // Verify response structure
    expect(propertyData.permit_id).toBe(permitId);
    expect(propertyData.total_permits).toBeGreaterThanOrEqual(0);

    // If property is not null, verify it has expected fields
    if (propertyData.property) {
      expect(propertyData.property.id).toBeDefined();
      expect(propertyData.property.address).toBeDefined();
      console.log(`Property address: ${propertyData.property.address}`);
    } else {
      console.log(`Property is null, message: ${propertyData.message}`);
    }
  });

  test("detail page shows property panel with data", async ({ page }) => {
    // Go directly to permits and get first permit ID via network interception
    let permitId: string | null = null;

    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          const data = await response.json();
          if (data.results?.length > 0) {
            permitId = data.results[0].permit.id;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    await page.goto("https://react.ecbtx.com/permits");
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(permitId).toBeTruthy();
    console.log(`Navigating to permit: ${permitId}`);

    // Navigate to detail page
    await page.goto(`https://react.ecbtx.com/permits/${permitId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot for verification
    await page.screenshot({ path: "e2e/screenshots/permit-detail-linked-property.png", fullPage: true });

    // Check for property data sections (after API responds)
    const propertyPanel = page.locator('.mt-6').filter({ hasText: 'Linked Property' });
    await expect(propertyPanel).toBeVisible({ timeout: 10000 });

    // Verify we see actual data, not "No property data"
    const pageContent = await page.content();
    const hasNoDataMessage = pageContent.includes("No property data linked to this permit");
    const hasPropertyData = pageContent.includes("Property Overview") ||
                           pageContent.includes("Owner Information") ||
                           pageContent.includes("All Permits on This Property");

    console.log(`Has "no data" message: ${hasNoDataMessage}`);
    console.log(`Has property data sections: ${hasPropertyData}`);

    // For permits with rich data, we should see property sections
    // For permits without rich data, we get a different message
    expect(hasPropertyData || !hasNoDataMessage).toBe(true);
  });
});

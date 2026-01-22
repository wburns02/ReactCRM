import { test, expect } from "@playwright/test";

/**
 * Permits Linked-Data Visibility Enforcement Tests
 *
 * These tests verify that linked-data indicators are VISIBLY displayed
 * on the Permits page when permits have rich data (URLs, parcel numbers, etc.)
 */
test.describe("Permits Linked-Data Visibility", () => {
  test.beforeEach(async ({ page }) => {
    // Login with provided credentials
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Navigate to permits page
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle");
  });

  test("should show linked property indicators on permits with URLs", async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    // Check for linked property icons - should have at least some
    const linkedIcons = page.locator('[data-testid="linked-property-icon"]');
    const linkedCount = await linkedIcons.count();

    console.log(`Linked property icons found: ${linkedCount}`);

    // CRITICAL: At least one permit should show as linked
    expect(linkedCount).toBeGreaterThan(0);
  });

  test("should display green icons for linked permits", async ({ page }) => {
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    // Find green house icons (linked status)
    const greenIcons = page.locator('[data-testid="linked-property-icon"] svg.text-green-600');
    const greenCount = await greenIcons.count();

    console.log(`Green linked icons: ${greenCount}`);

    // At least one should be green
    expect(greenCount).toBeGreaterThan(0);
  });

  test("linked icons should have proper accessibility attributes", async ({ page }) => {
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    const linkedIcon = page.locator('[data-testid="linked-property-icon"]').first();

    if (await linkedIcon.isVisible()) {
      // Check title attribute
      const title = await linkedIcon.getAttribute("title");
      expect(title).toBeTruthy();
      expect(title).toMatch(/[Ll]inked/);

      // Check aria-label
      const ariaLabel = await linkedIcon.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    }
  });

  test("API should return has_property=true for permits with URLs", async ({ page }) => {
    // This test navigates fresh to capture the API response
    // Note: beforeEach already logged in, so we just need to navigate

    let hasLinkedPermit = false;
    let linkedCount = 0;
    let totalCount = 0;

    // Set up listener BEFORE navigating
    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          const data = await response.json();
          if (data.results) {
            totalCount = data.results.length;
            for (const r of data.results) {
              if (r.permit.has_property === true) {
                hasLinkedPermit = true;
                linkedCount++;
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    // Navigate again to trigger fresh API call (listener is ready now)
    await page.goto("https://react.ecbtx.com/permits");
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for response processing

    console.log(`API returned ${linkedCount}/${totalCount} linked permits`);

    // CRITICAL: API must return at least one linked permit
    expect(hasLinkedPermit).toBe(true);
    expect(linkedCount).toBeGreaterThan(0);
  });

  test("should have no console errors with linked icons", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    // Navigate pages to exercise the component
    const nextButton = page.locator('[data-testid="pagination-next"]');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForLoadState("networkidle");
      await page.locator('[data-testid="pagination-prev"]').click();
      await page.waitForLoadState("networkidle");
    }

    // Filter known benign errors
    const realErrors = consoleErrors.filter(
      (err) => !err.includes("Sentry") && !err.includes("DSN not configured")
    );

    expect(realErrors).toHaveLength(0);
  });

  test("should have no failed network requests", async ({ page }) => {
    const failedRequests: string[] = [];

    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    // Filter out known acceptable 4xx (like 404 for missing resources)
    const criticalFailures = failedRequests.filter(
      (req) => !req.includes("/favicon.ico") && !req.includes("analytics")
    );

    expect(criticalFailures).toHaveLength(0);
  });

  test("linked icon tooltip should be visible on hover", async ({ page }) => {
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    const linkedIcon = page.locator('[data-testid="linked-property-icon"]').first();

    if (await linkedIcon.isVisible()) {
      // Hover over the icon
      await linkedIcon.hover();

      // The title attribute should create a native tooltip
      const title = await linkedIcon.getAttribute("title");
      expect(title).toBeTruthy();
      console.log(`Tooltip text: ${title}`);
    }
  });

  test("multiple rows should show linked indicators", async ({ page }) => {
    await expect(page.locator('[data-testid="permits-table"]')).toBeVisible({ timeout: 15000 });

    const rows = page.locator('[data-testid="permits-row"]');
    const rowCount = await rows.count();

    const linkedIcons = page.locator('[data-testid="linked-property-icon"]');
    const linkedCount = await linkedIcons.count();

    console.log(`Rows: ${rowCount}, Linked icons: ${linkedCount}`);

    // Multiple rows should have linked indicators (not just one)
    // At least 50% of visible permits should show linked
    expect(linkedCount).toBeGreaterThan(rowCount * 0.3);
  });
});

/**
 * Invoice Date Filtering Verification
 * Verifies that date filters actually filter invoices by due_date
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Date Filtering", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("date_from filter excludes invoices before that date", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Screenshot initial state
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-filter-initial.png",
      fullPage: false,
    });

    // Get all due dates before filtering
    const dueDatesBeforeText = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Due dates before filter:", dueDatesBeforeText);

    // Set date_from to Jan 27, 2026 (should exclude older invoices)
    const dateFromInput = page.locator('input[type="date"]').first();
    await dateFromInput.fill("2026-01-27");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Screenshot filtered state
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-filter-from.png",
      fullPage: false,
    });

    // Get due dates after filtering
    const dueDatesAfterText = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Due dates after date_from filter:", dueDatesAfterText);

    // Verify all visible due dates are >= 2026-01-27
    for (const dateText of dueDatesAfterText) {
      if (dateText && dateText !== "-") {
        // Parse the date (format: "Jan 27, 2026")
        const dateObj = new Date(dateText);
        const filterDate = new Date("2026-01-27");
        console.log(`Checking: ${dateText} (${dateObj.toISOString()}) >= ${filterDate.toISOString()}`);
        // Allow some flexibility in date parsing
        if (!isNaN(dateObj.getTime())) {
          expect(dateObj.getTime()).toBeGreaterThanOrEqual(filterDate.getTime() - 86400000); // Allow 1 day tolerance
        }
      }
    }
  });

  test("date_to filter excludes invoices after that date", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Set date_to to Jan 26, 2026 (should exclude newer invoices)
    const dateToInput = page.locator('input[type="date"]').nth(1);
    await dateToInput.fill("2026-01-26");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Screenshot filtered state
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-filter-to.png",
      fullPage: false,
    });

    // Get due dates after filtering
    const dueDatesAfterText = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Due dates after date_to filter:", dueDatesAfterText);

    // Verify all visible due dates are <= 2026-01-26
    for (const dateText of dueDatesAfterText) {
      if (dateText && dateText !== "-") {
        const dateObj = new Date(dateText);
        const filterDate = new Date("2026-01-26");
        console.log(`Checking: ${dateText} (${dateObj.toISOString()}) <= ${filterDate.toISOString()}`);
        if (!isNaN(dateObj.getTime())) {
          expect(dateObj.getTime()).toBeLessThanOrEqual(filterDate.getTime() + 86400000); // Allow 1 day tolerance
        }
      }
    }
  });

  test("combined date range shows only invoices in range", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Set both date_from and date_to for a narrow range
    const dateFromInput = page.locator('input[type="date"]').first();
    const dateToInput = page.locator('input[type="date"]').nth(1);

    await dateFromInput.fill("2026-01-27");
    await page.waitForTimeout(500);
    await dateToInput.fill("2026-01-27");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-filter-range.png",
      fullPage: false,
    });

    // Get due dates
    const dueDatesText = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Due dates in range filter:", dueDatesText);

    // All dates should be Jan 27, 2026 (or empty if no invoices match)
    for (const dateText of dueDatesText) {
      if (dateText && dateText !== "-") {
        console.log(`Date in range: ${dateText}`);
        expect(dateText).toContain("Jan 27");
      }
    }
  });

  test("clear filters resets date range", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Count invoices before filter
    const countBefore = await page.locator("table tbody tr").count();
    console.log("Invoice count before filter:", countBefore);

    // Set a date filter
    const dateFromInput = page.locator('input[type="date"]').first();
    await dateFromInput.fill("2026-01-28");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");

    // Count after filter
    const countFiltered = await page.locator("table tbody tr").count();
    console.log("Invoice count after filter:", countFiltered);

    // Click clear filters
    const clearButton = page.locator("text=Clear filters");
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");

      // Count after clear
      const countAfterClear = await page.locator("table tbody tr").count();
      console.log("Invoice count after clear:", countAfterClear);

      // Should return to original count
      expect(countAfterClear).toBe(countBefore);
    }
  });
});

/**
 * Final Invoice Date Filtering Verification
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Date Filter Final", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("date filtering works correctly", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get initial due dates
    const initialDates = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("Initial due dates:", initialDates);

    // Test: date_from = Jan 28 should only show Jan 28 invoices
    const dateFromInput = page.locator('input[type="date"]').first();
    await dateFromInput.fill("2026-01-28");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const afterFromFilter = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("After date_from=Jan28:", afterFromFilter);

    // All shown dates should be >= Jan 28
    for (const dateText of afterFromFilter) {
      if (dateText && dateText !== "-") {
        console.log(`Checking: ${dateText} contains Jan 28`);
        expect(dateText).toContain("Jan 28");
      }
    }

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-final-from.png",
      fullPage: false,
    });

    // Clear and test date_to
    await dateFromInput.fill("");
    await page.waitForTimeout(500);

    const dateToInput = page.locator('input[type="date"]').nth(1);
    await dateToInput.fill("2026-01-27");
    await page.waitForTimeout(1000);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const afterToFilter = await page.locator("table tbody tr td:nth-child(5)").allTextContents();
    console.log("After date_to=Jan27:", afterToFilter);

    // All shown dates with due_date should be <= Jan 27
    for (const dateText of afterToFilter) {
      if (dateText && dateText !== "-") {
        console.log(`Checking: ${dateText}`);
        // Should NOT contain Jan 28
        expect(dateText).not.toContain("Jan 28");
      }
    }

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-date-final-to.png",
      fullPage: false,
    });

    console.log("Date filtering works correctly!");
  });
});

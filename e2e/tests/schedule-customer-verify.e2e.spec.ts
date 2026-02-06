/**
 * Verify Schedule Page Customer Names
 */
import { test, expect } from "@playwright/test";

test.describe("Schedule Customer Names", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("schedule shows real customer names not Customer #X", async ({ page }) => {
    // Navigate to schedule
    await page.goto("https://react.ecbtx.com/schedule");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/schedule-customer-final.png",
      fullPage: false,
    });

    // Get page text
    const pageText = await page.textContent("body");

    // Check for "Customer #X" pattern (should NOT exist)
    const customerHashPattern = /Customer #\d+/g;
    const matches = pageText?.match(customerHashPattern) || [];
    console.log("Customer #X patterns found:", matches);

    // Should have no "Customer #X" fallbacks
    expect(matches.length).toBe(0);

    // Should see real customer names
    const hasWillBurns = pageText?.includes("Will Burns");
    const hasBradHoff = pageText?.includes("Brad Hoff");
    console.log("Has Will Burns:", hasWillBurns);
    console.log("Has Brad Hoff:", hasBradHoff);

    // At least one real customer name should appear
    expect(hasWillBurns || hasBradHoff).toBe(true);

    console.log("SUCCESS: Customer names are showing correctly!");
  });
});

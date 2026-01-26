import { test, expect } from "@playwright/test";

/**
 * Invoices Filter Clarity E2E Tests
 *
 * Validates:
 * - Current filter is clearly labeled at all times
 * - Filters show correct data
 * - No confusion about which view is active
 */

const BASE_URL = "https://react.ecbtx.com";
const INVOICES_URL = `${BASE_URL}/invoices`;

test.describe("Invoices Filter Clarity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders|invoices)/, {
      timeout: 15000,
    });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    await page.goto(INVOICES_URL);
    await page.waitForTimeout(2000);
  });

  test("default state shows invoice count without filter label", async ({ page }) => {
    console.log("Test: Default state shows invoice count");

    // Wait for table to load
    await page.waitForSelector("table", { timeout: 10000 });

    // Find the card title (h3 with text-xl font-semibold)
    const cardTitle = page.locator("h3.text-xl.font-semibold").first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });

    const titleText = await cardTitle.textContent();
    console.log("Default title:", titleText);

    // Should show "X invoices" or "X invoice"
    expect(titleText).toMatch(/^\d+ invoices?$/);
    console.log("PASS: Default shows count without filter label");
  });

  test("selecting Draft filter updates label to include Draft", async ({ page }) => {
    console.log("Test: Draft filter shows 'X Draft invoices'");

    await page.waitForSelector("table", { timeout: 10000 });

    // Select Draft filter
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("draft");
    await page.waitForTimeout(1500);

    // Find the card title
    const cardTitle = page.locator("h3.text-xl.font-semibold").first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });

    const titleText = await cardTitle.textContent();
    console.log("Draft filter title:", titleText);

    // Should show "X Draft invoices" or "X Draft invoice"
    expect(titleText).toMatch(/^\d+ Draft invoices?$/);
    console.log("PASS: Draft filter shows labeled count");
  });

  test("selecting Sent filter updates label to include Sent", async ({ page }) => {
    console.log("Test: Sent filter shows 'X Sent invoices'");

    await page.waitForSelector("table", { timeout: 10000 });

    // Select Sent filter
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("sent");
    await page.waitForTimeout(1500);

    const cardTitle = page.locator("h3.text-xl.font-semibold").first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });

    const titleText = await cardTitle.textContent();
    console.log("Sent filter title:", titleText);

    // Should show "X Sent invoices" or "X Sent invoice"
    expect(titleText).toMatch(/^\d+ Sent invoices?$/);
    console.log("PASS: Sent filter shows labeled count");
  });

  test("selecting Paid filter updates label to include Paid", async ({ page }) => {
    console.log("Test: Paid filter shows 'X Paid invoices'");

    await page.waitForSelector("table", { timeout: 10000 });

    // Select Paid filter
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("paid");
    await page.waitForTimeout(1500);

    const cardTitle = page.locator("h3.text-xl.font-semibold").first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });

    const titleText = await cardTitle.textContent();
    console.log("Paid filter title:", titleText);

    // Should show "X Paid invoices" or "X Paid invoice"
    expect(titleText).toMatch(/^\d+ Paid invoices?$/);
    console.log("PASS: Paid filter shows labeled count");
  });

  test("clearing filter returns to default label", async ({ page }) => {
    console.log("Test: Clearing filter returns to default");

    await page.waitForSelector("table", { timeout: 10000 });

    // First select a filter
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("draft");
    await page.waitForTimeout(1000);

    // Verify filter is active
    let cardTitle = page.locator("h3.text-xl.font-semibold").first();
    let titleText = await cardTitle.textContent();
    console.log("With Draft filter:", titleText);
    expect(titleText).toContain("Draft");

    // Clear filter by selecting empty option
    await statusSelect.selectOption("");
    await page.waitForTimeout(1500);

    // Verify back to default
    titleText = await cardTitle.textContent();
    console.log("After clearing:", titleText);

    // Should show "X invoices" without filter label
    expect(titleText).toMatch(/^\d+ invoices?$/);
    expect(titleText).not.toContain("Draft");
    expect(titleText).not.toContain("Sent");
    expect(titleText).not.toContain("Paid");
    console.log("PASS: Clearing filter returns to default label");
  });

  test("Clear filters button appears when filter is active", async ({ page }) => {
    console.log("Test: Clear filters button visibility");

    await page.waitForSelector("table", { timeout: 10000 });

    // Initially no Clear filters button
    const clearButton = page.getByRole("button", { name: /clear filters/i });
    await expect(clearButton).not.toBeVisible();
    console.log("No Clear filters button initially");

    // Select a filter
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("draft");
    await page.waitForTimeout(1000);

    // Clear filters button should now be visible
    await expect(clearButton).toBeVisible({ timeout: 3000 });
    console.log("Clear filters button visible after selecting filter");

    // Click clear filters
    await clearButton.click();
    await page.waitForTimeout(1000);

    // Button should disappear
    await expect(clearButton).not.toBeVisible();
    console.log("PASS: Clear filters button works correctly");
  });

  test("no console errors during filter changes", async ({ page }) => {
    console.log("Test: No console errors");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForSelector("table", { timeout: 10000 });

    // Change filters
    const statusSelect = page.locator("select").first();
    await statusSelect.selectOption("draft");
    await page.waitForTimeout(500);
    await statusSelect.selectOption("sent");
    await page.waitForTimeout(500);
    await statusSelect.selectOption("paid");
    await page.waitForTimeout(500);
    await statusSelect.selectOption("");
    await page.waitForTimeout(500);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("analytics") &&
        !err.includes("gtag") &&
        !err.includes("hydrat") &&
        !err.includes("ResizeObserver")
    );

    console.log("Console errors:", criticalErrors.length);
    expect(criticalErrors.length).toBe(0);
    console.log("PASS: No console errors");
  });
});

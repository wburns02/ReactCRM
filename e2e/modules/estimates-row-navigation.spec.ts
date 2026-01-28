import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Estimate Row Navigation
 * Verifies that clicking anywhere on an estimate row navigates to the detail page.
 */

const BASE_URL = "https://react.ecbtx.com";

const TEST_USER = {
  email: "will@macseptic.com",
  password: "#Espn2025",
};

test.describe("Estimate Row Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    // Navigate to Estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");
  });

  test("clicking customer name navigates to estimate detail", async ({ page }) => {
    // Wait for estimates to load
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get the estimate ID from the View link
    const viewLink = firstRow.locator('a[href*="/estimates/"]');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    // Click on customer name (first td)
    const customerCell = firstRow.locator("td").first();
    await customerCell.click();

    // Verify navigation to detail page
    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("clicking total amount navigates to estimate detail", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get estimate ID
    const viewLink = firstRow.locator('a[href*="/estimates/"]');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    // Click on total (second td)
    const totalCell = firstRow.locator("td").nth(1);
    await totalCell.click();

    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("clicking status badge navigates to estimate detail", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get estimate ID
    const viewLink = firstRow.locator('a[href*="/estimates/"]');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    // Click on status badge (third td)
    const statusCell = firstRow.locator("td").nth(2);
    await statusCell.click();

    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("clicking date cells navigates to estimate detail", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get estimate ID
    const viewLink = firstRow.locator('a[href*="/estimates/"]');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    // Click on created date (fourth td)
    const dateCell = firstRow.locator("td").nth(3);
    await dateCell.click();

    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("View button still works", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click the View link directly
    const viewLink = firstRow.locator('a:has-text("View")');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    await viewLink.click();

    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("second row is also clickable", async ({ page }) => {
    // Wait for at least 2 rows
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount < 2) {
      test.skip(true, "Not enough estimates to test second row");
      return;
    }

    const secondRow = rows.nth(1);
    await expect(secondRow).toBeVisible({ timeout: 10000 });

    // Get the estimate ID from second row's View link
    const viewLink = secondRow.locator('a[href*="/estimates/"]');
    const href = await viewLink.getAttribute("href");
    const estimateId = href?.split("/estimates/")[1];

    // Click the customer cell
    const customerCell = secondRow.locator("td").first();
    await customerCell.click();

    await expect(page).toHaveURL(new RegExp(`/estimates/${estimateId}`), { timeout: 5000 });
  });

  test("row has cursor-pointer style", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check for cursor-pointer class
    const className = await firstRow.getAttribute("class");
    expect(className).toContain("cursor-pointer");
  });

  test("row has proper accessibility attributes", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check for role="button"
    const role = await firstRow.getAttribute("role");
    expect(role).toBe("button");

    // Check for tabIndex
    const tabIndex = await firstRow.getAttribute("tabindex");
    expect(tabIndex).toBe("0");

    // Check for aria-label
    const ariaLabel = await firstRow.getAttribute("aria-label");
    expect(ariaLabel).toContain("View estimate");
  });

  test("no console errors during navigation", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click to navigate
    await firstRow.click();

    // Wait for navigation
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });

    // Go back
    await page.goBack();
    await page.waitForURL(/\/estimates$/, { timeout: 5000 });

    // Filter out known benign errors
    const actualErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("manifest")
    );

    expect(actualErrors).toHaveLength(0);
  });
});

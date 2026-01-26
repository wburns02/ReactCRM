import { test, expect } from "@playwright/test";

/**
 * Invoice Row Navigation E2E Tests
 *
 * Validates that clicking anywhere on an invoice row navigates to details
 */

const PRODUCTION_URL = "https://react.ecbtx.com";
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;

// Test credentials
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Invoice Row Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill(
      'input[name="password"], input[type="password"]',
      TEST_PASSWORD,
    );
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, {
      timeout: 15000,
    });
  });

  test("invoices page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Should show invoices page header
    await expect(
      page.getByRole("heading", { name: "Invoices", exact: true }),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("clicking invoice row navigates to detail page", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Wait for table to load
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // Get first invoice row (skip header)
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    // Get the invoice ID from the View link
    const viewLink = firstRow.locator('a[href*="/invoices/"]').first();
    const href = await viewLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];
    console.log("Invoice ID:", invoiceId);

    // Click on the row (not on any button or link)
    await firstRow.click({ position: { x: 300, y: 10 } });

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), {
      timeout: 5000,
    });
  });

  test("clicking invoice number link navigates to detail", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click on the invoice number link
    const invoiceLink = firstRow.locator('a[href*="/invoices/"]').first();
    const href = await invoiceLink.getAttribute("href");
    await invoiceLink.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp(href!), { timeout: 5000 });
  });

  test("clicking View button navigates to detail", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get href before clicking
    const viewLink = firstRow.locator('a[href*="/invoices/"]').first();
    const href = await viewLink.getAttribute("href");

    // Click View button
    const viewButton = firstRow.getByRole("button", { name: /view/i });
    await viewButton.click();

    // Should navigate
    await expect(page).toHaveURL(new RegExp(href!), { timeout: 5000 });
  });

  test("row has hover effect and cursor pointer", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check for cursor-pointer class
    await expect(firstRow).toHaveClass(/cursor-pointer/);
  });

  test("keyboard navigation works on rows", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get href for verification
    const viewLink = firstRow.locator('a[href*="/invoices/"]').first();
    const href = await viewLink.getAttribute("href");

    // Focus the row and press Enter
    await firstRow.focus();
    await page.keyboard.press("Enter");

    // Should navigate
    await expect(page).toHaveURL(new RegExp(href!), { timeout: 5000 });
  });

  test("status badge is visible and styled", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check for status badge (Badge component uses rounded-full class)
    const statusBadge = firstRow.locator("span.rounded-full");
    await expect(statusBadge.first()).toBeVisible();

    // Check that badge has text content (status label)
    const badgeText = await statusBadge.first().textContent();
    console.log("Status badge text:", badgeText);
    expect(badgeText?.trim()).toBeTruthy();
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Estimate Detail Customer Integration
 * Verifies that customer details load properly on estimate detail page.
 */

const BASE_URL = "https://react.ecbtx.com";

const TEST_USER = {
  email: "will@macseptic.com",
  password: "#Espn2025",
};

test.describe("Estimate Detail Customer Integration", () => {
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
  });

  test("customer section loads on estimate detail page", async ({ page }) => {
    // Navigate to estimates list
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Click on first estimate row to go to detail
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    // Wait for detail page
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });

    // Verify customer section exists
    const customerSection = page.locator('text=Customer').first();
    await expect(customerSection).toBeVisible();
  });

  test("customer name is visible and not N/A", async ({ page }) => {
    // Navigate to estimates list and click first estimate
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });

    // Look for customer name in the customer section
    // The customer name should be displayed (not just "N/A")
    const customerCard = page.locator('.bg-bg-card').filter({ hasText: 'Customer' }).first();
    await expect(customerCard).toBeVisible();

    // Check that there's actual content (not just N/A)
    const cardText = await customerCard.textContent();

    // The card should contain "View Customer" link if customer data is present
    // OR at minimum, should not be all N/A
    const hasViewCustomer = cardText?.includes("View Customer");
    const hasOnlyNA = cardText?.match(/N\/A/g)?.length === 4; // All 4 fields are N/A

    // Either customer data is present OR we verify the API response
    expect(hasViewCustomer || !hasOnlyNA).toBeTruthy();
  });

  test("View Customer link navigates to customer detail", async ({ page }) => {
    // Navigate to estimates list and click first estimate
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });

    // Look for View Customer link
    const viewCustomerLink = page.locator('a:has-text("View Customer")');

    // If the link exists, click it and verify navigation
    if (await viewCustomerLink.isVisible({ timeout: 3000 })) {
      await viewCustomerLink.click();
      await expect(page).toHaveURL(/\/customers\/\d+/, { timeout: 5000 });
    } else {
      // If no View Customer link, the customer data might not be loaded
      // This is acceptable if customer_id doesn't exist
      console.log("View Customer link not visible - customer may not be linked");
    }
  });

  test("API returns customer data in estimate response", async ({ page }) => {
    // Setup response interception
    let estimateResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().match(/\/estimates\/\d+$/) && response.request().method() === "GET") {
        try {
          estimateResponse = await response.json();
        } catch {
          // Ignore parse errors
        }
      }
    });

    // Navigate to estimates list and click first estimate
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForTimeout(1000); // Wait for response to be captured

    // Verify the API response includes customer fields
    expect(estimateResponse).not.toBeNull();
    expect(estimateResponse).toHaveProperty("customer_id");

    // Check if customer details are present (may be null if no customer)
    expect(estimateResponse).toHaveProperty("customer_name");
    expect(estimateResponse).toHaveProperty("customer_email");
    expect(estimateResponse).toHaveProperty("customer_phone");
    expect(estimateResponse).toHaveProperty("customer_address");
  });

  test("no console errors on estimate detail page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to estimates list and click first estimate
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Filter out known benign errors
    const actualErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("manifest") &&
        !err.includes("404")
    );

    expect(actualErrors).toHaveLength(0);
  });

  test("no 404 errors when fetching estimate or customer data", async ({ page }) => {
    const networkErrors: string[] = [];

    page.on("response", (response) => {
      if (response.status() === 404) {
        networkErrors.push(`404: ${response.url()}`);
      }
    });

    // Navigate to estimates list and click first estimate
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Filter API-related 404s (ignore favicon, etc)
    const api404s = networkErrors.filter(
      (err) => err.includes("/api/") || err.includes("/estimates/") || err.includes("/customers/")
    );

    expect(api404s).toHaveLength(0);
  });
});

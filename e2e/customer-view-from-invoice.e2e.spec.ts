/**
 * Customer View from Invoice Detail - E2E Tests
 *
 * Verifies that clicking "View Customer" on invoice detail page
 * successfully loads customer data without 422 errors.
 */
import { test, expect } from "@playwright/test";

test.describe("Customer View from Invoice Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Login with the specified credentials
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"], input[type="email"]', "will@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/.*(?<!login)$/, { timeout: 15000 });
  });

  test("1. Navigate to invoice detail page", async ({ page }) => {
    // Go to invoices list
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    // Verify invoices page loaded
    await expect(page.locator('h1:has-text("Invoices")')).toBeVisible();

    // Click on first invoice row to view details
    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();

    // Wait for invoice detail page (UUIDs or any ID format)
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    // Verify we're on invoice detail page by checking for View Customer button
    await expect(page.getByRole("button", { name: /view customer/i })).toBeVisible({ timeout: 5000 });
  });

  test("2. Click View Customer button", async ({ page }) => {
    // Go directly to invoices and click first one
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    // Find and click View Customer button
    const viewCustomerBtn = page.getByRole("button", { name: /view customer/i });
    await expect(viewCustomerBtn).toBeVisible({ timeout: 5000 });
    await viewCustomerBtn.click();

    // Should navigate to customer detail page (UUIDs or integer IDs)
    await page.waitForURL(/.*\/customers\/[^\/]+/, { timeout: 10000 });
  });

  test("3. Customer detail page loads with customer data", async ({ page }) => {
    // Navigate through invoice to customer
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    const viewCustomerBtn = page.getByRole("button", { name: /view customer/i });
    await viewCustomerBtn.click();
    await page.waitForURL(/.*\/customers\/[^\/]+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Verify customer detail page shows customer data
    // Check for customer name header or card
    const customerContent = page.locator('main, [role="main"], .container');
    await expect(customerContent).toBeVisible();

    // Should not show "Failed to load customer" error
    const errorMessage = page.locator('text=/failed to load customer/i');
    await expect(errorMessage).not.toBeVisible();
  });

  test("4. GET /customers/{id} returns valid status (not 422)", async ({ page }) => {
    let customerApiStatus: number | undefined;
    let customerApiUrl: string | undefined;

    page.on("response", async (response) => {
      if (response.url().includes("/customers/") && response.request().method() === "GET") {
        // Capture the specific customer detail request, not list
        if (response.url().match(/\/customers\/[^\/\?]+$/)) {
          customerApiStatus = response.status();
          customerApiUrl = response.url();
        }
      }
    });

    // Navigate through invoice to customer
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    const viewCustomerBtn = page.getByRole("button", { name: /view customer/i });
    await viewCustomerBtn.click();
    await page.waitForURL(/.*\/customers\/[^\/]+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Wait for API to complete
    await page.waitForTimeout(2000);

    console.log("Customer API URL:", customerApiUrl);
    console.log("Customer API Status:", customerApiStatus);

    // Verify API returned valid status (200 or 404), NOT 422 validation error
    // 200 = customer found, 404 = customer not found (valid for invalid ID format)
    // 422 = validation error (the bug we fixed)
    expect(customerApiStatus).toBeDefined();
    expect([200, 404]).toContain(customerApiStatus);
  });

  test("5. No 422 errors in network", async ({ page }) => {
    const errors422: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      if (response.status() === 422) {
        errors422.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Navigate through invoice to customer
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    const viewCustomerBtn = page.getByRole("button", { name: /view customer/i });
    await viewCustomerBtn.click();
    await page.waitForURL(/.*\/customers\/[^\/]+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // No 422 errors should have occurred
    const customerErrors = errors422.filter(e => e.url.includes("/customers/"));
    expect(customerErrors.length).toBe(0);
  });

  test("6. No console errors during navigation", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out non-critical errors
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("WebSocket") &&
          !text.includes("apple-touch-icon") &&
          !text.includes("net::ERR")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Navigate through invoice to customer
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    const firstInvoiceLink = page.locator('tbody tr a[href^="/invoices/"]').first();
    await firstInvoiceLink.click();
    await page.waitForURL(/.*\/invoices\/[^\/]+/, { timeout: 10000 });

    const viewCustomerBtn = page.getByRole("button", { name: /view customer/i });
    await viewCustomerBtn.click();
    await page.waitForURL(/.*\/customers\/[^\/]+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes("icon") && !e.includes("manifest") && !e.includes("resource")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });
});

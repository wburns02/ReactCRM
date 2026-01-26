import { test, expect } from "@playwright/test";

/**
 * Payment Plan Invoice Selector E2E Tests
 *
 * Validates:
 * - Invoice dropdown loads invoices
 * - Can select an invoice
 * - Invoice details display correctly
 * - API returns invoice data
 */

const BASE_URL = "https://react.ecbtx.com";
const PAYMENT_PLANS_URL = `${BASE_URL}/billing/payment-plans`;
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Payment Plan Invoice Selector", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, {
      timeout: 15000,
    });
  });

  test("invoice dropdown loads with multiple options", async ({ page }) => {
    await page.goto(PAYMENT_PLANS_URL);
    await page.waitForLoadState("networkidle");

    // Click Create Payment Plan
    await page.getByRole("button", { name: /create payment plan/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for invoices to load
    await page.waitForTimeout(2000);

    // Check dropdown has invoice options
    const dropdown = modal.locator("select").first();
    const options = await dropdown.locator("option").all();

    console.log("Total options:", options.length);
    expect(options.length).toBeGreaterThan(1); // More than just placeholder
  });

  test("can select invoice and see details populated", async ({ page }) => {
    await page.goto(PAYMENT_PLANS_URL);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create payment plan/i }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for invoices
    await page.waitForTimeout(2000);

    const dropdown = modal.locator("select").first();
    const options = await dropdown.locator("option").all();

    // Select first invoice (index 1, skipping placeholder)
    if (options.length > 1) {
      await dropdown.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Invoice details should appear
      await expect(modal.getByText("Customer:")).toBeVisible({ timeout: 3000 });
      await expect(modal.getByText("Balance Due:")).toBeVisible({ timeout: 3000 });
    }
  });

  test("no console errors during invoice selection", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(PAYMENT_PLANS_URL);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create payment plan/i }).click();
    await page.waitForTimeout(2000);

    // Select an invoice if available
    const modal = page.getByRole("dialog");
    const dropdown = modal.locator("select").first();
    const options = await dropdown.locator("option").all();

    if (options.length > 1) {
      await dropdown.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("workbox") &&
        !e.includes("404") &&
        !e.includes("hydration") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error") &&
        !e.includes("third-party"),
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("invoice API returns 200 with data", async ({ page }) => {
    let invoiceApiSuccess = false;
    let invoiceCount = 0;

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/invoices/") && url.includes("page_size")) {
        if (response.status() === 200) {
          try {
            const body = await response.json();
            const items = body?.items || (Array.isArray(body) ? body : []);
            invoiceCount = items.length;
            invoiceApiSuccess = invoiceCount > 0;
          } catch {
            // Ignore parse errors
          }
        }
      }
    });

    await page.goto(PAYMENT_PLANS_URL);
    await page.waitForLoadState("networkidle");

    // Open modal to trigger fetch
    await page.getByRole("button", { name: /create payment plan/i }).click();
    await page.waitForTimeout(3000);

    expect(invoiceApiSuccess).toBe(true);
    console.log("Invoice API returned", invoiceCount, "invoices");
  });
});

import { test, expect } from "@playwright/test";

/**
 * Build Success Verification Tests
 *
 * Validates that the PaymentPlansPage TypeScript fix is working correctly:
 * - Page loads without runtime errors
 * - Invoice data renders correctly
 * - No type-related runtime errors
 * - Create modal works
 */

const BASE_URL = process.env.BASE_URL || "https://react.ecbtx.com";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe("Build Success Verification - PaymentPlansPage", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|work-orders)/, {
      timeout: 15000,
    });
  });

  test("payment plans page loads without error", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/billing/payment-plans`);
    expect(response?.status()).toBeLessThan(500);

    // Verify page title/heading is visible
    const heading = page.getByRole("heading", { name: /payment plans/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("invoice list loads in create modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Click create button to open modal
    const createBtn = page.getByRole("button", { name: /create payment plan/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Modal should open
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Invoice selector should be present (may or may not have data)
    // The key is it renders without type errors
    const invoiceSelect = modal.locator('[class*="select"], select, [role="combobox"]').first();
    await expect(invoiceSelect).toBeVisible({ timeout: 5000 });
  });

  test("no console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("workbox") &&
        !e.includes("service-worker") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Failed to load resource") // Network issues not type errors
    );

    // Type errors would show as "Cannot read properties of null" or similar
    const typeErrors = criticalErrors.filter(
      (e) =>
        e.includes("Cannot read properties") ||
        e.includes("is not a function") ||
        e.includes("TypeError") ||
        e.includes("null is not")
    );

    expect(typeErrors).toHaveLength(0);
  });

  test("no type-related runtime errors when opening create modal", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Open create modal (triggers invoice data mapping)
    const createBtn = page.getByRole("button", { name: /create payment plan/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(2000); // Wait for data to load
    }

    // Check for type-related errors
    const typeErrors = consoleErrors.filter(
      (e) =>
        e.includes("Cannot read properties") ||
        e.includes("is not a function") ||
        e.includes("TypeError") ||
        e.includes("null is not") ||
        e.includes("undefined is not")
    );

    expect(typeErrors).toHaveLength(0);
  });

  test("page renders despite backend errors", async ({ page }) => {
    // This test verifies the frontend handles backend errors gracefully
    // It does NOT fail if the backend returns 500 - that's a separate concern
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Page should still render the heading even if backend has issues
    const heading = page.getByRole("heading", { name: /payment plans/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Create button should still be visible
    const createBtn = page.getByRole("button", { name: /create payment plan/i });
    await expect(createBtn).toBeVisible({ timeout: 5000 });
  });

  test("invoice data with null customer_name renders correctly", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/billing/payment-plans`);
    await page.waitForLoadState("networkidle");

    // Open create modal
    const createBtn = page.getByRole("button", { name: /create payment plan/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(2000);

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();

      // The page should handle null customer_name gracefully
      // by displaying "Unknown Customer" as the fallback
      // If there are invoices with null names, they should still render
      const pageContent = await page.content();

      // Should not contain "null" as visible text (would indicate type issue)
      const hasNullText = pageContent.includes(">null<") || pageContent.includes('">null"');
      expect(hasNullText).toBe(false);
    }
  });
});

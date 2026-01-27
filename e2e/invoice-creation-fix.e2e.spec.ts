import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

/**
 * Invoice Creation E2E Tests
 * Verifies invoice creation works without 500 errors
 */
test.describe("Invoice Creation Fix", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("No 500 errors in network tab", async ({ page }) => {
    const serverErrors: { url: string; detail: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/api/v2/") && response.status() === 500) {
        let detail = "";
        try {
          const body = await response.json();
          detail = body.detail || JSON.stringify(body);
        } catch {
          detail = "Could not parse error body";
        }
        serverErrors.push({ url: response.url(), detail });
      }
    });

    // Navigate to invoices
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select first customer
    const customerSelect = dialog.locator("select").first();
    await customerSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Wait for any API calls
    await page.waitForTimeout(2000);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    console.log("Server 500 errors found:", serverErrors);
    expect(serverErrors).toHaveLength(0);
  });

  test("POST /invoices returns 201 on valid submission", async ({ page }) => {
    // Navigate to invoices
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    const customerSelect = dialog.locator("select").first();
    await customerSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Fill line item - use correct placeholder "Service name"
    await dialog.locator('input[placeholder="Service name"]').fill("E2E Test Service");

    // Quantity - first number input
    const qtyInput = dialog.locator('input[type="number"]').first();
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill("1");

    // Rate - second number input
    const rateInput = dialog.locator('input[type="number"]').nth(1);
    await rateInput.click({ clickCount: 3 });
    await rateInput.fill("250");

    await page.waitForTimeout(500);

    // Set up response listener before clicking submit
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/invoices") &&
        response.request().method() === "POST",
      { timeout: 15000 }
    );

    // Submit - click the button inside dialog that says "Create Invoice"
    await dialog.locator('button[type="submit"]').click();

    // Check response
    const response = await responsePromise;
    const status = response.status();

    console.log(`POST /invoices returned: ${status}`);

    if (status >= 400) {
      try {
        const body = await response.json();
        console.log("Error response:", JSON.stringify(body, null, 2));
      } catch {
        console.log("Could not parse error response");
      }
    }

    // Should NOT be 500
    expect(status).not.toBe(500);
    expect([200, 201, 307]).toContain(status);
  });

  test("Invoice modal closes on successful creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Invoice")');
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select customer
    await dialog.locator("select").first().selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Fill line item using correct placeholders
    await dialog.locator('input[placeholder="Service name"]').fill("Modal Close Test");

    const qtyInput = dialog.locator('input[type="number"]').first();
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill("1");

    const rateInput = dialog.locator('input[type="number"]').nth(1);
    await rateInput.click({ clickCount: 3 });
    await rateInput.fill("100");

    await page.waitForTimeout(300);

    // Submit
    await dialog.locator('button[type="submit"]').click();

    // Modal should close on success
    await expect(dialog).toBeHidden({ timeout: 10000 });
  });

  test("Invoices list loads without errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/invoices") && response.status() >= 400) {
        errors.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("Invoices");

    // Verify table is visible
    await expect(page.locator("table")).toBeVisible();

    console.log("API errors:", errors);
    expect(errors.filter((e) => e.includes("500"))).toHaveLength(0);
  });
});

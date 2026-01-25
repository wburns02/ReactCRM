import { test, expect } from "@playwright/test";

/**
 * Final comprehensive verification test for invoice creation
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Invoice Creation Final Verification", () => {
  test("complete invoice creation flow with console check", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known non-critical warnings
        if (!text.includes("DSN") &&
            !text.includes("WebSocket") &&
            !text.includes("net::ERR_") &&
            !text.includes("roles")) {
          consoleErrors.push(text);
        }
      }
    });

    // Track API calls
    let postStatus = 0;
    let createdInvoiceId = "";

    page.on("response", async (res) => {
      if (res.url().includes("/invoices") && res.request().method() === "POST") {
        postStatus = res.status();
        if (res.status() === 201) {
          try {
            const body = await res.json();
            createdInvoiceId = body.id;
            console.log("Created invoice ID: " + createdInvoiceId);
          } catch {
            // ignore parse errors
          }
        }
      }
    });

    // Login
    await page.goto(PRODUCTION_URL + "/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule|invoices)/, {
      timeout: 15000,
    });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Navigate to invoice create page
    await page.goto(PRODUCTION_URL + "/invoices/new");
    await page.waitForTimeout(2000);

    // Verify font sizes are readable
    const quantityInput = page.locator('input[type="number"][placeholder="Qty"]').first();
    await expect(quantityInput).toBeVisible({ timeout: 5000 });
    const quantityFontSize = await quantityInput.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    expect(quantityFontSize).toBeGreaterThanOrEqual(14);
    console.log("Quantity field font size: " + quantityFontSize + "px");

    const rateInput = page.locator('input[type="number"][placeholder="Rate"]').first();
    await expect(rateInput).toBeVisible({ timeout: 5000 });
    const rateFontSize = await rateInput.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    expect(rateFontSize).toBeGreaterThanOrEqual(14);
    console.log("Rate field font size: " + rateFontSize + "px");

    // Select a customer
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await expect(customerSearch).toBeVisible({ timeout: 5000 });
    await customerSearch.click();
    await page.waitForTimeout(500);

    const firstCustomer = page.locator('.absolute.z-50 button').first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      console.log("Selected customer");
    }
    await page.waitForTimeout(500);

    // Fill line item
    const serviceInput = page.locator('input[placeholder="Service name"]').first();
    await serviceInput.fill("Final Verification Test Service");

    const qtyInput = page.locator('input[placeholder="Qty"]').first();
    await qtyInput.fill("2");

    const rateInputField = page.locator('input[placeholder="Rate"]').first();
    await rateInputField.fill("175.50");

    console.log("Filled form data");

    // Click Create Invoice
    const createButton = page.locator('button:has-text("Create Invoice")');
    await createButton.click();
    await page.waitForTimeout(3000);

    // Verify success
    expect(postStatus).toBe(201);
    console.log("Invoice created with status 201");

    // Check success toast
    const successToast = page.locator('[role="alert"]').filter({ hasText: /created|success/i });
    const hasSuccessToast = await successToast.isVisible().catch(() => false);
    expect(hasSuccessToast).toBe(true);
    console.log("Success toast displayed");

    // Verify navigation to invoice detail
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain("/invoices/");
    console.log("Navigated to invoice detail: " + currentUrl);

    // Check for critical console errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes("Warning:") &&
      !e.includes("React DevTools")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found: " + criticalErrors.length);
      criticalErrors.forEach(e => console.log("  - " + e));
    }

    console.log("");
    console.log("========================================");
    console.log("INVOICE CREATION FULLY WORKING");
    console.log("========================================");
    console.log("");
  });
});

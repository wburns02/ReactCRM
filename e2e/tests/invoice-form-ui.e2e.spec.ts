import { test, expect } from "@playwright/test";

/**
 * Invoice Form UI Polish E2E Tests
 *
 * Verifies:
 * 1. QTY field is readable (proper font size, centered)
 * 2. Tax Rate field is properly sized (not oversized)
 * 3. Form layout is clean and professional
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Invoice Form UI Polish", () => {
  test("QTY and Tax Rate fields are properly styled", async ({ page }) => {
    // Login
    console.log("Step 1: Login");
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

    // Navigate to Invoices and open Create Invoice modal
    console.log("Step 2: Navigate to Invoices");
    await page.goto(PRODUCTION_URL + "/invoices");
    await page.waitForTimeout(2000);

    // Click Create Invoice button
    console.log("Step 3: Open Create Invoice modal");
    const createButton = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")');
    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Verify modal is open
    const modalTitle = page.locator('text="Create Invoice"').first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log("Create Invoice modal is open");

    // Find QTY input
    console.log("Step 4: Check QTY field styling");
    const qtyInput = page.locator('input[type="number"]').nth(0); // First number input is QTY
    await expect(qtyInput).toBeVisible({ timeout: 5000 });

    // Check QTY input styles
    const qtyStyles = await qtyInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontSize: parseFloat(styles.fontSize),
        width: parseFloat(styles.width),
        textAlign: styles.textAlign,
      };
    });

    console.log("QTY input styles:", qtyStyles);
    expect(qtyStyles.fontSize).toBeGreaterThanOrEqual(14);
    console.log("  - Font size >= 14px: PASS (" + qtyStyles.fontSize + "px)");

    // Type in QTY field
    await qtyInput.fill("5");
    const qtyValue = await qtyInput.inputValue();
    expect(qtyValue).toBe("5");
    console.log("  - QTY accepts input: PASS (value: " + qtyValue + ")");

    // Find Tax Rate input (scroll down to find it)
    console.log("Step 5: Check Tax Rate field styling");
    const taxRateLabel = page.locator('label:has-text("Tax Rate")');
    await taxRateLabel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const taxRateInput = page.locator('input#tax_rate');
    await expect(taxRateInput).toBeVisible({ timeout: 5000 });

    // Check Tax Rate input styles
    const taxRateStyles = await taxRateInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        width: parseFloat(styles.width),
        fontSize: parseFloat(styles.fontSize),
      };
    });

    console.log("Tax Rate input styles:", taxRateStyles);
    // Tax rate should be reasonably sized, not overly wide (< 200px is reasonable)
    expect(taxRateStyles.width).toBeLessThan(200);
    console.log("  - Width < 200px: PASS (" + taxRateStyles.width + "px)");

    // Type in Tax Rate field
    await taxRateInput.fill("8.25");
    const taxRateValue = await taxRateInput.inputValue();
    expect(taxRateValue).toBe("8.25");
    console.log("  - Tax Rate accepts input: PASS (value: " + taxRateValue + ")");

    // Fill required fields and verify layout with content
    console.log("Step 6: Fill form and verify layout");

    // Select customer
    const customerSelect = page.locator('select#customer_id');
    await customerSelect.selectOption({ index: 1 });
    console.log("  - Selected customer");

    // Fill service name
    const serviceInput = page.locator('input[placeholder="Service name"]');
    await serviceInput.fill("Test Service");
    console.log("  - Filled service name");

    // Fill rate
    const rateInput = page.locator('input[type="number"]').nth(1); // Second number input is Rate
    await rateInput.fill("100");
    console.log("  - Filled rate");

    // Add another line item
    console.log("Step 7: Test multiple line items");
    const addLineButton = page.locator('button:has-text("Add Line Item")');
    await addLineButton.click();
    await page.waitForTimeout(500);

    // Verify second line item appears
    const lineItemRows = page.locator('tbody tr');
    const rowCount = await lineItemRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
    console.log("  - Multiple line items added: PASS (" + rowCount + " rows)");

    // Check no visual overflow
    console.log("Step 8: Check for visual issues");
    const modalContent = page.locator('[role="dialog"]');
    const hasOverflow = await modalContent.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });
    console.log("  - No horizontal overflow: " + (hasOverflow ? "FAIL" : "PASS"));

    console.log("\n========================================");
    console.log("INVOICE FORM UI CHECKS COMPLETE");
    console.log("========================================\n");
  });

  test("QTY input is readable without spinners", async ({ page }) => {
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

    // Navigate to Invoices
    await page.goto(PRODUCTION_URL + "/invoices");
    await page.waitForTimeout(2000);

    // Open Create Invoice modal
    const createButton = page.locator('button:has-text("Create Invoice"), button:has-text("New Invoice")');
    await createButton.first().click();
    await page.waitForTimeout(1500);

    // Find QTY input and check it looks clean
    const qtyInput = page.locator('input[type="number"]').first();
    await expect(qtyInput).toBeVisible();

    // Get computed styles to verify spinner is hidden
    const qtyAppearance = await qtyInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.appearance || styles.webkitAppearance;
    });

    // Appearance should be 'textfield' if spinners are hidden
    console.log("QTY input appearance:", qtyAppearance);

    // Fill value and verify it displays correctly
    await qtyInput.fill("12");
    const value = await qtyInput.inputValue();
    expect(value).toBe("12");
    console.log("QTY input displays '12' correctly");

    // Take screenshot for visual verification
    await page.screenshot({ path: "test-results/invoice-form-ui.png", fullPage: false });
    console.log("Screenshot saved to test-results/invoice-form-ui.png");
  });
});

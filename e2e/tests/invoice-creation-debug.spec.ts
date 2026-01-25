import { test, expect } from "@playwright/test";

/**
 * Debug test to reproduce invoice creation issues:
 * 1. Quantity and Rate fields readability
 * 2. 422 Unprocessable Content on POST /api/v2/invoices/
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Invoice Creation Debug", () => {
  test("reproduce invoice creation 422 error and check field readability", async ({ page }) => {
    // Track API calls
    const apiCalls: { method: string; url: string; body?: string; status?: number; responseBody?: string }[] = [];

    page.on("request", async (req) => {
      if (req.url().includes("/invoices") && req.method() === "POST") {
        apiCalls.push({
          method: req.method(),
          url: req.url(),
          body: req.postData() || undefined,
        });
        console.log(`[REQUEST] POST ${req.url()}`);
        console.log(`[REQUEST BODY] ${req.postData()}`);
      }
    });

    page.on("response", async (res) => {
      if (res.url().includes("/invoices") && res.request().method() === "POST") {
        const call = apiCalls.find(c => c.url === res.url() && !c.status);
        if (call) {
          call.status = res.status();
          try {
            call.responseBody = await res.text();
          } catch {
            call.responseBody = "[could not read]";
          }
        }
        console.log(`[RESPONSE] ${res.status()} ${res.url()}`);
      }
    });

    // Capture console warnings
    const consoleWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning" || msg.type() === "error") {
        consoleWarnings.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Login
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule|invoices)/, {
      timeout: 15000,
    });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    // Navigate to invoice create page
    console.log("\n=== NAVIGATING TO CREATE INVOICE ===");
    await page.goto(`${PRODUCTION_URL}/invoices/new`);
    await page.waitForTimeout(2000);

    // Check if page loaded
    const pageTitle = page.locator("h1");
    const titleText = await pageTitle.textContent();
    console.log(`Page title: ${titleText}`);

    // ============================================
    // CHECK FIELD READABILITY
    // ============================================
    console.log("\n=== CHECKING FIELD READABILITY ===");

    // Find quantity and rate inputs in line items
    const quantityInputs = page.locator('input[type="number"][placeholder="Qty"], input[type="number"][min="1"]').first();
    const rateInputs = page.locator('input[type="number"][placeholder="Rate"], input[type="number"][step="0.01"]').first();

    if (await quantityInputs.count() > 0) {
      const quantityStyles = await quantityInputs.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          width: styles.width,
        };
      });
      console.log("Quantity input styles:", quantityStyles);

      // Check if font size is at least 14px
      const fontSizeNum = parseFloat(quantityStyles.fontSize);
      console.log(`Quantity font size: ${fontSizeNum}px (should be >= 14px)`);
    } else {
      console.log("Quantity input not found");
    }

    if (await rateInputs.count() > 0) {
      const rateStyles = await rateInputs.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          width: styles.width,
        };
      });
      console.log("Rate input styles:", rateStyles);

      const fontSizeNum = parseFloat(rateStyles.fontSize);
      console.log(`Rate font size: ${fontSizeNum}px (should be >= 14px)`);
    } else {
      console.log("Rate input not found");
    }

    // ============================================
    // ATTEMPT TO CREATE INVOICE (EXPECT 422)
    // ============================================
    console.log("\n=== ATTEMPTING TO CREATE INVOICE ===");

    // Fill customer name
    const customerNameInput = page.locator('input[placeholder="Enter customer name"]');
    if (await customerNameInput.count() > 0) {
      await customerNameInput.fill("Test Customer");
      console.log("Filled customer name");
    }

    // Fill description in first line item
    const descriptionInput = page.locator('input[placeholder="Description"]').first();
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill("Test Service");
      console.log("Filled description");
    }

    // Set quantity
    const qtyInput = page.locator('input[type="number"]').nth(0);
    if (await qtyInput.count() > 0) {
      await qtyInput.fill("2");
      console.log("Set quantity to 2");
    }

    // Set rate
    const rateInput = page.locator('input[type="number"]').nth(1);
    if (await rateInput.count() > 0) {
      await rateInput.fill("100");
      console.log("Set rate to 100");
    }

    // Click Create Invoice button
    const createButton = page.locator('button:has-text("Create Invoice")');
    if (await createButton.count() > 0) {
      console.log("Clicking Create Invoice button...");
      await createButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log("Create Invoice button not found");
    }

    // ============================================
    // ANALYZE RESULTS
    // ============================================
    console.log("\n=== API CALLS ===");
    apiCalls.forEach((call, i) => {
      console.log(`${i + 1}. ${call.method} ${call.url}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Request Body: ${call.body}`);
      console.log(`   Response: ${call.responseBody?.substring(0, 500)}`);
    });

    console.log("\n=== CONSOLE WARNINGS ===");
    consoleWarnings.forEach((warning) => console.log(warning));

    // Check for error messages on page
    const errorMessages = page.locator('[role="alert"], .text-danger, .error');
    const errorCount = await errorMessages.count();
    if (errorCount > 0) {
      console.log("\n=== ERROR MESSAGES ON PAGE ===");
      for (let i = 0; i < errorCount; i++) {
        const text = await errorMessages.nth(i).textContent();
        console.log(`Error ${i + 1}: ${text}`);
      }
    }

    // Summary
    console.log("\n=== SUMMARY ===");
    const has422 = apiCalls.some(c => c.status === 422);
    console.log(`422 Error occurred: ${has422}`);
    if (has422) {
      const error422 = apiCalls.find(c => c.status === 422);
      console.log(`422 Response body: ${error422?.responseBody}`);
    }
  });
});

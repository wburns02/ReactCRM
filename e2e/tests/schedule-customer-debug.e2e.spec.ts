/**
 * Debug Schedule Page Customer Names
 */
import { test, expect } from "@playwright/test";

test.describe("Schedule Customer Name Debug", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("capture API response and check customer names", async ({ page }) => {
    // Capture work-orders API responses
    const apiResponses: any[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/work-orders")) {
        const url = response.url();
        let body = null;
        try {
          body = await response.json();
        } catch {}
        apiResponses.push({ url, status: response.status(), body });
      }
    });

    // Navigate to schedule
    await page.goto("https://react.ecbtx.com/schedule");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/schedule-customer-debug.png",
      fullPage: false,
    });

    // Log API responses
    console.log("\n=== API RESPONSES ===");
    for (const resp of apiResponses) {
      console.log("URL:", resp.url);
      console.log("Status:", resp.status);
      if (resp.body?.items) {
        console.log("Items count:", resp.body.items.length);
        console.log("First 5 items customer data:");
        for (const item of resp.body.items.slice(0, 5)) {
          console.log(`  - ID: ${item.id}, customer_id: ${item.customer_id}, customer_name: ${item.customer_name}`);
        }
      }
    }

    // Check the unscheduled panel
    const unscheduledText = await page.locator('[data-testid="unscheduled-panel"], .unscheduled-orders, [class*="Unscheduled"]').first().textContent();
    console.log("\n=== UNSCHEDULED PANEL TEXT ===");
    console.log(unscheduledText?.substring(0, 500));

    // Check for "Customer #" pattern
    const pageText = await page.textContent("body");
    const customerHashPattern = /Customer #\d+/g;
    const matches = pageText?.match(customerHashPattern);
    console.log("\n=== CUSTOMER # PATTERNS FOUND ===");
    console.log(matches);

    // Verify customer names are showing
    const hasCustomerHash = matches && matches.length > 0;
    if (hasCustomerHash) {
      console.log("ISSUE: Found 'Customer #X' patterns - names not showing");
    } else {
      console.log("SUCCESS: No 'Customer #X' fallback patterns found");
    }
  });
});

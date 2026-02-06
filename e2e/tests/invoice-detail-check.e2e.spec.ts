/**
 * Invoice Detail Page Customer Data Check
 * Verifies that invoice detail shows customer name/info
 */
import { test, expect } from "@playwright/test";

test("invoice detail shows customer data", async ({ page }) => {
  // Capture API responses
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/v2/invoices/") && !url.includes("?")) {
      const status = response.status();
      console.log(`Detail API: ${status} ${url}`);
      try {
        const json = await response.json();
        console.log("customer_name:", json.customer_name);
        console.log("customer:", JSON.stringify(json.customer));
      } catch (e) {
        console.log("Could not get JSON");
      }
    }
  });

  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Navigate to invoices
  await page.goto("https://react.ecbtx.com/invoices");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click View on first invoice
  const viewBtn = page.locator("a:has-text('View'), button:has-text('View')").first();
  await viewBtn.click();
  await page.waitForURL("**/invoices/**");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({
    path: "e2e/screenshots/invoice-detail-check.png",
    fullPage: true,
  });

  // Check page content for Customer #UUID pattern
  const content = await page.textContent("body");
  const uuidPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/i;
  const hasUUIDFallback = uuidPattern.test(content || "");
  console.log("Has UUID fallback:", hasUUIDFallback);

  // Should NOT have UUID fallback on detail page
  expect(hasUUIDFallback).toBe(false);
});

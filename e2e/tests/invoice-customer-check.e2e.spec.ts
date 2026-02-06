/**
 * Invoice Customer Data Check
 * Verifies that invoice list shows customer names
 */
import { test, expect } from "@playwright/test";

test("invoice list loads and shows customer data", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Navigate to invoices
  await page.goto("https://react.ecbtx.com/invoices");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({
    path: "e2e/screenshots/invoice-customer-check.png",
    fullPage: false,
  });

  // Check for error state
  const hasError = await page.locator("text=Error").count() > 0;
  console.log("Has Error:", hasError);

  // Get customer column text
  const customerCells = page.locator("tbody td:nth-child(2)");
  const cellCount = await customerCells.count();
  console.log("Customer cells:", cellCount);

  // Check first few cells
  for (let i = 0; i < Math.min(cellCount, 5); i++) {
    const text = await customerCells.nth(i).textContent();
    console.log(`Customer ${i}: ${text}`);
  }

  // Verify no error state
  expect(hasError).toBe(false);
  expect(cellCount).toBeGreaterThan(0);
});

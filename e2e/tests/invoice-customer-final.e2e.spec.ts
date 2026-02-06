/**
 * Invoice Customer Data Final Verification
 *
 * Tests that both invoice list and detail pages show real customer names.
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Customer Data - Final Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("invoice list shows customer names, not UUIDs", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-list-final.png",
      fullPage: false,
    });

    // Get all customer cells in the table
    const customerCells = page.locator("td:nth-child(2)");
    const cellCount = await customerCells.count();
    console.log(`Found ${cellCount} customer cells`);

    // Check for UUID patterns in customer column
    const uuidPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/i;
    let uuidCount = 0;
    let realNameCount = 0;

    for (let i = 0; i < Math.min(cellCount, 10); i++) {
      const text = await customerCells.nth(i).textContent();
      console.log(`Cell ${i}: ${text}`);
      if (text && uuidPattern.test(text)) {
        uuidCount++;
      } else if (text && text.trim() && !text.includes("Customer #")) {
        realNameCount++;
      }
    }

    console.log(`UUID fallbacks: ${uuidCount}`);
    console.log(`Real names: ${realNameCount}`);

    // Should have no UUID fallbacks in the visible rows
    expect(uuidCount).toBe(0);
  });

  test("invoice detail page shows customer info", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    // Click View button on first invoice
    const viewBtn = page.locator("text=View").first();
    await viewBtn.click();
    await page.waitForURL("**/invoices/**");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-detail-final.png",
      fullPage: true,
    });

    // Get page content
    const content = await page.textContent("body");
    console.log("Page content includes 'Customer #':", content?.includes("Customer #"));

    // Check for UUID pattern
    const uuidPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/i;
    const hasUUID = uuidPattern.test(content || "");
    console.log("Has UUID fallback:", hasUUID);

    // Check for email/phone links (indicates real customer data)
    const emailLinks = await page.locator("a[href^='mailto:']").count();
    const phoneLinks = await page.locator("a[href^='tel:']").count();
    console.log(`Email links: ${emailLinks}, Phone links: ${phoneLinks}`);

    // Should NOT have UUID fallback
    expect(hasUUID).toBe(false);
  });
});

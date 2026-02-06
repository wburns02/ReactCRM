/**
 * Invoice Customer Data Verification Test
 *
 * Captures the actual API response and page content
 * to verify customer data is being returned correctly.
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Customer Data Verification", () => {
  test("capture invoice detail API response and page content", async ({ page }) => {
    // Capture API responses
    const apiResponses: any[] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/v2/invoices/") && !url.includes("?")) {
        try {
          const json = await response.json();
          apiResponses.push({ url, json });
          console.log("API Response URL:", url);
          console.log("API Response:", JSON.stringify(json, null, 2));
        } catch (e) {
          // Not JSON
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

    // Get first invoice link
    const invoiceLink = page.locator("a[href*='/invoices/INV-']").first();
    const href = await invoiceLink.getAttribute("href");
    console.log("Clicking invoice link:", href);

    // Click to view invoice detail
    await invoiceLink.click();
    await page.waitForURL("**/invoices/INV-**");
    await page.waitForLoadState("networkidle");

    // Wait a bit for API response
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/invoice-detail-verify.png",
      fullPage: true,
    });

    // Get page content
    const pageContent = await page.textContent("body");
    console.log("\n=== PAGE CONTENT ANALYSIS ===");

    // Check for UUID patterns
    const uuidPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/gi;
    const uuidMatches = pageContent?.match(uuidPattern);
    console.log("UUID patterns found:", uuidMatches?.length || 0, uuidMatches);

    // Look for customer name in specific areas
    const customerCard = page.locator(".bg-white").filter({ hasText: "Customer" }).first();
    if (await customerCard.count() > 0) {
      const cardText = await customerCard.textContent();
      console.log("\nCustomer Card Text:", cardText);
    }

    // Look for email/phone links
    const emailLinks = await page.locator("a[href^='mailto:']").allTextContents();
    console.log("\nEmail links:", emailLinks);

    const phoneLinks = await page.locator("a[href^='tel:']").allTextContents();
    console.log("Phone links:", phoneLinks);

    // Find View Customer button and get its href
    const viewCustomerBtn = page.locator("a:has-text('View Customer')");
    if (await viewCustomerBtn.count() > 0) {
      const btnHref = await viewCustomerBtn.getAttribute("href");
      console.log("\nView Customer href:", btnHref);

      // Check if it's integer or UUID
      const isIntID = /\/customers\/\d+$/.test(btnHref || "");
      const isUUID = /\/customers\/[0-9a-f-]{36}$/i.test(btnHref || "");
      console.log("Is integer ID:", isIntID);
      console.log("Is UUID:", isUUID);
    }

    // Print API responses
    console.log("\n=== API RESPONSES ===");
    for (const resp of apiResponses) {
      console.log("URL:", resp.url);
      console.log("customer_name:", resp.json?.customer_name);
      console.log("customer:", resp.json?.customer);
    }

    // Assertions
    expect(uuidMatches?.length || 0).toBe(0);
  });
});

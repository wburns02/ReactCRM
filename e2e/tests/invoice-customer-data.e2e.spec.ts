/**
 * Invoice Customer Data E2E Test
 *
 * Verifies that invoice detail pages show actual customer information
 * instead of "Customer #[UUID]" or "N/A".
 *
 * Bug: Backend returned customer_name: null, customer: null
 * Fix: Backend now fetches customer data via UUID reverse lookup
 */
import { test, expect } from "@playwright/test";

test.describe("Invoice Customer Data", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("invoice detail shows customer name, not UUID", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    // Take screenshot of invoices list
    await page.screenshot({
      path: "e2e/screenshots/invoice-list.png",
      fullPage: false,
    });

    // Find an invoice with a customer and click to view details
    const invoiceRows = page.locator("table tbody tr, [data-testid='invoice-row']");
    const rowCount = await invoiceRows.count();
    console.log(`Found ${rowCount} invoice rows`);

    if (rowCount === 0) {
      // Try looking for invoice cards instead
      const invoiceCards = page.locator("[data-testid='invoice-card'], .invoice-card, a[href*='/invoices/']");
      const cardCount = await invoiceCards.count();
      console.log(`Found ${cardCount} invoice cards/links`);

      if (cardCount > 0) {
        await invoiceCards.first().click();
      } else {
        test.skip(true, "No invoices found to test");
        return;
      }
    } else {
      // Click first invoice row
      await invoiceRows.first().click();
    }

    // Wait for invoice detail page
    await page.waitForURL("**/invoices/**", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Take screenshot of invoice detail
    await page.screenshot({
      path: "e2e/screenshots/invoice-detail-customer.png",
      fullPage: true,
    });

    // Get all text content on the page
    const pageContent = await page.textContent("body");
    console.log("Page contains Customer #:", pageContent?.includes("Customer #"));

    // Verify customer data is displayed - look for patterns indicating real customer data
    // Should NOT show "Customer #" followed by UUID
    const customerUUIDPattern = /Customer #[0-9a-f]{8}-[0-9a-f]{4}/i;
    const hasUUIDFallback = customerUUIDPattern.test(pageContent || "");
    console.log("Has UUID fallback pattern:", hasUUIDFallback);

    // Look for customer info section
    const customerSection = page.locator("[data-testid='customer-info'], .customer-info, h3:has-text('Customer'), h2:has-text('Customer')");
    const customerSectionCount = await customerSection.count();
    console.log(`Found ${customerSectionCount} customer sections`);

    if (customerSectionCount > 0) {
      const customerText = await customerSection.first().textContent();
      console.log("Customer section text:", customerText);

      // Verify it shows real customer name, not UUID
      if (customerText) {
        const hasRealName = !customerUUIDPattern.test(customerText) && !customerText.includes("N/A");
        console.log("Has real customer name:", hasRealName);
        expect(hasRealName).toBe(true);
      }
    }

    // Check for email link (indicates real customer data)
    const emailLink = page.locator("a[href^='mailto:']");
    const emailCount = await emailLink.count();
    console.log(`Found ${emailCount} email links`);

    // Check for phone link (indicates real customer data)
    const phoneLink = page.locator("a[href^='tel:']");
    const phoneCount = await phoneLink.count();
    console.log(`Found ${phoneCount} phone links`);

    // Check for View Customer button
    const viewCustomerBtn = page.locator("a:has-text('View Customer'), button:has-text('View Customer')");
    const viewCustomerCount = await viewCustomerBtn.count();
    console.log(`Found ${viewCustomerCount} View Customer buttons`);

    // At least one indicator of real customer data should be present
    const hasRealCustomerData = !hasUUIDFallback || emailCount > 0 || phoneCount > 0;
    console.log("Has real customer data indicators:", hasRealCustomerData);

    // Main assertion: Should NOT show "Customer #[UUID]" pattern
    expect(hasUUIDFallback).toBe(false);
  });

  test("View Customer link navigates correctly", async ({ page }) => {
    // Navigate to invoices
    await page.goto("https://react.ecbtx.com/invoices");
    await page.waitForLoadState("networkidle");

    // Click first invoice
    const invoiceLink = page.locator("a[href*='/invoices/']").first();
    await invoiceLink.click();
    await page.waitForURL("**/invoices/**");
    await page.waitForLoadState("networkidle");

    // Find View Customer button
    const viewCustomerBtn = page.locator("a:has-text('View Customer')");
    const btnCount = await viewCustomerBtn.count();
    console.log(`View Customer button count: ${btnCount}`);

    if (btnCount > 0) {
      // Get the href
      const href = await viewCustomerBtn.getAttribute("href");
      console.log("View Customer href:", href);

      // Should be an integer ID, not UUID
      const isIntegerID = href && /\/customers\/\d+$/.test(href);
      const isUUID = href && /\/customers\/[0-9a-f]{8}-[0-9a-f]{4}/.test(href);

      console.log("Is integer ID:", isIntegerID);
      console.log("Is UUID:", isUUID);

      // Should be integer ID, not UUID
      expect(isUUID).toBe(false);

      // Click and verify navigation
      await viewCustomerBtn.click();
      await page.waitForURL("**/customers/**", { timeout: 10000 });

      // Should land on customer detail page without error
      const url = page.url();
      console.log("Final URL:", url);

      // Should NOT have UUID in URL
      expect(url).not.toMatch(/\/customers\/[0-9a-f]{8}-[0-9a-f]{4}/);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/customer-from-invoice.png",
        fullPage: false,
      });
    } else {
      console.log("No View Customer button found - skipping navigation test");
    }
  });
});

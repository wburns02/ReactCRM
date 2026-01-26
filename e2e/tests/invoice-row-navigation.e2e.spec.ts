import { test, expect } from "@playwright/test";

/**
 * Invoice Row Navigation E2E Tests
 *
 * Verifies:
 * 1. Entire invoice row is clickable (not just View button)
 * 2. Clicking anywhere on row navigates to invoice detail
 * 3. Action buttons (Edit/Delete) don't navigate but open modals
 * 4. Keyboard navigation works (Enter/Space on focused row)
 * 5. Multiple rows work correctly
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Invoice Row Navigation", () => {
  test.beforeEach(async ({ page }) => {
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

    // Navigate to Invoices page
    await page.goto(PRODUCTION_URL + "/invoices");
    await page.waitForTimeout(2000);
  });

  test("clicking invoice number navigates to detail", async ({ page }) => {
    console.log("Test: Click invoice number");

    // Wait for invoices to load
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get the invoice ID from the first link
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];
    console.log("Invoice ID:", invoiceId);

    // Click invoice number
    await invoiceLink.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Invoice number click navigates to detail");
  });

  test("clicking customer name navigates to detail", async ({ page }) => {
    console.log("Test: Click customer name");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click on customer name cell (second td)
    const customerCell = firstRow.locator("td").nth(1);
    await customerCell.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Customer name click navigates to detail");
  });

  test("clicking amount navigates to detail", async ({ page }) => {
    console.log("Test: Click amount");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click on total amount cell (4th td)
    const amountCell = firstRow.locator("td").nth(3);
    await amountCell.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Amount click navigates to detail");
  });

  test("clicking status badge navigates to detail", async ({ page }) => {
    console.log("Test: Click status badge");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click on status cell (3rd td)
    const statusCell = firstRow.locator("td").nth(2);
    await statusCell.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Status badge click navigates to detail");
  });

  test("clicking due date navigates to detail", async ({ page }) => {
    console.log("Test: Click due date");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click on due date cell (5th td)
    const dueDateCell = firstRow.locator("td").nth(4);
    await dueDateCell.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Due date click navigates to detail");
  });

  test("View button still navigates to detail", async ({ page }) => {
    console.log("Test: View button");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click View button
    const viewButton = firstRow.locator('button:has-text("View")');
    await viewButton.click();

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: View button navigates to detail");
  });

  test("Edit button opens modal without navigation", async ({ page }) => {
    console.log("Test: Edit button opens modal");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Store current URL
    const currentUrl = page.url();

    // Click Edit button
    const editButton = firstRow.locator('button:has-text("Edit")');
    await editButton.click();
    await page.waitForTimeout(500);

    // Should stay on same URL
    expect(page.url()).toBe(currentUrl);

    // Modal should be open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    console.log("PASS: Edit button opens modal without navigation");

    // Close modal
    await page.keyboard.press("Escape");
  });

  test("Delete button opens confirm without navigation", async ({ page }) => {
    console.log("Test: Delete button opens confirm");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Store current URL
    const currentUrl = page.url();

    // Click Delete button
    const deleteButton = firstRow.locator('button:has-text("Delete")');
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Should stay on same URL
    expect(page.url()).toBe(currentUrl);

    // Confirm dialog should be open
    const confirmDialog = page.locator('[role="dialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    console.log("PASS: Delete button opens confirm without navigation");

    // Close dialog
    await page.keyboard.press("Escape");
  });

  test("second row also navigates on click", async ({ page }) => {
    console.log("Test: Second row navigation");

    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount < 2) {
      console.log("SKIP: Less than 2 invoices, cannot test second row");
      return;
    }

    const secondRow = rows.nth(1);
    await expect(secondRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID from second row
    const invoiceLink = secondRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Click on customer name in second row
    const customerCell = secondRow.locator("td").nth(1);
    await customerCell.click();

    // Assert navigation to second invoice
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Second row click navigates to correct detail");
  });

  test("row has cursor-pointer on hover", async ({ page }) => {
    console.log("Test: Cursor pointer on hover");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Check cursor style
    const cursor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });

    expect(cursor).toBe("pointer");
    console.log("PASS: Row has cursor-pointer (" + cursor + ")");
  });

  test("keyboard Enter navigates to detail", async ({ page }) => {
    console.log("Test: Keyboard Enter navigation");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Get invoice ID
    const invoiceLink = firstRow.locator("a").first();
    const href = await invoiceLink.getAttribute("href");
    const invoiceId = href?.split("/invoices/")[1];

    // Focus the row
    await firstRow.focus();

    // Press Enter
    await page.keyboard.press("Enter");

    // Assert navigation
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}`), { timeout: 5000 });
    console.log("PASS: Enter key navigates to detail");
  });

  test("no console errors during navigation", async ({ page }) => {
    console.log("Test: No console errors");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Click customer cell
    const customerCell = firstRow.locator("td").nth(1);
    await customerCell.click();
    await page.waitForTimeout(1000);

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("analytics") &&
        !err.includes("gtag")
    );

    console.log("Console errors:", criticalErrors.length);
    expect(criticalErrors.length).toBe(0);
    console.log("PASS: No console errors");
  });
});

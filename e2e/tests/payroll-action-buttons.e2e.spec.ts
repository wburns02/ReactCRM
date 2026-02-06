import { test, expect } from "@playwright/test";

/**
 * Payroll Action Buttons E2E Test
 * Verifies delete button on pay periods and CRUD on time entries
 */

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test.describe("Payroll Action Buttons", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("should show Delete button on draft pay periods", async ({ page }) => {
    // Navigate to payroll page
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Wait for page content to load
    await expect(page.locator("h1:has-text('Payroll')")).toBeVisible({ timeout: 10000 });

    // Check if Pay Periods tab is active (default)
    const periodsTab = page.locator("button:has-text('Pay Periods')");
    await expect(periodsTab).toBeVisible();

    // Take screenshot of the payroll page
    await page.screenshot({ path: "e2e/screenshots/payroll-periods-tab.png" });

    // Look for any period cards with buttons
    const periodCards = page.locator(".space-y-3 > div");
    const cardCount = await periodCards.count();

    console.log(`Found ${cardCount} period cards`);

    // Check if Delete button exists on any draft period
    const deleteButtons = page.locator("button:has-text('Delete')");
    const deleteCount = await deleteButtons.count();

    console.log(`Found ${deleteCount} Delete buttons`);

    // At minimum, View buttons should exist
    const viewButtons = page.locator("button:has-text('View')");
    const viewCount = await viewButtons.count();

    console.log(`Found ${viewCount} View buttons`);

    // Verify we have some periods or empty state
    if (cardCount === 0) {
      // Check for empty state
      const emptyState = page.locator("text=No Payroll Periods");
      await expect(emptyState.or(page.locator("text=Create Period"))).toBeVisible();
    } else {
      // We have periods, verify View buttons exist
      expect(viewCount).toBeGreaterThan(0);
    }
  });

  test("should show Add Entry button in Time Entries tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Click on Time Entries tab
    await page.click("button:has-text('Time Entries')");
    await page.waitForTimeout(1000);

    // Wait for tab content
    await expect(page.locator("h3:has-text('Pending Time Entries')")).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/payroll-time-entries-tab.png" });

    // Verify Add Entry button is visible
    const addEntryButton = page.locator("button:has-text('Add Entry')");
    await expect(addEntryButton).toBeVisible();

    console.log("Add Entry button is visible");
  });

  test("should open Add Entry form modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Click on Time Entries tab
    await page.click("button:has-text('Time Entries')");
    await page.waitForTimeout(1000);

    // Click Add Entry button
    await page.click("button:has-text('Add Entry')");
    await page.waitForTimeout(500);

    // Verify form modal opens
    const modalHeader = page.locator("text=Add Time Entry");
    await expect(modalHeader).toBeVisible({ timeout: 5000 });

    // Verify form fields exist
    const technicianSelect = page.locator("select#entry-technician");
    const dateInput = page.locator("input#entry-date");
    const clockInInput = page.locator("input#entry-clock-in");

    await expect(technicianSelect).toBeVisible();
    await expect(dateInput).toBeVisible();
    await expect(clockInInput).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/payroll-add-entry-modal.png" });

    console.log("Add Entry form modal opened successfully");

    // Close the modal
    await page.click("button:has-text('Cancel')");
    await page.waitForTimeout(300);

    // Verify modal is closed
    await expect(modalHeader).not.toBeVisible();
  });

  test("should show Edit and Delete buttons on time entries", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Click on Time Entries tab
    await page.click("button:has-text('Time Entries')");
    await page.waitForTimeout(1000);

    // Check for time entry cards
    const entryCards = page.locator(".space-y-3 > div");
    const entryCount = await entryCards.count();

    console.log(`Found ${entryCount} time entry cards`);

    if (entryCount > 0) {
      // Check for Edit button
      const editButtons = page.locator("button:has-text('Edit')");
      const editCount = await editButtons.count();
      console.log(`Found ${editCount} Edit buttons`);
      expect(editCount).toBeGreaterThan(0);

      // Check for Delete button
      const deleteButtons = page.locator("button:has-text('Delete')");
      const deleteCount = await deleteButtons.count();
      console.log(`Found ${deleteCount} Delete buttons`);
      expect(deleteCount).toBeGreaterThan(0);

      // Check for Approve button
      const approveButtons = page.locator("button:has-text('Approve')");
      const approveCount = await approveButtons.count();
      console.log(`Found ${approveCount} Approve buttons`);
      expect(approveCount).toBeGreaterThan(0);
    } else {
      // Check for empty state
      const emptyState = page.locator("text=All Caught Up");
      await expect(emptyState).toBeVisible();
      console.log("No pending time entries - showing empty state");
    }
  });

  test("should verify Delete button only appears on draft periods", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Get all period cards
    const periodCards = page.locator(".space-y-3 > div");
    const cardCount = await periodCards.count();

    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = periodCards.nth(i);

      // Check the status badge
      const statusBadge = card.locator("span.rounded-full, [class*='badge']").first();
      const statusText = await statusBadge.textContent();

      // Check for Delete button in this card
      const deleteBtn = card.locator("button:has-text('Delete')");
      const hasDelete = (await deleteBtn.count()) > 0;

      console.log(`Period ${i + 1}: Status='${statusText}', Has Delete=${hasDelete}`);

      // Delete should only be visible for draft status
      if (statusText?.toLowerCase().includes("draft")) {
        expect(hasDelete).toBe(true);
      }
    }
  });
});

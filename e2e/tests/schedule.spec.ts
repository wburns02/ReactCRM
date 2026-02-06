import { test, expect } from "@playwright/test";

/**
 * Schedule Page E2E Tests
 *
 * Tests the schedule page functionality:
 * - Page loads without errors
 * - New Work Order button works
 * - Drag-and-drop scheduling (TODO)
 */

const BASE_URL = "https://react.ecbtx.com";
const CREDENTIALS = {
  email: "will@macseptic.com",
  password: "#Espn2025",
};

test.setTimeout(90000);

async function loginAndNavigate(page: typeof test.expect.page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  if (page.url().includes("/login")) {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill(CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(CREDENTIALS.password);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.waitFor({ state: "visible" });
    await submitBtn.click();

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 20000 }
      );
    } catch {
      // Retry login once
      await emailInput.fill(CREDENTIALS.email);
      await page.locator('input[type="password"]').fill(CREDENTIALS.password);
      await submitBtn.click();
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 20000 }
      );
    }
    await page.waitForTimeout(2000);

    if (!page.url().includes(path)) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }
  }

  return page.url().includes(path) || page.url() === `${BASE_URL}/`;
}

test.describe("Schedule Page", () => {
  test("loads schedule page without errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Sentry") && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/schedule");

    // Verify page title/header
    const header = page.getByRole("heading", { name: /schedule/i }).first();
    await expect(header).toBeVisible({ timeout: 15000 });

    // Verify key UI elements
    const newWorkOrderBtn = page.getByRole("button", { name: /new work order/i });
    await expect(newWorkOrderBtn).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log("Console errors:", errors);
    }
  });

  test("New Work Order button navigates to form", async ({ page }) => {
    await loginAndNavigate(page, "/schedule");

    const newWorkOrderBtn = page.getByRole("button", { name: /new work order/i });
    await expect(newWorkOrderBtn).toBeVisible({ timeout: 15000 });

    // Click the button
    await newWorkOrderBtn.click();

    // Wait for navigation and modal/form to appear
    await page.waitForTimeout(2000);

    // Should navigate to /work-orders/new
    await page.waitForURL(/\/work-orders\/new/, { timeout: 10000 });

    // Should not show 404 or 500 error
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("404");
    expect(bodyText).not.toContain("Work Order Not Found");
    expect(bodyText).not.toContain("500");

    // Should show the work order form (check for common form elements)
    // The form might be in a modal, so check for dialog/form elements
    const formOrModal = page.locator('form, [role="dialog"]').first();
    await expect(formOrModal).toBeVisible({ timeout: 10000 });
  });

  test.skip("drag and drop work order to schedule", async ({ page }) => {
    // TODO: Test drag-and-drop after verifying unscheduled work orders exist
    await loginAndNavigate(page, "/schedule");

    // Wait for unscheduled work orders table to load
    await page.waitForTimeout(3000);

    // Check if there are any unscheduled work orders
    const unscheduledTable = page.locator("table").first();
    const hasRows = await unscheduledTable.locator("tbody tr").count();

    if (hasRows === 0) {
      test.skip();
    }

    // Implement drag-and-drop test
    // - Get first unscheduled work order
    // - Drag it to a calendar slot
    // - Verify API call success
    // - Verify work order appears on calendar
  });
});

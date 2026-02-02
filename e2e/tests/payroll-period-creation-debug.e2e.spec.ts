import { test, expect } from "@playwright/test";

/**
 * Debug test to reproduce and capture the payroll period 400 error
 */

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test.describe("Payroll Period Creation Debug", () => {
  test("capture exact 400 error on period creation", async ({ page }) => {
    // Capture all network requests/responses
    const networkLogs: Array<{
      url: string;
      method: string;
      status?: number;
      requestBody?: string;
      responseBody?: string;
    }> = [];

    page.on("request", (request) => {
      if (request.url().includes("/payroll")) {
        networkLogs.push({
          url: request.url(),
          method: request.method(),
          requestBody: request.postData() || undefined,
        });
      }
    });

    page.on("response", async (response) => {
      if (response.url().includes("/payroll")) {
        const existing = networkLogs.find(
          (log) => log.url === response.url() && !log.status
        );
        if (existing) {
          existing.status = response.status();
          try {
            existing.responseBody = await response.text();
          } catch {
            existing.responseBody = "Could not read body";
          }
        }
      }
    });

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Navigate to payroll
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await expect(page.locator("h1:has-text('Payroll')")).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot of initial state
    await page.screenshot({ path: "e2e/screenshots/payroll-before-create.png" });

    // Click "Pay Periods" tab first (page loads on Summary tab by default)
    const payPeriodsTab = page.locator("button:has-text('Pay Periods')");
    await expect(payPeriodsTab).toBeVisible({ timeout: 5000 });
    await payPeriodsTab.click();
    await page.waitForTimeout(500);

    // Click "+ New Period" button
    const newPeriodButton = page.locator("button:has-text('New Period')");
    await expect(newPeriodButton).toBeVisible({ timeout: 5000 });
    await newPeriodButton.click();

    // Wait for modal
    await page.waitForTimeout(500);
    await page.screenshot({ path: "e2e/screenshots/payroll-create-modal.png" });

    // Check what form fields exist
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();

    console.log("Start date input visible:", await startDateInput.isVisible());
    console.log("End date input visible:", await endDateInput.isVisible());

    // Fill form with valid future dates (use random to avoid overlap)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() + 3); // 3 years in future
    startDate.setMonth(Math.floor(Math.random() * 12)); // Random month
    startDate.setDate(Math.floor(Math.random() * 14) + 1); // Random day 1-14
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 13); // 2 weeks later

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`Filling dates: ${startDateStr} to ${endDateStr}`);

    await startDateInput.fill(startDateStr);
    await endDateInput.fill(endDateStr);

    await page.screenshot({ path: "e2e/screenshots/payroll-form-filled.png" });

    // Find and click Create/Submit button
    const createButton = page.locator("button:has-text('Create')");
    if (await createButton.isVisible()) {
      console.log("Clicking Create button...");
      await createButton.click();
    } else {
      // Try other possible button text
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        console.log("Clicking submit button...");
        await submitButton.click();
      }
    }

    // Wait for network response
    await page.waitForTimeout(2000);

    // Take screenshot after submission
    await page.screenshot({ path: "e2e/screenshots/payroll-after-submit.png" });

    // Output all captured network logs
    console.log("\n=== NETWORK LOGS ===");
    for (const log of networkLogs) {
      console.log(`\n${log.method} ${log.url}`);
      console.log(`  Status: ${log.status}`);
      if (log.requestBody) {
        console.log(`  Request Body: ${log.requestBody}`);
      }
      if (log.responseBody) {
        console.log(`  Response Body: ${log.responseBody}`);
      }
    }

    // Output console errors
    if (consoleErrors.length > 0) {
      console.log("\n=== CONSOLE ERRORS ===");
      for (const error of consoleErrors) {
        console.log(error);
      }
    }

    // Look specifically for 400 response
    const error400 = networkLogs.find(
      (log) => log.status === 400 && log.method === "POST"
    );
    if (error400) {
      console.log("\n=== 400 ERROR DETAILS ===");
      console.log(`URL: ${error400.url}`);
      console.log(`Request Body: ${error400.requestBody}`);
      console.log(`Response Body: ${error400.responseBody}`);
    }

    // Check for success (201) or any other status
    const periodPost = networkLogs.find(
      (log) => log.url.includes("/periods") && log.method === "POST"
    );
    if (periodPost) {
      console.log(`\nPOST /periods result: ${periodPost.status}`);
      expect(periodPost.status).toBeLessThan(400); // Should not be error
    } else {
      console.log("\nNo POST /periods request found - button may not work");
    }
  });
});

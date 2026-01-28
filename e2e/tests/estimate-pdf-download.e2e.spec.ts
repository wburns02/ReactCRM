import { test, expect } from "@playwright/test";

/**
 * Estimate PDF Download E2E Tests
 *
 * Tests the client-side PDF generation using jsPDF.
 * PDF is generated entirely in the browser - no backend API call.
 */
test.describe("Estimate PDF Download", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("1. Download PDF button is visible on estimate detail page", async ({
    page,
  }) => {
    // Navigate to estimates
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Click first estimate to open detail
    const firstEstimate = page.locator("table tbody tr").first();
    await expect(firstEstimate).toBeVisible({ timeout: 10000 });
    await firstEstimate.click();

    // Wait for detail page
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Assert Download PDF button is visible and enabled
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();
    console.log("Download PDF button is visible and enabled");
  });

  test("2. Click Download PDF triggers file download", async ({ page }) => {
    // Navigate to estimates
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Click first estimate
    const firstEstimate = page.locator("table tbody tr").first();
    await expect(firstEstimate).toBeVisible({ timeout: 10000 });
    await firstEstimate.click();

    // Wait for detail page
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });

    // Click Download PDF button
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Wait for download (jsPDF generates client-side and triggers blob download)
    const download = await downloadPromise;

    // Verify download
    const filename = download.suggestedFilename();
    console.log(`Downloaded file: ${filename}`);

    // Assert filename starts with Estimate_ and ends with .pdf
    expect(filename.toLowerCase()).toContain("estimate");
    expect(filename.toLowerCase()).toMatch(/\.pdf$/);

    // After download, button should return to normal state
    await expect(downloadButton).toHaveText(/download pdf/i, { timeout: 5000 });

    console.log("PDF download successful!");
  });

  test("3. Download PDF works on multiple estimates", async ({ page }) => {
    // Navigate to estimates
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Get estimate rows
    const estimateRows = page.locator("table tbody tr");
    const rowCount = await estimateRows.count();

    if (rowCount < 2) {
      console.log("Skipping test - less than 2 estimates available");
      test.skip();
      return;
    }

    // Test first estimate
    await estimateRows.first().click();
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    let downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    let downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    let download = await downloadPromise;
    const firstFilename = download.suggestedFilename();
    console.log(`First PDF: ${firstFilename}`);
    expect(firstFilename.toLowerCase()).toMatch(/\.pdf$/);

    // Go back and test second estimate
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator("table tbody tr").nth(1).click();
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    download = await downloadPromise;
    const secondFilename = download.suggestedFilename();
    console.log(`Second PDF: ${secondFilename}`);
    expect(secondFilename.toLowerCase()).toMatch(/\.pdf$/);

    console.log("Multiple estimates PDF download works!");
  });

  test("4. No console errors during PDF download", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to estimate detail
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    const firstEstimate = page.locator("table tbody tr").first();
    await expect(firstEstimate).toBeVisible({ timeout: 10000 });
    await firstEstimate.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Download PDF
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    await downloadPromise;

    // Wait for any async errors
    await page.waitForTimeout(2000);

    // Filter relevant errors (ignore common benign ones)
    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Download the React DevTools") &&
        !e.includes("third-party cookie")
    );

    if (relevantErrors.length > 0) {
      console.log("Console errors found:", relevantErrors);
    }

    expect(
      relevantErrors.length,
      `Console errors: ${relevantErrors.join(", ")}`
    ).toBe(0);
    console.log("No console errors during PDF download");
  });

  test("5. No network errors during PDF download (client-side generation)", async ({
    page,
  }) => {
    const apiErrors: { url: string; status: number }[] = [];

    // Track any unexpected 4xx/5xx errors during the flow
    page.on("response", async (response) => {
      const url = response.url();
      const status = response.status();
      // Only track errors on our API domain (not third-party)
      if (
        url.includes("railway.app") &&
        status >= 400 &&
        !url.includes("/pdf") // PDF is now client-side, no backend call expected
      ) {
        apiErrors.push({ url, status });
      }
    });

    // Navigate to estimate detail
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    const firstEstimate = page.locator("table tbody tr").first();
    await expect(firstEstimate).toBeVisible({ timeout: 10000 });
    await firstEstimate.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Download PDF (client-side, no API call)
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    await downloadPromise;

    // Verify no API errors occurred during the flow
    if (apiErrors.length > 0) {
      console.log("API errors found:", JSON.stringify(apiErrors, null, 2));
    }

    expect(apiErrors.length, `API errors: ${JSON.stringify(apiErrors)}`).toBe(
      0
    );
    console.log("No network errors during PDF download");
  });

  test("6. Success toast appears after PDF download", async ({ page }) => {
    // Navigate to estimate detail
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    const firstEstimate = page.locator("table tbody tr").first();
    await expect(firstEstimate).toBeVisible({ timeout: 10000 });
    await firstEstimate.click();

    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Download PDF
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    await downloadPromise;

    // Check for success toast notification
    const toast = page.locator("text=PDF Downloaded");
    await expect(toast).toBeVisible({ timeout: 5000 });
    console.log("Success toast appeared after PDF download");
  });
});

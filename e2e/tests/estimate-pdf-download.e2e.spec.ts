import { test, expect } from "@playwright/test";

/**
 * Estimate PDF Download E2E Tests
 *
 * Tests the PDF download functionality on estimate detail pages.
 * Verifies button works, file downloads, and no errors occur.
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

    // Assert Download PDF button is visible
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();
    console.log("Download PDF button is visible");
  });

  test("2. Click Download PDF triggers file download", async ({ page }) => {
    // Track network errors
    const networkErrors: { url: string; status: number }[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/pdf") && response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

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
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

    // Click Download PDF button
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Button should show loading state
    await expect(downloadButton).toHaveText(/downloading/i, { timeout: 2000 });
    console.log("Button shows loading state");

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    const filename = download.suggestedFilename();
    console.log(`Downloaded file: ${filename}`);

    // Assert filename contains Estimate
    expect(filename.toLowerCase()).toContain("estimate");
    expect(filename.toLowerCase()).toEndWith(".pdf");

    // Verify no network errors
    const pdfErrors = networkErrors.filter((e) => e.url.includes("/pdf"));
    expect(pdfErrors.length, `PDF errors: ${JSON.stringify(pdfErrors)}`).toBe(
      0
    );

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

    let downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    let downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    let download = await downloadPromise;
    console.log(`First PDF: ${download.suggestedFilename()}`);

    // Go back and test second estimate
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator("table tbody tr").nth(1).click();
    await page.waitForURL(/\/estimates\/\d+/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    download = await downloadPromise;
    console.log(`Second PDF: ${download.suggestedFilename()}`);

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
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    await downloadPromise;

    // Wait for any async errors
    await page.waitForTimeout(2000);

    // Filter relevant errors
    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Download the React DevTools")
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

  test("5. No 4xx/5xx errors on PDF endpoint", async ({ page }) => {
    const apiErrors: { url: string; status: number; body?: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/pdf") && response.status() >= 400) {
        let body = "";
        try {
          body = await response.text();
        } catch {}
        apiErrors.push({
          url: response.url(),
          status: response.status(),
          body,
        });
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
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await downloadButton.click();
    await downloadPromise;

    // Verify no API errors
    if (apiErrors.length > 0) {
      console.log("API errors found:", JSON.stringify(apiErrors, null, 2));
    }

    expect(apiErrors.length, `API errors: ${JSON.stringify(apiErrors)}`).toBe(
      0
    );
    console.log("No API errors on PDF endpoint");
  });
});

test.describe("Estimate PDF API Tests", () => {
  test("API: GET /quotes/{id}/pdf returns PDF", async ({ request }) => {
    const API_URL =
      process.env.API_URL ||
      "https://react-crm-api-production.up.railway.app";

    // Login to get token
    const loginResponse = await request.post(`${API_URL}/api/v2/auth/login`, {
      data: {
        email: "will@macseptic.com",
        password: "#Espn2025",
      },
    });

    if (loginResponse.status() !== 200) {
      console.log("Login failed, skipping API test");
      test.skip();
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // First get list of quotes to find a valid ID
    const listResponse = await request.get(`${API_URL}/api/v2/quotes/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const listData = await listResponse.json();
    const quotes = listData.items || listData;

    if (!quotes || quotes.length === 0) {
      console.log("No quotes found, skipping API test");
      test.skip();
      return;
    }

    const quoteId = quotes[0].id;
    console.log(`Testing PDF endpoint for quote ID: ${quoteId}`);

    // Request PDF
    const pdfResponse = await request.get(
      `${API_URL}/api/v2/quotes/${quoteId}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Assert successful response
    expect(pdfResponse.status()).toBe(200);

    // Assert content type is PDF
    const contentType = pdfResponse.headers()["content-type"];
    expect(contentType).toContain("application/pdf");

    // Assert Content-Disposition header
    const contentDisposition = pdfResponse.headers()["content-disposition"];
    expect(contentDisposition).toContain("attachment");
    expect(contentDisposition.toLowerCase()).toContain("estimate");

    // Assert response has content
    const body = await pdfResponse.body();
    expect(body.length).toBeGreaterThan(1000); // PDF should be > 1KB

    console.log(
      `PDF API test passed - ${body.length} bytes, filename: ${contentDisposition}`
    );
  });
});

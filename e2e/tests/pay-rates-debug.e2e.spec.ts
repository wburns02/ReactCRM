import { test, expect } from "@playwright/test";

/**
 * Debug test to capture pay rates creation 500 error
 */

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test("debug: capture pay rate creation error", async ({ page }) => {
  // Track all network responses
  const networkResponses: { method: string; url: string; status: number; body: string }[] = [];
  const networkRequests: { method: string; url: string; body: string }[] = [];
  const consoleErrors: string[] = [];

  page.on("request", async (request) => {
    if (request.url().includes("/pay-rates")) {
      try {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          body: request.postData() || "",
        });
      } catch (e) {
        // ignore
      }
    }
  });

  page.on("response", async (response) => {
    if (response.url().includes("/pay-rates") || response.url().includes("/payroll")) {
      try {
        const body = await response.text().catch(() => "");
        networkResponses.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          body: body,
        });
      } catch (e) {
        networkResponses.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          body: "Could not read body",
        });
      }
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("Sentry") && !text.includes("ERR_BLOCKED_BY_CLIENT")) {
        consoleErrors.push(text);
      }
    }
  });

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✅ Logged in");

  // Navigate to Payroll page
  await page.goto(`${BASE_URL}/payroll`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1:has-text('Payroll')")).toBeVisible({ timeout: 10000 });
  console.log("✅ On Payroll page");

  // Click Pay Rates tab
  const payRatesTab = page.locator("button").filter({ hasText: "Pay Rates" });
  await payRatesTab.click();
  await page.waitForTimeout(1000);
  console.log("✅ Clicked Pay Rates tab");

  // Take screenshot of Pay Rates tab
  await page.screenshot({ path: "e2e/screenshots/pay-rates-tab.png" });

  // Click "+ Add Rate" button
  const addButton = page.locator("button:has-text('Add Rate')");
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();
  await page.waitForTimeout(500);
  console.log("✅ Clicked Add Rate button");

  // Wait for modal
  const modal = page.locator("[role='dialog'], .modal, [class*='Dialog']").filter({ hasText: "Add New Pay Rate" });
  await expect(modal).toBeVisible({ timeout: 3000 });
  console.log("✅ Modal opened");

  // Take screenshot of form
  await page.screenshot({ path: "e2e/screenshots/pay-rate-form.png" });

  // Fill the form
  // 1. Select technician
  const techSelect = page.locator("select").first();
  const techOptions = await techSelect.locator("option").allTextContents();
  console.log("Available technicians:", techOptions);

  if (techOptions.length > 1) {
    await techSelect.selectOption({ index: 1 });
    console.log("✅ Selected technician:", techOptions[1]);
  }

  // 2. Pay type should default to "hourly" - verify it
  const hourlyRadio = page.locator("input[type='radio'][value='hourly']");
  const salaryRadio = page.locator("input[type='radio'][value='salary']");

  // Check if radio buttons exist, otherwise look for different UI
  if (await hourlyRadio.count() === 0) {
    // Maybe it's a different UI - look for buttons or other selectors
    const hourlyButton = page.locator("button:has-text('Hourly'), label:has-text('Hourly')");
    if (await hourlyButton.count() > 0) {
      await hourlyButton.click();
      console.log("✅ Selected Hourly via button/label");
    }
  } else {
    await hourlyRadio.check();
    console.log("✅ Selected Hourly radio");
  }

  // 3. Fill hourly rate
  const hourlyRateInput = page.locator("input").filter({ has: page.locator("..").filter({ hasText: /Hourly Rate/i }) }).first();
  // Alternative selector if above doesn't work
  const rateInputs = page.locator("input[type='number'], input[inputmode='decimal']");
  const inputCount = await rateInputs.count();
  console.log(`Found ${inputCount} number inputs`);

  // Try to find the hourly rate input
  if (inputCount > 0) {
    await rateInputs.first().fill("25");
    console.log("✅ Filled rate input with 25");
  }

  // Take screenshot before submit
  await page.screenshot({ path: "e2e/screenshots/pay-rate-form-filled.png" });

  // Find and click submit button
  const submitButton = page.locator("button:has-text('Create Rate'), button:has-text('Save'), button:has-text('Add')").filter({ has: page.locator(":not(:has-text('Add Rate'))") });
  const createButton = page.locator("button").filter({ hasText: /^Create Rate$|^Save$|^Create$/ });

  if (await createButton.count() > 0) {
    console.log("Found create button, clicking...");
    await createButton.first().click();
  } else {
    // Find any enabled button in the modal that looks like submit
    const modalButtons = modal.locator("button");
    const buttonTexts = await modalButtons.allTextContents();
    console.log("Modal buttons:", buttonTexts);

    // Click the last button (usually submit)
    const lastButton = modalButtons.last();
    await lastButton.click();
  }

  // Wait for network response
  await page.waitForTimeout(3000);

  // Take screenshot after submit
  await page.screenshot({ path: "e2e/screenshots/pay-rate-after-submit.png" });

  // Log all captured network data
  console.log("\n========== NETWORK REQUESTS ==========");
  for (const req of networkRequests) {
    console.log(`${req.method} ${req.url}`);
    console.log(`Request Body: ${req.body}`);
  }

  console.log("\n========== NETWORK RESPONSES ==========");
  for (const res of networkResponses) {
    console.log(`${res.method} ${res.url} -> ${res.status}`);
    console.log(`Response Body: ${res.body.substring(0, 500)}`);
  }

  console.log("\n========== CONSOLE ERRORS ==========");
  if (consoleErrors.length > 0) {
    console.log(consoleErrors);
  } else {
    console.log("No console errors");
  }

  // Check for 500 errors
  const has500 = networkResponses.some(r => r.status === 500);
  if (has500) {
    const error500 = networkResponses.find(r => r.status === 500);
    console.log("\n❌ 500 ERROR FOUND:");
    console.log("URL:", error500?.url);
    console.log("Full Response Body:", error500?.body);
  }

  // Check for success (200 or 201)
  const hasSuccess = networkResponses.some(r => r.status === 200 || r.status === 201);
  if (hasSuccess) {
    console.log("\n✅ SUCCESS RESPONSE FOUND");
    const success = networkResponses.find(r => r.status === 200 || r.status === 201);
    console.log("URL:", success?.url);
  }
});

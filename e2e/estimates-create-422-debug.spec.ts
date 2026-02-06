import { test, expect } from "@playwright/test";

/**
 * Debug test to reproduce and capture the 422 error on estimate creation
 */
test.describe("Estimates Create 422 Debug", () => {
  test("reproduce 422 error on estimate creation", async ({ page }) => {
    // Collect all network responses
    const networkLogs: string[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/") || url.includes("quotes")) {
        networkLogs.push(`${response.status()} ${response.request().method()} ${url}`);
      }
    });

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Login
    console.log("=== STEP 1: Login ===");
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("Logged in successfully");

    // Navigate to Estimates
    console.log("=== STEP 2: Navigate to Estimates ===");
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");
    console.log("On Estimates page");

    // Click Create Estimate button
    console.log("=== STEP 3: Open Create Estimate Modal ===");
    const createBtn = page.locator('button:has-text("Create Estimate"), button:has-text("New Estimate"), a:has-text("Create Estimate")');
    await createBtn.first().click();
    await page.waitForTimeout(1000);
    console.log("Create Estimate modal should be open");

    // Take screenshot of modal
    await page.screenshot({ path: "test-results/create-estimate-modal.png", fullPage: true });

    // Fill form
    console.log("=== STEP 4: Fill Form ===");

    // Select customer - it's a searchable select with placeholder "Search customers..."
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500); // Wait for dropdown to open

    // Take screenshot showing customer dropdown
    await page.screenshot({ path: "test-results/customer-dropdown.png", fullPage: true });

    // Select the "CSRF Test" customer (a real customer)
    const customerOption = page.locator('text=CSRF Test').first();
    if (await customerOption.isVisible()) {
      await customerOption.click();
      console.log("Selected customer: CSRF Test");
    } else {
      // Fallback - try to select any visible option
      const anyOption = page.locator('[class*="option"]').first();
      if (await anyOption.isVisible()) {
        await anyOption.click();
        console.log("Selected first available customer option");
      }
    }
    await page.waitForTimeout(500);

    // Take screenshot after customer selection
    await page.screenshot({ path: "test-results/customer-selected.png", fullPage: true });

    // Fill line item - Service field
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.fill("Septic Tank Pumping");
    console.log("Filled service: Septic Tank Pumping");

    // Rate field - it's the last number input in the line item row
    const rateInput = page.locator('input[type="number"][placeholder="Rate"]').first();
    if (await rateInput.count() > 0) {
      await rateInput.fill("350");
      console.log("Filled rate: 350");
    } else {
      // Alternative - find by position
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      console.log(`Found ${count} number inputs`);
      if (count >= 2) {
        await numberInputs.nth(1).fill("350");
        console.log("Filled rate via index: 350");
      }
    }

    await page.screenshot({ path: "test-results/create-estimate-filled.png", fullPage: true });

    // Intercept the POST request to capture details
    let postPayload: any = null;
    let postResponse: any = null;

    page.on("request", (request) => {
      if (request.url().includes("/quotes") && request.method() === "POST") {
        postPayload = request.postData();
        console.log("=== POST REQUEST PAYLOAD ===");
        console.log(postPayload);
      }
    });

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postResponse = {
          status: response.status(),
          statusText: response.statusText(),
          body: null,
        };
        try {
          postResponse.body = await response.json();
        } catch {
          postResponse.body = await response.text();
        }
        console.log("=== POST RESPONSE ===");
        console.log(`Status: ${postResponse.status} ${postResponse.statusText}`);
        console.log("Body:", JSON.stringify(postResponse.body, null, 2));
      }
    });

    // Click Create Estimate
    console.log("=== STEP 5: Submit Form ===");
    const submitBtn = page.locator('button:has-text("Create Estimate")').last();
    await submitBtn.click();

    // Wait for response
    await page.waitForTimeout(3000);

    await page.screenshot({ path: "test-results/create-estimate-after-submit.png", fullPage: true });

    // Output all network logs
    console.log("=== NETWORK LOGS ===");
    networkLogs.forEach((log) => console.log(log));

    // Output console errors
    console.log("=== CONSOLE ERRORS ===");
    consoleErrors.forEach((err) => console.log(err));

    // Output captured request/response
    console.log("=== CAPTURED POST DATA ===");
    console.log("Payload:", postPayload);
    console.log("Response:", JSON.stringify(postResponse, null, 2));

    // Assertions to check what happened
    if (postResponse) {
      expect(postResponse.status).not.toBe(422);
    }
  });
});

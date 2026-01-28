import { test, expect } from "@playwright/test";

test.describe("Estimate Create - Simple Test", () => {
  test("creates estimate with explicit waits", async ({ page }) => {
    test.setTimeout(90000); // 90 second timeout

    // Step 1: Login
    console.log("Step 1: Login");
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForSelector('input[name="email"]', { state: "visible", timeout: 10000 });
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    console.log("Logged in, on dashboard");

    // Step 2: Navigate to Estimates
    console.log("Step 2: Navigate to Estimates");
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("On Estimates page");

    // Step 3: Click Create Estimate
    console.log("Step 3: Open modal");
    const createBtn = page.locator('button:has-text("Create Estimate")').first();
    await createBtn.waitFor({ state: "visible", timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Wait for modal
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });
    console.log("Modal is open");

    // Step 4: Select customer
    console.log("Step 4: Select customer");
    const customerInput = page.locator('input[placeholder="Search customers..."]');
    await customerInput.waitFor({ state: "visible", timeout: 10000 });

    // Type to filter the dropdown
    await customerInput.fill("CSRF");
    await page.waitForTimeout(1500);

    // Take screenshot of dropdown
    await page.screenshot({ path: "test-results/customer-dropdown-filtered.png" });

    // Find and click CSRF Test customer using more specific selector
    // The button inside the dropdown
    const csrfOption = page.locator('button:has-text("CSRF Test")').first();
    if (await csrfOption.isVisible()) {
      console.log("Found CSRF Test button, clicking...");
      await csrfOption.click();
      await page.waitForTimeout(1000);
      console.log("Customer selected");
    } else {
      console.log("CSRF Test button not found, trying text selector");
      const textOption = page.locator('text=CSRF Test').first();
      if (await textOption.isVisible()) {
        await textOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Screenshot after selection
    await page.screenshot({ path: "test-results/after-customer-selection.png" });

    // Check if modal is still open
    const modalStillOpen = await page.locator('text=Create New Estimate').isVisible();
    console.log("Modal still open after customer selection:", modalStillOpen);

    if (!modalStillOpen) {
      console.log("ERROR: Modal closed unexpectedly!");
      console.log("Current URL:", page.url());
    }

    // Step 5: Fill line item
    console.log("Step 5: Fill line item");
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.waitFor({ state: "visible", timeout: 10000 });
    await serviceInput.fill("Simple E2E Test");

    const rateInput = page.locator('input[type="number"]').nth(1);
    await rateInput.fill("100");
    console.log("Form filled");

    // Step 6: Submit
    console.log("Step 6: Submit form");
    let postStatus: number | null = null;
    let postBody: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postStatus = response.status();
        try {
          postBody = await response.json();
        } catch {
          postBody = "parse error";
        }
      }
    });

    const submitBtn = page.locator('button:has-text("Create Estimate")').last();
    await submitBtn.click();
    await page.waitForTimeout(5000);

    // Results
    console.log("POST Status:", postStatus);
    console.log("POST Body:", JSON.stringify(postBody, null, 2));

    // Assertions
    expect(postStatus).toBe(201);
    expect(postStatus).not.toBe(422);
    console.log("SUCCESS: Estimate created");
  });
});

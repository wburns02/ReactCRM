/**
 * Estimates 422 Bug Diagnosis Test
 * Purpose: Capture the exact 422 error response from POST /quotes
 */
import { test, expect } from "@playwright/test";

test.describe("Estimates 422 Diagnosis", () => {
  test("reproduce and capture 422 error on estimate creation", async ({ page }) => {
    // Set up network interception BEFORE any navigation
    let apiResponseStatus: number | undefined;
    let apiResponseBody: string | undefined;
    let apiRequestBody: string | undefined;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        apiResponseStatus = response.status();
        try {
          apiResponseBody = await response.text();
        } catch (e) {
          apiResponseBody = "Could not read response body";
        }
        console.log("CAPTURED POST /quotes response:", apiResponseStatus, apiResponseBody);
      }
    });

    page.on("request", (request) => {
      if (request.url().includes("/quotes") && request.method() === "POST") {
        apiRequestBody = request.postData() || "No post data";
        console.log("CAPTURED POST /quotes request:", apiRequestBody);
      }
    });

    // Login with the provided credentials
    console.log("Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"], input[type="email"]', "will@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/.*(?<!login)$/, { timeout: 15000 });
    console.log("Login successful, current URL:", page.url());

    // Navigate to estimates page
    console.log("Step 2: Navigating to Estimates page...");
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");
    console.log("Estimates page loaded");

    // Find and click Create Estimate button
    console.log("Step 3: Opening Create Estimate modal...");
    const createButton = page.getByRole("button", { name: /create estimate/i });
    await createButton.waitFor({ state: "visible", timeout: 10000 });
    await createButton.click();

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log("Create Estimate modal opened");

    // Step 4: Select a customer using the CustomerSelect component
    console.log("Step 4: Selecting a customer...");

    // Find the search input with placeholder "Search customers..."
    const customerSearchInput = page.locator('input[placeholder="Search customers..."]');
    await customerSearchInput.waitFor({ state: "visible", timeout: 5000 });

    // Click to focus and open the dropdown
    await customerSearchInput.click();
    console.log("Customer search input clicked, waiting for dropdown...");

    // Wait for the dropdown to appear with customer options
    await page.waitForTimeout(1000); // Allow time for customers to load

    // Look for customer buttons in the dropdown (they have a specific structure)
    const customerDropdown = page.locator('.absolute.z-50'); // The dropdown container
    await customerDropdown.waitFor({ state: "visible", timeout: 5000 });

    // Click the first customer option
    const firstCustomer = customerDropdown.locator('button').first();
    await firstCustomer.waitFor({ state: "visible", timeout: 5000 });

    const customerName = await firstCustomer.locator('.font-medium').textContent();
    console.log("Selecting customer:", customerName);
    await firstCustomer.click();

    // Verify selection by checking for the customer preview card
    await page.waitForTimeout(500);
    const customerPreview = page.locator('.bg-bg-muted').filter({ hasText: customerName || "" });
    const hasCustomerSelected = await customerPreview.isVisible();
    console.log("Customer selected and preview visible:", hasCustomerSelected);

    // Step 5: Fill line item fields
    console.log("Step 5: Filling line items...");
    await page.fill('input[placeholder="Service"]', "Septic Tank Pumping");
    await page.fill('input[placeholder="Description"]', "Standard residential pumping");

    // Clear and fill quantity
    const qtyInput = page.locator('input[placeholder="Qty"]');
    await qtyInput.clear();
    await qtyInput.fill("1");

    // Clear and fill rate
    const rateInput = page.locator('input[placeholder="Rate"]');
    await rateInput.clear();
    await rateInput.fill("350");

    console.log("Line items filled");

    // Step 6: Fill tax rate
    console.log("Step 6: Setting tax rate...");
    // Tax rate input is the first number input after rate
    const taxRateLabel = page.locator('label:has-text("Tax Rate")');
    const taxRateInput = taxRateLabel.locator('..').locator('input[type="number"]');
    await taxRateInput.clear();
    await taxRateInput.fill("8.25");
    console.log("Tax rate set to 8.25%");

    // Step 7: Set valid until date
    console.log("Step 7: Setting valid until date...");
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill("2026-02-28");
    console.log("Valid until date set");

    // Step 8: Add notes
    console.log("Step 8: Adding notes...");
    const notesTextarea = page.locator('textarea');
    await notesTextarea.fill("Test estimate for 422 diagnosis");

    // Take screenshot before submit
    await page.screenshot({ path: "test-results/estimates-form-filled.png" });
    console.log("Form filled, screenshot taken");

    // Step 9: Submit the form
    console.log("Step 9: Submitting form...");
    const submitButton = page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i });

    // Wait for the button to be enabled (not in pending state)
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    console.log("Submit button clicked");

    // Wait for the API response
    await page.waitForTimeout(5000);

    // Log the results
    console.log("\n========== API DIAGNOSIS RESULTS ==========");
    console.log("Request Body:", apiRequestBody);
    console.log("Response Status:", apiResponseStatus);
    console.log("Response Body:", apiResponseBody);
    console.log("=============================================\n");

    // Take screenshot after submit
    await page.screenshot({ path: "test-results/estimates-after-submit.png" });

    // Check if modal is still open (indicating failure)
    const modalStillOpen = await page.locator('[role="dialog"]').isVisible();
    console.log("Modal still open after submit:", modalStillOpen);

    // Check for toast messages
    const toastMessages = await page.locator('[role="alert"], .toast, [class*="toast"], [class*="Toastify"]').allTextContents();
    console.log("Toast messages:", toastMessages);

    // Detailed analysis
    if (apiResponseStatus === 422) {
      console.log("\n🔴 CONFIRMED: 422 Unprocessable Content error");
      console.log("This is the bug we need to fix!");

      // Parse the error details
      try {
        const errorData = JSON.parse(apiResponseBody || "{}");
        console.log("Parsed error details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log("Raw error response:", apiResponseBody);
      }
    } else if (apiResponseStatus === 201) {
      console.log("\n🟢 SUCCESS: Estimate created successfully!");
      console.log("The bug may already be fixed.");
    } else if (apiResponseStatus === undefined) {
      console.log("\n⚠️ NO API CALL MADE - Check if frontend validation failed");
    } else {
      console.log("\n⚠️ UNEXPECTED STATUS:", apiResponseStatus);
    }

    // Final assertions
    expect(apiResponseStatus, "API should have been called").toBeDefined();
    expect(apiResponseStatus, "Should return 201 Created").toBe(201);
  });
});

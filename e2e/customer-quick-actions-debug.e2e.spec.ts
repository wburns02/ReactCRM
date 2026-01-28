import { test, expect } from "@playwright/test";

test.describe("Customer Quick Actions Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
  });

  test("diagnose customer quick actions buttons", async ({ page }) => {
    // Navigate directly to a customer detail page
    await page.goto("/customers/1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for page to fully render

    console.log("=== CUSTOMER DETAIL PAGE LOADED ===");
    console.log("URL:", page.url());

    // Look for Quick Actions section
    const quickActionsHeading = page.locator('text="Quick Actions"');
    const quickActionsCount = await quickActionsHeading.count();
    console.log("Quick Actions sections found:", quickActionsCount);

    // Look for Schedule Follow-up button anywhere
    const scheduleFollowUpBtn = page.locator('button:has-text("Schedule Follow-up"), button:has-text("Schedule Follow-Up")');
    const scheduleFollowUpCount = await scheduleFollowUpBtn.count();
    console.log("Schedule Follow-up buttons found:", scheduleFollowUpCount);

    // Look for Send Email button anywhere
    const sendEmailBtn = page.locator('button:has-text("Send Email")');
    const sendEmailCount = await sendEmailBtn.count();
    console.log("Send Email buttons found:", sendEmailCount);

    // Look for Log Activity button anywhere
    const logActivityBtn = page.locator('button:has-text("Log Activity")');
    const logActivityCount = await logActivityBtn.count();
    console.log("Log Activity buttons found:", logActivityCount);

    // Try clicking Schedule Follow-up if it exists
    if (scheduleFollowUpCount > 0) {
      console.log("\n=== Testing Schedule Follow-up ===");
      await scheduleFollowUpBtn.first().click();
      await page.waitForTimeout(1000);

      // Check for any modal or dialog
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]');
      const modalCount = await modal.count();
      console.log("Modals opened after Schedule Follow-up click:", modalCount);
    }

    // Try clicking Send Email if it exists
    if (sendEmailCount > 0) {
      console.log("\n=== Testing Send Email ===");
      await sendEmailBtn.first().click();
      await page.waitForTimeout(1000);

      // Check for any modal or dialog or composer
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]');
      const modalCount = await modal.count();
      console.log("Modals opened after Send Email click:", modalCount);
    }

    // Try clicking Log Activity if it exists
    if (logActivityCount > 0) {
      console.log("\n=== Testing Log Activity ===");
      await logActivityBtn.first().click();
      await page.waitForTimeout(1000);

      // Check for any modal or dialog
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]');
      const modalCount = await modal.count();
      console.log("Modals opened after Log Activity click:", modalCount);

      // Check if we can see form fields
      if (modalCount > 0) {
        const activityTypeSelect = page.locator('select[id="activity_type"], select[name="activity_type"]');
        const descriptionInput = page.locator('textarea[id="description"], textarea[name="description"]');
        console.log("Activity type select exists:", (await activityTypeSelect.count()) > 0);
        console.log("Description textarea exists:", (await descriptionInput.count()) > 0);

        // Try filling and submitting
        if ((await activityTypeSelect.count()) > 0) {
          await activityTypeSelect.selectOption("note");
        }
        if ((await descriptionInput.count()) > 0) {
          await descriptionInput.fill("Test activity from Playwright");
        }

        // Look for submit button
        const submitBtn = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Log"), button:has-text("Save Activity")');
        const submitBtnCount = await submitBtn.count();
        console.log("Submit buttons found:", submitBtnCount);

        if (submitBtnCount > 0) {
          // Setup response listener
          const responsePromise = page.waitForResponse(
            (resp) => resp.url().includes("/activities") && resp.request().method() === "POST",
            { timeout: 5000 }
          ).catch(() => null);

          await submitBtn.first().click();

          const response = await responsePromise;
          if (response) {
            console.log("Activity POST response status:", response.status());
          } else {
            console.log("No POST to /activities detected");
          }
        }
      }
    }

    // List all buttons on the page for debugging
    console.log("\n=== ALL BUTTONS ON PAGE ===");
    const allButtons = await page.locator("button").allTextContents();
    console.log("Buttons:", allButtons.filter(b => b.trim()).join(", "));
  });
});

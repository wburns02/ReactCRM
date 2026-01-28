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
    await page.waitForTimeout(2000);

    console.log("=== CUSTOMER DETAIL PAGE LOADED ===");
    console.log("URL:", page.url());

    // Look for Schedule Follow-up button
    const scheduleFollowUpBtn = page.locator('button:has-text("Schedule Follow-up"), button:has-text("Schedule Follow-Up")');
    const scheduleFollowUpCount = await scheduleFollowUpBtn.count();
    console.log("Schedule Follow-up buttons found:", scheduleFollowUpCount);

    // Look for Send Email button
    const sendEmailBtn = page.locator('button:has-text("Send Email")');
    const sendEmailCount = await sendEmailBtn.count();
    console.log("Send Email buttons found:", sendEmailCount);

    // Look for Log Activity button
    const logActivityBtn = page.locator('button:has-text("Log Activity")');
    const logActivityCount = await logActivityBtn.count();
    console.log("Log Activity buttons found:", logActivityCount);

    // Test Schedule Follow-up
    if (scheduleFollowUpCount > 0) {
      console.log("\n=== Testing Schedule Follow-up ===");
      await scheduleFollowUpBtn.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      const modalCount = await modal.count();
      console.log("Modal opened:", modalCount > 0 ? "YES" : "NO");

      // Close modal
      if (modalCount > 0) {
        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Test Send Email
    if (sendEmailCount > 0) {
      console.log("\n=== Testing Send Email ===");
      await sendEmailBtn.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      const modalCount = await modal.count();
      console.log("Modal opened:", modalCount > 0 ? "YES" : "NO");

      // Close modal
      if (modalCount > 0) {
        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Test Log Activity
    if (logActivityCount > 0) {
      console.log("\n=== Testing Log Activity ===");
      await logActivityBtn.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      const modalCount = await modal.count();
      console.log("Modal opened:", modalCount > 0 ? "YES" : "NO");

      if (modalCount > 0) {
        const activityTypeSelect = page.locator('select[id="activity_type"]');
        const descriptionInput = page.locator('textarea[id="description"]');
        console.log("Activity type select:", (await activityTypeSelect.count()) > 0 ? "EXISTS" : "MISSING");
        console.log("Description textarea:", (await descriptionInput.count()) > 0 ? "EXISTS" : "MISSING");

        // Fill form
        if ((await activityTypeSelect.count()) > 0) {
          await activityTypeSelect.selectOption("note");
        }
        if ((await descriptionInput.count()) > 0) {
          await descriptionInput.fill("Test activity from Playwright");
        }

        // Submit
        const submitBtn = page.locator('button[type="submit"]:has-text("Log Activity")');
        console.log("Submit button:", (await submitBtn.count()) > 0 ? "EXISTS" : "MISSING");

        if ((await submitBtn.count()) > 0) {
          const responsePromise = page.waitForResponse(
            (resp) => resp.url().includes("/activities") && resp.request().method() === "POST",
            { timeout: 5000 }
          ).catch(() => null);

          await submitBtn.click();

          const response = await responsePromise;
          if (response) {
            console.log("Activity POST status:", response.status());
          } else {
            console.log("No POST to /activities detected");
          }
        }
      }
    }

    console.log("\n=== TEST COMPLETE ===");
  });
});

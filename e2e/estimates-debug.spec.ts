import { test, expect } from "@playwright/test";

test.describe("Estimates Creation Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("debug estimate creation - find create button and form", async ({
    page,
  }) => {
    // Navigate to Estimates page
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Screenshot initial state
    await page.screenshot({ path: "estimates-page-initial.png", fullPage: true });

    // Find the Create Estimate button
    const createButton = page.locator('button:has-text("Create Estimate")');
    const buttonExists = await createButton.isVisible();
    console.log("Create Estimate button visible:", buttonExists);

    if (buttonExists) {
      // Click to see if a modal opens
      await createButton.click();
      await page.waitForTimeout(1000);

      // Check for modal/dialog
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log("Modal visible after click:", modalVisible);

      // Screenshot after click
      await page.screenshot({ path: "estimates-after-create-click.png", fullPage: true });

      // Look for any form elements
      const formFields = await page.locator("input, select, textarea").count();
      console.log("Form fields found:", formFields);
    }

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Try POST to /quotes endpoint directly to see the 422 error
    const response = await page.request.post(
      "https://react-crm-api-production.up.railway.app/api/v2/quotes",
      {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          customer_id: 1,
          line_items: [
            {
              service: "Test Service",
              description: "Test description",
              quantity: 1,
              rate: 100,
              amount: 100,
            },
          ],
          tax_rate: 0,
          status: "draft",
        },
      }
    );

    console.log("POST /quotes status:", response.status());
    console.log("POST /quotes response:", await response.text());
  });
});

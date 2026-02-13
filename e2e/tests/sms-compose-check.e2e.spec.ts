import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";

test.describe("SMS/Email Compose Check", () => {
  test("Check SMS tab for compose button", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click SMS tab
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    // Take screenshot of SMS tab
    await page.screenshot({
      path: "e2e/screenshots/sms-tab-check.png",
      fullPage: true,
    });

    // Check if floating compose button exists
    const composeBtn = page.locator('button[aria-label="Compose message"]');
    const count = await composeBtn.count();
    console.log("Compose button count:", count);
    if (count > 0) {
      const box = await composeBtn.first().boundingBox();
      console.log("Compose button bounding box:", box);
      const visible = await composeBtn.first().isVisible();
      console.log("Compose button visible:", visible);
    }
  });

  test("Check Email tab for compose button", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click Email tab
    const emailTab = page.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await page.waitForTimeout(1000);

    // Take screenshot of Email tab
    await page.screenshot({
      path: "e2e/screenshots/email-tab-check.png",
      fullPage: true,
    });
  });
});

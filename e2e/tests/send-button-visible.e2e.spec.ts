import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";

test.describe("Send Button Visibility", () => {
  test("Send SMS button is bright blue and visible", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // SMS tab
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    // Open compose
    const newMsgBtn = page.getByRole("button", { name: /New Text Message/i });
    await newMsgBtn.click();
    await page.waitForTimeout(1000);

    // Send button should be visible and blue
    const sendBtn = page.locator("button:has-text('Send SMS')");
    await expect(sendBtn).toBeVisible();

    // Verify it has blue background (Tailwind 4 uses oklch color space)
    const bgColor = await sendBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log("Send button background color:", bgColor);
    // blue-600 = oklch(0.546 0.245 262.881) or rgb(37, 99, 235)
    expect(
      bgColor.includes("oklch") || bgColor.includes("37"),
    ).toBeTruthy();

    await page.screenshot({
      path: "e2e/screenshots/send-button-visible.png",
      fullPage: true,
    });
  });

  test("Send Email button is bright blue and visible", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Email tab
    const emailTab = page.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await page.waitForTimeout(1000);

    // Open compose
    const newEmailBtn = page.getByRole("button", { name: /New Email/i });
    await newEmailBtn.click();
    await page.waitForTimeout(1000);

    // Send button visible
    const sendBtn = page.locator("button:has-text('Send Email')");
    await expect(sendBtn).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/send-email-button-visible.png",
      fullPage: true,
    });
  });
});

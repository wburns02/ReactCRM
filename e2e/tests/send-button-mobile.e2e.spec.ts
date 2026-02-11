import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";

test.describe("Send Button on Mobile", () => {
  test.use({ viewport: { width: 375, height: 600 } }); // Small mobile

  test("Send button is visible in header on mobile (SMS)", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click SMS tab
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    // Open compose
    const newMsgBtn = page.getByRole("button", { name: /New Text Message/i });
    await newMsgBtn.click();
    await page.waitForTimeout(1000);

    // Send button should be in the header — always visible, no scrolling needed
    const sendBtn = page.getByRole("button", { name: /^Send$/i });
    await expect(sendBtn).toBeVisible();

    // Verify it's near the TOP of the viewport (in header bar, y < 60px)
    const box = await sendBtn.boundingBox();
    expect(box).not.toBeNull();
    console.log("Send button position:", box);
    expect(box!.y).toBeLessThan(60);

    await page.screenshot({
      path: "e2e/screenshots/send-button-mobile.png",
      fullPage: false,
    });
  });

  test("Send button is visible in header on mobile (Email)", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click Email tab
    const emailTab = page.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await page.waitForTimeout(1000);

    // Open compose
    const newEmailBtn = page.getByRole("button", { name: /New Email/i });
    await newEmailBtn.click();
    await page.waitForTimeout(1000);

    // Send button in header
    const sendBtn = page.getByRole("button", { name: /^Send$/i });
    await expect(sendBtn).toBeVisible();

    const box = await sendBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(60);

    await page.screenshot({
      path: "e2e/screenshots/send-email-mobile.png",
      fullPage: false,
    });
  });
});

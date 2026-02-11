import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";

test.describe("SMS/Email New Message Buttons", () => {
  test("1. SMS tab has New Text Message button", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click SMS tab
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    // Should see "New Text Message" button
    const newMsgBtn = page.getByRole("button", { name: /New Text Message/i });
    await expect(newMsgBtn).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/sms-new-message-btn.png",
      fullPage: true,
    });
  });

  test("2. Email tab has New Email button", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click Email tab
    const emailTab = page.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await page.waitForTimeout(1000);

    // Should see "New Email" button
    const newEmailBtn = page.getByRole("button", { name: /New Email/i });
    await expect(newEmailBtn).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/email-new-message-btn.png",
      fullPage: true,
    });
  });

  test("3. New Text Message button opens compose panel", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click SMS tab
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    // Click New Text Message
    const newMsgBtn = page.getByRole("button", { name: /New Text Message/i });
    await newMsgBtn.click();
    await page.waitForTimeout(500);

    // Compose panel should open with "New Message" header
    await expect(page.locator("text=New Message").first()).toBeVisible();

    // Should have phone number input
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput.first()).toBeVisible();

    // Should have message textarea
    const textarea = page.locator('textarea[placeholder="Type your message here..."]');
    await expect(textarea).toBeVisible();

    // Should have Send button in header
    const sendBtn = page.getByRole("button", { name: /^Send$/i });
    await expect(sendBtn).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/sms-compose-panel.png",
      fullPage: true,
    });
  });

  test("4. New Email button opens compose with subject field", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click Email tab
    const emailTab = page.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await page.waitForTimeout(1000);

    // Click New Email button (the prominent one in the tab content)
    const newEmailBtn = page.getByRole("button", { name: /New Email/i });
    await newEmailBtn.click();
    await page.waitForTimeout(1000);

    // Compose panel opens with Email type pre-selected
    // Should have "New Message" header
    await expect(page.locator("text=New Message").first()).toBeVisible();

    // Should have email input (compose defaults to email when opened from Email tab)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput.first()).toBeVisible();

    // Should have subject input
    await expect(page.locator("text=Subject").first()).toBeVisible();

    // Should have Send button in header
    const sendBtn = page.getByRole("button", { name: /^Send$/i });
    await expect(sendBtn).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/email-compose-panel.png",
      fullPage: true,
    });
  });

  test("5. Compose panel can be closed", async ({ page }) => {
    await page.goto(`${BASE}/portal/messages`);
    await page.waitForTimeout(3000);

    // Click SMS tab and open compose
    const smsTab = page.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await page.waitForTimeout(1000);

    const newMsgBtn = page.getByRole("button", { name: /New Text Message/i });
    await newMsgBtn.click();
    await page.waitForTimeout(500);

    // Verify compose is open
    await expect(page.locator("text=New Message").first()).toBeVisible();

    // Click the Cancel button
    const closeBtn = page.getByRole("button", { name: /Cancel/i });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Compose should be closed
    await expect(page.locator("text=New Message").first()).not.toBeVisible();
  });
});

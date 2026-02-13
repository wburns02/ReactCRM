import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";
const TEST_WO_ID = "246c9fc6-6a50-47b9-b90d-e429cd135292";

test.describe("Tech Portal Text/SMS Buttons", () => {
  test("1. Job detail shows Text and RC Text buttons", async ({ page }) => {
    await page.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await page.waitForTimeout(3000);

    // Verify customer info loaded
    await expect(page.locator("text=Alfred Stone").first()).toBeVisible();

    // Check for native Text button (sms: link)
    const textLink = page.locator('a[href^="sms:"]');
    await expect(textLink.first()).toBeVisible();
    const smsHref = await textLink.first().getAttribute("href");
    expect(smsHref).toContain("sms:");
    console.log("Text link href:", smsHref);

    // Check for RC Text button
    const rcTextBtn = page.getByRole("button", { name: /RC Text/i });
    await expect(rcTextBtn).toBeVisible();

    // Check for Call button too
    const callLink = page.locator('a[href^="tel:"]');
    await expect(callLink.first()).toBeVisible();

    // Check for RC Call button
    const rcCallBtn = page.getByRole("button", { name: /RC Call/i });
    await expect(rcCallBtn).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/tech-text-buttons.png",
      fullPage: true,
    });
  });

  test("2. RC Text button opens quick compose panel", async ({ page }) => {
    await page.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await page.waitForTimeout(3000);

    // Click RC Text to open compose panel
    const rcTextBtn = page.getByRole("button", { name: /RC Text/i });
    await rcTextBtn.click();
    await page.waitForTimeout(500);

    // Verify compose panel is visible
    const composePanel = page.locator("text=Send SMS to");
    await expect(composePanel.first()).toBeVisible();

    // Verify textarea is present
    const textarea = page.locator('textarea[placeholder="Type your message..."]');
    await expect(textarea).toBeVisible();

    // Verify Send button exists
    const sendBtn = page.locator("button:has-text('Send')").last();
    await expect(sendBtn).toBeVisible();

    // Verify character counter
    const charCounter = page.locator("text=/\\/160 chars/");
    await expect(charCounter.first()).toBeVisible();

    // Take screenshot of the compose panel
    await page.screenshot({
      path: "e2e/screenshots/tech-rc-text-compose.png",
      fullPage: true,
    });
  });

  test("3. Quick compose allows typing and shows character count", async ({
    page,
  }) => {
    await page.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await page.waitForTimeout(3000);

    // Open compose panel
    const rcTextBtn = page.getByRole("button", { name: /RC Text/i });
    await rcTextBtn.click();
    await page.waitForTimeout(500);

    // Type a message
    const textarea = page.locator(
      'textarea[placeholder="Type your message..."]'
    );
    await textarea.fill("Hi, this is your technician. I am on my way!");

    // Verify character count updates (44 chars)
    const charCounter = page.locator("text=44/160 chars");
    await expect(charCounter.first()).toBeVisible();
  });

  test("4. Cancel closes the compose panel", async ({ page }) => {
    await page.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await page.waitForTimeout(3000);

    // Open compose
    const rcTextBtn = page.getByRole("button", { name: /RC Text/i });
    await rcTextBtn.click();
    await page.waitForTimeout(500);

    // Verify compose is open
    await expect(page.locator("text=Send SMS to").first()).toBeVisible();

    // Click cancel
    const cancelBtn = page.locator("button:has-text('Cancel')");
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Verify compose is closed
    await expect(page.locator("text=Send SMS to").first()).not.toBeVisible();
  });

  test("5. Send button is disabled when message is empty", async ({
    page,
  }) => {
    await page.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await page.waitForTimeout(3000);

    // Open compose
    const rcTextBtn = page.getByRole("button", { name: /RC Text/i });
    await rcTextBtn.click();
    await page.waitForTimeout(500);

    // Send button should be disabled (no message typed)
    const sendBtn = page.locator(
      "button:has-text('Send'):not(:has-text('Sending'))"
    ).last();
    await expect(sendBtn).toBeDisabled();
  });
});

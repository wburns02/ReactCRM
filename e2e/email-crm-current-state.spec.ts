import { test, expect, Page } from "@playwright/test";

/**
 * Email CRM Current State Exploration
 * Manually explore the communications page to understand current functionality
 */

async function login(page: Page) {
  await page.goto("https://react.ecbtx.com/login");
  await page.waitForLoadState("domcontentloaded");

  if (page.url().includes("/login")) {
    await page.fill('input[name="email"], input[type="email"]', "will@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|communications|schedule)/, { timeout: 15000 });
  }
}

test.describe("Email CRM Current State", () => {
  test("Explore Communications Page", async ({ page }) => {
    await login(page);

    // Navigate to Communications page
    await page.goto("https://react.ecbtx.com/communications");
    await page.waitForLoadState("networkidle");

    // Take screenshot of communications overview
    await page.screenshot({
      path: "e2e/screenshots/email-crm-communications-overview.png",
      fullPage: true
    });

    // Check what's on the page
    const pageContent = await page.textContent("body");
    console.log("=== Communications Page Content ===");
    console.log(pageContent?.substring(0, 2000));

    // Look for email-related elements
    const emailLink = page.locator('a[href*="email"], button:has-text("Email")').first();
    if (await emailLink.isVisible()) {
      console.log("Found email link/button");
    }

    // Look for compose button
    const composeBtn = page.getByRole("button", { name: /compose|send|new/i }).first();
    if (await composeBtn.isVisible()) {
      console.log("Found compose button");
    }
  });

  test("Explore Email Inbox", async ({ page }) => {
    await login(page);

    // Navigate to Email Inbox
    await page.goto("https://react.ecbtx.com/communications/email-inbox");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/email-crm-email-inbox.png",
      fullPage: true
    });

    // Check for email items
    const emailItems = page.locator('[data-testid="email-item"], .email-row, tr').all();
    console.log("=== Email Inbox Items ===");
    console.log("Found email items:", (await emailItems).length);

    // Look for compose email button
    const composeEmailBtn = page.getByRole("button", { name: /compose|new email|send email/i });
    if (await composeEmailBtn.isVisible()) {
      console.log("Found compose email button");
      await composeEmailBtn.click();
      await page.waitForTimeout(1000);

      // Screenshot of compose modal
      await page.screenshot({
        path: "e2e/screenshots/email-crm-compose-modal.png",
        fullPage: true
      });
    }
  });

  test("Explore Customer Detail Email History", async ({ page }) => {
    await login(page);

    // Navigate to customers page
    await page.goto("https://react.ecbtx.com/customers");
    await page.waitForLoadState("networkidle");

    // Click first customer
    const firstCustomer = page.locator('tr, [data-testid="customer-row"]').first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      await page.waitForLoadState("networkidle");

      // Take screenshot of customer detail
      await page.screenshot({
        path: "e2e/screenshots/email-crm-customer-detail.png",
        fullPage: true
      });

      // Look for communications/email tab or section
      const commTab = page.getByRole("tab", { name: /communication|email|message/i });
      if (await commTab.isVisible()) {
        await commTab.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: "e2e/screenshots/email-crm-customer-emails.png",
          fullPage: true
        });
      }
    }
  });

  test("Test Email Compose Flow", async ({ page }) => {
    await login(page);

    // Navigate to communications
    await page.goto("https://react.ecbtx.com/communications/email-inbox");
    await page.waitForLoadState("networkidle");

    // Listen for API requests
    page.on("request", request => {
      if (request.url().includes("/email") || request.url().includes("/communications")) {
        console.log("API Request:", request.method(), request.url());
      }
    });

    page.on("response", response => {
      if (response.url().includes("/email") || response.url().includes("/communications")) {
        console.log("API Response:", response.status(), response.url());
      }
    });

    // Try to compose email
    const composeBtn = page.getByRole("button", { name: /compose|new email/i }).first();
    if (await composeBtn.isVisible()) {
      await composeBtn.click();
      await page.waitForTimeout(1000);

      // Fill compose form
      const toField = page.locator('input[name="to"], input[type="email"]').first();
      if (await toField.isVisible()) {
        await toField.fill("test@example.com");
      }

      const subjectField = page.locator('input[name="subject"]').first();
      if (await subjectField.isVisible()) {
        await subjectField.fill("Test Email Subject");
      }

      const bodyField = page.locator('textarea[name="body"], textarea[name="message"]').first();
      if (await bodyField.isVisible()) {
        await bodyField.fill("This is a test email body.");
      }

      // Screenshot before send
      await page.screenshot({
        path: "e2e/screenshots/email-crm-compose-filled.png",
        fullPage: true
      });

      // Don't actually send - just document the flow
      console.log("Email compose form ready");
    }
  });

  test("Check Network Endpoints", async ({ page }) => {
    await login(page);

    const apiCalls: string[] = [];

    page.on("response", response => {
      if (response.url().includes("/api/v2/")) {
        apiCalls.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to communications
    await page.goto("https://react.ecbtx.com/communications");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to email inbox
    await page.goto("https://react.ecbtx.com/communications/email-inbox");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    console.log("=== API Endpoints Called ===");
    apiCalls.forEach(call => console.log(call));
  });
});

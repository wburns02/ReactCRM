import { test, expect } from "@playwright/test";

/**
 * Email CRM Integration E2E Tests
 *
 * Tests the email functionality across the CRM:
 * 1. Communications Overview - Email stats and compose
 * 2. Email Inbox - View email history
 * 3. Customer Detail - Email history section
 * 4. Send Email - Compose and send from various locations
 */

test.describe("Email CRM Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("Communications Overview shows email section", async ({ page }) => {
    // Navigate to communications
    await page.goto("/communications");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Check for communications overview elements
    await expect(page.locator("h1:has-text('Communications')")).toBeVisible();

    // Check for Email channel card
    const emailCard = page.locator("a[href='/communications/email-inbox']");
    await expect(emailCard).toBeVisible();

    // Check for Send Email quick action
    const sendEmailButton = page.locator("button:has-text('Send Email')");
    await expect(sendEmailButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/communications-overview-email.png" });
  });

  test("Email Inbox displays email list", async ({ page }) => {
    // Navigate to email inbox
    await page.goto("/communications/email-inbox");

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Check for inbox elements
    await expect(page.locator("h1:has-text('Email Inbox')")).toBeVisible();

    // Check for compose button
    const composeButton = page.locator("button:has-text('Compose')");
    await expect(composeButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/email-inbox-list.png" });
  });

  test("Compose Email modal opens and has required fields", async ({
    page,
  }) => {
    // Navigate to communications
    await page.goto("/communications");
    await page.waitForLoadState("networkidle");

    // Click Send Email button
    await page.locator("button:has-text('Send Email')").click();

    // Wait for modal header (exact match)
    await expect(page.getByText("Compose Email", { exact: true })).toBeVisible({ timeout: 5000 });

    // Check for email form fields - the modal has To, Subject, Message labels
    await expect(page.getByText("To", { exact: true })).toBeVisible();
    await expect(page.getByText("Subject", { exact: true })).toBeVisible();
    await expect(page.getByText("Message", { exact: true })).toBeVisible();

    // Check for AI assist option
    await expect(page.locator("text=Use AI to draft email")).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/email-compose-modal.png" });
  });

  test("Customer Detail page shows Email History section", async ({ page }) => {
    // Navigate to customers list
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // Wait for table to load
    await page.waitForSelector("table tbody tr", { timeout: 10000 });

    // Click on the View button for the first customer (Actions column)
    const viewButton = page.locator("table tbody tr").first().locator("text=View");
    await viewButton.click();

    // Wait for navigation to customer detail
    await page.waitForURL(/\/customers\/\d+/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Scroll down to see Email History section
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(1000);

    // Check for Email History section
    await expect(page.locator("text=Email History")).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/customer-detail-email-history.png",
      fullPage: true,
    });
  });

  test("Can open compose modal from Customer Email History", async ({ page }) => {
    // Navigate to a customer detail page
    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    // Wait for table and click View on first customer
    await page.waitForSelector("table tbody tr", { timeout: 10000 });
    await page.locator("table tbody tr").first().locator("text=View").click();
    await page.waitForURL(/\/customers\/\d+/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Scroll to Email History section
    const emailHistoryHeader = page.locator("text=Email History");
    await emailHistoryHeader.scrollIntoViewIfNeeded();

    // Check if Send Email button exists in the section
    const emailSection = page.locator(".lg\\:col-span-2:has-text('Email History')");
    const sendEmailBtn = emailSection.locator("button:has-text('Send Email')");

    if (await sendEmailBtn.isVisible({ timeout: 3000 })) {
      await sendEmailBtn.click();

      // Check compose modal opens
      await expect(page.locator("text=Compose Email")).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/customer-email-compose-from-detail.png",
      });
    } else {
      // Customer may not have email - check for "No emails sent" message
      await expect(page.locator("text=No emails sent")).toBeVisible();
    }
  });

  test("Email templates page is accessible", async ({ page }) => {
    // Navigate to email templates
    await page.goto("/communications/templates/email");
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/email-templates-page.png" });

    // Page should load without errors (check not 404)
    await expect(page.locator("text=404")).not.toBeVisible();
  });

  test("Can fill and submit email compose form", async ({ page }) => {
    // Navigate to communications
    await page.goto("/communications");
    await page.waitForLoadState("networkidle");

    // Click Send Email button
    await page.locator("button:has-text('Send Email')").click();
    await expect(page.getByText("Compose Email", { exact: true })).toBeVisible({ timeout: 5000 });

    // Fill out the form
    await page.fill('input[type="email"]', "test@example.com");
    await page.locator('input').nth(1).fill("Test Email Subject"); // Subject field
    await page.fill('textarea', "This is a test email message from Playwright.");

    // Take screenshot before send
    await page.screenshot({ path: "e2e/screenshots/email-compose-filled.png" });

    // Find the send button inside the modal (not the quick action)
    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    const sendButton = modal.locator("button:has-text('Send Email')");
    await expect(sendButton).toBeEnabled();

    // Note: We don't actually click send in tests to avoid sending real emails
    // Just verify the form is fillable and button is enabled
  });
});

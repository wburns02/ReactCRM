import { test, expect } from "@playwright/test";

/**
 * Debug test to reproduce email system errors
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Email System Debug", () => {
  test("reproduce email inbox and send errors", async ({ page }) => {
    const apiCalls: { method: string; url: string; status: number; body?: string }[] = [];

    // Capture ALL network requests
    page.on("response", async (res) => {
      const url = res.url();
      if (url.includes("/api/v2/") || url.includes("fastapi.ecbtx.com")) {
        const entry = {
          method: res.request().method(),
          url: url,
          status: res.status(),
          body: "",
        };

        if (res.status() >= 400) {
          try {
            entry.body = await res.text();
          } catch {
            entry.body = "(could not read body)";
          }
        }

        apiCalls.push(entry);
        console.log(`${entry.method} ${entry.url} -> ${entry.status}`);
        if (entry.body) {
          console.log(`  Response: ${entry.body.substring(0, 500)}`);
        }
      }
    });

    // Login
    console.log("\n=== LOGGING IN ===\n");
    await page.goto(PRODUCTION_URL + "/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule|invoices)/, {
      timeout: 15000,
    });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    console.log("\n=== NAVIGATING TO EMAIL INBOX ===\n");

    // Try both possible email inbox URLs
    await page.goto(PRODUCTION_URL + "/communications/email-inbox");
    await page.waitForTimeout(3000);

    // Check what's on the page
    const pageContent = await page.textContent("body");
    console.log("\nPage contains 'Email Inbox':", pageContent?.includes("Email Inbox"));
    console.log("Page contains 'No emails':", pageContent?.includes("No emails"));
    console.log("Page contains 'Compose':", pageContent?.includes("Compose"));

    // Click Compose button
    console.log("\n=== OPENING COMPOSE MODAL ===\n");
    const composeButton = page.locator('button:has-text("Compose")');
    if (await composeButton.isVisible()) {
      await composeButton.click();
      await page.waitForTimeout(1000);

      // Fill email form
      console.log("\n=== FILLING EMAIL FORM ===\n");

      const toInput = page.locator('input[type="email"]').last();
      if (await toInput.isVisible()) {
        await toInput.fill("test@example.com");
        console.log("Filled 'to' field");
      }

      const subjectInput = page.locator('input[placeholder*="subject" i], input[placeholder*="Subject" i]');
      if (await subjectInput.isVisible()) {
        await subjectInput.fill("Test Email Subject");
        console.log("Filled 'subject' field");
      } else {
        // Try finding by label
        const subjectLabel = page.locator('label:has-text("Subject")');
        if (await subjectLabel.isVisible()) {
          const input = subjectLabel.locator('~ input, + input, + div input');
          await input.fill("Test Email Subject");
          console.log("Filled 'subject' field via label");
        }
      }

      const bodyTextarea = page.locator('textarea[placeholder*="message" i], textarea[placeholder*="Type" i]');
      if (await bodyTextarea.isVisible()) {
        await bodyTextarea.fill("This is a test email body content.");
        console.log("Filled 'body' field");
      }

      // Click Send button
      console.log("\n=== ATTEMPTING TO SEND ===\n");
      const sendButton = page.locator('button:has-text("Send Email"), button:has-text("Send")').last();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log("Clicked Send button");
        await page.waitForTimeout(3000);
      }
    } else {
      console.log("Compose button not visible");
    }

    // Print all API calls
    console.log("\n=== ALL API CALLS ===\n");
    apiCalls.forEach((call) => {
      const marker = call.status >= 400 ? "❌" : "✓";
      console.log(`${marker} ${call.method} ${call.url} -> ${call.status}`);
      if (call.body) {
        console.log(`   Body: ${call.body.substring(0, 300)}`);
      }
    });

    // Filter for email-related calls
    console.log("\n=== EMAIL-RELATED API CALLS ===\n");
    const emailCalls = apiCalls.filter(c =>
      c.url.includes("email") ||
      c.url.includes("communications")
    );
    emailCalls.forEach((call) => {
      const marker = call.status >= 400 ? "❌" : "✓";
      console.log(`${marker} ${call.method} ${call.url} -> ${call.status}`);
      if (call.body) {
        console.log(`   Body: ${call.body}`);
      }
    });

    // Summary
    console.log("\n=== SUMMARY ===\n");
    const errors = apiCalls.filter(c => c.status >= 400);
    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`Error responses: ${errors.length}`);

    const has404 = errors.some(c => c.status === 404);
    const has422 = errors.some(c => c.status === 422);
    console.log(`Has 404 errors: ${has404}`);
    console.log(`Has 422 errors: ${has422}`);

    // Check for toast messages
    const toasts = page.locator('[role="alert"]');
    const toastCount = await toasts.count();
    console.log(`Toast messages visible: ${toastCount}`);
    if (toastCount > 0) {
      for (let i = 0; i < toastCount; i++) {
        const text = await toasts.nth(i).textContent();
        console.log(`  Toast ${i + 1}: ${text}`);
      }
    }
  });
});

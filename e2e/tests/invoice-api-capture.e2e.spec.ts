/**
 * Capture invoice API response
 */
import { test, expect } from "@playwright/test";

test("capture invoice API response", async ({ page }) => {
  // Capture network responses
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/v2/invoices")) {
      const status = response.status();
      console.log(`API Response: ${status} ${url}`);
      try {
        const body = await response.text();
        console.log(`Body: ${body.substring(0, 1000)}`);
      } catch (e) {
        console.log(`Could not get body`);
      }
    }
  });

  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Navigate to invoices
  await page.goto("https://react.ecbtx.com/invoices");
  await page.waitForTimeout(5000);
});

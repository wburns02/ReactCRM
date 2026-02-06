/**
 * Debug test to capture invoice API errors
 */
import { test, expect } from "@playwright/test";

test("debug invoice API response", async ({ page }) => {
  // Capture network responses
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/invoices")) {
      console.log(`Response: ${response.status()} ${url}`);
      try {
        const body = await response.text();
        console.log(`Body: ${body.substring(0, 500)}`);
      } catch (e) {
        console.log(`Could not get body: ${e}`);
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

  // Screenshot
  await page.screenshot({
    path: "e2e/screenshots/invoice-debug.png",
    fullPage: true,
  });

  // Check for error message
  const errorText = await page.locator("text=Error").textContent().catch(() => null);
  console.log("Error text:", errorText);

  const pageContent = await page.textContent("body");
  console.log("Page content (first 500 chars):", pageContent?.substring(0, 500));
});

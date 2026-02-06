import { test } from "@playwright/test";

/**
 * Capture console logs from TimeEntryList component
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Timesheets Console Logs", () => {
  test("capture debug logs from pending approval tab", async ({ page }) => {
    const consoleLogs: string[] = [];

    // Capture ALL console messages
    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[${msg.type()}] ${text}`);
    });

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`, { timeout: 20000 });
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 20000 });
    await page.evaluate(() => localStorage.setItem("crm_onboarding_completed", "true"));
    console.log("✅ Logged in\n");

    // Navigate to timesheets
    console.log("📄 Navigating to Timesheets...");
    await page.goto(`${BASE_URL}/timesheets`, { timeout: 20000 });
    await page.waitForTimeout(3000);

    // Click Pending Approval tab
    console.log("\n📑 Clicking Pending Approval tab...");
    await page.click('button:has-text("Pending Approval")');
    await page.waitForTimeout(5000);

    // Filter for TimeEntryList debug logs
    console.log("\n" + "=".repeat(80));
    console.log("TimeEntryList DEBUG LOGS");
    console.log("=".repeat(80));

    const debugLogs = consoleLogs.filter(log => log.includes("TimeEntryList render"));
    if (debugLogs.length > 0) {
      debugLogs.forEach(log => console.log(log));
    } else {
      console.log("⚠️  No TimeEntryList debug logs found");
      console.log("\nAll console logs:");
      consoleLogs.slice(-20).forEach(log => console.log(log));
    }

    console.log("=".repeat(80) + "\n");
  });
});

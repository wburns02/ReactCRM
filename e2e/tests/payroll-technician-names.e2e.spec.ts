import { test, expect } from "@playwright/test";

/**
 * Verify technician names display correctly (not UUIDs)
 */

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test("should display technician names instead of UUIDs", async ({ page }) => {
  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Navigate to Payroll page
  await page.goto(`${BASE_URL}/payroll`);
  await page.waitForLoadState("networkidle");

  // Click View on first period
  await page.locator("button:has-text('View')").first().click();
  await page.waitForURL("**/payroll/*", { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click Time Entries tab
  const timeEntriesTab = page.locator("button").filter({ hasText: "Time Entries" });
  await timeEntriesTab.click();
  await page.waitForTimeout(1000);

  // Screenshot for evidence
  await page.screenshot({ path: "e2e/screenshots/payroll-technician-names.png" });

  // Get page content
  const pageContent = await page.content();

  // Check for UUID patterns like "Tech #fe2440c6-2308-4625-ad38-b1933aa0034c"
  const fullUuidPattern = /Tech #[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
  const fullUuidMatches = pageContent.match(fullUuidPattern);

  if (fullUuidMatches && fullUuidMatches.length > 0) {
    console.log("❌ Found full UUIDs:", fullUuidMatches);
    // This is the OLD behavior we're fixing
  }

  // Check if we now have shortened UUIDs (fallback) or actual names
  const shortUuidPattern = /Tech #[a-f0-9]{8}\.\.\./gi;
  const shortUuidMatches = pageContent.match(shortUuidPattern);

  // Get all technician display elements
  const techEntries = page.locator(".bg-bg-muted .font-medium").first();
  const techText = await techEntries.textContent();
  console.log("First time entry technician:", techText);

  // Verify we're NOT showing full UUIDs
  expect(fullUuidMatches).toBeFalsy();

  // If there are time entries, check they show names or shortened UUIDs
  const hasTimeEntries = await page.locator(".bg-bg-muted").count() > 0;
  if (hasTimeEntries) {
    // Should show actual name like "Chris Williams" or shortened fallback
    const entryTexts = await page.locator(".bg-bg-muted .font-medium").allTextContents();
    console.log("All technician entries:", entryTexts);

    for (const text of entryTexts) {
      // Should NOT contain full UUID pattern
      const hasFullUuid = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(text);
      if (hasFullUuid) {
        console.log("❌ Found full UUID in:", text);
      }
      expect(hasFullUuid).toBe(false);
    }
    console.log("✅ No full UUIDs found in technician names");
  } else {
    console.log("ℹ️ No time entries to check");
  }
});

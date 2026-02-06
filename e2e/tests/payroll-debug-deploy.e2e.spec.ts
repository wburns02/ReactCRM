import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const LOGIN_EMAIL = "will@macseptic.com";
const LOGIN_PASSWORD = "#Espn2025";

test("debug: check Time Entries tab content", async ({ page }) => {
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

  // Wait for page to load
  await page.waitForTimeout(1000);

  // Screenshot overview tab
  await page.screenshot({ path: "e2e/screenshots/debug-period-overview.png" });
  console.log("Tabs visible:", await page.locator("button").filter({ hasText: /Time Entries|Overview|Commissions/ }).count());

  // Click Time Entries tab - try multiple selectors
  const timeEntriesTab = page.locator("button").filter({ hasText: "Time Entries" });
  console.log("Time Entries tab count:", await timeEntriesTab.count());

  if (await timeEntriesTab.count() > 0) {
    await timeEntriesTab.click();
    await page.waitForTimeout(1000);
  }

  // Screenshot time entries tab
  await page.screenshot({ path: "e2e/screenshots/debug-period-time-entries.png" });

  // Check for Add Entry button
  const addButton = page.locator("button:has-text('Add Entry')");
  const addButtonCount = await addButton.count();
  console.log("Add Entry button count:", addButtonCount);

  // Get all buttons on page
  const allButtons = await page.locator("button").allTextContents();
  console.log("All buttons on page:", allButtons.filter(b => b.trim()));

  // Check the HTML of the time entries section
  const pageContent = await page.content();
  console.log("Has 'Add Entry' in HTML:", pageContent.includes("Add Entry"));
  console.log("Has 'openAddEntryForm' in HTML:", pageContent.includes("openAddEntryForm"));
});

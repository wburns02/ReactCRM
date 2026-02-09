import { test } from "@playwright/test";

/**
 * Debug schedule calendar dates
 * Check what dates are shown in each column
 */

const BASE_URL = "https://react.ecbtx.com";

test("Debug calendar date columns", async ({ page }) => {
  console.log("\n" + "=".repeat(80));
  console.log("SCHEDULE CALENDAR DATE DEBUG");
  console.log("=".repeat(80) + "\n");

  // Login
  console.log("Step 1: Logging in...");
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, { timeout: 15000 });
  console.log("✓ Logged in\n");

  await page.evaluate(() => {
    localStorage.setItem("crm_onboarding_completed", "true");
  });

  // Go to schedule
  console.log("Step 2: Navigating to Schedule page...");
  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForTimeout(3000);
  console.log("✓ Schedule page loaded\n");

  // Check week range display
  console.log("Step 3: Checking week range...");
  const weekRange = await page.locator("text=/Week of/i, text=/\\w+ \\d+/").first().textContent();
  console.log(`   Week range text: ${weekRange}\n`);

  // Get all calendar day headers (day names + dates)
  console.log("Step 4: Checking calendar column headers...");
  const headers = page.locator('[role="columnheader"], .text-center.text-sm.font-semibold, .grid-cols-7 > div').first();

  // Try to find date headers
  const dayHeaders = page.locator(".grid-cols-7 > div").first();
  const headerCount = await page.locator(".grid-cols-7").count();
  console.log(`   Found ${headerCount} grid-cols-7 elements\n`);

  // Get all text from the first grid
  if (headerCount > 0) {
    const firstGrid = page.locator(".grid-cols-7").first();
    const divs = firstGrid.locator("> div");
    const count = await divs.count();

    console.log(`   Column headers (${count} columns):`);
    for (let i = 0; i < Math.min(count, 7); i++) {
      const text = await divs.nth(i).textContent();
      console.log(`      Column ${i + 1}: ${text?.trim()}`);
    }
  }

  // Take screenshot
  await page.screenshot({ path: "/tmp/schedule-calendar-debug.png", fullPage: true });

  console.log("\n📸 Screenshot: /tmp/schedule-calendar-debug.png\n");
  console.log("=".repeat(80) + "\n");
});

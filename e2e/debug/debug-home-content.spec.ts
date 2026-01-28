import { test } from "@playwright/test";

test("debug home page content", async ({ page }) => {
  await page.goto("/home");
  await page.waitForLoadState("networkidle");
  
  // Get page title
  const title = await page.title();
  console.log("Page title:", title);
  
  // Find all "Texas" text occurrences  
  const texasLocators = page.locator("text=Texas");
  const texasCount = await texasLocators.count();
  console.log("Found", texasCount, "Texas text elements");
  
  for (let i = 0; i < texasCount && i < 10; i++) {
    const text = await texasLocators.nth(i).textContent();
    console.log(`Texas ${i}:`, text?.substring(0, 100));
  }
  
  // Check for MAC Septic
  const macCount = await page.locator("text=MAC Septic").count();
  console.log("MAC Septic count:", macCount);
  
  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/debug-home.png", fullPage: true });
  console.log("Screenshot saved");
});

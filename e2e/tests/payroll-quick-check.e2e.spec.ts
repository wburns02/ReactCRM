import { test, expect } from "@playwright/test";

test("Quick payroll check - View button on cards", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Force reload to get latest JS
  await page.goto("https://react.ecbtx.com/payroll", { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: "test-results/payroll-quick-check.png", fullPage: true });

  // Check page content
  const pageContent = await page.content();
  console.log("Page has 'View' in HTML:", pageContent.includes(">View<"));

  // Check for any buttons
  const allButtons = await page.getByRole("button").all();
  console.log(`Total buttons on page: ${allButtons.length}`);

  for (const btn of allButtons.slice(0, 10)) {
    const text = await btn.innerText().catch(() => "");
    console.log(`  Button: "${text}"`);
  }

  // Specifically look for View button
  const viewButton = page.getByRole("button", { name: "View" });
  const viewCount = await viewButton.count();
  console.log(`View buttons found: ${viewCount}`);
});

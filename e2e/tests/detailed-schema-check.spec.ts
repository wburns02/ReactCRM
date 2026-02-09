import { test } from "@playwright/test";

test("Detailed schema validation check", async ({ page }) => {
  // Capture detailed Zod error messages
  const detailedErrors: any[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[API Schema Violation]")) {
      // Try to extract the full error object
      const args = msg.args();
      Promise.all(args.map(arg => arg.jsonValue())).then(values => {
        detailedErrors.push({
          type: msg.type(),
          text,
          values
        });
      });
    }
  });

  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"));

  // Navigate to schedule
  await page.goto("https://react.ecbtx.com/schedule");
  await page.waitForTimeout(5000);

  // Log detailed errors
  console.log("\n=== DETAILED SCHEMA ERRORS ===");
  detailedErrors.forEach((err, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log("Text:", err.text);
    console.log("Values:", JSON.stringify(err.values, null, 2));
  });

  // Also check browser console for the formatted error
  const consoleLogs = await page.evaluate(() => {
    return (window as any).__schemaErrors || "No errors captured";
  });
  console.log("\n=== BROWSER CONSOLE SCHEMA ERRORS ===");
  console.log(consoleLogs);
});

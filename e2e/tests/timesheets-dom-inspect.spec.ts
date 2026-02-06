import { test, expect } from "@playwright/test";

/**
 * Inspect DOM structure to see what's rendering
 */

test.use({ storageState: "/home/will/ReactCRM/.auth/user.json" });

test.describe("Timesheets DOM Inspection", () => {
  test("check what HTML is actually rendered", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/timesheets");
    await page.waitForTimeout(2000);

    // Click pending approval tab
    await page.click('button:has-text("Pending Approval")');
    await page.waitForTimeout(3000);

    // Check DOM structure
    const cardContent = await page.locator('text="Pending Approval"').locator('..').locator('..').innerHTML();
    console.log("\n" + "=".repeat(80));
    console.log("CARD CONTENT HTML:");
    console.log("=".repeat(80));
    console.log(cardContent);

    // Check for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    console.log("\n" + "=".repeat(80));
    console.log("CONSOLE ERRORS:");
    console.log("=".repeat(80));
    if (errors.length > 0) {
      errors.forEach((err) => console.log(`  - ${err}`));
    } else {
      console.log("  (none)");
    }

    // Check if table exists
    const tableExists = await page.locator("table").count();
    console.log("\n" + "=".repeat(80));
    console.log(`TABLE ELEMENTS FOUND: ${tableExists}`);
    console.log("=".repeat(80));

    // Check tbody tr count
    const rowCount = await page.locator("table tbody tr").count();
    console.log(`TBODY TR COUNT: ${rowCount}`);

    // Check if there's a loading state
    const loadingExists = await page.locator('text=/loading/i').count();
    console.log(`LOADING INDICATOR: ${loadingExists > 0 ? "YES" : "NO"}`);

    // Check if there's an error message
    const errorMsg = await page.locator('text=/error/i').count();
    console.log(`ERROR MESSAGE: ${errorMsg > 0 ? "YES" : "NO"}`);

    // Check for "No entries" message
    const noEntries = await page.locator('text=/no.*entries/i').count();
    console.log(`"NO ENTRIES" MESSAGE: ${noEntries > 0 ? "YES" : "NO"}`);

    console.log("=".repeat(80) + "\n");
  });
});

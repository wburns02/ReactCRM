import { test } from "@playwright/test";

test("Check raw API values causing validation failures", async ({ page }) => {
  const apiResponses: any[] = [];

  page.on("response", async (response) => {
    if (response.url().includes("/work-orders") && response.status() === 200) {
      try {
        const data = await response.json();
        apiResponses.push(data);
      } catch (e) {}
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

  // Check problematic items
  console.log("\n=== CHECKING PROBLEMATIC WORK ORDERS ===");

  apiResponses.forEach((resp, respIdx) => {
    if (resp.items && Array.isArray(resp.items)) {
      resp.items.forEach((item: any, itemIdx: number) => {
        // Check total_amount
        if (item.total_amount !== null && item.total_amount !== undefined) {
          const type = typeof item.total_amount;
          if (type !== "number" && type !== "string") {
            console.log(`\n❌ Item ${itemIdx} has invalid total_amount:`);
            console.log(`  Type: ${type}`);
            console.log(`  Value: ${JSON.stringify(item.total_amount)}`);
            console.log(`  Work Order ID: ${item.id}`);
          }
        }

        // Check status
        const validStatuses = ["draft", "scheduled", "confirmed", "enroute", "on_site", "in_progress", "completed", "canceled", "requires_followup"];
        if (item.status && !validStatuses.includes(item.status)) {
          console.log(`\n❌ Item ${itemIdx} has invalid status:`);
          console.log(`  Status: ${item.status}`);
          console.log(`  Type: ${typeof item.status}`);
          console.log(`  Work Order ID: ${item.id}`);
        }

        // Log all statuses and total_amounts for inspection
        if (itemIdx < 5) {
          console.log(`\nItem ${itemIdx}:`);
          console.log(`  ID: ${item.id}`);
          console.log(`  status: ${item.status} (${typeof item.status})`);
          console.log(`  total_amount: ${item.total_amount} (${typeof item.total_amount})`);
        }
      });
    }
  });
});

import { test, expect } from "@playwright/test";

test("Quick check - Schedule performance with date filtering", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), {
    timeout: 10000,
  });

  // Track API requests
  const apiRequests: { url: string; params: any }[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/work-orders")) {
      const url = new URL(request.url());
      const params = Object.fromEntries(url.searchParams.entries());
      apiRequests.push({ url: request.url(), params });
    }
  });

  // Navigate to schedule
  await page.goto("https://react.ecbtx.com/schedule");
  await page.waitForTimeout(3000);

  // Clear requests
  apiRequests.length = 0;

  // Click Next Week and measure time
  console.log("\n=== TESTING WEEK NAVIGATION ===");

  // Wait for any pending requests to finish
  await page.waitForLoadState('networkidle');

  const start = Date.now();
  await page.click('text="Next →"');

  // Wait for the new data to load (spinner to appear and disappear)
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  const elapsed = Date.now() - start;

  // Extra wait to ensure all requests complete
  await page.waitForTimeout(1000);

  console.log(`Navigation time: ${elapsed}ms`);
  console.log(`API requests made: ${apiRequests.length}`);

  // Check if date filtering is being used
  apiRequests.forEach((req, i) => {
    console.log(`\nRequest ${i + 1}:`);
    console.log(`  URL: ${req.url}`);
    console.log(`  Has scheduled_date_from: ${!!req.params.scheduled_date_from}`);
    console.log(`  Has scheduled_date_to: ${!!req.params.scheduled_date_to}`);
    console.log(`  scheduled_date_from: ${req.params.scheduled_date_from || "N/A"}`);
    console.log(`  scheduled_date_to: ${req.params.scheduled_date_to || "N/A"}`);
    console.log(`  page_size: ${req.params.page_size || "N/A"}`);
  });

  // Verify date filtering is active
  const hasDateFiltering = apiRequests.some(
    (req) => req.params.scheduled_date_from && req.params.scheduled_date_to
  );

  console.log(`\n=== RESULTS ===`);
  console.log(`Date filtering active: ${hasDateFiltering ? "YES ✓" : "NO ✗"}`);
  console.log(`Navigation time: ${elapsed}ms ${elapsed < 1000 ? "✓" : "✗ (too slow)"}`);

  expect(hasDateFiltering).toBe(true);
  expect(elapsed).toBeLessThan(2000); // Should be much faster, but giving buffer
});

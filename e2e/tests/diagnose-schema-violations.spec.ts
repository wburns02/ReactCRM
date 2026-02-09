import { test, expect } from "@playwright/test";

test("Diagnose work-orders schema violations", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), {
    timeout: 10000,
  });

  // Capture console errors and API responses
  const consoleErrors: string[] = [];
  const apiResponses: { url: string; data: any }[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" && msg.text().includes("[API Schema Violation]")) {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", async (response) => {
    if (response.url().includes("/work-orders") && response.status() === 200) {
      try {
        const data = await response.json();
        apiResponses.push({ url: response.url(), data });
      } catch (e) {
        // Ignore non-JSON responses
      }
    }
  });

  // Navigate to schedule (triggers work-orders API call)
  await page.goto("https://react.ecbtx.com/schedule");
  await page.waitForTimeout(5000); // Wait for API calls to complete

  // Log findings
  console.log("\n=== CONSOLE ERRORS ===");
  consoleErrors.forEach((err, i) => {
    console.log(`\nError ${i + 1}:`, err);
  });

  console.log("\n=== API RESPONSES ===");
  apiResponses.forEach((resp, i) => {
    console.log(`\nResponse ${i + 1}:`, resp.url);

    // Check structure
    if (resp.data) {
      console.log("Response type:", Array.isArray(resp.data) ? "Array" : "Object");

      if (Array.isArray(resp.data)) {
        console.log("Array length:", resp.data.length);
        if (resp.data.length > 0) {
          console.log("First item keys:", Object.keys(resp.data[0]));
          console.log("First item sample:", JSON.stringify(resp.data[0], null, 2).slice(0, 500));
        }
      } else if (resp.data.items) {
        console.log("Paginated response - items length:", resp.data.items.length);
        console.log("Pagination:", {
          total: resp.data.total,
          page: resp.data.page,
          page_size: resp.data.page_size,
        });
        if (resp.data.items.length > 0) {
          console.log("First item keys:", Object.keys(resp.data.items[0]));

          // Check for fields that might be causing validation issues
          const firstItem = resp.data.items[0];
          console.log("\n=== CHECKING COMMON VALIDATION ISSUES ===");
          console.log("customer_id type:", typeof firstItem.customer_id, "value:", firstItem.customer_id);
          console.log("scheduled_date type:", typeof firstItem.scheduled_date, "value:", firstItem.scheduled_date);
          console.log("time_window_start type:", typeof firstItem.time_window_start, "value:", firstItem.time_window_start);
          console.log("estimated_duration_hours type:", typeof firstItem.estimated_duration_hours, "value:", firstItem.estimated_duration_hours);
          console.log("status:", firstItem.status);
          console.log("job_type:", firstItem.job_type);
          console.log("priority:", firstItem.priority);

          // Check for unexpected null/undefined fields
          console.log("\n=== NULL/UNDEFINED FIELDS ===");
          Object.entries(firstItem).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              console.log(`${key}: ${value}`);
            }
          });
        }
      }
    }
  });

  console.log("\n=== SUMMARY ===");
  console.log("Total schema violations:", consoleErrors.length);
  console.log("Total API responses captured:", apiResponses.length);
});

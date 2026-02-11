import { test, expect, type Page } from "@playwright/test";

/**
 * CRM-Wide Schema Violation Check
 *
 * Navigates to key pages and checks for [API Schema Violation] console errors.
 * Identifies which endpoints still have schema drift.
 */

const APP_URL = "https://react.ecbtx.com";

async function login(page: Page) {
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), {
    timeout: 15000,
  });
}

const PAGES_TO_CHECK = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Customers", path: "/customers" },
  { name: "Prospects", path: "/prospects" },
  { name: "Work Orders", path: "/work-orders" },
  { name: "Invoices", path: "/invoices" },
  { name: "Payments", path: "/payments" },
  { name: "Technicians", path: "/technicians" },
  { name: "Schedule", path: "/schedule" },
  { name: "Estimates", path: "/estimates" },
  { name: "Payroll", path: "/payroll" },
];

test("CRM-wide schema violation audit", async ({ page }) => {
  const violations: Record<string, string[]> = {};

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (text.includes("[API Schema Violation]")) {
        // Extract endpoint from message
        const match = text.match(/\[API Schema Violation\] ([^:]+)/);
        const endpoint = match ? match[1] : "unknown";
        if (!violations[endpoint]) violations[endpoint] = [];
        violations[endpoint].push(text.substring(0, 200));
      }
    }
  });

  await login(page);

  for (const { name, path } of PAGES_TO_CHECK) {
    console.log(`\nChecking ${name} (${path})...`);
    await page.goto(`${APP_URL}${path}`);
    await page.waitForTimeout(3000);
    console.log(`  Done loading ${name}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("SCHEMA VIOLATION AUDIT RESULTS");
  console.log("=".repeat(60));

  const endpoints = Object.keys(violations);
  if (endpoints.length === 0) {
    console.log("\nZERO schema violations found across all pages!");
  } else {
    console.log(`\nFound violations on ${endpoints.length} endpoint(s):\n`);
    for (const [endpoint, msgs] of Object.entries(violations)) {
      console.log(`  ${endpoint}: ${msgs.length} violation(s)`);
      console.log(`    Sample: ${msgs[0].substring(0, 150)}...`);
    }
  }

  console.log("\n" + "=".repeat(60));
});

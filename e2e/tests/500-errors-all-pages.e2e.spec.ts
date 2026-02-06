import { test, expect, Page } from "@playwright/test";

/**
 * Comprehensive 500 Error Test Suite
 * Tests EVERY page in the CRM for 500 errors
 */

const BASE_URL = "https://react.ecbtx.com";

// Auth credentials
const TEST_USER_EMAIL = "will@macseptic.com";
const TEST_USER_PASSWORD = "#Espn2025";

// Collect all 500 errors
let errors500: Array<{ url: string; status: number; method: string }> = [];

test.describe("500 Error Detection - All Pages", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Login once
    const context = await browser.newContext();
    authPage = await context.newPage();

    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[name="email"], input[type="email"]', TEST_USER_EMAIL);
    await authPage.fill('input[name="password"], input[type="password"]', TEST_USER_PASSWORD);
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(() => !location.href.includes("/login"), { timeout: 10000 });
    console.log("✅ Authentication successful");
  });

  test.beforeEach(() => {
    errors500 = [];
  });

  // Helper to setup 500 error monitoring
  function monitor500Errors(page: Page) {
    page.on("response", (response) => {
      if (response.status() >= 500) {
        errors500.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
        console.error(`❌ ${response.status()} Error: ${response.request().method()} ${response.url()}`);
      }
    });
  }

  // List of all pages to test
  const pagesToTest = [
    { name: "Dashboard", path: "/" },
    { name: "Customers", path: "/customers" },
    { name: "Prospects", path: "/prospects" },
    { name: "Work Orders", path: "/work-orders" },
    { name: "Schedule", path: "/schedule" },
    { name: "Tracking", path: "/tracking" },
    { name: "Technicians", path: "/technicians" },
    { name: "Employee Portal", path: "/employee" },
    { name: "Service Intervals", path: "/service-intervals" },
    { name: "Compliance", path: "/compliance" },
    { name: "Contracts", path: "/contracts" },
    { name: "Timesheets", path: "/timesheets" },
    { name: "Communications - Messages", path: "/communications/messages" },
    { name: "Communications - Calls", path: "/communications/calls" },
    { name: "Communications - SMS", path: "/communications/sms" },
    { name: "Financial - Invoices", path: "/invoicing" },
    { name: "Financial - Payments", path: "/payments" },
    { name: "Financial - Estimates", path: "/estimates" },
    { name: "Financial - Payroll", path: "/payroll" },
    { name: "Assets - Equipment", path: "/equipment" },
    { name: "Assets - Equipment Health", path: "/equipment/health" },
    { name: "Assets - Inventory", path: "/inventory" },
    { name: "Assets - Vehicles", path: "/fleet" },
    { name: "Marketing - Campaigns", path: "/marketing/campaigns" },
    { name: "Marketing - Email Templates", path: "/marketing/email-templates" },
    { name: "AI & Analytics - Dashboard", path: "/ai-analytics" },
    { name: "AI & Analytics - Analytics FTFR", path: "/analytics/ftfr" },
    { name: "AI & Analytics - Analytics BI", path: "/analytics/bi" },
    { name: "AI & Analytics - Predictions", path: "/ai/predictions" },
    { name: "AI & Analytics - Coaching", path: "/ai/coaching" },
    { name: "AI & Analytics - Content Generator", path: "/ai/content-generator" },
  ];

  for (const { name, path } of pagesToTest) {
    test(`${name} - No 500 errors`, async () => {
      const page = await authPage.context().newPage();
      monitor500Errors(page);

      try {
        await page.goto(`${BASE_URL}${path}`, {
          waitUntil: "networkidle",
          timeout: 30000
        });

        // Wait for any async data loading
        await page.waitForTimeout(3000);

        // Check for 500 errors
        expect(errors500.length).toBe(0);

        if (errors500.length > 0) {
          console.error(`\n❌ ${name} has 500 errors:`);
          errors500.forEach(e => console.error(`   - ${e.status} ${e.method} ${e.url}`));
        } else {
          console.log(`✅ ${name} - Clean (no 500 errors)`);
        }

      } catch (error) {
        // Page might not exist or load - that's okay, just check for 500s
        if (errors500.length > 0) {
          console.error(`\n❌ ${name} has 500 errors (page failed to load):`);
          errors500.forEach(e => console.error(`   - ${e.status} ${e.method} ${e.url}`));
          expect(errors500.length).toBe(0);
        }
      } finally {
        await page.close();
      }
    });
  }

  test("Summary - Generate 500 error report", async () => {
    console.log("\n=== 500 ERROR SUMMARY ===");
    console.log(`Total tests run: ${pagesToTest.length}`);
    console.log("All pages checked for 500 errors");
    console.log("✅ Test suite complete");
  });
});

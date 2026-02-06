import { test, expect } from "@playwright/test";

/**
 * Comprehensive 500 Error Scanner
 *
 * Scans EVERY page in the CRM and reports ALL 500 errors
 */

const BASE_URL = "https://react.ecbtx.com";

const ALL_PAGES = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Schedule", path: "/schedule" },
  { name: "Customers", path: "/customers" },
  { name: "Work Orders", path: "/work-orders" },
  { name: "Invoices", path: "/invoices" },
  { name: "Estimates", path: "/estimates" },
  { name: "Payments", path: "/payments" },
  { name: "Analytics", path: "/analytics" },
  { name: "Reports", path: "/reports" },
  { name: "Technicians", path: "/technicians" },
  { name: "Fleet", path: "/fleet" },
  { name: "Tracking", path: "/tracking" },
  { name: "Permits", path: "/permits" },
  { name: "Communications", path: "/communications" },
  { name: "Marketing", path: "/marketing" },
  { name: "Payroll", path: "/payroll" },
  { name: "Settings", path: "/settings" },
  { name: "AI Coaching", path: "/ai-coaching" },
  { name: "Job Costing", path: "/job-costing" },
  { name: "Inventory", path: "/inventory" },
];

test.describe("500 Error Scanner", () => {
  test("scan all pages for 500 errors", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    const allErrors: {
      page: string;
      url: string;
      status: number;
      method: string;
      body?: any;
    }[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("SCANNING ALL PAGES FOR 500 ERRORS");
    console.log("=".repeat(80) + "\n");

    for (const pageInfo of ALL_PAGES) {
      console.log(`\n📄 Scanning: ${pageInfo.name} (${pageInfo.path})`);

      const pageErrors: typeof allErrors = [];

      // Track 500 errors
      const responseHandler = async (res: any) => {
        if (res.status() >= 500) {
          let body;
          try {
            body = await res.json();
          } catch (e) {
            try {
              body = await res.text();
            } catch (e2) {
              body = null;
            }
          }

          const error = {
            page: pageInfo.name,
            url: res.url(),
            status: res.status(),
            method: res.request().method(),
            body,
          };

          pageErrors.push(error);
          allErrors.push(error);
        }
      };

      page.on("response", responseHandler);

      try {
        await page.goto(`${BASE_URL}${pageInfo.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        await page.waitForTimeout(3000); // Let API calls complete
      } catch (e: any) {
        console.log(`   ⚠️  Navigation error: ${e.message}`);
      }

      page.off("response", responseHandler);

      if (pageErrors.length === 0) {
        console.log(`   ✅ No 500 errors`);
      } else {
        console.log(`   ❌ Found ${pageErrors.length} error(s):`);
        pageErrors.forEach((err) => {
          console.log(`      ${err.method} ${err.url}`);
          console.log(`      Status: ${err.status}`);
          if (err.body) {
            console.log(`      Body: ${JSON.stringify(err.body).slice(0, 200)}`);
          }
        });
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total pages scanned: ${ALL_PAGES.length}`);
    console.log(`Total 500 errors found: ${allErrors.length}`);

    if (allErrors.length > 0) {
      console.log("\n❌ ERRORS BY ENDPOINT:\n");

      // Group by URL
      const errorsByUrl = new Map<string, typeof allErrors>();
      allErrors.forEach((err) => {
        const key = `${err.method} ${err.url.split("?")[0]}`;
        if (!errorsByUrl.has(key)) {
          errorsByUrl.set(key, []);
        }
        errorsByUrl.get(key)!.push(err);
      });

      errorsByUrl.forEach((errors, endpoint) => {
        console.log(`\n${endpoint}`);
        console.log(`  Occurrences: ${errors.length}`);
        console.log(`  Affected pages: ${[...new Set(errors.map((e) => e.page))].join(", ")}`);
        if (errors[0].body) {
          console.log(`  Error: ${JSON.stringify(errors[0].body).slice(0, 300)}`);
        }
      });

      console.log("\n" + "=".repeat(80));
      expect(allErrors.length).toBe(0); // Fail the test
    } else {
      console.log("\n✅ NO 500 ERRORS FOUND!\n");
    }
  });
});

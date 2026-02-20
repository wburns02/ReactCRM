import { test, expect, Page } from "@playwright/test";

/**
 * Full CRM Site Crawl & Error Audit
 * Navigates every major page, captures console errors, network failures, and UI broken states.
 */

const APP_URL = "https://react.ecbtx.com";

// Known noise to filter out
const KNOWN_NOISE = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "Download the React DevTools",
  "third-party cookie",
  "net::ERR_",
  // WebSocket reconnection noise — WS connects/retries on every page load
  "WebSocket connection to",
  "[WebSocket]",
  "wss://",
];

interface PageResult {
  path: string;
  status: "ok" | "error" | "crash";
  consoleErrors: string[];
  consoleWarnings: string[];
  networkFailures: { url: string; status: number; method: string }[];
  loadTimeMs: number;
  title: string;
  hasContent: boolean;
}

// All protected pages to crawl (no dynamic :id routes - those need real IDs)
const PAGES = [
  "/dashboard",
  "/command-center",
  "/customers",
  "/prospects",
  "/customer-success",
  "/work-orders",
  "/work-orders/calendar",
  "/work-orders/board",
  "/work-orders/map",
  "/schedule",
  "/technicians",
  "/service-intervals",
  "/employee",
  "/payroll",
  "/communications",
  "/communications/sms",
  "/communications/email-inbox",
  "/communications/templates",
  "/communications/reminders",
  "/phone",
  "/calls",
  "/call-intelligence",
  "/billing/overview",
  "/invoices",
  "/estimates",
  "/payments",
  "/billing/payment-plans",
  "/reports",
  "/reports/revenue",
  "/reports/technicians",
  "/reports/clv",
  "/reports/service",
  "/reports/location",
  "/analytics/ftfr",
  "/analytics/bi",
  "/analytics/operations",
  "/analytics/financial",
  "/analytics/performance",
  "/analytics/insights",
  "/equipment",
  "/equipment/health",
  "/inventory",
  "/fleet",
  "/tracking",
  "/tracking/dispatch",
  "/predictive-maintenance",
  "/compliance",
  "/permits",
  "/contracts",
  "/timesheets",
  "/job-costing",
  "/marketing",
  "/marketing/ads",
  "/marketing/reviews",
  "/marketing/ai-content",
  "/users",
  "/admin",
  "/admin/import",
  "/admin/dump-sites",
  "/integrations",
  "/notifications",
  "/settings/notifications",
  "/settings/sms",
  "/tickets",
  "/ai-assistant",
  "/help",
];

function isNoise(msg: string): boolean {
  return KNOWN_NOISE.some((n) => msg.includes(n));
}

test.describe.serial("Full CRM Site Crawl", () => {
  let page: Page;
  const results: PageResult[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();

    // Login with retry for rate limiting
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');

      try {
        await page.waitForFunction(
          () => !window.location.href.includes("/login"),
          { timeout: 15000 }
        );
        break; // success
      } catch {
        console.log(`Login attempt ${attempt + 1} failed (likely rate limited), waiting 60s...`);
        if (attempt < 4) await page.waitForTimeout(60000);
        else throw new Error("Login failed after 5 attempts");
      }
    }
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    // Print aggregated report
    console.log("\n" + "=".repeat(80));
    console.log("FULL CRM CRAWL REPORT");
    console.log("=".repeat(80));
    console.log(`Total pages crawled: ${results.length}`);

    const errorPages = results.filter(
      (r) =>
        r.consoleErrors.length > 0 ||
        r.networkFailures.length > 0 ||
        r.status === "crash"
    );
    const cleanPages = results.filter(
      (r) =>
        r.consoleErrors.length === 0 &&
        r.networkFailures.length === 0 &&
        r.status === "ok"
    );

    console.log(`Clean pages: ${cleanPages.length}`);
    console.log(`Pages with issues: ${errorPages.length}`);
    console.log("-".repeat(80));

    // Summary of all errors
    if (errorPages.length > 0) {
      console.log("\nPAGES WITH ISSUES:\n");
      for (const r of errorPages) {
        console.log(`  ${r.path} [${r.status}] (${r.loadTimeMs}ms)`);
        for (const e of r.consoleErrors) {
          console.log(`    ❌ CONSOLE: ${e.substring(0, 200)}`);
        }
        for (const n of r.networkFailures) {
          console.log(`    🔴 ${n.method} ${n.status}: ${n.url.substring(0, 150)}`);
        }
        if (!r.hasContent) {
          console.log(`    ⚠️  NO CONTENT (blank page)`);
        }
      }
    }

    // Network failure summary grouped by endpoint
    const allNetworkFailures = results.flatMap((r) =>
      r.networkFailures.map((n) => ({ ...n, page: r.path }))
    );
    if (allNetworkFailures.length > 0) {
      console.log("\n" + "-".repeat(80));
      console.log("NETWORK FAILURES BY ENDPOINT:\n");
      const byUrl = new Map<string, { status: number; pages: string[] }>();
      for (const f of allNetworkFailures) {
        // Strip query params for grouping
        const cleanUrl = f.url.split("?")[0];
        const key = `${f.method} ${f.status} ${cleanUrl}`;
        if (!byUrl.has(key)) {
          byUrl.set(key, { status: f.status, pages: [] });
        }
        byUrl.get(key)!.pages.push(f.page);
      }
      for (const [key, val] of byUrl) {
        console.log(`  ${key}`);
        console.log(`    Pages: ${[...new Set(val.pages)].join(", ")}`);
      }
    }

    // Console error summary
    const allErrors = results.flatMap((r) =>
      r.consoleErrors.map((e) => ({ error: e, page: r.path }))
    );
    if (allErrors.length > 0) {
      console.log("\n" + "-".repeat(80));
      console.log(`UNIQUE CONSOLE ERRORS (${allErrors.length} total):\n`);
      const unique = new Map<string, string[]>();
      for (const e of allErrors) {
        const short = e.error.substring(0, 120);
        if (!unique.has(short)) unique.set(short, []);
        unique.get(short)!.push(e.page);
      }
      for (const [err, pages] of unique) {
        console.log(`  ${err}`);
        console.log(`    Pages: ${[...new Set(pages)].join(", ")}`);
      }
    }

    // Clean pages
    if (cleanPages.length > 0) {
      console.log("\n" + "-".repeat(80));
      console.log("CLEAN PAGES:\n");
      for (const r of cleanPages) {
        console.log(`  ✅ ${r.path} (${r.loadTimeMs}ms)`);
      }
    }

    console.log("\n" + "=".repeat(80));

    await page.context().close();
  });

  for (const path of PAGES) {
    test(`crawl ${path}`, async () => {
      const result: PageResult = {
        path,
        status: "ok",
        consoleErrors: [],
        consoleWarnings: [],
        networkFailures: [],
        loadTimeMs: 0,
        title: "",
        hasContent: true,
      };

      // Collect console errors
      const consoleHandler = (msg: any) => {
        const text = msg.text();
        if (isNoise(text)) return;
        if (msg.type() === "error") {
          result.consoleErrors.push(text);
        } else if (msg.type() === "warning") {
          result.consoleWarnings.push(text);
        }
      };
      page.on("console", consoleHandler);

      // Collect network failures (4xx/5xx on API calls)
      const responseHandler = (response: any) => {
        const status = response.status();
        const url = response.url();
        if (
          status >= 400 &&
          (url.includes("/api/") || url.includes("railway.app"))
        ) {
          // Skip 401 on initial load (expected before auth)
          if (status === 401) return;
          // Skip 404 on optional endpoints
          const method =
            response.request().method?.() ||
            response.request().method ||
            "GET";
          result.networkFailures.push({ url, status, method });
        }
      };
      page.on("response", responseHandler);

      const start = Date.now();

      try {
        await page.goto(`${APP_URL}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        // Wait for dynamic content
        await page.waitForTimeout(3000);

        result.title = await page.title();

        // Check if page has meaningful content (not just empty shell)
        const bodyText = await page.evaluate(
          () => document.body?.innerText?.length || 0
        );
        result.hasContent = bodyText > 50;

        // Check for React error boundaries
        const errorBoundary = await page
          .locator("text=Something went wrong")
          .count();
        if (errorBoundary > 0) {
          result.consoleErrors.push("React Error Boundary triggered");
          result.status = "crash";
        }

        // Check for blank/loading stuck states
        const spinner = await page.locator(".animate-spin").count();
        if (spinner > 0 && !result.hasContent) {
          result.consoleErrors.push(
            "Page stuck in loading state (spinner visible, no content)"
          );
        }
      } catch (e: any) {
        result.status = "crash";
        result.consoleErrors.push(`Navigation error: ${e.message}`);
      }

      result.loadTimeMs = Date.now() - start;

      // Remove listeners
      page.removeListener("console", consoleHandler);
      page.removeListener("response", responseHandler);

      results.push(result);

      // Soft assertion: annotate crashes but don't stop the crawl.
      // The afterAll report summarizes all issues. Individual page crashes
      // are logged as annotations, not hard failures, so all 67 pages run.
      if (result.status === "crash") {
        test.info().annotations.push({
          type: "crash",
          description: `${path} → ${result.consoleErrors.slice(0, 2).join("; ")}`,
        });
        // Hard-fail only on React Error Boundary (real app crash, not just API 5xx)
        const isReactCrash = result.consoleErrors.some((e) =>
          e.includes("React Error Boundary")
        );
        expect(
          isReactCrash,
          `React Error Boundary on ${path}: ${result.consoleErrors.join("; ")}`
        ).toBe(false);
      }
    });
  }
});

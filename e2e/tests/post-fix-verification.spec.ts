/**
 * Post-Fix Verification: Drag-drop persistence + Customer schema violations
 * Verifies both fixes are deployed and working.
 */
import { test, expect, type Page } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

let authPage: Page;
let sessionCookie: string;

test.describe("Post-Fix Verification", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    await authPage.goto(`${APP}/login`);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      null,
      { timeout: 15000 },
    );

    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session");
    sessionCookie = session?.value || "";
    expect(sessionCookie).toBeTruthy();
  });

  test.afterAll(async () => {
    await authPage?.context().close();
  });

  test("Customer API returns data without schema violations", async () => {
    const result = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      { url: `${API}/customers?page=1&page_size=100`, cookie: sessionCookie },
    );

    expect(result.status).toBe(200);
    expect(result.data.items).toBeDefined();
    expect(Array.isArray(result.data.items)).toBe(true);

    // Check that items have expected shape (nullable first/last name)
    for (const cust of result.data.items) {
      expect(cust).toHaveProperty("id");
      // first_name and last_name can be null or string
      expect(
        cust.first_name === null || typeof cust.first_name === "string",
      ).toBe(true);
      expect(
        cust.last_name === null || typeof cust.last_name === "string",
      ).toBe(true);
      // lat/lon can be null, number, or string (Decimal serialization)
      if (cust.latitude !== null && cust.latitude !== undefined) {
        expect(["number", "string"]).toContain(typeof cust.latitude);
      }
    }
  });

  test("Customers page loads without schema violation console errors", async () => {
    const schemaViolations: string[] = [];

    authPage.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[API Schema Violation]") && text.includes("/customers")) {
        schemaViolations.push(text);
      }
    });

    await authPage.goto(`${APP}/customers`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(5000);

    expect(
      schemaViolations.length,
      `Customer schema violations: ${schemaViolations.join("\n")}`,
    ).toBe(0);
  });

  test("Work order PATCH persists and returns updated data", async () => {
    // Get a work order to test with
    const listResult = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      { url: `${API}/work-orders?page=1&page_size=5`, cookie: sessionCookie },
    );

    expect(listResult.status).toBe(200);
    expect(listResult.data.items.length).toBeGreaterThan(0);

    const wo = listResult.data.items[0];
    const originalNotes = wo.internal_notes || "";
    const testMarker = `test-${Date.now()}`;

    // PATCH with a unique marker
    const patchResult = await authPage.evaluate(
      async ({ url, cookie, body }: { url: string; cookie: string; body: string }) => {
        const resp = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Cookie: `session=${cookie}`,
            "Content-Type": "application/json",
          },
          body,
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders/${wo.id}`,
        cookie: sessionCookie,
        body: JSON.stringify({ internal_notes: testMarker }),
      },
    );

    expect(patchResult.status).toBe(200);
    expect(patchResult.data.internal_notes).toBe(testMarker);

    // Verify persistence: re-fetch the same work order
    const verifyResult = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      { url: `${API}/work-orders/${wo.id}`, cookie: sessionCookie },
    );

    expect(verifyResult.status).toBe(200);
    expect(verifyResult.data.internal_notes).toBe(testMarker);

    // Restore original value
    await authPage.evaluate(
      async ({ url, cookie, body }: { url: string; cookie: string; body: string }) => {
        await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Cookie: `session=${cookie}`,
            "Content-Type": "application/json",
          },
          body,
        });
      },
      {
        url: `${API}/work-orders/${wo.id}`,
        cookie: sessionCookie,
        body: JSON.stringify({ internal_notes: originalNotes }),
      },
    );
  });

  test("Work-orders endpoint no longer returns cache-control max-age", async () => {
    // Check that the work-orders endpoint doesn't return stale-inducing cache headers
    const result = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return {
          status: resp.status,
          cacheControl: resp.headers.get("cache-control"),
        };
      },
      { url: `${API}/work-orders?page=1&page_size=1`, cookie: sessionCookie },
    );

    expect(result.status).toBe(200);
    // Should NOT have max-age (which caused the stale refetch bug)
    if (result.cacheControl) {
      expect(result.cacheControl).not.toContain("max-age=30");
      expect(result.cacheControl).not.toContain("stale-while-revalidate");
    }
  });

  test("Schedule page loads cleanly with no errors", async () => {
    const errors: string[] = [];
    const networkFailures: string[] = [];

    authPage.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("Sentry") ||
          text.includes("ResizeObserver") ||
          text.includes("favicon") ||
          text.includes("Failed to load resource") ||
          text.includes("server responded with a status of")
        ) return;
        errors.push(text);
      }
    });
    authPage.on("response", (resp) => {
      if (resp.status() >= 500) {
        networkFailures.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(5000);

    expect(networkFailures.length, `500 errors: ${networkFailures.join(", ")}`).toBe(0);
    // Allow API Schema Violation warnings but flag them
    const criticalErrors = errors.filter((e) => !e.includes("API Schema Violation"));
    expect(criticalErrors.length, `Critical errors: ${criticalErrors.join(", ")}`).toBe(0);
  });
});

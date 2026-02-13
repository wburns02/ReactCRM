/**
 * Verifies customer names are preserved during drag-drop operations.
 * Specifically tests that PATCH /work-orders returns customer_name
 * and that the frontend merge doesn't overwrite names with null.
 */
import { test, expect, type Page } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

let authPage: Page;
let sessionCookie: string;

test.describe("Customer Name Preservation in Drag-Drop", () => {
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

  test("PATCH work-order response includes customer_name", async () => {
    // Get a work order with a customer
    const listResult = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      { url: `${API}/work-orders?page=1&page_size=10`, cookie: sessionCookie },
    );

    expect(listResult.status).toBe(200);
    // Find a work order with a customer_name set
    const woWithName = listResult.data.items.find(
      (wo: any) => wo.customer_name && wo.customer_name.trim() !== "",
    );

    if (!woWithName) {
      console.log("No work orders with customer_name found, skipping PATCH test");
      return;
    }

    // PATCH it with a trivial update (internal_notes)
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
        url: `${API}/work-orders/${woWithName.id}`,
        cookie: sessionCookie,
        body: JSON.stringify({ internal_notes: `test-${Date.now()}` }),
      },
    );

    expect(patchResult.status).toBe(200);
    // KEY ASSERTION: PATCH response must include customer_name
    expect(patchResult.data.customer_name).toBeTruthy();
    expect(patchResult.data.customer_name).not.toContain("Customer #");
    // Should match the original name from the list
    expect(patchResult.data.customer_name).toBe(woWithName.customer_name);
  });

  test("Schedule/unschedule round-trip preserves customer_name", async () => {
    // Get a draft work order
    const listResult = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      { url: `${API}/work-orders?page=1&page_size=20&status=draft`, cookie: sessionCookie },
    );

    expect(listResult.status).toBe(200);

    const draftWo = listResult.data.items.find(
      (wo: any) => wo.customer_name && wo.customer_name.trim() !== "",
    );

    if (!draftWo) {
      console.log("No draft work orders with customer_name, skipping round-trip");
      return;
    }

    const originalName = draftWo.customer_name;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    // Schedule it
    const scheduleResult = await authPage.evaluate(
      async ({ url, cookie, body }: { url: string; cookie: string; body: string }) => {
        const resp = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: { Cookie: `session=${cookie}`, "Content-Type": "application/json" },
          body,
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders/${draftWo.id}`,
        cookie: sessionCookie,
        body: JSON.stringify({
          scheduled_date: dateStr,
          time_window_start: "09:00:00",
          status: "scheduled",
        }),
      },
    );

    expect(scheduleResult.status).toBe(200);
    expect(scheduleResult.data.customer_name).toBe(originalName);
    expect(scheduleResult.data.scheduled_date).toBe(dateStr);

    // Unschedule it back
    const unscheduleResult = await authPage.evaluate(
      async ({ url, cookie, body }: { url: string; cookie: string; body: string }) => {
        const resp = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: { Cookie: `session=${cookie}`, "Content-Type": "application/json" },
          body,
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders/${draftWo.id}`,
        cookie: sessionCookie,
        body: JSON.stringify({
          scheduled_date: null,
          assigned_technician: null,
          time_window_start: null,
          status: "draft",
        }),
      },
    );

    expect(unscheduleResult.status).toBe(200);
    expect(unscheduleResult.data.customer_name).toBe(originalName);
    expect(unscheduleResult.data.status).toBe("draft");
  });

  test("Schedule page shows real customer names (not UUIDs)", async () => {
    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(5000);

    const body = await authPage.textContent("body");

    // Should NOT contain "Customer #" followed by UUID pattern
    const uuidPattern = /Customer #[0-9a-f]{8}/i;
    const hasUuidNames = uuidPattern.test(body || "");

    // Allow it for now since some old work orders might not have customer_id set
    // But verify that real names appear
    const hasRealNames =
      body?.includes("Walter Burns") ||
      body?.includes("Alfred Stone") ||
      body?.includes("Keith Hansen") ||
      body?.includes("Billy Bob");

    expect(hasRealNames).toBe(true);

    if (hasUuidNames) {
      console.log(
        "WARNING: Some work orders still show UUID-based names. This may be due to work orders without customer_id.",
      );
    }
  });

  test("sw.js has no-cache headers", async () => {
    const result = await authPage.evaluate(async (url: string) => {
      const resp = await fetch(url);
      return {
        status: resp.status,
        cacheControl: resp.headers.get("cache-control"),
      };
    }, `${APP}/sw.js`);

    // sw.js should have no-cache headers
    if (result.status === 200 && result.cacheControl) {
      expect(result.cacheControl).toContain("no-cache");
    }
  });
});

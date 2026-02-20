/**
 * Completion Notifications E2E Tests
 *
 * Verifies that when a work order status is PATCHED to "completed",
 * the API response includes `notification_sent: boolean`.
 *
 * - If Twilio is configured in production: notification_sent === true
 * - If Twilio is NOT configured: notification_sent === false (graceful fallback)
 *
 * Test flow:
 *   1. Login as admin
 *   2. Create a test customer with a phone number via API
 *   3. Create a test work order (status: "scheduled") for that customer
 *   4. PATCH the work order status to "completed"
 *   5. Assert response includes `notification_sent` (boolean)
 *   6. Cleanup: DELETE work order + customer in afterAll
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "net::ERR_",
  "third-party cookie",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((pattern) => msg.includes(pattern));
}

test.describe.serial("Completion Notifications via Twilio SMS", () => {
  let context: BrowserContext;
  let page: Page;

  // Track created resources for cleanup
  let testCustomerId: string | null = null;
  let testWorkOrderId: string | null = null;

  const suffix = Date.now().toString().slice(-6);
  const testCustomer = {
    first_name: "E2ENotify",
    last_name: `Test${suffix}`,
    email: `e2e-notify-${suffix}@example.com`,
    phone: "5125550199",
    address_line1: "123 Test Lane",
    city: "San Marcos",
    state: "TX",
    postal_code: "78666",
  };

  test("0. Login as admin", async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: undefined,
    });
    page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        console.log(`[Console Error] ${msg.text()}`);
      }
    });

    await context.clearCookies();
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // If already logged in with a different session, clear it
    if (!page.url().includes("/login")) {
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 30000 },
    );
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain("/login");
    console.log(`Logged in. Current URL: ${page.url()}`);
  });

  test("1. Create test customer with phone number", async () => {
    const data = await page.evaluate(
      async ({ apiUrl, customer }) => {
        const res = await fetch(`${apiUrl}/customers`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customer),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, customer: testCustomer },
    );

    console.log(`Create customer status: ${data.status}`);
    console.log(`Customer body: ${JSON.stringify(data.body).slice(0, 200)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.id).toBeTruthy();
    testCustomerId = data.body.id;
    console.log(`Test customer created: ${testCustomerId}`);
  });

  test("2. Create test work order for that customer (status: scheduled)", async () => {
    expect(testCustomerId).toBeTruthy();

    const workOrderData = {
      customer_id: testCustomerId,
      job_type: "pumping",
      status: "scheduled",
      priority: "normal",
      service_address_line1: "123 Test Lane",
      service_city: "San Marcos",
      service_state: "TX",
      service_postal_code: "78666",
      notes: "E2E test work order — completion notification test",
    };

    const data = await page.evaluate(
      async ({ apiUrl, woData }) => {
        const res = await fetch(`${apiUrl}/work-orders`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(woData),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, woData: workOrderData },
    );

    console.log(`Create WO status: ${data.status}`);
    console.log(`WO body: ${JSON.stringify(data.body).slice(0, 200)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.id).toBeTruthy();
    expect(data.body.status).toBe("scheduled");
    testWorkOrderId = data.body.id;
    console.log(`Test work order created: ${testWorkOrderId}`);
  });

  test("3. PATCH work order status to 'completed' — response includes notification_sent", async () => {
    expect(testWorkOrderId).toBeTruthy();

    const data = await page.evaluate(
      async ({ apiUrl, woId }) => {
        const res = await fetch(`${apiUrl}/work-orders/${woId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, woId: testWorkOrderId },
    );

    console.log(`PATCH status: ${data.status}`);
    console.log(`PATCH response: ${JSON.stringify(data.body).slice(0, 400)}`);

    expect(data.ok).toBeTruthy();
    expect(data.status).toBe(200);

    // Critical assertion: notification_sent field MUST be present and be a boolean
    expect(data.body).toHaveProperty("notification_sent");
    expect(typeof data.body.notification_sent).toBe("boolean");

    console.log(`notification_sent = ${data.body.notification_sent}`);

    // Status must be updated
    expect(data.body.status).toBe("completed");
  });

  test("4. notification_sent is boolean (true if Twilio configured, false if not)", async () => {
    // This test verifies graceful fallback behavior.
    // - If TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER are all set: true
    // - If any of those are missing: false (SMS skipped gracefully, no error)
    //
    // We can determine which case applies by checking the integration status endpoint.
    const statusData = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/integration-status`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    }, API_URL);

    const twilioConfigured = statusData?.twilio?.configured ?? false;
    console.log(`Twilio configured on Railway: ${twilioConfigured}`);

    // Re-PATCH a fresh WO to verify the behavior (create a second WO)
    const createData = await page.evaluate(
      async ({ apiUrl, customerId }) => {
        const res = await fetch(`${apiUrl}/work-orders`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: customerId,
            job_type: "inspection",
            status: "scheduled",
            priority: "normal",
            notes: "E2E notification_sent boolean check",
          }),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, customerId: testCustomerId },
    );

    expect(createData.ok).toBeTruthy();
    const secondWoId = createData.body.id;
    console.log(`Second test WO: ${secondWoId}`);

    const patchData = await page.evaluate(
      async ({ apiUrl, woId }) => {
        const res = await fetch(`${apiUrl}/work-orders/${woId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, woId: secondWoId },
    );

    expect(patchData.ok).toBeTruthy();
    expect(patchData.body).toHaveProperty("notification_sent");
    expect(typeof patchData.body.notification_sent).toBe("boolean");

    if (twilioConfigured) {
      // Twilio is configured — SMS should have been sent
      expect(patchData.body.notification_sent).toBe(true);
      console.log("Twilio configured: notification_sent === true (SMS sent)");
    } else {
      // Twilio not configured — graceful skip
      expect(patchData.body.notification_sent).toBe(false);
      console.log("Twilio not configured: notification_sent === false (graceful skip)");
    }

    // Cleanup second WO
    await page.evaluate(
      async ({ apiUrl, woId }) => {
        await fetch(`${apiUrl}/work-orders/${woId}`, {
          method: "DELETE",
          credentials: "include",
        });
      },
      { apiUrl: API_URL, woId: secondWoId },
    );
  });

  test("5. PATCH to completed is idempotent (already completed → no double SMS)", async () => {
    // Patching again when already completed should NOT send another SMS
    // (because old_status == new_status == "completed")
    expect(testWorkOrderId).toBeTruthy();

    const data = await page.evaluate(
      async ({ apiUrl, woId }) => {
        const res = await fetch(`${apiUrl}/work-orders/${woId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      },
      { apiUrl: API_URL, woId: testWorkOrderId },
    );

    expect(data.ok).toBeTruthy();
    expect(data.body).toHaveProperty("notification_sent");

    // When already completed → old_status == new_status → no SMS sent
    expect(data.body.notification_sent).toBe(false);
    console.log(`Idempotent PATCH: notification_sent = ${data.body.notification_sent} (expected false)`);
  });

  test.afterAll(async () => {
    // Cleanup: DELETE test work order and customer
    if (testWorkOrderId && page) {
      try {
        await page.evaluate(
          async ({ apiUrl, woId }) => {
            await fetch(`${apiUrl}/work-orders/${woId}`, {
              method: "DELETE",
              credentials: "include",
            });
          },
          { apiUrl: API_URL, woId: testWorkOrderId },
        );
        console.log(`Cleaned up WO ${testWorkOrderId}`);
      } catch (e) {
        console.log(`Cleanup WO failed: ${e}`);
      }
    }

    if (testCustomerId && page) {
      try {
        await page.evaluate(
          async ({ apiUrl, custId }) => {
            await fetch(`${apiUrl}/customers/${custId}`, {
              method: "DELETE",
              credentials: "include",
            });
          },
          { apiUrl: API_URL, custId: testCustomerId },
        );
        console.log(`Cleaned up customer ${testCustomerId}`);
      } catch (e) {
        console.log(`Cleanup customer failed: ${e}`);
      }
    }

    await context?.close();
  });
});

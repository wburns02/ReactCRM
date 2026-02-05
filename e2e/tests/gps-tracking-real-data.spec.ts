import { test, expect } from "@playwright/test";

/**
 * GPS Tracking Real Data E2E Tests
 *
 * Verifies the GPS tracking page shows real data from Samsara vehicle integration:
 * - Dispatch map API returns vehicles array with Samsara data
 * - Locations API returns combined vehicle + technician counts
 * - Map renders with proper controls (vehicle toggle, stats overlay)
 * - Samsara status endpoint confirms connection
 * - No unexpected console errors
 *
 * Uses pre-authenticated state from auth.setup.ts (storageState).
 */

const API_URL =
  "https://react-crm-api-production.up.railway.app/api/v2";

// Known console errors to ignore (pre-existing)
const KNOWN_CONSOLE_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "third-party cookie",
  "net::ERR",
];

test.setTimeout(90000);

/** Navigate to tracking page, handling auth if needed */
async function ensureOnTrackingPage(
  page: import("@playwright/test").Page,
  baseURL: string | undefined
) {
  const base = baseURL || "https://react.ecbtx.com";
  await page.goto(`${base}/tracking`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // If redirected to login, authenticate
  if (page.url().includes("/login")) {
    // Wait for login form to be interactive
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill("will@macseptic.com");
    await page.locator('input[type="password"]').fill("#Espn2025");

    // Wait for submit button and click
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.waitFor({ state: "visible" });
    await submitBtn.click();

    // Wait for navigation away from login using waitForFunction (more reliable)
    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 20000 }
      );
    } catch {
      // Retry login once
      await emailInput.fill("will@macseptic.com");
      await page.locator('input[type="password"]').fill("#Espn2025");
      await submitBtn.click();
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 20000 }
      );
    }
    await page.waitForTimeout(2000);

    // Navigate to tracking if not already there
    if (!page.url().includes("/tracking")) {
      await page.goto(`${base}/tracking`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }
  }

  return page.url().includes("/tracking");
}

test.describe("GPS Tracking - Real Data", () => {
  // =========================================================================
  // API Tests (work with any auth state via page.evaluate + credentials)
  // =========================================================================

  test("API: dispatch-map returns vehicles array", async ({ page, baseURL }) => {
    await ensureOnTrackingPage(page, baseURL);

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/gps/dispatch-map`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(
      `Dispatch map: ${data.body.technicians?.length || 0} techs, ` +
        `${data.body.work_orders?.length || 0} WOs, ` +
        `${data.body.vehicles?.length || 0} vehicles`
    );

    expect(data.ok).toBeTruthy();
    expect(data.status).toBe(200);

    // Verify response structure has all expected fields
    expect(data.body).toHaveProperty("technicians");
    expect(data.body).toHaveProperty("work_orders");
    expect(data.body).toHaveProperty("vehicles");
    expect(data.body).toHaveProperty("geofences");
    expect(data.body).toHaveProperty("center_latitude");
    expect(data.body).toHaveProperty("center_longitude");
    expect(data.body).toHaveProperty("zoom_level");
    expect(data.body).toHaveProperty("last_refresh");

    // Arrays should exist (may be empty if no data)
    expect(Array.isArray(data.body.technicians)).toBe(true);
    expect(Array.isArray(data.body.work_orders)).toBe(true);
    expect(Array.isArray(data.body.vehicles)).toBe(true);
    expect(Array.isArray(data.body.geofences)).toBe(true);

    // If vehicles exist, verify structure
    if (data.body.vehicles.length > 0) {
      const v = data.body.vehicles[0];
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("name");
      expect(v).toHaveProperty("latitude");
      expect(v).toHaveProperty("longitude");
      expect(v).toHaveProperty("status");
      expect(v).toHaveProperty("updated_at");
      expect(["moving", "idling", "stopped", "offline"]).toContain(v.status);
    }
  });

  test("API: locations endpoint returns vehicle counts", async ({
    page,
    baseURL,
  }) => {
    await ensureOnTrackingPage(page, baseURL);

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/gps/locations`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(
      `Locations: online=${data.body.total_online}, offline=${data.body.total_offline}, ` +
        `vehicle_online=${data.body.vehicle_online}, vehicle_offline=${data.body.vehicle_offline}`
    );

    expect(data.ok).toBeTruthy();
    expect(data.status).toBe(200);

    // Verify response structure
    expect(data.body).toHaveProperty("technicians");
    expect(data.body).toHaveProperty("total_online");
    expect(data.body).toHaveProperty("total_offline");
    expect(data.body).toHaveProperty("vehicle_online");
    expect(data.body).toHaveProperty("vehicle_offline");
    expect(data.body).toHaveProperty("last_refresh");

    // Counts should be non-negative integers
    expect(data.body.total_online).toBeGreaterThanOrEqual(0);
    expect(data.body.total_offline).toBeGreaterThanOrEqual(0);
    expect(data.body.vehicle_online).toBeGreaterThanOrEqual(0);
    expect(data.body.vehicle_offline).toBeGreaterThanOrEqual(0);
  });

  test("API: Samsara status shows connected", async ({ page, baseURL }) => {
    await ensureOnTrackingPage(page, baseURL);

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/samsara/status`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Samsara status: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.configured).toBe(true);
    expect(data.body.connected).toBe(true);
    expect(data.body.feed_poller_active).toBe(true);
  });

  // =========================================================================
  // UI Tests (require being on the tracking page)
  // =========================================================================

  test("Tracking page loads with map and controls", async ({
    page,
    baseURL,
  }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    // Map container should be present (Leaflet map)
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Stats overlay should show vehicle/tech/job counts
    await expect(page.getByText("Vehicles").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Techs").first()).toBeVisible();
    await expect(page.getByText("Jobs").first()).toBeVisible();
    await expect(page.getByText("Last updated:").first()).toBeVisible();
  });

  test("Vehicle toggle and map controls exist", async ({ page, baseURL }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    // Vehicle toggle (Samsara)
    const vehicleToggle = page.locator(
      'button[title="Toggle Vehicles (Samsara)"]'
    );
    await expect(vehicleToggle).toBeVisible({ timeout: 15000 });

    // Technician toggle
    const techToggle = page.locator('button[title="Toggle Technicians"]');
    await expect(techToggle).toBeVisible();

    // Work order toggle
    const woToggle = page.locator('button[title="Toggle Work Orders"]');
    await expect(woToggle).toBeVisible();

    // Click vehicle toggle off/on
    await vehicleToggle.click();
    await page.waitForTimeout(500);
    await vehicleToggle.click();
  });

  test("Tracking dashboard tabs render correctly", async ({
    page,
    baseURL,
  }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    await expect(page.getByText("Live Map").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Technicians").first()).toBeVisible();
    await expect(page.getByText("Geofences").first()).toBeVisible();
    await expect(page.getByText("Events").first()).toBeVisible();
    await expect(page.getByText("Settings").first()).toBeVisible();
  });

  test("Dispatch map data refreshes on polling interval", async ({
    page,
    baseURL,
  }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    // Count API calls using network events
    let apiCallCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/gps/dispatch-map")) {
        apiCallCount++;
      }
    });

    // Wait for 3+ poll cycles (10s interval + buffer)
    await page.waitForTimeout(35000);

    console.log(`Dispatch map API calls in 35s: ${apiCallCount}`);
    expect(apiCallCount).toBeGreaterThanOrEqual(2);
  });

  test("No unexpected console errors on tracking page", async ({
    page,
    baseURL,
  }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    const unexpectedErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        const isKnown = KNOWN_CONSOLE_ERRORS.some((known) =>
          text.includes(known)
        );
        if (!isKnown) {
          unexpectedErrors.push(text);
        }
      }
    });

    // Wait for activity
    await page.waitForTimeout(5000);

    if (unexpectedErrors.length > 0) {
      console.log(
        "Unexpected console errors:",
        JSON.stringify(unexpectedErrors, null, 2)
      );
    }
    expect(unexpectedErrors.length).toBe(0);
  });

  test("Map markers correspond to API data", async ({ page, baseURL }) => {
    const onPage = await ensureOnTrackingPage(page, baseURL);
    test.skip(!onPage, "Could not navigate to tracking page");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/gps/dispatch-map`, {
        credentials: "include",
      });
      return res.json();
    }, API_URL);

    const techCount = data.technicians?.length || 0;
    const woCount = data.work_orders?.length || 0;
    const vehicleCount = data.vehicles?.length || 0;
    console.log(
      `API: ${techCount} techs, ${woCount} WOs, ${vehicleCount} vehicles`
    );

    if (techCount + woCount + vehicleCount > 0) {
      await page.waitForTimeout(3000);
      const markers = page.locator(".leaflet-marker-icon");
      const markerCount = await markers.count();
      console.log(`Map markers: ${markerCount}`);
      expect(markerCount).toBeGreaterThan(0);
    }
  });
});

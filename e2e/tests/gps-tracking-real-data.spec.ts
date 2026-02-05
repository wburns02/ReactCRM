import { test, expect, Page } from "@playwright/test";

/**
 * GPS Tracking Real Data E2E Tests
 *
 * Verifies the GPS tracking page shows real data from Samsara vehicle integration:
 * - Dispatch map API returns vehicles array with Samsara data
 * - Locations API returns combined vehicle + technician counts
 * - Map renders with proper controls (vehicle toggle, stats overlay)
 * - Samsara status endpoint confirms connection
 * - No unexpected console errors
 */

const APP_URL = "https://react.ecbtx.com";
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

async function loginAndNavigate(page: Page, path: string) {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    } catch {
      // Retry login once
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    }
    await page.waitForTimeout(1000);

    if (!page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(2000);
  }
}

test.describe("GPS Tracking - Real Data", () => {
  // =========================================================================
  // API Tests
  // =========================================================================

  test("API: dispatch-map returns vehicles array", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

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

    // Center coordinates should be reasonable (Texas area)
    expect(data.body.center_latitude).toBeGreaterThan(25);
    expect(data.body.center_latitude).toBeLessThan(37);
    expect(data.body.center_longitude).toBeGreaterThan(-107);
    expect(data.body.center_longitude).toBeLessThan(-93);

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

  test("API: locations endpoint returns vehicle counts", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

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

    // total_online should include vehicle_online
    expect(data.body.total_online).toBeGreaterThanOrEqual(
      data.body.vehicle_online
    );
    expect(data.body.total_offline).toBeGreaterThanOrEqual(
      data.body.vehicle_offline
    );
  });

  test("API: Samsara status shows connected", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

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
  // UI Tests
  // =========================================================================

  test("Tracking page loads with map", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

    // Should be on the tracking page
    expect(page.url()).toContain("/tracking");

    // Map container should be present (Leaflet map)
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // OpenStreetMap tile layer should be loading
    const tiles = page.locator(".leaflet-tile-pane");
    await expect(tiles).toBeVisible();
  });

  test("Stats overlay shows Vehicles, Techs, and Jobs", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

    // Wait for the map and stats to load
    await page.waitForTimeout(3000);

    // Stats overlay should be visible with vehicle count
    const vehiclesText = page.getByText("Vehicles").first();
    await expect(vehiclesText).toBeVisible({ timeout: 10000 });

    // Techs stat should be visible
    const techsText = page.getByText("Techs").first();
    await expect(techsText).toBeVisible();

    // Jobs stat should be visible
    const jobsText = page.getByText("Jobs").first();
    await expect(jobsText).toBeVisible();

    // "Last updated" timestamp should be present
    const lastUpdated = page.getByText("Last updated:").first();
    await expect(lastUpdated).toBeVisible();
  });

  test("Vehicle toggle button exists in map controls", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");
    await page.waitForTimeout(3000);

    // Vehicle toggle button should be visible
    const vehicleToggle = page.locator(
      'button[title="Toggle Vehicles (Samsara)"]'
    );
    await expect(vehicleToggle).toBeVisible({ timeout: 10000 });

    // Click it to toggle off
    await vehicleToggle.click();
    await page.waitForTimeout(500);

    // Click again to toggle back on
    await vehicleToggle.click();
    await page.waitForTimeout(500);
  });

  test("Map has technician toggle and work order toggle", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");
    await page.waitForTimeout(3000);

    // Technician toggle button
    const techToggle = page.locator(
      'button[title="Toggle Technicians"]'
    );
    await expect(techToggle).toBeVisible({ timeout: 10000 });

    // Work order toggle button
    const woToggle = page.locator(
      'button[title="Toggle Work Orders"]'
    );
    await expect(woToggle).toBeVisible();
  });

  test("Tracking dashboard tabs render correctly", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");
    await page.waitForTimeout(2000);

    // Verify all tabs exist
    const liveMapTab = page.getByText("Live Map").first();
    await expect(liveMapTab).toBeVisible({ timeout: 10000 });

    const techniciansTab = page.getByText("Technicians").first();
    await expect(techniciansTab).toBeVisible();

    const geofencesTab = page.getByText("Geofences").first();
    await expect(geofencesTab).toBeVisible();

    const eventsTab = page.getByText("Events").first();
    await expect(eventsTab).toBeVisible();

    const settingsTab = page.getByText("Settings").first();
    await expect(settingsTab).toBeVisible();
  });

  test("Dispatch map data refreshes on polling interval", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

    // Intercept dispatch-map API calls to count them
    let apiCallCount = 0;
    await page.route("**/gps/dispatch-map**", (route) => {
      apiCallCount++;
      route.continue();
    });

    // Wait for at least 2 poll cycles (10s interval + buffer)
    await page.waitForTimeout(25000);

    console.log(`Dispatch map API calls in 25s: ${apiCallCount}`);

    // Should have polled at least twice (10s interval)
    expect(apiCallCount).toBeGreaterThanOrEqual(2);
  });

  test("No unexpected console errors on tracking page", async ({ page }) => {
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

    await loginAndNavigate(page, "/tracking");
    await page.waitForTimeout(5000);

    if (unexpectedErrors.length > 0) {
      console.log(
        "Unexpected console errors:",
        JSON.stringify(unexpectedErrors, null, 2)
      );
    }

    // Allow zero unexpected errors
    expect(unexpectedErrors.length).toBe(0);
  });

  // =========================================================================
  // Integration: API response drives UI
  // =========================================================================

  test("Map markers correspond to API technician data", async ({ page }) => {
    await loginAndNavigate(page, "/tracking");

    // Get technician count from API
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/gps/dispatch-map`, {
        credentials: "include",
      });
      return res.json();
    }, API_URL);

    const techCount = data.technicians?.length || 0;
    console.log(`API technicians: ${techCount}`);

    if (techCount > 0) {
      // Wait for markers to render
      await page.waitForTimeout(3000);

      // Custom markers should be present on the map
      const markers = page.locator(".leaflet-marker-icon");
      const markerCount = await markers.count();
      console.log(`Map markers: ${markerCount}`);

      // At least some markers should exist (technicians + work orders)
      expect(markerCount).toBeGreaterThan(0);
    }
  });
});

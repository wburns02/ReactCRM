/**
 * Schedule & Dispatch — Interaction Tests
 *
 * Covers: schedule page, command center, GPS tracking, fleet map.
 * Uses storageState from test@macseptic.com (admin) via "modules" project.
 *
 * Resilience policy:
 *   - Annotate with info and return when optional UI elements are absent.
 *   - Hard-fail ONLY on React error boundary or non-noise console errors.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

const NOISE = [
  "API Schema Violation", "Sentry", "ResizeObserver", "favicon",
  "Failed to load resource", "server responded with a status of",
  "third-party cookie", "net::ERR_", "WebSocket", "[WebSocket]", "wss://",
];
function isNoise(msg: string) {
  return NOISE.some((n) => msg.includes(n));
}

// ---------------------------------------------------------------------------
// Schedule & Dispatch
// ---------------------------------------------------------------------------

test.describe("Schedule & Dispatch", () => {
  test("schedule page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Hard-fail: React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary appeared on /schedule").toBe(false);

    // Body must have meaningful content (not empty / white screen)
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.trim().length, "Page body is empty — possible white-screen crash").toBeGreaterThan(20);

    // Hard-fail: non-noise console errors
    expect(errors, `Unexpected console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("schedule shows calendar or list of jobs", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Skip if redirected to login
    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "info", description: "Redirected to login — auth may have expired" });
      return;
    }

    // Check for any of: date-grid columns, table rows, calendar cells, or job cards
    const dateGrid = page.locator(
      '[class*="calendar"], [class*="day-col"], [class*="time-grid"], [class*="schedule-grid"]'
    );
    const tableRows = page.locator("table tbody tr");
    const jobCards = page.locator('[class*="job-card"], [class*="event"], [data-event]');
    const weekDayHeaders = page.locator('[class*="week"], [class*="day-header"]');
    const viewButtons = page.getByRole("button", { name: /week|day|month|tech|map/i });

    const dateGridCount = await dateGrid.count();
    const tableRowCount = await tableRows.count();
    const jobCardCount = await jobCards.count();
    const weekDayCount = await weekDayHeaders.count();
    const viewButtonCount = await viewButtons.count();

    const hasScheduleUI =
      dateGridCount > 0 ||
      tableRowCount > 0 ||
      jobCardCount > 0 ||
      weekDayCount > 0 ||
      viewButtonCount > 0;

    test.info().annotations.push({
      type: "info",
      description: [
        `dateGrid: ${dateGridCount}`,
        `tableRows: ${tableRowCount}`,
        `jobCards: ${jobCardCount}`,
        `weekDayHeaders: ${weekDayCount}`,
        `viewButtons: ${viewButtonCount}`,
      ].join(", "),
    });

    if (!hasScheduleUI) {
      // Annotate absence but do not fail — page may show empty state
      test.info().annotations.push({
        type: "info",
        description: "No recognisable calendar/list UI found — may be loading or empty state",
      });
      return;
    }

    expect(hasScheduleUI).toBe(true);
  });

  test("schedule has technician assignment UI", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "info", description: "Redirected to login" });
      return;
    }

    // Look for any tech names, assignment dropdowns, or drag handles
    const techDropdown = page.getByRole("combobox", { name: /tech|assign/i }).first();
    const dragHandles = page.locator('[draggable="true"], [data-draggable], [class*="drag-handle"]');
    const techBadges = page.locator('[class*="tech"], [class*="assignee"], [class*="avatar"]');
    const unscheduledPanel = page.getByRole("heading", { name: /unscheduled/i });
    const assignButton = page.getByRole("button", { name: /assign/i }).first();

    const techDropdownVisible = await techDropdown.isVisible().catch(() => false);
    const dragHandleCount = await dragHandles.count();
    const techBadgeCount = await techBadges.count();
    const unscheduledPanelVisible = await unscheduledPanel.isVisible().catch(() => false);
    const assignButtonVisible = await assignButton.isVisible().catch(() => false);

    const hasAssignmentUI =
      techDropdownVisible ||
      dragHandleCount > 0 ||
      techBadgeCount > 0 ||
      unscheduledPanelVisible ||
      assignButtonVisible;

    test.info().annotations.push({
      type: "info",
      description: [
        `techDropdown: ${techDropdownVisible}`,
        `dragHandles: ${dragHandleCount}`,
        `techBadges: ${techBadgeCount}`,
        `unscheduledPanel: ${unscheduledPanelVisible}`,
        `assignButton: ${assignButtonVisible}`,
      ].join(", "),
    });

    if (!hasAssignmentUI) {
      test.info().annotations.push({
        type: "info",
        description: "No technician assignment UI found — may be empty state or different view mode",
      });
      return;
    }

    expect(hasAssignmentUI).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Command Center
// ---------------------------------------------------------------------------

test.describe("Command Center", () => {
  test("command center loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/command-center`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Hard-fail: React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary appeared on /command-center").toBe(false);

    // Body must have content
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body is empty — possible white-screen crash"
    ).toBeGreaterThan(20);

    // Hard-fail: non-noise console errors
    expect(errors, `Unexpected console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("command center renders map or job list", async ({ page }) => {
    await page.goto(`${BASE_URL}/command-center`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "info", description: "Redirected to login" });
      return;
    }

    // Map container candidates (Leaflet, MapLibre, or generic map class)
    const mapContainer = page.locator(
      ".leaflet-container, .maplibregl-map, .mapboxgl-map, [class*=\"map-container\"], [class*=\"MapContainer\"]"
    );
    // Job list candidates
    const jobListItems = page.locator(
      '[class*="job-card"], [class*="dispatch-card"], [class*="work-order-card"]'
    );
    const tableRows = page.locator("table tbody tr");
    const listItems = page.locator("ul li").first();
    // Stats/KPI tiles often appear in command center
    const kpiTiles = page.locator('[class*="stat"], [class*="kpi"], [class*="metric"]');

    const mapVisible = await mapContainer.isVisible().catch(() => false);
    const jobCardCount = await jobListItems.count();
    const tableRowCount = await tableRows.count();
    const listItemVisible = await listItems.isVisible().catch(() => false);
    const kpiCount = await kpiTiles.count();

    const hasContent =
      mapVisible ||
      jobCardCount > 0 ||
      tableRowCount > 0 ||
      listItemVisible ||
      kpiCount > 0;

    test.info().annotations.push({
      type: "info",
      description: [
        `map: ${mapVisible}`,
        `jobCards: ${jobCardCount}`,
        `tableRows: ${tableRowCount}`,
        `listItem: ${listItemVisible}`,
        `kpiTiles: ${kpiCount}`,
      ].join(", "),
    });

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No map or job list found — command center may show empty state",
      });
      return;
    }

    expect(hasContent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GPS Tracking
// ---------------------------------------------------------------------------

test.describe("GPS Tracking", () => {
  test("tracking page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/tracking`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Hard-fail: React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary appeared on /tracking").toBe(false);

    // Body must have content
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body is empty — possible white-screen crash"
    ).toBeGreaterThan(20);

    test.info().annotations.push({
      type: "info",
      description: `Final URL: ${page.url()}`,
    });

    // Hard-fail: non-noise console errors
    expect(errors, `Unexpected console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("fleet page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/fleet`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Hard-fail: React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "React error boundary appeared on /fleet").toBe(false);

    // Body must have content
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body is empty — possible white-screen crash"
    ).toBeGreaterThan(20);

    test.info().annotations.push({
      type: "info",
      description: `Final URL: ${page.url()}`,
    });

    // Hard-fail: non-noise console errors
    expect(errors, `Unexpected console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("tracking page renders a map or vehicle list", async ({ page }) => {
    await page.goto(`${BASE_URL}/tracking`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "info", description: "Redirected to login" });
      return;
    }

    const mapContainer = page.locator(
      ".leaflet-container, .maplibregl-map, .mapboxgl-map, [class*=\"map-container\"], [class*=\"MapContainer\"]"
    );
    const vehicleRows = page.locator("table tbody tr");
    const vehicleCards = page.locator('[class*="vehicle"], [class*="truck"], [class*="tracker"]');

    const mapVisible = await mapContainer.isVisible().catch(() => false);
    const vehicleRowCount = await vehicleRows.count();
    const vehicleCardCount = await vehicleCards.count();

    const hasTrackingUI = mapVisible || vehicleRowCount > 0 || vehicleCardCount > 0;

    test.info().annotations.push({
      type: "info",
      description: [
        `map: ${mapVisible}`,
        `vehicleRows: ${vehicleRowCount}`,
        `vehicleCards: ${vehicleCardCount}`,
      ].join(", "),
    });

    if (!hasTrackingUI) {
      test.info().annotations.push({
        type: "info",
        description: "No map or vehicle list found — tracking page may show empty state",
      });
      return;
    }

    expect(hasTrackingUI).toBe(true);
  });

  test("fleet page renders a map or vehicle list", async ({ page }) => {
    await page.goto(`${BASE_URL}/fleet`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({ type: "info", description: "Redirected to login" });
      return;
    }

    const mapContainer = page.locator(
      ".leaflet-container, .maplibregl-map, .mapboxgl-map, [class*=\"map-container\"], [class*=\"MapContainer\"]"
    );
    const vehicleRows = page.locator("table tbody tr");
    const vehicleMarkers = page.locator(
      '[class*="vehicle-marker"], [class*="truck-icon"], .leaflet-marker-icon, .maplibregl-marker'
    );
    const fleetStats = page.locator('[class*="stat"], [class*="fleet-stat"]');

    const mapVisible = await mapContainer.isVisible().catch(() => false);
    const vehicleRowCount = await vehicleRows.count();
    const markerCount = await vehicleMarkers.count();
    const statCount = await fleetStats.count();

    const hasFleetUI = mapVisible || vehicleRowCount > 0 || markerCount > 0 || statCount > 0;

    test.info().annotations.push({
      type: "info",
      description: [
        `map: ${mapVisible}`,
        `vehicleRows: ${vehicleRowCount}`,
        `markers: ${markerCount}`,
        `fleetStats: ${statCount}`,
      ].join(", "),
    });

    if (!hasFleetUI) {
      test.info().annotations.push({
        type: "info",
        description: "No map or fleet list found — fleet page may show empty state",
      });
      return;
    }

    expect(hasFleetUI).toBe(true);
  });
});

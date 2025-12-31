import { test, expect } from '@playwright/test';

/**
 * Schedule Map View E2E Tests
 *
 * Tests the map view functionality:
 * - Work order markers appear
 * - Technician markers appear
 * - Marker popups work
 * - Stats counter is accurate
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';

test.describe('Schedule Map View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/schedule`);

    // Skip if redirected to login
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Click Map tab
    const mapTab = page.getByRole('button', { name: /map/i });
    await expect(mapTab).toBeVisible({ timeout: 10000 });
    await mapTab.click();

    // Wait for Leaflet map to load
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });

  test('map shows work order markers', async ({ page }) => {
    // Wait for markers to render
    await page.waitForTimeout(2000);

    // Should have at least some markers (work orders + technicians)
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();

    console.log(`Found ${markerCount} markers on map`);

    // Should have at least 3 markers (the 3 unscheduled work orders from screenshot)
    expect(markerCount).toBeGreaterThanOrEqual(3);
  });

  test('stats counter shows correct work order count', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Find the stats tooltip (shows "X work orders · Y technicians")
    const statsText = page.locator('text=/\\d+ work orders/');
    await expect(statsText).toBeVisible({ timeout: 10000 });

    // Get the text content
    const text = await statsText.textContent();
    console.log(`Stats text: ${text}`);

    // Should show at least 3 work orders
    const match = text?.match(/(\d+) work orders/);
    if (match) {
      const count = parseInt(match[1], 10);
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test('clicking work order marker shows popup', async ({ page }) => {
    // Wait for markers to render
    await page.waitForTimeout(2000);

    // Find a work order marker (not technician marker - those have "T" in them)
    const workOrderMarkers = page.locator('.leaflet-marker-icon:not(:has-text("T"))');
    const count = await workOrderMarkers.count();

    if (count === 0) {
      console.log('No work order markers found - skipping popup test');
      test.skip();
      return;
    }

    // Click the first work order marker
    await workOrderMarkers.first().click();

    // Popup should appear with customer name and View Details button
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Should have View Details button
    const viewDetailsBtn = popup.getByRole('button', { name: /view details/i });
    await expect(viewDetailsBtn).toBeVisible();
  });

  test('technician markers show with T badge', async ({ page }) => {
    // Wait for markers to render
    await page.waitForTimeout(2000);

    // Find technician markers (have "T" text)
    const techMarkers = page.locator('.leaflet-marker-icon:has-text("T")');
    const count = await techMarkers.count();

    console.log(`Found ${count} technician markers`);

    // Should have technician markers
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('map shows legend', async ({ page }) => {
    // Legend should be visible - look for legend-specific text
    const legendItems = page.locator('span:has-text("Scheduled/Confirmed"), span:has-text("Unscheduled/Draft")');
    const count = await legendItems.count();

    // Should have at least the basic legend items
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('show/hide technicians toggle works', async ({ page }) => {
    // Find the checkbox
    const techCheckbox = page.locator('label:has-text("Show Technicians") input[type="checkbox"]');
    await expect(techCheckbox).toBeVisible();

    // Should be checked by default
    await expect(techCheckbox).toBeChecked();

    // Count technician markers
    const initialTechMarkers = await page.locator('.leaflet-marker-icon:has-text("T")').count();

    // Uncheck to hide technicians
    await techCheckbox.uncheck();
    await page.waitForTimeout(500);

    // Technician markers should be hidden
    const afterTechMarkers = await page.locator('.leaflet-marker-icon:has-text("T")').count();
    expect(afterTechMarkers).toBe(0);

    // Re-check to show again
    await techCheckbox.check();
    await page.waitForTimeout(500);

    const finalTechMarkers = await page.locator('.leaflet-marker-icon:has-text("T")').count();
    expect(finalTechMarkers).toBe(initialTechMarkers);
  });
});

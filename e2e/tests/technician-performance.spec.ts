import { test, expect } from '@playwright/test';

/**
 * Technician Performance Profile Tests
 *
 * Tests the new performance stats feature on technician detail pages
 */

test.describe('Technician Performance Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"]', '#Espn2025');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('should display performance stats on technician detail page', async ({ page }) => {
    // Navigate to technicians
    await page.click('text=Technicians');
    await page.waitForSelector('text=5 technicians', { timeout: 10000 });

    // Click View on Terry Black or Will Burns (existing technician with data)
    const viewButton = page.locator('tr:has-text("Terry Black") button:has-text("View"), tr:has-text("Will Burns") button:has-text("View")').first();
    await viewButton.click();

    // Wait for detail page to load - look for technician name instead
    await page.waitForSelector('h1:has-text("Terry Black"), h1:has-text("Will Burns")', { timeout: 15000 });

    // Verify performance stats section exists
    await expect(page.locator('text=Performance Overview')).toBeVisible({ timeout: 10000 });

    // Verify summary stats are displayed
    await expect(page.locator('text=Total Jobs')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Return Visits')).toBeVisible();

    // Verify category cards are displayed
    await expect(page.locator('button:has-text("Pump Outs")')).toBeVisible();
    await expect(page.locator('button:has-text("Repairs")')).toBeVisible();
  });

  test('should open pump outs modal when clicking pump outs card', async ({ page }) => {
    // Navigate to technician detail
    await page.click('text=Technicians');
    await page.waitForSelector('text=5 technicians', { timeout: 10000 });

    // Click View on an existing technician
    const viewButton = page.locator('tr:has-text("Terry Black") button:has-text("View"), tr:has-text("Will Burns") button:has-text("View")').first();
    await viewButton.click();

    // Wait for performance stats
    await page.waitForSelector('text=Performance Overview', { timeout: 15000 });

    // Click on Pump Outs card
    await page.click('button:has-text("Pump Outs")');

    // Verify modal opens with pump out jobs
    await expect(page.locator('h2:has-text("Pump Out Jobs")')).toBeVisible({ timeout: 5000 });

    // Verify table headers for pump outs
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Customer")')).toBeVisible();
    await expect(page.locator('th:has-text("Gallons")')).toBeVisible();
    await expect(page.locator('th:has-text("Revenue")')).toBeVisible();
  });

  test('should open repairs modal when clicking repairs card', async ({ page }) => {
    // Navigate to technician detail
    await page.click('text=Technicians');
    await page.waitForSelector('text=5 technicians', { timeout: 10000 });

    // Click View on an existing technician
    const viewButton = page.locator('tr:has-text("Terry Black") button:has-text("View"), tr:has-text("Will Burns") button:has-text("View")').first();
    await viewButton.click();

    // Wait for performance stats
    await page.waitForSelector('text=Performance Overview', { timeout: 15000 });

    // Click on Repairs card
    await page.click('button:has-text("Repairs")');

    // Verify modal opens with repair jobs
    await expect(page.locator('h2:has-text("Repair Jobs")')).toBeVisible({ timeout: 5000 });

    // Verify table headers for repairs
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Labor")')).toBeVisible();
    await expect(page.locator('th:has-text("Parts")')).toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    // Navigate to technician detail
    await page.click('text=Technicians');
    await page.waitForSelector('text=5 technicians', { timeout: 10000 });

    // Click View on an existing technician
    const viewButton = page.locator('tr:has-text("Terry Black") button:has-text("View"), tr:has-text("Will Burns") button:has-text("View")').first();
    await viewButton.click();

    // Wait for performance stats
    await page.waitForSelector('text=Performance Overview', { timeout: 15000 });

    // Open modal
    await page.click('button:has-text("Pump Outs")');
    await page.waitForSelector('h2:has-text("Pump Out Jobs")', { timeout: 5000 });

    // Close modal by clicking X button (it's a button with an SVG X icon)
    await page.click('button[class*="text-gray-400"]:near(h2:has-text("Pump Out Jobs"))');

    // Verify modal is closed
    await expect(page.locator('h2:has-text("Pump Out Jobs")')).not.toBeVisible({ timeout: 3000 });
  });

  test('API endpoint returns valid performance stats', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('https://react-crm-api-production.up.railway.app/api/v2/auth/login', {
      data: {
        email: 'will@macseptic.com',
        password: '#Espn2025'
      }
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token } = await loginResponse.json();

    // Get list of technicians
    const techResponse = await request.get('https://react-crm-api-production.up.railway.app/api/v2/technicians/', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    expect(techResponse.ok()).toBeTruthy();
    const techData = await techResponse.json();
    expect(techData.items.length).toBeGreaterThan(0);

    // Get performance stats for first technician
    const techId = techData.items[0].id;
    const perfResponse = await request.get(`https://react-crm-api-production.up.railway.app/api/v2/technicians/${techId}/performance`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    expect(perfResponse.ok()).toBeTruthy();
    const perfData = await perfResponse.json();

    // Verify response structure
    expect(perfData).toHaveProperty('technician_id');
    expect(perfData).toHaveProperty('total_jobs_completed');
    expect(perfData).toHaveProperty('total_revenue');
    expect(perfData).toHaveProperty('pump_out_jobs');
    expect(perfData).toHaveProperty('repair_jobs');
    expect(typeof perfData.total_jobs_completed).toBe('number');
    expect(typeof perfData.total_revenue).toBe('number');
  });

  test('API endpoint returns valid job details', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('https://react-crm-api-production.up.railway.app/api/v2/auth/login', {
      data: {
        email: 'will@macseptic.com',
        password: '#Espn2025'
      }
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token } = await loginResponse.json();

    // Get list of technicians
    const techResponse = await request.get('https://react-crm-api-production.up.railway.app/api/v2/technicians/', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    expect(techResponse.ok()).toBeTruthy();
    const techData = await techResponse.json();
    const techId = techData.items[0].id;

    // Get jobs for technician (pump outs)
    const jobsResponse = await request.get(`https://react-crm-api-production.up.railway.app/api/v2/technicians/${techId}/jobs?job_category=pump_outs`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    expect(jobsResponse.ok()).toBeTruthy();
    const jobsData = await jobsResponse.json();

    // Verify response structure
    expect(jobsData).toHaveProperty('items');
    expect(jobsData).toHaveProperty('total');
    expect(jobsData).toHaveProperty('page');
    expect(jobsData).toHaveProperty('job_category');
    expect(jobsData.job_category).toBe('pump_outs');
    expect(Array.isArray(jobsData.items)).toBe(true);
  });
});

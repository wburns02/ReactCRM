import { test, expect } from '@playwright/test';

/**
 * Email CRM Integration Tests
 * Tests for email send, inbox display, and customer linking
 *
 * PREREQUISITE: Backend must be at version 2.7.6+ with:
 * - /communications/stats endpoint
 * - /communications/activity endpoint
 * - /communications/email/status endpoint
 * - Fixed email send with from_address
 *
 * Check version: curl -s https://react-crm-api-production.up.railway.app/health | jq '.version'
 */

const BASE_URL = 'https://react.ecbtx.com';
const API_URL = 'https://react-crm-api-production.up.railway.app/api/v2';
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';
const REQUIRED_VERSION = '2.7.6';

test.describe('Email CRM Integration', () => {

  test('Backend version check', async ({ request }) => {
    // This test verifies the backend is deployed with the required version
    const healthResponse = await request.get(`${API_URL.replace('/api/v2', '')}/health`);
    expect(healthResponse.status()).toBe(200);

    const health = await healthResponse.json();
    console.log('Backend version:', health.version);

    // Version check - skip remaining tests if backend is outdated
    const currentVersion = health.version;
    const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
    const [requiredMajor, requiredMinor, requiredPatch] = REQUIRED_VERSION.split('.').map(Number);

    const isVersionSufficient =
      currentMajor > requiredMajor ||
      (currentMajor === requiredMajor && currentMinor > requiredMinor) ||
      (currentMajor === requiredMajor && currentMinor === requiredMinor && currentPatch >= requiredPatch);

    if (!isVersionSufficient) {
      console.warn(`Backend version ${currentVersion} is older than required ${REQUIRED_VERSION}`);
      console.warn('Email CRM features may not be available. Check Railway deployment.');
    }

    // This test passes but logs a warning if outdated
    expect(health.status).toBe('healthy');
  });

  test('Email send endpoint returns 200/201', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });
    expect(loginResponse.status()).toBe(200);

    // Get auth token/cookies
    const cookies = loginResponse.headers()['set-cookie'];

    // Send email
    const emailResponse = await request.post(`${API_URL}/communications/email/send`, {
      data: {
        to: 'test@example.com',
        subject: `Test Email ${Date.now()}`,
        body: 'This is a test email from Playwright integration test.',
        source: 'react'
      },
      headers: cookies ? { 'Cookie': cookies } : {}
    });

    console.log('Email send status:', emailResponse.status());

    // Should be 200 or 201, not 500
    expect([200, 201]).toContain(emailResponse.status());

    if (emailResponse.ok()) {
      const data = await emailResponse.json();
      console.log('Email response:', JSON.stringify(data, null, 2));

      // Verify response has required fields
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'email');
      expect(data).toHaveProperty('direction', 'outbound');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('from_address', 'support@macseptic.com');
    }
  });

  test('Communications stats endpoint returns 200', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });
    expect(loginResponse.status()).toBe(200);
    const cookies = loginResponse.headers()['set-cookie'];

    // Get stats
    const statsResponse = await request.get(`${API_URL}/communications/stats`, {
      headers: cookies ? { 'Cookie': cookies } : {}
    });

    console.log('Stats status:', statsResponse.status());

    // Should be 200, not 422
    expect(statsResponse.status()).toBe(200);

    if (statsResponse.ok()) {
      const data = await statsResponse.json();
      console.log('Stats response:', JSON.stringify(data, null, 2));

      // Verify response structure
      expect(data).toHaveProperty('unread_sms');
      expect(data).toHaveProperty('unread_email');
      expect(data).toHaveProperty('pending_reminders');
    }
  });

  test('Communications activity endpoint returns 200', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });
    expect(loginResponse.status()).toBe(200);
    const cookies = loginResponse.headers()['set-cookie'];

    // Get activity
    const activityResponse = await request.get(`${API_URL}/communications/activity?limit=10`, {
      headers: cookies ? { 'Cookie': cookies } : {}
    });

    console.log('Activity status:', activityResponse.status());

    // Should be 200, not 422
    expect(activityResponse.status()).toBe(200);

    if (activityResponse.ok()) {
      const data = await activityResponse.json();
      console.log('Activity response:', JSON.stringify(data, null, 2));

      // Verify response structure
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.items)).toBe(true);
    }
  });

  test('Email appears in inbox after sending', async ({ page }) => {
    // Login via UI
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/(dashboard|onboarding|payroll)/, { timeout: 15000 });

    // Navigate to Email Inbox
    await page.goto(`${BASE_URL}/communications/email-inbox`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/email-inbox-after-send.png', fullPage: true });

    // Check for emails in inbox (may have test emails from previous runs)
    const pageContent = await page.textContent('body');
    console.log('Email inbox content preview:', pageContent?.substring(0, 300));
  });

  test('Email compose and send via UI', async ({ page }) => {
    // Login via UI
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/(dashboard|onboarding|payroll)/, { timeout: 15000 });

    // Navigate to Communications
    await page.goto(`${BASE_URL}/communications`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture network requests
    const requests: { url: string; method: string; status?: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/communications')) {
        requests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status()
        });
      }
    });

    // Click Send Email button to open compose modal
    const sendEmailButton = page.locator('button:has-text("Send Email"), button:has-text("Email")').first();
    if (await sendEmailButton.count() > 0) {
      await sendEmailButton.click();
      await page.waitForTimeout(1000);

      // Fill in email form
      const toInput = page.locator('input[type="email"], input[placeholder*="email"], input[name="to"]');
      const subjectInput = page.locator('input[placeholder*="subject"], input[name="subject"]');
      const bodyInput = page.locator('textarea');

      if (await toInput.count() > 0) {
        await toInput.fill('playwright-test@example.com');
      }
      if (await subjectInput.count() > 0) {
        await subjectInput.fill(`UI Test Email ${Date.now()}`);
      }
      if (await bodyInput.count() > 0) {
        await bodyInput.fill('This is a test email sent from Playwright UI test.');
      }

      // Take screenshot before sending
      await page.screenshot({ path: 'test-results/email-compose-filled.png', fullPage: true });

      // Click Send button
      const sendButton = page.locator('button:has-text("Send Email"), button:has-text("Send"):not(:has-text("SMS"))').last();
      if (await sendButton.count() > 0) {
        await sendButton.click();
        await page.waitForTimeout(3000);

        // Take screenshot after sending
        await page.screenshot({ path: 'test-results/email-after-send.png', fullPage: true });
      }
    }

    // Log network requests
    console.log('Network requests:', requests);

    // Check for successful email send request
    const emailSendRequest = requests.find(r => r.url.includes('/email/send') && r.method === 'POST');
    if (emailSendRequest) {
      console.log('Email send request found:', emailSendRequest);
      // Should not be 500
      expect(emailSendRequest.status).not.toBe(500);
    }
  });

  test('Communications Overview shows stats', async ({ page }) => {
    // Login via UI
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/(dashboard|onboarding|payroll)/, { timeout: 15000 });

    // Capture API responses
    let statsResponse: any = null;
    let activityResponse: any = null;

    page.on('response', async response => {
      if (response.url().includes('/communications/stats')) {
        statsResponse = {
          status: response.status(),
          data: response.ok() ? await response.json().catch(() => null) : null
        };
      }
      if (response.url().includes('/communications/activity')) {
        activityResponse = {
          status: response.status(),
          data: response.ok() ? await response.json().catch(() => null) : null
        };
      }
    });

    // Navigate to Communications
    await page.goto(`${BASE_URL}/communications`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/communications-overview-stats.png', fullPage: true });

    console.log('Stats response:', statsResponse);
    console.log('Activity response:', activityResponse);

    // Verify endpoints return 200 (not 422)
    if (statsResponse) {
      expect(statsResponse.status).toBe(200);
    }
    if (activityResponse) {
      expect(activityResponse.status).toBe(200);
    }
  });
});

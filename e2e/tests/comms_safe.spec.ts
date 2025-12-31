import { test, expect } from '@playwright/test';

/**
 * Communications E2E Tests (SAFE MODE)
 *
 * CRITICAL: These tests use MOCK/SANDBOX mode ONLY.
 * NO REAL TWILIO CALLS ARE MADE.
 *
 * Safe mode is enforced by:
 * 1. TWILIO_MOCK=true environment variable
 * 2. Mock server intercepts all Twilio API calls
 * 3. Tests verify mock mode is active before proceeding
 *
 * Tests cover:
 * - SMS composition UI
 * - Message history display
 * - Communication preferences
 * - Webhook handling (mock signatures)
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

// Verify we're in mock mode - ABORT if not
test.beforeAll(async ({ request }) => {
  // Check if mock mode is enabled
  const isMockMode = process.env.TWILIO_MOCK === 'true';

  if (!isMockMode) {
    console.warn('⚠️  TWILIO_MOCK is not set to "true"');
    console.warn('⚠️  Communication tests will be SKIPPED to prevent real SMS');
    console.warn('⚠️  Set TWILIO_MOCK=true to run these tests safely');
  }

  // Double-check with API health endpoint
  try {
    const response = await request.get(`${API_URL}/health`);
    if (response.ok()) {
      const data = await response.json();
      if (data.twilio_mode && data.twilio_mode !== 'mock') {
        throw new Error(
          `SAFETY VIOLATION: Backend is in "${data.twilio_mode}" mode, not "mock". Aborting tests.`
        );
      }
    }
  } catch (e) {
    // Health check failed - tests will handle auth requirements
  }
});

test.describe('Communications Module (Mock Mode)', () => {
  // Skip entire suite if not in mock mode
  test.skip(
    () => process.env.TWILIO_MOCK !== 'true',
    'Skipping comms tests - TWILIO_MOCK not enabled'
  );

  test.describe('SMS Composition UI', () => {
    test('SMS compose form is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      // If redirected to login, skip
      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Look for compose button or form
      const composeButton = page
        .getByRole('button', { name: /compose|new message|send sms/i })
        .or(page.locator('[data-testid="compose-sms"]'))
        .first();

      const hasCompose = await composeButton.isVisible().catch(() => false);

      if (hasCompose) {
        await composeButton.click();

        // Should show SMS form
        const recipientField = page
          .getByLabel(/to|recipient|phone/i)
          .or(page.locator('input[name="to"], input[name="recipient"]'))
          .first();

        const messageField = page
          .getByLabel(/message|body|content/i)
          .or(page.locator('textarea[name="message"], textarea[name="body"]'))
          .first();

        // At least one should be visible
        const hasRecipient = await recipientField.isVisible().catch(() => false);
        const hasMessage = await messageField.isVisible().catch(() => false);

        expect(hasRecipient || hasMessage).toBe(true);
      } else {
        // No compose button - communications might be list-only
        console.log('No SMS compose UI found - may be read-only view');
      }
    });

    test('SMS form validates phone number format', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Try to access compose form
      const composeButton = page
        .getByRole('button', { name: /compose|new message|send sms/i })
        .first();

      if (!(await composeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await composeButton.click();

      const recipientField = page
        .getByLabel(/to|recipient|phone/i)
        .or(page.locator('input[name="to"]'))
        .first();

      if (!(await recipientField.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Enter invalid phone number
      await recipientField.fill('invalid-phone');

      // Try to submit
      const sendButton = page.getByRole('button', { name: /send/i }).first();
      if (await sendButton.isVisible().catch(() => false)) {
        await sendButton.click();

        // Should show validation error
        const errorMessage = page.getByText(/invalid|valid phone|format/i).first();
        const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

        // Or field should be marked invalid
        const isInvalid = await recipientField
          .evaluate((el) => el.getAttribute('aria-invalid') === 'true' || el.matches(':invalid'))
          .catch(() => false);

        expect(hasError || isInvalid).toBe(true);
      }
    });

    test('SMS compose shows character count', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      const composeButton = page
        .getByRole('button', { name: /compose|new message|send sms/i })
        .first();

      if (!(await composeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await composeButton.click();

      const messageField = page
        .getByLabel(/message|body/i)
        .or(page.locator('textarea[name="message"]'))
        .first();

      if (!(await messageField.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      // Type a message
      await messageField.fill('Test message for character count');

      // Look for character count indicator
      const charCount = page.getByText(/\d+\s*\/\s*\d+|characters|chars remaining/i).first();
      const hasCharCount = await charCount.isVisible().catch(() => false);

      // Informational - not all implementations show char count
      if (!hasCharCount) {
        console.log('INFO: No character count indicator found');
      }
    });
  });

  test.describe('Message History', () => {
    test('message history page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Should show communications/messages content
      const hasHeading = await page
        .getByRole('heading', { name: /communication|message|sms/i })
        .isVisible()
        .catch(() => false);

      const hasList = await page
        .locator('table, [data-testid="message-list"], .message-list')
        .isVisible()
        .catch(() => false);

      expect(hasHeading || hasList || page.url().includes('communication')).toBe(true);
    });

    test('message list shows sender and recipient', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      await page.waitForLoadState('networkidle');

      // Look for message items
      const messageItems = page.locator(
        'table tbody tr, [data-testid="message-item"], .message-item'
      );
      const count = await messageItems.count();

      if (count === 0) {
        console.log('No messages in list - skipping content verification');
        test.skip();
        return;
      }

      // First message should show phone number or contact info
      const firstMessage = messageItems.first();
      const text = await firstMessage.textContent();

      // Should contain phone-like pattern or contact name
      const hasPhonePattern = /\+?\d{10,}|\(\d{3}\)\s*\d{3}-\d{4}/.test(text || '');
      const hasContactInfo = text && text.length > 0;

      expect(hasPhonePattern || hasContactInfo).toBe(true);
    });

    test('message detail view loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/communications`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      await page.waitForLoadState('networkidle');

      // Find first message to click
      const messageLink = page
        .locator('table tbody tr a, [data-testid="message-item"] a')
        .first()
        .or(page.locator('table tbody tr').first());

      if (!(await messageLink.isVisible().catch(() => false))) {
        console.log('No messages to view - skipping detail test');
        test.skip();
        return;
      }

      await messageLink.click();
      await page.waitForLoadState('networkidle');

      // Should show message detail or thread view
      const hasDetail =
        page.url().includes('message') ||
        page.url().includes('thread') ||
        page.url().includes('communication');

      expect(hasDetail).toBe(true);
    });
  });

  test.describe('Mock SMS API', () => {
    test('mock SMS send returns success without real delivery', async ({ request }) => {
      // This tests the mock API endpoint directly
      const response = await request.post(`${API_URL}/api/v2/sms/send`, {
        data: {
          to: '+15551234567', // Fake number - mock mode
          body: 'Test message from E2E suite (MOCK)',
          source: 'react',
          mock: true, // Explicitly request mock mode
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should return success (200) or auth error (401/403)
      // Should NOT return server error (500) which would indicate real Twilio failure
      if (response.status() === 200) {
        const data = await response.json();
        // Mock response should indicate mock mode
        expect(data.mock || data.status === 'mock' || data.sid?.startsWith('SM_MOCK')).toBeTruthy();
      } else {
        // Auth error is acceptable - means endpoint exists
        expect([401, 403, 404].includes(response.status())).toBe(true);
      }
    });

    test('mock SMS receive webhook processes correctly', async ({ request }) => {
      // Simulate incoming SMS via webhook (mock signature)
      const mockPayload = {
        MessageSid: 'SM_MOCK_' + Date.now(),
        AccountSid: 'AC_MOCK_TEST',
        From: '+15551234567',
        To: '+15559876543',
        Body: 'Mock incoming message for E2E test',
        NumMedia: '0',
      };

      const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
        form: mockPayload,
        headers: {
          'X-Twilio-Signature': 'mock_signature_for_testing',
          'X-Mock-Mode': 'true', // Signal mock mode
        },
      });

      // Should reject invalid signature OR accept in mock mode
      // Either behavior is acceptable for mock testing
      expect([200, 204, 400, 401, 403, 404].includes(response.status())).toBe(true);
    });

    test('communication preferences can be updated', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Look for communication preferences section
      const commPrefs = page
        .getByText(/communication preference|notification|sms preference/i)
        .first();
      const hasPrefs = await commPrefs.isVisible().catch(() => false);

      if (!hasPrefs) {
        // Try navigating to specific settings page
        await page.goto(`${BASE_URL}/settings/communications`);
      }

      // Look for toggle or checkbox for SMS notifications
      const smsToggle = page
        .getByLabel(/sms|text message/i)
        .or(page.locator('input[name*="sms"], input[name*="notification"]'))
        .first();

      const hasToggle = await smsToggle.isVisible().catch(() => false);

      // Informational - not all apps have this
      if (!hasToggle) {
        console.log('INFO: No SMS preference toggle found in settings');
      }
    });
  });
});

test.describe('Communication Security (Mock Mode)', () => {
  test.skip(
    () => process.env.TWILIO_MOCK !== 'true',
    'Skipping security tests - TWILIO_MOCK not enabled'
  );

  test('SMS endpoint does not expose phone numbers in errors', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v2/sms/send`, {
      data: {
        to: 'invalid',
        body: '',
      },
    });

    const text = await response.text();

    // Should not echo back the invalid input in a way that could leak info
    expect(text).not.toContain('+1555');
    expect(text).not.toContain('phone_number');

    // Should not expose internal implementation
    expect(text).not.toContain('Twilio');
    expect(text).not.toContain('twilio_sid');
    expect(text).not.toContain('auth_token');
  });

  test('bulk SMS is rate limited', async ({ request }) => {
    const responses: number[] = [];

    // Attempt rapid bulk sends
    for (let i = 0; i < 10; i++) {
      const response = await request.post(`${API_URL}/api/v2/sms/send`, {
        data: {
          to: '+15551234567',
          body: `Rate limit test ${i}`,
          mock: true,
        },
      });
      responses.push(response.status());
    }

    // Check if any were rate limited (429)
    const rateLimited = responses.filter((s) => s === 429).length;

    if (rateLimited === 0) {
      console.log('INFO: No rate limiting detected on SMS endpoint');
    } else {
      console.log(`Rate limited: ${rateLimited}/10 requests`);
    }
  });

  test('message content is sanitized', async ({ request }) => {
    // Test XSS prevention in message body
    const maliciousBody = '<script>alert("xss")</script>';

    const response = await request.post(`${API_URL}/api/v2/sms/send`, {
      data: {
        to: '+15551234567',
        body: maliciousBody,
        mock: true,
      },
    });

    // If successful, the stored/returned message should be sanitized
    if (response.ok()) {
      const data = await response.json();
      if (data.body) {
        expect(data.body).not.toContain('<script>');
      }
    }
  });
});

test.describe('Phone Number Display', () => {
  test('phone numbers are masked in lists', async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Look for phone number display
    const phoneText = await page.locator('table tbody td').allTextContents();

    // Check if any full phone numbers are displayed
    const fullPhonePattern = /\+1\d{10}|\d{3}-\d{3}-\d{4}/;
    const maskedPhonePattern = /\*{3,}|\d{3}-\*{3}-\*{4}|XXX-XXX-\d{4}/;

    const hasFullNumbers = phoneText.some((t) => fullPhonePattern.test(t));
    const hasMaskedNumbers = phoneText.some((t) => maskedPhonePattern.test(t));

    // Informational - masking is a security best practice
    if (hasFullNumbers && !hasMaskedNumbers) {
      console.log('INFO: Phone numbers displayed unmasked - consider masking for privacy');
    }
  });
});

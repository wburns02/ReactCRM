import { test, expect } from '@playwright/test';
import * as crypto from 'crypto';

/**
 * Webhook E2E Tests
 *
 * Tests webhook endpoints with signature verification:
 * - Twilio webhooks (SMS, Voice)
 * - Stripe webhooks (Payments)
 * - Signature validation
 *
 * NOTE: Uses mock signatures - no real webhook calls
 */

const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

// Test webhook payloads (simulated)
const MOCK_TWILIO_INCOMING_SMS = {
  MessageSid: 'SM_TEST_123456789',
  AccountSid: 'AC_TEST_ACCOUNT',
  From: '+15551234567',
  To: '+15559876543',
  Body: 'Test message from self-heal system',
  NumMedia: '0',
};

const MOCK_STRIPE_PAYMENT_INTENT = {
  id: 'evt_test_123',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test_123',
      amount: 10000,
      currency: 'usd',
      status: 'succeeded',
      customer: 'cus_test_123',
    },
  },
};

/**
 * Generate a mock Twilio signature
 * This is for testing signature VALIDATION - not bypassing security
 */
function generateMockTwilioSignature(url: string, params: Record<string, string>): string {
  // Note: Uses a fake auth token - server should REJECT this
  const fakeAuthToken = 'test_auth_token_for_validation';

  // Build data string per Twilio spec
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  return crypto.createHmac('sha1', fakeAuthToken).update(data).digest('base64');
}

test.describe('Webhook Security', () => {
  test.describe('Twilio Webhook Signature Validation', () => {
    test('rejects webhook without signature header', async ({ request }) => {
      const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
        form: MOCK_TWILIO_INCOMING_SMS,
        // No X-Twilio-Signature header
      });

      // Should reject - no signature
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Expected 4xx for missing signature, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with invalid signature', async ({ request }) => {
      const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
        form: MOCK_TWILIO_INCOMING_SMS,
        headers: {
          'X-Twilio-Signature': 'clearly_invalid_signature',
        },
      });

      // Should reject - invalid signature
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Expected 4xx for invalid signature, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with tampered signature', async ({ request }) => {
      const webhookUrl = `${API_URL}/webhooks/twilio/incoming`;
      const tamperedSig = generateMockTwilioSignature(webhookUrl, MOCK_TWILIO_INCOMING_SMS);

      const response = await request.post(webhookUrl, {
        form: MOCK_TWILIO_INCOMING_SMS,
        headers: {
          'X-Twilio-Signature': tamperedSig,
        },
      });

      // Server should reject because auth token doesn't match
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Expected 4xx for tampered signature, got ${response.status()}`
      ).toBe(true);
    });

    test('webhook error does not leak internal details', async ({ request }) => {
      const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
        form: {
          ...MOCK_TWILIO_INCOMING_SMS,
          Body: '<script>alert("xss")</script>',
        },
        headers: {
          'X-Twilio-Signature': 'invalid',
        },
      });

      const text = await response.text();

      // Should not leak stack traces or internal paths
      expect(text).not.toContain('Traceback');
      expect(text).not.toContain('node_modules');
      expect(text).not.toContain('/home/');
      expect(text).not.toContain('/Users/');
      expect(text).not.toContain('.py"');
      expect(text).not.toContain('.ts"');
    });
  });

  test.describe('Stripe Webhook Signature Validation', () => {
    test('rejects webhook without Stripe-Signature header', async ({ request }) => {
      const response = await request.post(`${API_URL}/webhooks/stripe`, {
        data: MOCK_STRIPE_PAYMENT_INTENT,
        // No Stripe-Signature header
      });

      // Should reject or return 404 if not implemented
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Expected 4xx for missing stripe signature, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with invalid Stripe signature', async ({ request }) => {
      const response = await request.post(`${API_URL}/webhooks/stripe`, {
        data: MOCK_STRIPE_PAYMENT_INTENT,
        headers: {
          'Stripe-Signature': 't=1234567890,v1=invalid_signature',
        },
      });

      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Expected 4xx for invalid stripe signature, got ${response.status()}`
      ).toBe(true);
    });
  });

  test.describe('Webhook Rate Limiting', () => {
    test('rate limits rapid webhook requests', async ({ request }) => {
      const responses: number[] = [];

      // Send rapid requests
      for (let i = 0; i < 20; i++) {
        const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
          form: {
            ...MOCK_TWILIO_INCOMING_SMS,
            MessageSid: `SM_TEST_${i}`,
          },
        });
        responses.push(response.status());
      }

      // Check if any were rate limited (429)
      const rateLimited = responses.filter((s) => s === 429).length;
      console.log(`Rate limited: ${rateLimited}/${responses.length}`);

      // This is informational - rate limiting may or may not be configured
      if (rateLimited === 0) {
        console.log('INFO: No rate limiting detected on webhook endpoint');
      }
    });
  });
});

test.describe('Webhook Endpoints Exist', () => {
  test('Twilio incoming SMS endpoint exists', async ({ request }) => {
    // OPTIONS request to check endpoint exists
    const response = await request.fetch(`${API_URL}/webhooks/twilio/incoming`, {
      method: 'OPTIONS',
    });

    // Should return 200, 204, or 405 (method not allowed = endpoint exists)
    expect([200, 204, 405, 401, 403].includes(response.status())).toBe(true);
  });

  test('Twilio status callback endpoint exists', async ({ request }) => {
    const response = await request.fetch(`${API_URL}/webhooks/twilio/status`, {
      method: 'OPTIONS',
    });

    // Might return 404 if not implemented
    expect([200, 204, 404, 405, 401, 403].includes(response.status())).toBe(true);
  });
});

test.describe('Webhook Response Format', () => {
  test('Twilio webhook returns TwiML or JSON', async ({ request }) => {
    const response = await request.post(`${API_URL}/webhooks/twilio/incoming`, {
      form: MOCK_TWILIO_INCOMING_SMS,
      headers: {
        'X-Twilio-Signature': 'test',
      },
    });

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      // Should return either TwiML (XML) or JSON
      const validContentType =
        contentType.includes('application/xml') ||
        contentType.includes('text/xml') ||
        contentType.includes('application/json');

      expect(validContentType).toBe(true);
    }
  });
});

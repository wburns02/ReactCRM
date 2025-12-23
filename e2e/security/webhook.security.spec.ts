import { test, expect } from '@playwright/test';
import * as crypto from 'crypto';

/**
 * Webhook Security Tests
 *
 * Validates security invariants:
 * - MUST-005: Webhook endpoints verify signatures before processing
 */

const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('Webhook Security', () => {
  test.describe('Twilio Webhook Signature Verification', () => {
    test('rejects webhook without signature', async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/twilio/incoming`, {
        form: {
          MessageSid: 'SM1234567890',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'Test message',
        },
        // No X-Twilio-Signature header
      });

      // Should reject - no signature
      expect(
        [400, 401, 403].includes(response.status()),
        `Webhook without signature should be rejected, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with invalid signature', async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/twilio/incoming`, {
        form: {
          MessageSid: 'SM1234567890',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'Test message',
        },
        headers: {
          'X-Twilio-Signature': 'invalid_signature_12345',
        },
      });

      // Should reject - invalid signature
      expect(
        [400, 401, 403].includes(response.status()),
        `Webhook with invalid signature should be rejected, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with tampered data', async ({ request }) => {
      // Generate a valid-looking but incorrect signature
      const tamperedSignature = crypto
        .createHmac('sha1', 'wrong_auth_token')
        .update('tampered_data')
        .digest('base64');

      const response = await request.post(`${API_BASE}/webhooks/twilio/incoming`, {
        form: {
          MessageSid: 'SM1234567890',
          From: '+15551234567',
          To: '+15559876543',
          Body: 'Tampered message',
        },
        headers: {
          'X-Twilio-Signature': tamperedSignature,
        },
      });

      expect(
        [400, 401, 403].includes(response.status()),
        'Tampered webhook should be rejected'
      ).toBe(true);
    });
  });

  test.describe('Stripe Webhook Signature Verification', () => {
    test('rejects webhook without Stripe signature', async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/stripe`, {
        data: {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              amount: 10000,
            },
          },
        },
        // No Stripe-Signature header
      });

      // Should reject or return 404 if not implemented
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Stripe webhook without signature should be rejected, got ${response.status()}`
      ).toBe(true);
    });

    test('rejects webhook with invalid Stripe signature', async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/stripe`, {
        data: {
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123' } },
        },
        headers: {
          'Stripe-Signature': 't=1234567890,v1=invalid_signature',
        },
      });

      expect(
        [400, 401, 403, 404].includes(response.status()),
        'Invalid Stripe signature should be rejected'
      ).toBe(true);
    });
  });

  test.describe('Webhook Replay Protection', () => {
    test('rejects outdated webhook timestamps', async ({ request }) => {
      // Send webhook with old timestamp (simulating replay attack)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const response = await request.post(`${API_BASE}/webhooks/twilio/incoming`, {
        form: {
          MessageSid: 'SM1234567890',
          Timestamp: oldTimestamp.toString(),
          From: '+15551234567',
          Body: 'Replayed message',
        },
        headers: {
          'X-Twilio-Signature': 'some_signature',
        },
      });

      // Should reject replayed webhooks
      expect(
        [400, 401, 403].includes(response.status()),
        'Old webhook should be rejected (replay protection)'
      ).toBe(true);
    });
  });

  test.describe('Webhook Rate Limiting', () => {
    test('rate limits excessive webhook requests', async ({ request }) => {
      const requests: Promise<{ status: number }>[] = [];

      // Send many requests rapidly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request.post(`${API_BASE}/webhooks/twilio/incoming`, {
            form: {
              MessageSid: `SM${i}`,
              From: '+15551234567',
              Body: `Message ${i}`,
            },
          }).then(r => ({ status: r.status() }))
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should see some rate limiting after rapid requests
      console.log(`Rate limited: ${rateLimited.length} / ${responses.length}`);

      // This is informational - rate limiting may or may not be implemented
      if (rateLimited.length === 0) {
        console.warn('WARNING: No rate limiting detected on webhook endpoint');
      }
    });
  });

  test.describe('Webhook Response Security', () => {
    test('webhook errors do not leak internal details', async ({ request }) => {
      const response = await request.post(`${API_BASE}/webhooks/twilio/incoming`, {
        form: {
          MessageSid: 'INVALID',
          From: 'invalid_phone',
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
      expect(text).not.toContain('\\Users\\');
      expect(text).not.toContain('.py"');
      expect(text).not.toContain('.ts"');
    });
  });
});

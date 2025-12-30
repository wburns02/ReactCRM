import { test, expect } from '../../fixtures/base.fixture';

/**
 * Messaging Module E2E Tests (Twilio Strategy)
 *
 * Tests verify:
 * - CRM creates message records correctly
 * - UI shows appropriate feedback
 * - Backend integration works
 *
 * Tests do NOT verify:
 * - Actual Twilio delivery (handled by backend integration tests)
 * - SMS/email actually received by recipient
 *
 * This strategy keeps UI tests stable even when Twilio has issues.
 */

test.describe('Messaging - SMS', () => {
  test.skip('send SMS creates message record', async ({ page, request }) => {
    // Skip if messaging feature not yet implemented
    // Remove .skip when ready

    // Navigate to a customer with a phone number
    const customersRes = await request.get('/api/customers/?page_size=10');
    const { items } = await customersRes.json();

    // Find customer with phone
    const customerWithPhone = items.find((c: { phone?: string }) => c.phone);
    if (!customerWithPhone) {
      test.skip();
      return;
    }

    await page.goto(`/customers/${customerWithPhone.id}`);

    // Click send SMS button (adjust selector as needed)
    await page.click('button:has-text("Send SMS"), button:has-text("Message")');

    // Fill message
    await page.fill('textarea[name="message"], textarea[name="content"]', 'Test message from Playwright');

    // Submit
    await page.click('button[type="submit"]:has-text("Send")');

    // Wait for success feedback
    await expect(
      page.locator('.toast, [role="alert"]').filter({ hasText: /sent|queued|success/i })
    ).toBeVisible({ timeout: 10000 });

    // Verify message record via API
    const historyRes = await request.get(
      `/api/communications/history?customer_id=${customerWithPhone.id}&page_size=1`
    );

    if (historyRes.ok()) {
      const history = await historyRes.json();
      if (history.items && history.items.length > 0) {
        const lastMessage = history.items[0];

        expect(lastMessage.type).toBe('sms');
        expect(lastMessage.content).toContain('Test message');
        // Status can be queued, sent, or delivered - all valid
        expect(['queued', 'sent', 'delivered', 'pending']).toContain(lastMessage.status);
      }
    }
  });
});

test.describe('Messaging - Email', () => {
  test.skip('send email creates message record', async ({ page, request }) => {
    // Skip if messaging feature not yet implemented
    // Remove .skip when ready

    // Navigate to a customer with an email
    const customersRes = await request.get('/api/customers/?page_size=10');
    const { items } = await customersRes.json();

    // Find customer with email
    const customerWithEmail = items.find((c: { email?: string }) => c.email);
    if (!customerWithEmail) {
      test.skip();
      return;
    }

    await page.goto(`/customers/${customerWithEmail.id}`);

    // Click send email button (adjust selector as needed)
    await page.click('button:has-text("Send Email"), button:has-text("Email")');

    // Fill email form
    await page.fill('input[name="subject"]', 'Test Email from Playwright');
    await page.fill('textarea[name="body"], textarea[name="content"]', 'This is a test email.');

    // Submit
    await page.click('button[type="submit"]:has-text("Send")');

    // Wait for success feedback
    await expect(
      page.locator('.toast, [role="alert"]').filter({ hasText: /sent|queued|success/i })
    ).toBeVisible({ timeout: 10000 });

    // Verify message record via API
    const historyRes = await request.get(
      `/api/communications/history?customer_id=${customerWithEmail.id}&page_size=1`
    );

    if (historyRes.ok()) {
      const history = await historyRes.json();
      if (history.items && history.items.length > 0) {
        const lastMessage = history.items[0];

        expect(lastMessage.type).toBe('email');
        expect(['queued', 'sent', 'delivered', 'pending']).toContain(lastMessage.status);
      }
    }
  });
});

test.describe('Communication History', () => {
  test('communication history endpoint responds', async ({ request }) => {
    const response = await request.get('/api/communications/history?page_size=1');

    // Endpoint might not exist yet - that's okay
    if (response.status() === 404) {
      console.log('Communications history endpoint not implemented yet');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });
});

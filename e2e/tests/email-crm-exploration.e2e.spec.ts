import { test, expect } from '@playwright/test';

/**
 * Email CRM Integration - Exploration Tests
 * Exploring current state of email functionality
 */

const BASE_URL = 'https://react.ecbtx.com';
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Email CRM Current State Exploration', () => {

  test('Explore Communications page structure', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/(dashboard|onboarding|payroll)/, { timeout: 15000 });

    // Navigate to Communications
    await page.goto(`${BASE_URL}/communications`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'test-results/communications-overview.png', fullPage: true });

    // Log page content
    const pageContent = await page.textContent('body');
    console.log('Communications Overview page content (truncated):', pageContent?.substring(0, 500));

    // Check for key elements
    const hasEmailInbox = await page.locator('text=/Email/i').count();
    const hasSMSInbox = await page.locator('text=/SMS/i').count();
    const hasComposeButton = await page.locator('button:has-text("Send"), button:has-text("Compose")').count();

    console.log('Email related elements:', hasEmailInbox);
    console.log('SMS related elements:', hasSMSInbox);
    console.log('Compose buttons:', hasComposeButton);
  });

  test('Explore Email Inbox page', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Navigate to Email Inbox
    await page.goto(`${BASE_URL}/communications/email-inbox`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/email-inbox.png', fullPage: true });

    // Log emails found
    const pageContent = await page.textContent('body');
    console.log('Email Inbox content (truncated):', pageContent?.substring(0, 500));

    // Check for compose button
    const composeButton = page.locator('button:has-text("Compose"), button:has-text("Send Email"), button:has-text("New Email")');
    console.log('Compose button found:', await composeButton.count());
  });

  test('Try to compose email and capture network', async ({ page }) => {
    // Capture network requests
    const requests: { url: string; method: string; status?: number }[] = [];

    page.on('response', response => {
      if (response.url().includes('/communications') || response.url().includes('/email')) {
        requests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status()
        });
      }
    });

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Navigate to Communications
    await page.goto(`${BASE_URL}/communications`);
    await page.waitForLoadState('networkidle');

    // Look for Send Email button
    const sendEmailButtons = page.locator('button:has-text("Send Email"), button:has-text("Email"), a:has-text("Send Email")');
    const buttonCount = await sendEmailButtons.count();
    console.log('Send Email buttons found:', buttonCount);

    if (buttonCount > 0) {
      // Click first available button
      await sendEmailButtons.first().click();
      await page.waitForTimeout(1000);

      // Take screenshot of compose modal
      await page.screenshot({ path: 'test-results/email-compose-modal.png', fullPage: true });

      // Check for input fields
      const toInput = await page.locator('input[type="email"], input[placeholder*="email"], input[name="to"]').count();
      const subjectInput = await page.locator('input[placeholder*="subject"], input[name="subject"]').count();
      const bodyInput = await page.locator('textarea').count();

      console.log('To field found:', toInput);
      console.log('Subject field found:', subjectInput);
      console.log('Body textarea found:', bodyInput);
    }

    // Log network requests
    console.log('Network requests captured:', requests);
  });

  test('Check customer detail for email history', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Go to customers page
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on first customer
    const customerLink = page.locator('a[href*="/customers/"], tr[data-customer-id], .customer-row').first();
    if (await customerLink.count() > 0) {
      await customerLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take screenshot of customer detail
      await page.screenshot({ path: 'test-results/customer-detail.png', fullPage: true });

      // Check for communications section
      const pageContent = await page.textContent('body');
      const hasCommunicationsSection = pageContent?.toLowerCase().includes('communication') || pageContent?.toLowerCase().includes('message') || pageContent?.toLowerCase().includes('email');
      console.log('Customer detail has communications section:', hasCommunicationsSection);

      // Look for email/SMS buttons on customer page
      const emailButton = await page.locator('button:has-text("Email"), button:has-text("Send Email")').count();
      const smsButton = await page.locator('button:has-text("SMS"), button:has-text("Text")').count();
      console.log('Email button on customer page:', emailButton);
      console.log('SMS button on customer page:', smsButton);
    } else {
      console.log('No customer links found');
    }
  });

  test('Test email send API directly', async ({ request }) => {
    // First we need to login and get auth cookie
    const loginResponse = await request.post('https://react-crm-api-production.up.railway.app/api/v2/auth/login', {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });

    console.log('Login status:', loginResponse.status());

    if (loginResponse.status() === 200) {
      // Try to send an email
      const emailResponse = await request.post('https://react-crm-api-production.up.railway.app/api/v2/communications/email/send', {
        data: {
          to: 'test@example.com',
          subject: 'Test Email from Playwright',
          body: 'This is a test email sent from Playwright exploration test.',
          source: 'react'
        }
      });

      console.log('Email send status:', emailResponse.status());

      if (emailResponse.status() === 200 || emailResponse.status() === 201) {
        const data = await emailResponse.json();
        console.log('Email response:', data);
      } else {
        const errorText = await emailResponse.text();
        console.log('Email error:', errorText);
      }
    }
  });
});

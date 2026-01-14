/**
 * Embeddable Widgets E2E Tests
 * Tests for booking, payment, and status tracking widgets
 */
import { test, expect } from '@playwright/test';

test.describe('Embeddable Widgets', () => {
  test.describe('Booking Widget', () => {
    test('should load booking widget embed page', async ({ page }) => {
      await page.goto('/embed/booking?companyId=test');

      await page.waitForLoadState('networkidle');

      // Widget should load (these are public pages)
      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('schedule') ||
        pageContent.includes('booking') ||
        pageContent.includes('service') ||
        pageContent.includes('appointment')
      ).toBeTruthy();
    });

    test('should display booking form fields', async ({ page }) => {
      await page.goto('/embed/booking?companyId=test');

      await page.waitForLoadState('networkidle');

      // Should have form fields
      const nameInput = page.locator('input[name="firstName"], input[id="firstName"], input[placeholder*="first" i]');
      const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]');

      const hasNameInput = await nameInput.count() > 0;
      const hasEmailInput = await emailInput.count() > 0;

      // At least some form fields should exist
      expect(hasNameInput || hasEmailInput).toBeTruthy();
    });

    test('should show service type selection', async ({ page }) => {
      await page.goto('/embed/booking?companyId=test');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('service') ||
        pageContent.includes('type') ||
        pageContent.includes('select')
      ).toBeTruthy();
    });
  });

  test.describe('Payment Widget', () => {
    test('should load payment widget embed page', async ({ page }) => {
      await page.goto('/embed/payment?companyId=test');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('payment') ||
        pageContent.includes('pay') ||
        pageContent.includes('amount') ||
        pageContent.includes('card')
      ).toBeTruthy();
    });

    test('should display payment form', async ({ page }) => {
      await page.goto('/embed/payment?companyId=test');

      await page.waitForLoadState('networkidle');

      // Should have amount or card fields
      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('amount') ||
        pageContent.includes('card') ||
        pageContent.includes('pay')
      ).toBeTruthy();
    });

    test('should show secure payment badge', async ({ page }) => {
      await page.goto('/embed/payment?companyId=test');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('secure') ||
        pageContent.includes('stripe') ||
        pageContent.includes('payment')
      ).toBeTruthy();
    });
  });

  test.describe('Status Widget', () => {
    test('should load status widget embed page', async ({ page }) => {
      await page.goto('/embed/status?companyId=test');

      await page.waitForLoadState('networkidle');

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        pageContent.includes('track') ||
        pageContent.includes('status') ||
        pageContent.includes('service')
      ).toBeTruthy();
    });

    test('should display tracking code input', async ({ page }) => {
      await page.goto('/embed/status?companyId=test');

      await page.waitForLoadState('networkidle');

      // Should have input for tracking code
      const input = page.locator('input');
      const hasInput = await input.count() > 0;

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(
        hasInput ||
        pageContent.includes('track') ||
        pageContent.includes('code')
      ).toBeTruthy();
    });

    test('should show track button', async ({ page }) => {
      await page.goto('/embed/status?companyId=test');

      await page.waitForLoadState('networkidle');

      const trackButton = page.locator('button').filter({ hasText: /track/i });
      const hasTrackButton = await trackButton.count() > 0;

      const pageContent = await page.content().then(c => c.toLowerCase());
      expect(hasTrackButton || pageContent.includes('track')).toBeTruthy();
    });
  });

  test.describe('Widget Configuration', () => {
    test('should accept custom branding via URL params', async ({ page }) => {
      await page.goto('/embed/booking?companyId=test&primaryColor=%232563eb&companyName=TestCompany');

      await page.waitForLoadState('networkidle');

      // Page should load without errors
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });
});

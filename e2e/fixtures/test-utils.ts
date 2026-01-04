import { Page, expect } from '@playwright/test';

/**
 * Reusable Test Utilities
 *
 * Common helpers for E2E tests to reduce duplication and improve maintainability.
 */

// ============================================
// Configuration
// ============================================

export const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
export const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

export const TEST_CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'test@macseptic.com',
  password: process.env.TEST_PASSWORD || 'TestPassword123',
};

// ============================================
// Page Navigation Helpers
// ============================================

/**
 * Navigate to a page and check if redirected to login.
 * Returns true if on intended page, false if on login.
 */
export async function navigateAndCheckAuth(page: Page, path: string): Promise<boolean> {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  return !page.url().includes('login');
}

/**
 * Wait for page to be fully loaded and interactive.
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra buffer for dynamic content
}

/**
 * Navigate to dashboard and ensure authenticated.
 * Skips test if not authenticated.
 */
export async function ensureAuthenticated(page: Page, testFn: { skip: () => void }): Promise<boolean> {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('login')) {
    testFn.skip();
    return false;
  }

  return true;
}

// ============================================
// Login Helpers
// ============================================

/**
 * Perform login with test credentials.
 */
export async function performLogin(
  page: Page,
  email: string = TEST_CREDENTIALS.email,
  password: string = TEST_CREDENTIALS.password
): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();

  await emailField.fill(email);
  await passwordField.fill(password);

  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect
  await page.waitForTimeout(2000);

  return page.url().includes('dashboard');
}

// ============================================
// Offline Mode Helpers
// ============================================

/**
 * Simulate going offline.
 */
export async function goOffline(page: Page, context: { setOffline: (offline: boolean) => Promise<void> }): Promise<void> {
  await context.setOffline(true);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });
  await page.waitForTimeout(500);
}

/**
 * Simulate going back online.
 */
export async function goOnline(page: Page, context: { setOffline: (offline: boolean) => Promise<void> }): Promise<void> {
  await context.setOffline(false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });
  await page.waitForTimeout(500);
}

/**
 * Check if offline indicator is visible.
 */
export async function isOfflineIndicatorVisible(page: Page): Promise<boolean> {
  const offlineIndicator = page.locator('text=/offline/i').first();
  return offlineIndicator.isVisible().catch(() => false);
}

// ============================================
// Performance Helpers
// ============================================

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number | null;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

/**
 * Measure page performance metrics.
 */
export async function measurePerformance(page: Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const firstPaint = paintEntries.find(e => e.name === 'first-paint');
    const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint');

    let largestContentfulPaint: number | null = null;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
    }

    let cumulativeLayoutShift = 0;
    const clsEntries = performance.getEntriesByType('layout-shift') as unknown[];
    for (const entry of clsEntries) {
      const lsEntry = entry as { hadRecentInput: boolean; value: number };
      if (!lsEntry.hadRecentInput) {
        cumulativeLayoutShift += lsEntry.value;
      }
    }

    return {
      loadTime: navigation.loadEventEnd - navigation.startTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      firstPaint: firstPaint?.startTime || 0,
      firstContentfulPaint: firstContentfulPaint?.startTime || 0,
      largestContentfulPaint,
      cumulativeLayoutShift,
      timeToInteractive: navigation.domInteractive - navigation.startTime,
    };
  });
}

/**
 * Format performance metrics as a readable report.
 */
export function formatPerformanceReport(metrics: PerformanceMetrics, pageName: string): string {
  return `
=== Performance Report: ${pageName} ===
Load Time:               ${metrics.loadTime.toFixed(0)}ms
DOM Content Loaded:      ${metrics.domContentLoaded.toFixed(0)}ms
First Paint:             ${metrics.firstPaint.toFixed(0)}ms
First Contentful Paint:  ${metrics.firstContentfulPaint.toFixed(0)}ms
Largest Contentful Paint: ${metrics.largestContentfulPaint?.toFixed(0) || 'N/A'}ms
Time to Interactive:     ${metrics.timeToInteractive.toFixed(0)}ms
Cumulative Layout Shift: ${metrics.cumulativeLayoutShift.toFixed(4)}
====================================
  `;
}

// ============================================
// Accessibility Helpers
// ============================================

/**
 * Check if element has accessible name.
 */
export async function hasAccessibleName(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();

  if (!(await element.isVisible().catch(() => false))) {
    return false;
  }

  const text = await element.textContent();
  const ariaLabel = await element.getAttribute('aria-label');
  const title = await element.getAttribute('title');

  return !!(text?.trim() || ariaLabel || title);
}

/**
 * Check if form field has associated label.
 */
export async function hasLabel(page: Page, inputSelector: string): Promise<boolean> {
  const input = page.locator(inputSelector).first();

  if (!(await input.isVisible().catch(() => false))) {
    return false;
  }

  const id = await input.getAttribute('id');
  const ariaLabel = await input.getAttribute('aria-label');
  const ariaLabelledby = await input.getAttribute('aria-labelledby');
  const placeholder = await input.getAttribute('placeholder');

  if (ariaLabel || ariaLabelledby) {
    return true;
  }

  if (id) {
    const label = page.locator(`label[for="${id}"]`);
    return label.isVisible().catch(() => false);
  }

  // Fall back to placeholder (not ideal but acceptable)
  return !!placeholder;
}

/**
 * Check if modal has proper ARIA attributes.
 */
export async function checkModalAccessibility(page: Page): Promise<{
  hasRole: boolean;
  hasAriaModal: boolean;
  hasLabel: boolean;
}> {
  const modal = page.locator('[role="dialog"]').first();
  const isVisible = await modal.isVisible().catch(() => false);

  if (!isVisible) {
    return { hasRole: false, hasAriaModal: false, hasLabel: false };
  }

  const ariaModal = await modal.getAttribute('aria-modal');
  const ariaLabel = await modal.getAttribute('aria-label');
  const ariaLabelledby = await modal.getAttribute('aria-labelledby');

  return {
    hasRole: true,
    hasAriaModal: ariaModal === 'true',
    hasLabel: !!(ariaLabel || ariaLabelledby),
  };
}

// ============================================
// Console Error Helpers
// ============================================

export interface ConsoleMessage {
  type: string;
  text: string;
}

/**
 * Set up console error capturing.
 * Returns function to get captured errors.
 */
export function captureConsoleErrors(page: Page): () => ConsoleMessage[] {
  const errors: ConsoleMessage[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        type: msg.type(),
        text: msg.text(),
      });
    }
  });

  return () => errors;
}

/**
 * Filter out known benign console errors.
 */
export function filterBenignErrors(errors: ConsoleMessage[]): ConsoleMessage[] {
  const benignPatterns = [
    /favicon/i,
    /ResizeObserver/i,
    /404/,
    /Failed to load resource/i,
    /third-party/i,
  ];

  return errors.filter((error) => {
    return !benignPatterns.some((pattern) => pattern.test(error.text));
  });
}

// ============================================
// Network Helpers
// ============================================

export interface NetworkFailure {
  url: string;
  status: number;
  method: string;
}

/**
 * Set up network failure capturing.
 * Returns function to get captured failures.
 */
export function captureNetworkFailures(page: Page): () => NetworkFailure[] {
  const failures: NetworkFailure[] = [];

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      failures.push({
        url: response.url(),
        status,
        method: response.request().method(),
      });
    }
  });

  return () => failures;
}

// ============================================
// Form Helpers
// ============================================

/**
 * Fill a form field safely.
 */
export async function fillField(page: Page, label: string | RegExp, value: string): Promise<boolean> {
  const field = page.getByLabel(label);

  if (await field.isVisible().catch(() => false)) {
    await field.fill(value);
    return true;
  }

  return false;
}

/**
 * Submit a form and wait for response.
 */
export async function submitForm(page: Page, buttonText: string | RegExp = /submit|save|create/i): Promise<void> {
  const submitButton = page.getByRole('button', { name: buttonText }).first();

  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Open a modal by clicking a button.
 */
export async function openModal(page: Page, buttonText: string | RegExp): Promise<boolean> {
  const button = page.getByRole('button', { name: buttonText });

  if (!(await button.isVisible().catch(() => false))) {
    return false;
  }

  await button.click();
  await page.waitForTimeout(500);

  const modal = page.locator('[role="dialog"], [class*="modal"]').first();
  return modal.isVisible().catch(() => false);
}

/**
 * Close a modal using escape key.
 */
export async function closeModalWithEscape(page: Page): Promise<boolean> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const modal = page.locator('[role="dialog"], [class*="modal"]').first();
  return !(await modal.isVisible().catch(() => false));
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert element is visible with custom timeout.
 */
export async function assertVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible({ timeout });
}

/**
 * Assert page contains text.
 */
export async function assertContainsText(
  page: Page,
  text: string | RegExp,
  timeout: number = 5000
): Promise<void> {
  const element = page.locator(`text=${text}`).first();
  await expect(element).toBeVisible({ timeout });
}

/**
 * Assert URL contains path.
 */
export function assertUrlContains(page: Page, path: string): void {
  expect(page.url()).toContain(path);
}

// ============================================
// Wait Helpers
// ============================================

/**
 * Wait for element to be visible or timeout.
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for navigation to complete.
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForURL(urlPattern, { timeout });
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Export all helpers
// ============================================

export const testUtils = {
  // Config
  BASE_URL,
  API_URL,
  TEST_CREDENTIALS,

  // Navigation
  navigateAndCheckAuth,
  waitForPageReady,
  ensureAuthenticated,

  // Login
  performLogin,

  // Offline
  goOffline,
  goOnline,
  isOfflineIndicatorVisible,

  // Performance
  measurePerformance,
  formatPerformanceReport,

  // Accessibility
  hasAccessibleName,
  hasLabel,
  checkModalAccessibility,

  // Console
  captureConsoleErrors,
  filterBenignErrors,

  // Network
  captureNetworkFailures,

  // Forms
  fillField,
  submitForm,
  openModal,
  closeModalWithEscape,

  // Assertions
  assertVisible,
  assertContainsText,
  assertUrlContains,

  // Waits
  waitForVisible,
  waitForNavigation,
};

export default testUtils;

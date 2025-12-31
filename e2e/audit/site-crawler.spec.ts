import { test, expect, type Page, type ConsoleMessage, type Response, type Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * FULL SITE AUDIT - Comprehensive Crawler
 *
 * Systematically crawls every page/route, clicks every link/button, and captures:
 * - All 404s, 422s, 500s
 * - All console.error() messages
 * - All network failures
 * - All unique errors in structured format
 *
 * Run: npx playwright test e2e/audit/site-crawler.spec.ts --project=audit
 */

const PRODUCTION_URL = 'https://react.ecbtx.com';
const BASE_URL = process.env.BASE_URL || PRODUCTION_URL;
const API_URL = process.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

// All routes to audit
const ALL_ROUTES = [
  '/dashboard',
  '/prospects',
  '/customers',
  '/work-orders',
  '/schedule',
  '/technicians',
  '/fleet',
  '/equipment',
  '/inventory',
  '/tickets',
  '/invoices',
  '/payments',
  '/reports',
  '/email-marketing',
  '/integrations',
  '/users',
  '/admin',
  '/intel',
  '/settings',
];

// Audit data structures
interface AuditError {
  type: 'console' | 'network' | 'api' | 'navigation' | 'interaction';
  severity: 'error' | 'warning' | 'info';
  message: string;
  url: string;
  route: string;
  timestamp: string;
  statusCode?: number;
  stackTrace?: string;
  element?: string;
}

interface RouteAudit {
  route: string;
  url: string;
  status: 'success' | 'error' | 'auth-required';
  loadTime: number;
  consoleErrors: number;
  networkErrors: number;
  apiErrors: number;
  clickableElements: number;
  interactionsAttempted: number;
  interactionsFailed: number;
}

interface AuditReport {
  timestamp: string;
  baseUrl: string;
  apiUrl: string;
  duration: number;
  summary: {
    totalRoutes: number;
    successfulRoutes: number;
    failedRoutes: number;
    authRequiredRoutes: number;
    totalConsoleErrors: number;
    totalNetworkErrors: number;
    totalApiErrors: number;
    totalInteractionsFailed: number;
  };
  routes: RouteAudit[];
  errors: AuditError[];
  recommendations: string[];
}

// Global audit state
const auditErrors: AuditError[] = [];
const routeAudits: RouteAudit[] = [];

function addError(error: Omit<AuditError, 'timestamp'>) {
  auditErrors.push({
    ...error,
    timestamp: new Date().toISOString(),
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Full Site Audit', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create page with auth state if available
    const context = await browser.newContext({
      storageState: fs.existsSync('.auth/user.json') ? '.auth/user.json' : undefined,
    });
    page = await context.newPage();

    // Set up global error listeners
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore some common non-critical errors
        if (!text.includes('favicon.ico') && !text.includes('ResizeObserver')) {
          addError({
            type: 'console',
            severity: 'error',
            message: text,
            url: page.url(),
            route: new URL(page.url()).pathname.replace('/app', ''),
          });
        }
      }
    });

    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();

      // Track API errors
      if (url.includes('/api/') && (status >= 400 || status === 0)) {
        addError({
          type: 'api',
          severity: status >= 500 ? 'error' : 'warning',
          message: `API ${response.request().method()} ${url} returned ${status}`,
          url,
          route: new URL(page.url()).pathname.replace('/app', ''),
          statusCode: status,
        });
      }
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure) {
        addError({
          type: 'network',
          severity: 'error',
          message: `Request failed: ${request.url()} - ${failure.errorText}`,
          url: request.url(),
          route: new URL(page.url()).pathname.replace('/app', ''),
        });
      }
    });
  });

  test.afterAll(async () => {
    // Generate and save audit report
    const report = generateReport();

    // Save as JSON
    const outputDir = 'audit-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(outputDir, `audit-report-${timestamp}.json`),
      JSON.stringify(report, null, 2)
    );

    // Save as Markdown
    fs.writeFileSync(
      path.join(outputDir, `audit-report-${timestamp}.md`),
      generateMarkdownReport(report)
    );

    console.log('\n========== AUDIT SUMMARY ==========');
    console.log(`Total Routes: ${report.summary.totalRoutes}`);
    console.log(`Successful: ${report.summary.successfulRoutes}`);
    console.log(`Failed: ${report.summary.failedRoutes}`);
    console.log(`Auth Required: ${report.summary.authRequiredRoutes}`);
    console.log(`Console Errors: ${report.summary.totalConsoleErrors}`);
    console.log(`Network Errors: ${report.summary.totalNetworkErrors}`);
    console.log(`API Errors: ${report.summary.totalApiErrors}`);
    console.log('====================================\n');

    await page.context().close();
  });

  // Audit each route
  for (const route of ALL_ROUTES) {
    test(`Audit route: ${route}`, async () => {
      const startTime = Date.now();
      const fullUrl = `${BASE_URL}${route}`;

      const routeAudit: RouteAudit = {
        route,
        url: fullUrl,
        status: 'success',
        loadTime: 0,
        consoleErrors: 0,
        networkErrors: 0,
        apiErrors: 0,
        clickableElements: 0,
        interactionsAttempted: 0,
        interactionsFailed: 0,
      };

      // Clear previous route's error counts
      const errorCountBefore = auditErrors.length;

      try {
        // Navigate to route
        const response = await page.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Check for redirects to login
        if (page.url().includes('login') || page.url().includes('auth')) {
          routeAudit.status = 'auth-required';
          console.log(`  [AUTH] ${route} - requires authentication`);
        } else if (response?.status() && response.status() >= 400) {
          routeAudit.status = 'error';
          addError({
            type: 'navigation',
            severity: 'error',
            message: `Route ${route} returned ${response.status()}`,
            url: fullUrl,
            route,
            statusCode: response.status(),
          });
        } else {
          // Wait for page to be fully loaded
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

          // Check for error states in the UI
          const errorBanner = await page.locator('[role="alert"], .error-boundary, .error-message').first().isVisible().catch(() => false);
          if (errorBanner) {
            const errorText = await page.locator('[role="alert"], .error-boundary, .error-message').first().textContent().catch(() => 'Unknown error');
            addError({
              type: 'navigation',
              severity: 'warning',
              message: `Error banner visible on ${route}: ${errorText?.substring(0, 200)}`,
              url: fullUrl,
              route,
            });
          }

          // Count clickable elements
          const clickables = await page.locator('button:visible, a:visible, [role="button"]:visible').count();
          routeAudit.clickableElements = clickables;

          // Test key interactions (non-destructive only)
          await testNonDestructiveInteractions(page, route, routeAudit);
        }

        routeAudit.loadTime = Date.now() - startTime;

      } catch (error) {
        routeAudit.status = 'error';
        addError({
          type: 'navigation',
          severity: 'error',
          message: `Failed to load ${route}: ${error instanceof Error ? error.message : String(error)}`,
          url: fullUrl,
          route,
          stackTrace: error instanceof Error ? error.stack : undefined,
        });
      }

      // Count errors for this route
      const newErrors = auditErrors.slice(errorCountBefore);
      routeAudit.consoleErrors = newErrors.filter(e => e.type === 'console').length;
      routeAudit.networkErrors = newErrors.filter(e => e.type === 'network').length;
      routeAudit.apiErrors = newErrors.filter(e => e.type === 'api').length;

      routeAudits.push(routeAudit);

      // Log progress
      const statusIcon = routeAudit.status === 'success' ? '✓' : routeAudit.status === 'auth-required' ? '🔒' : '✗';
      console.log(`  ${statusIcon} ${route} - ${routeAudit.loadTime}ms, ${routeAudit.consoleErrors} console errors, ${routeAudit.apiErrors} API errors`);
    });
  }

  test('Audit API endpoints directly', async () => {
    const endpoints = [
      '/customers/',
      '/work-orders/',
      '/technicians/',
      '/invoices/',
      '/dashboard/summary',
      '/ringcentral/status',
    ];

    console.log('\n--- API Endpoint Audit ---');

    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`${API_URL}${endpoint}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        const status = response.status();
        const statusIcon = status === 200 ? '✓' : status === 401 ? '🔒' : '✗';
        console.log(`  ${statusIcon} ${endpoint} - ${status}`);

        if (status >= 400 && status !== 401) {
          addError({
            type: 'api',
            severity: status >= 500 ? 'error' : 'warning',
            message: `API ${endpoint} returned ${status}`,
            url: `${API_URL}${endpoint}`,
            route: 'api-audit',
            statusCode: status,
          });
        }
      } catch (error) {
        console.log(`  ✗ ${endpoint} - Failed: ${error instanceof Error ? error.message : String(error)}`);
        addError({
          type: 'api',
          severity: 'error',
          message: `API ${endpoint} request failed: ${error instanceof Error ? error.message : String(error)}`,
          url: `${API_URL}${endpoint}`,
          route: 'api-audit',
        });
      }
    }
  });
});

async function testNonDestructiveInteractions(page: Page, route: string, audit: RouteAudit) {
  // Test clicking tabs, dropdowns, and read-only buttons
  const safeInteractions = [
    { selector: '[role="tab"]', name: 'tabs' },
    { selector: 'button:has-text("View"), button:has-text("Details")', name: 'view buttons' },
    { selector: '[data-testid="view-toggle"], [aria-label*="view"]', name: 'view toggles' },
  ];

  for (const interaction of safeInteractions) {
    try {
      const elements = await page.locator(interaction.selector).all();
      for (const element of elements.slice(0, 3)) { // Limit to first 3 of each type
        audit.interactionsAttempted++;
        try {
          await element.click({ timeout: 2000 });
          await page.waitForTimeout(500); // Brief pause after click
        } catch {
          audit.interactionsFailed++;
        }
      }
    } catch {
      // Selector not found, continue
    }
  }
}

function generateReport(): AuditReport {
  const successfulRoutes = routeAudits.filter(r => r.status === 'success').length;
  const failedRoutes = routeAudits.filter(r => r.status === 'error').length;
  const authRequiredRoutes = routeAudits.filter(r => r.status === 'auth-required').length;

  const recommendations: string[] = [];

  // Generate recommendations based on findings
  const apiErrors = auditErrors.filter(e => e.type === 'api');
  if (apiErrors.length > 0) {
    recommendations.push(`Fix ${apiErrors.length} API errors - check backend availability and error handling`);
  }

  const consoleErrors = auditErrors.filter(e => e.type === 'console');
  if (consoleErrors.length > 0) {
    recommendations.push(`Address ${consoleErrors.length} console errors - may indicate React rendering issues`);
  }

  const networkErrors = auditErrors.filter(e => e.type === 'network');
  if (networkErrors.length > 0) {
    recommendations.push(`Investigate ${networkErrors.length} network failures - check CORS, DNS, and connectivity`);
  }

  const slowRoutes = routeAudits.filter(r => r.loadTime > 5000);
  if (slowRoutes.length > 0) {
    recommendations.push(`Optimize ${slowRoutes.length} slow routes (>5s load time): ${slowRoutes.map(r => r.route).join(', ')}`);
  }

  return {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    duration: routeAudits.reduce((sum, r) => sum + r.loadTime, 0),
    summary: {
      totalRoutes: routeAudits.length,
      successfulRoutes,
      failedRoutes,
      authRequiredRoutes,
      totalConsoleErrors: auditErrors.filter(e => e.type === 'console').length,
      totalNetworkErrors: auditErrors.filter(e => e.type === 'network').length,
      totalApiErrors: auditErrors.filter(e => e.type === 'api').length,
      totalInteractionsFailed: routeAudits.reduce((sum, r) => sum + r.interactionsFailed, 0),
    },
    routes: routeAudits,
    errors: auditErrors,
    recommendations,
  };
}

function generateMarkdownReport(report: AuditReport): string {
  let md = `# Site Audit Report\n\n`;
  md += `**Generated:** ${report.timestamp}\n`;
  md += `**Base URL:** ${report.baseUrl}\n`;
  md += `**API URL:** ${report.apiUrl}\n`;
  md += `**Total Duration:** ${(report.duration / 1000).toFixed(1)}s\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Routes | ${report.summary.totalRoutes} |\n`;
  md += `| Successful | ${report.summary.successfulRoutes} |\n`;
  md += `| Failed | ${report.summary.failedRoutes} |\n`;
  md += `| Auth Required | ${report.summary.authRequiredRoutes} |\n`;
  md += `| Console Errors | ${report.summary.totalConsoleErrors} |\n`;
  md += `| Network Errors | ${report.summary.totalNetworkErrors} |\n`;
  md += `| API Errors | ${report.summary.totalApiErrors} |\n\n`;

  md += `## Route Details\n\n`;
  md += `| Route | Status | Load Time | Console Errors | API Errors |\n`;
  md += `|-------|--------|-----------|----------------|------------|\n`;
  for (const route of report.routes) {
    const statusEmoji = route.status === 'success' ? '✅' : route.status === 'auth-required' ? '🔒' : '❌';
    md += `| ${route.route} | ${statusEmoji} ${route.status} | ${route.loadTime}ms | ${route.consoleErrors} | ${route.apiErrors} |\n`;
  }
  md += '\n';

  if (report.errors.length > 0) {
    md += `## Errors (${report.errors.length})\n\n`;

    // Group errors by type
    const errorsByType = report.errors.reduce((acc, err) => {
      acc[err.type] = acc[err.type] || [];
      acc[err.type].push(err);
      return acc;
    }, {} as Record<string, AuditError[]>);

    for (const [type, errors] of Object.entries(errorsByType)) {
      md += `### ${type.toUpperCase()} Errors (${errors.length})\n\n`;
      for (const error of errors.slice(0, 10)) { // Limit to first 10 per type
        md += `- **${error.route}**: ${error.message.substring(0, 200)}${error.message.length > 200 ? '...' : ''}\n`;
        if (error.statusCode) md += `  - Status: ${error.statusCode}\n`;
      }
      if (errors.length > 10) {
        md += `- ... and ${errors.length - 10} more\n`;
      }
      md += '\n';
    }
  }

  if (report.recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
  }

  return md;
}

/**
 * Geocivix Portal API Explorer
 * Captures API endpoints and request/response patterns
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const PORTAL_URL = 'https://williamson.geocivix.com/secure/';
const USERNAME = 'willwalterburns@gmail.com';
const PASSWORD = '#Espn2025';

interface APICapture {
  url: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: any;
  timestamp: string;
}

const captures: APICapture[] = [];

async function exploreGeocivix() {
  console.log('Starting Geocivix Portal Exploration...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('geocivix') || url.includes('api')) {
      console.log('[REQUEST] ' + request.method() + ' ' + url);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    const method = response.request().method();

    if (url.includes('geocivix') && (url.includes('api') || url.includes('search') || url.includes('permit') || url.includes('query') || url.includes('Search') || url.includes('Permit'))) {
      try {
        const body = await response.text();
        captures.push({
          url,
          method,
          responseStatus: response.status(),
          responseBody: body.substring(0, 5000),
          timestamp: new Date().toISOString()
        });
        console.log('[RESPONSE] ' + response.status() + ' ' + method + ' ' + url);
        if (body.length < 2000) {
          console.log('  Body preview: ' + body.substring(0, 500));
        }
      } catch (e) {
        // Some responses can't be read
      }
    }
  });

  // Navigate to portal
  console.log('\n1. Navigating to portal...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'geocivix_step1_landing.png' });
  console.log('  Screenshot: geocivix_step1_landing.png');

  // Wait for page to load and look for login form
  console.log('\n2. Looking for login form...');
  await page.waitForTimeout(3000);

  // Check current URL and page content
  console.log('  Current URL: ' + page.url());
  const pageTitle = await page.title();
  console.log('  Page title: ' + pageTitle);

  // Try to find login elements
  const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"], #email, #username');
  const passwordInput = await page.$('input[type="password"], input[name="password"], #password');

  if (emailInput && passwordInput) {
    console.log('  Found login form!');
    await emailInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);
    await page.screenshot({ path: 'geocivix_step2_login_filled.png' });

    // Find and click submit button
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'geocivix_step3_after_login.png' });
      console.log('  Logged in! Screenshot: geocivix_step3_after_login.png');
    }
  } else {
    console.log('  No standard login form found, checking page structure...');
    const html = await page.content();
    fs.writeFileSync('geocivix_page_source.html', html);
    console.log('  Saved page source to geocivix_page_source.html');
  }

  // Wait and explore after login
  await page.waitForTimeout(3000);
  console.log('\n3. After login - URL: ' + page.url());
  await page.screenshot({ path: 'geocivix_step4_dashboard.png' });

  // Try to find search functionality
  console.log('\n4. Looking for permit search...');
  const searchInput = await page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], #search');

  if (searchInput) {
    console.log('  Found search input!');
    await searchInput.fill('1234 Main');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_step5_search_results.png' });
  }

  // Look for any navigation to permits
  const permitsLink = await page.$('a:has-text("Permit"), a:has-text("permit"), button:has-text("Permit")');
  if (permitsLink) {
    console.log('  Found permits link!');
    await permitsLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_step6_permits_page.png' });
  }

  // Save all captures
  console.log('\n5. Saving captured API calls...');
  fs.writeFileSync('geocivix_api_captures.json', JSON.stringify(captures, null, 2));
  console.log('  Saved ' + captures.length + ' API captures to geocivix_api_captures.json');

  // Keep browser open for manual exploration
  console.log('\n6. Browser will stay open for 30 seconds for manual exploration...');
  await page.waitForTimeout(30000);

  await browser.close();
}

exploreGeocivix().catch(console.error);

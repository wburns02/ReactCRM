/**
 * Geocivix Portal API Explorer V2
 * Properly handles login modal and captures API endpoints
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
  console.log('Starting Geocivix Portal Exploration V2...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all network requests
  page.on('request', async request => {
    const url = request.url();
    const method = request.method();
    if (url.includes('geocivix') && (method === 'POST' || url.includes('api') || url.includes('action='))) {
      console.log('[REQUEST] ' + method + ' ' + url);
      try {
        const postData = request.postData();
        if (postData) {
          console.log('  POST data: ' + postData.substring(0, 500));
        }
      } catch (e) {}
    }
  });

  page.on('response', async response => {
    const url = response.url();
    const method = response.request().method();

    if (url.includes('geocivix') && (
      url.includes('action=') ||
      url.includes('api') ||
      url.includes('search') ||
      url.includes('permit') ||
      url.includes('project') ||
      url.includes('cfc') ||
      method === 'POST'
    )) {
      try {
        const body = await response.text();
        const requestPostData = response.request().postData();
        captures.push({
          url,
          method,
          requestBody: requestPostData,
          responseStatus: response.status(),
          responseBody: body.substring(0, 10000),
          timestamp: new Date().toISOString()
        });
        console.log('[RESPONSE] ' + response.status() + ' ' + method + ' ' + url);
        if (body.length < 1000) {
          console.log('  Body: ' + body.substring(0, 500));
        } else {
          console.log('  Body length: ' + body.length + ' chars');
        }
      } catch (e) {
        // Some responses can't be read
      }
    }
  });

  // Navigate to portal
  console.log('\n1. Navigating to portal...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'geocivix_v2_step1.png' });

  // Click Sign In button
  console.log('\n2. Clicking Sign In button...');
  await page.waitForTimeout(2000);

  const signInButton = await page.$('#user-login');
  if (signInButton) {
    console.log('  Found Sign In button, clicking...');
    await signInButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'geocivix_v2_step2_login_modal.png' });

    // Look for login form in modal
    console.log('\n3. Looking for login form in modal...');

    // Try common selectors for login form
    const emailField = await page.$('input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email"], input[name="username"]');
    const passwordField = await page.$('input[type="password"]');

    if (emailField && passwordField) {
      console.log('  Found login form!');
      await emailField.fill(USERNAME);
      await page.waitForTimeout(500);
      await passwordField.fill(PASSWORD);
      await page.screenshot({ path: 'geocivix_v2_step3_filled.png' });

      // Find submit button
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], .modal button.btn-primary, .modal-footer button.btn-primary');
      if (submitBtn) {
        console.log('  Clicking submit...');
        await submitBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'geocivix_v2_step4_after_login.png' });
        console.log('  After login URL: ' + page.url());
      }
    } else {
      console.log('  Login form not found in modal');
      // Get modal content for debugging
      const modalContent = await page.evaluate(() => {
        const modal = document.querySelector('.modal');
        return modal ? modal.innerHTML : 'No modal found';
      });
      fs.writeFileSync('geocivix_modal_content.html', modalContent);
      console.log('  Saved modal content to geocivix_modal_content.html');
    }
  } else {
    console.log('  Sign In button not found');
  }

  // After login, search for permits
  console.log('\n4. Searching for permits...');
  await page.waitForTimeout(2000);

  // Check if we're logged in by looking for user menu or different content
  const userMenu = await page.$('.user-menu, .dropdown-toggle[data-toggle="dropdown"], .nav-user');
  if (userMenu) {
    console.log('  Logged in successfully!');
  }

  // Try the main search field
  const mainSearch = await page.$('input[placeholder*="What would you like"], #main-search, .header-search input');
  if (mainSearch) {
    console.log('  Found main search, searching for "permit"...');
    await mainSearch.fill('permit');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_v2_step5_search.png' });
  }

  // Try to find permit list or search page
  console.log('\n5. Looking for permit pages...');

  // Check navigation for permits link
  const permitsLink = await page.$('a[href*="permit"], a:has-text("Permit"), a:has-text("Search")');
  if (permitsLink) {
    const href = await permitsLink.getAttribute('href');
    console.log('  Found permits link: ' + href);
    await permitsLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_v2_step6_permits.png' });
  }

  // Try direct URL patterns
  console.log('\n6. Trying direct permit search URLs...');
  const tryUrls = [
    '/secure/permit/',
    '/secure/permit/search/',
    '/secure/project/',
    '/secure/?action=permit.list',
    '/secure/?action=search&type=permit'
  ];

  for (const tryUrl of tryUrls) {
    const fullUrl = 'https://williamson.geocivix.com' + tryUrl;
    console.log('  Trying: ' + fullUrl);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log('    Title: ' + title);

    if (title.toLowerCase().includes('permit') || title.toLowerCase().includes('search')) {
      await page.screenshot({ path: 'geocivix_v2_found_permits.png' });
      break;
    }
  }

  // Save all captures
  console.log('\n7. Saving captured API calls...');
  fs.writeFileSync('geocivix_api_captures_v2.json', JSON.stringify(captures, null, 2));
  console.log('  Saved ' + captures.length + ' API captures');

  // Print summary of interesting endpoints
  console.log('\n=== API ENDPOINTS FOUND ===');
  const uniqueEndpoints = new Set<string>();
  captures.forEach(c => {
    const urlObj = new URL(c.url);
    uniqueEndpoints.add(c.method + ' ' + urlObj.pathname + urlObj.search.split('&')[0]);
  });
  uniqueEndpoints.forEach(e => console.log('  ' + e));

  console.log('\n8. Browser staying open for 60 seconds...');
  await page.waitForTimeout(60000);

  await browser.close();
}

exploreGeocivix().catch(console.error);

/**
 * Geocivix Portal API Explorer V3
 * Navigates directly to permit pages and captures all API endpoints
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
  console.log('Starting Geocivix Portal Exploration V3...');
  console.log('Focus: Permit search and listing APIs\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all network requests
  page.on('request', async request => {
    const url = request.url();
    const method = request.method();
    if (url.includes('geocivix') && (method === 'POST' || url.includes('action='))) {
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
          responseBody: body.substring(0, 20000),
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

  // Step 1: Navigate to portal
  console.log('=== STEP 1: Navigate to portal ===');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'geocivix_v3_01_landing.png' });

  // Step 2: Click Sign In button
  console.log('\n=== STEP 2: Click Sign In button ===');
  const signInButton = await page.$('#user-login');
  if (signInButton) {
    await signInButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'geocivix_v3_02_login_modal.png' });

    // Fill login form
    const emailField = await page.$('input[type="email"], input[name="email"], input[id*="email"], input[name="username"]');
    const passwordField = await page.$('input[type="password"]');

    if (emailField && passwordField) {
      console.log('  Filling login form...');
      await emailField.fill(USERNAME);
      await page.waitForTimeout(300);
      await passwordField.fill(PASSWORD);
      await page.screenshot({ path: 'geocivix_v3_03_login_filled.png' });

      // Submit
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], .modal button.btn-primary, .modal-footer button.btn-primary');
      if (submitBtn) {
        console.log('  Submitting login...');
        await submitBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'geocivix_v3_04_logged_in.png' });
        console.log('  After login URL: ' + page.url());
      }
    }
  }

  // Step 3: Navigate directly to permits page
  console.log('\n=== STEP 3: Navigate to permits page ===');
  const permitsUrl = 'https://williamson.geocivix.com/secure/project/permits/';
  console.log('  Going to: ' + permitsUrl);
  await page.goto(permitsUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'geocivix_v3_05_permits_page.png' });
  console.log('  Current URL: ' + page.url());
  console.log('  Page title: ' + await page.title());

  // Step 4: Explore the permits page structure
  console.log('\n=== STEP 4: Analyze permits page ===');

  // Get all links on the page
  const links = await page.$$eval('a', anchors =>
    anchors.map(a => ({ href: a.href, text: a.textContent?.trim() }))
  );
  console.log('  Links found: ' + links.length);
  const relevantLinks = links.filter(l =>
    l.href.includes('permit') ||
    l.href.includes('project') ||
    l.href.includes('search') ||
    l.text?.toLowerCase().includes('permit') ||
    l.text?.toLowerCase().includes('search')
  );
  console.log('  Relevant links:');
  relevantLinks.slice(0, 20).forEach(l => console.log('    ' + l.text + ' -> ' + l.href));

  // Get all buttons
  const buttons = await page.$$eval('button', btns =>
    btns.map(b => ({ text: b.textContent?.trim(), id: b.id, className: b.className }))
  );
  console.log('\n  Buttons found: ' + buttons.length);
  buttons.filter(b => b.text && b.text.length > 0).slice(0, 20).forEach(b =>
    console.log('    ' + b.text + ' (id=' + b.id + ', class=' + b.className + ')')
  );

  // Step 5: Try different permit-related URLs
  console.log('\n=== STEP 5: Try permit URL variations ===');
  const urlsToTry = [
    '/secure/project/permits/?step=overview',
    '/secure/project/permits/?step=search',
    '/secure/?action=project.list',
    '/secure/?action=permit.list',
    '/secure/?action=permit.search',
    '/secure/?action=project.search',
    '/secure/?action=search&type=permit',
    '/secure/project/?action=list',
    '/secure/permit/',
    '/secure/search/'
  ];

  for (const path of urlsToTry) {
    const fullUrl = 'https://williamson.geocivix.com' + path;
    console.log('\n  Trying: ' + fullUrl);
    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      const title = await page.title();
      const currentUrl = page.url();
      console.log('    Title: ' + title);
      console.log('    Final URL: ' + currentUrl);

      // Check if we got permit content
      const hasPermitTable = await page.$('table, .grid, .dataTables_wrapper, [class*="permit"]');
      if (hasPermitTable) {
        console.log('    Found table/grid content!');
        await page.screenshot({ path: 'geocivix_v3_permit_' + path.replace(/[\/\?=&]/g, '_') + '.png' });
      }
    } catch (e) {
      console.log('    Error: ' + (e as Error).message.substring(0, 100));
    }
  }

  // Step 6: Try the main search functionality
  console.log('\n=== STEP 6: Test search functionality ===');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Look for search input
  const searchInput = await page.$('input[placeholder*="What would you like"], input[type="search"], #main-search, .search-input, input[name="search"]');
  if (searchInput) {
    console.log('  Found search input, searching for "septic"...');
    await searchInput.fill('septic');
    await page.waitForTimeout(1000);

    // Check for autocomplete/suggestions dropdown
    const suggestions = await page.$('.autocomplete, .suggestions, .dropdown-menu.show, .typeahead');
    if (suggestions) {
      console.log('  Found suggestions dropdown');
      await page.screenshot({ path: 'geocivix_v3_search_suggestions.png' });
    }

    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_v3_06_search_results.png' });
    console.log('  Search results URL: ' + page.url());
  } else {
    console.log('  Search input not found');
  }

  // Step 7: Explore Projects section
  console.log('\n=== STEP 7: Explore Projects section ===');
  const projectsLink = await page.$('a[href*="project"], a:has-text("Projects")');
  if (projectsLink) {
    const href = await projectsLink.getAttribute('href');
    console.log('  Found Projects link: ' + href);
    await projectsLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'geocivix_v3_07_projects.png' });
    console.log('  Projects URL: ' + page.url());
  }

  // Step 8: Look for any data tables or grids
  console.log('\n=== STEP 8: Look for data tables ===');
  const tables = await page.$$('table');
  console.log('  Tables found: ' + tables.length);

  for (let i = 0; i < Math.min(tables.length, 3); i++) {
    const headers = await tables[i].$$eval('th', ths => ths.map(th => th.textContent?.trim()));
    console.log('  Table ' + (i+1) + ' headers: ' + headers.join(', '));
  }

  // Step 9: Check for JavaScript API calls in page source
  console.log('\n=== STEP 9: Extract API patterns from JavaScript ===');
  const pageContent = await page.content();

  // Look for action= patterns
  const actionMatches = pageContent.match(/action=[\w\.]+/g) || [];
  const uniqueActions = [...new Set(actionMatches)];
  console.log('  Found action patterns:');
  uniqueActions.forEach(a => console.log('    ' + a));

  // Look for API URLs
  const apiMatches = pageContent.match(/\/secure\/\?action=[^'"&\s]+/g) || [];
  const uniqueApis = [...new Set(apiMatches)];
  console.log('\n  Found API URL patterns:');
  uniqueApis.slice(0, 30).forEach(a => console.log('    ' + a));

  // Save page source for analysis
  fs.writeFileSync('geocivix_v3_page_source.html', pageContent);
  console.log('\n  Saved page source to geocivix_v3_page_source.html');

  // Step 10: Save all captures
  console.log('\n=== STEP 10: Save captured API calls ===');
  fs.writeFileSync('geocivix_api_captures_v3.json', JSON.stringify(captures, null, 2));
  console.log('  Saved ' + captures.length + ' API captures');

  // Print summary of all discovered endpoints
  console.log('\n=== API ENDPOINTS DISCOVERED ===');
  const uniqueEndpoints = new Map<string, {count: number, statuses: number[]}>();
  captures.forEach(c => {
    try {
      const urlObj = new URL(c.url);
      const key = c.method + ' ' + urlObj.pathname + (urlObj.searchParams.get('action') ? '?action=' + urlObj.searchParams.get('action') : '');
      if (!uniqueEndpoints.has(key)) {
        uniqueEndpoints.set(key, {count: 0, statuses: []});
      }
      const entry = uniqueEndpoints.get(key)!;
      entry.count++;
      if (c.responseStatus && !entry.statuses.includes(c.responseStatus)) {
        entry.statuses.push(c.responseStatus);
      }
    } catch (e) {}
  });

  uniqueEndpoints.forEach((v, k) => {
    console.log('  ' + k + ' (count=' + v.count + ', status=' + v.statuses.join(',') + ')');
  });

  console.log('\n=== EXPLORATION COMPLETE ===');
  console.log('Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);

  await browser.close();
}

exploreGeocivix().catch(console.error);

/**
 * GovQA Attachment Downloader
 * Downloads completed FOIA request attachments from GovQA portals
 */
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = '/root/scrapers/output/govqa_downloads';
const CREDENTIALS = {
  email: 'willwalterburns@gmail.com',
  password: '#Espn2025'
};

// Completed requests to download
const COMPLETED_REQUESTS = [
  {
    portal: 'hayscountytx.govqa.us',
    name: 'Hays County',
    requestId: 'R006228-120225',
    requestUrl: '/WEBAPP/_rs/RequestEdit.aspx?rid=49438'
  },
  {
    portal: 'bexarcountytx.govqa.us',
    name: 'Bexar County',
    requestId: 'R024243-121025',
    requestUrl: '/WEBAPP/_rs/RequestEdit.aspx?rid=38886'
  },
  {
    portal: 'hctxeng.govqa.us',
    name: 'Harris County Engineering',
    requestId: 'R041938-121225',
    requestUrl: '/WEBAPP/_rs/RequestEdit.aspx?rid=46190'
  }
];

async function login(page: Page, portal: string): Promise<boolean> {
  const loginUrl = `https://${portal}/WEBAPP/_rs/Login.aspx`;
  console.log(`  Navigating to: ${loginUrl}`);

  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // GovQA uses DevExpress form controls with specific IDs
  // Username field: ASPxFormLayout1_txtUsername_I
  // Password field: ASPxFormLayout1_txtPassword_I
  // Submit button: ASPxFormLayout1_btnLogin_I

  const usernameInput = page.locator('#ASPxFormLayout1_txtUsername_I');
  const passwordInput = page.locator('#ASPxFormLayout1_txtPassword_I');

  if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
    console.log('  Found GovQA login form');
    await usernameInput.fill(CREDENTIALS.email);
    await passwordInput.fill(CREDENTIALS.password);

    // Click submit button - DevExpress uses a div wrapper that intercepts clicks
    // So we click the outer div instead of the hidden input
    const submitBtn = page.locator('#ASPxFormLayout1_btnLogin');
    if (await submitBtn.count() > 0) {
      await submitBtn.click({ force: true });
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');

      // Check if we're now on a different page (successful login)
      const currentUrl = page.url();
      if (!currentUrl.includes('Login.aspx')) {
        console.log('  Login successful - redirected to: ' + currentUrl);
        return true;
      }

      // Check for error messages
      const errorMsg = await page.locator('.dxeErrorCell, .error-message, .alert-danger').first().textContent().catch(() => null);
      if (errorMsg) {
        console.log(`  Login error: ${errorMsg}`);
        return false;
      }
    }
  }

  console.log('  Could not find login form elements');
  return false;
}

async function downloadAttachments(page: Page, portal: string, requestUrl: string, outputDir: string): Promise<string[]> {
  const downloadedFiles: string[] = [];
  const fullUrl = `https://${portal}${requestUrl}`;

  console.log(`  Navigating to request: ${fullUrl}`);
  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: path.join(outputDir, 'request_page.png'), fullPage: true });

  // Save page HTML for debugging
  const html = await page.content();
  fs.writeFileSync(path.join(outputDir, 'request_page.html'), html);

  // Look for attachment links
  const attachmentSelectors = [
    'a[href*="Download"]',
    'a[href*="download"]',
    'a[href*="Attachment"]',
    'a[href*="attachment"]',
    'a[href*=".pdf"]',
    'a[href*=".xlsx"]',
    'a[href*=".xls"]',
    'a[href*=".csv"]',
    'a[href*=".zip"]',
    '.attachment-link',
    '[data-attachment]'
  ];

  for (const selector of attachmentSelectors) {
    const links = await page.locator(selector).all();
    console.log(`  Found ${links.length} links matching: ${selector}`);

    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();

        if (href) {
          console.log(`    Downloading: ${text?.trim() || href}`);

          // Set up download listener
          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await link.click();

          try {
            const download = await downloadPromise;
            const suggestedName = download.suggestedFilename();
            const savePath = path.join(outputDir, suggestedName);
            await download.saveAs(savePath);
            downloadedFiles.push(savePath);
            console.log(`    Saved to: ${savePath}`);
          } catch (e) {
            // May not be a download link, try direct fetch
            console.log(`    Not a direct download, trying alternative...`);
          }
        }
      } catch (e) {
        console.log(`    Error with link: ${e}`);
      }
    }
  }

  // Also check for any iframes or embedded content
  const iframes = await page.locator('iframe').all();
  console.log(`  Found ${iframes.length} iframes`);

  // Look for document viewer areas
  const docViewers = await page.locator('.document-viewer, .pdf-viewer, [class*="document"]').all();
  console.log(`  Found ${docViewers.length} document viewers`);

  return downloadedFiles;
}

async function processRequest(browser: Browser, request: typeof COMPLETED_REQUESTS[0]): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${request.name} - ${request.requestId}`);
  console.log(`${'='.repeat(60)}`);

  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const requestOutputDir = path.join(OUTPUT_DIR, request.name.toLowerCase().replace(/\s+/g, '_'));
  fs.mkdirSync(requestOutputDir, { recursive: true });

  try {
    // Login
    const loggedIn = await login(page, request.portal);
    if (!loggedIn) {
      console.log('  Failed to login, trying to access request directly...');
    }

    // Download attachments
    const files = await downloadAttachments(page, request.portal, request.requestUrl, requestOutputDir);

    console.log(`\nDownloaded ${files.length} files for ${request.name}`);

    // Save summary
    const summary = {
      portal: request.portal,
      requestId: request.requestId,
      downloadedFiles: files,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(requestOutputDir, 'download_summary.json'), JSON.stringify(summary, null, 2));

  } catch (e) {
    console.error(`Error processing ${request.name}: ${e}`);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('GovQA Attachment Downloader');
  console.log('='.repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const request of COMPLETED_REQUESTS) {
      await processRequest(browser, request);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Download complete!');
    console.log(`Files saved to: ${OUTPUT_DIR}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);

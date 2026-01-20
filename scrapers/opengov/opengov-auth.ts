/**
 * OpenGov Auth0 Authentication Module
 *
 * Handles authentication via Auth0 Implicit Grant flow for OpenGov/ViewPointCloud.
 * Captures bearer token from URL fragment after login redirect.
 *
 * Key Discovery:
 * - Single Auth0 tenant for ALL jurisdictions: accounts.viewpointcloud.com
 * - Client ID: Kne3XYPvChciFOG9DvQ01Ukm1wyBTdTQ
 * - Uses Implicit Grant (response_type=token+id_token)
 * - Token is universal across all jurisdictions once acquired
 *
 * Usage:
 *   const auth = new OpenGovAuth();
 *   await auth.login(email, password);
 *   const token = auth.getAccessToken();
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================
// CONFIGURATION
// ============================================

const AUTH_CONFIG = {
  // Auth0 Configuration (consistent across all jurisdictions)
  auth0Domain: 'accounts.viewpointcloud.com',
  clientId: 'Kne3XYPvChciFOG9DvQ01Ukm1wyBTdTQ',
  audience: 'viewpointcloud.com/api/production',
  scope: 'openid profile email',

  // Default portal for authentication (any jurisdiction works)
  defaultPortal: 'stpetersburgfl',

  // Storage paths
  storageDir: './scrapers/opengov',
  tokenFile: './scrapers/opengov/auth_token.json',
  storageStateFile: './scrapers/opengov/storage_state.json',

  // Timeouts
  loginTimeout: 120000,  // 2 minutes for manual login if needed
  navigationTimeout: 30000
};

// ============================================
// TYPES
// ============================================

interface TokenData {
  accessToken: string;
  idToken?: string;
  expiresAt: number;
  issuedAt: number;
  tenant: string;
}

interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

// ============================================
// AUTH MODULE
// ============================================

export class OpenGovAuth {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private tokenData: TokenData | null = null;

  constructor() {
    this.loadSavedToken();
  }

  /**
   * Check if we have a valid (non-expired) token
   */
  hasValidToken(): boolean {
    if (!this.tokenData) return false;
    // Token valid if not expired (with 5 min buffer)
    return this.tokenData.expiresAt > Date.now() + 300000;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    if (this.hasValidToken()) {
      return this.tokenData!.accessToken;
    }
    return null;
  }

  /**
   * Load saved token from disk
   */
  private loadSavedToken(): void {
    try {
      if (fs.existsSync(AUTH_CONFIG.tokenFile)) {
        const data = JSON.parse(fs.readFileSync(AUTH_CONFIG.tokenFile, 'utf-8'));
        this.tokenData = data;
        console.log(`[Auth] Loaded saved token (expires: ${new Date(data.expiresAt).toISOString()})`);
      }
    } catch (error) {
      console.log('[Auth] No saved token found or error loading');
    }
  }

  /**
   * Save token to disk for reuse
   */
  private saveToken(token: TokenData): void {
    try {
      if (!fs.existsSync(AUTH_CONFIG.storageDir)) {
        fs.mkdirSync(AUTH_CONFIG.storageDir, { recursive: true });
      }
      fs.writeFileSync(AUTH_CONFIG.tokenFile, JSON.stringify(token, null, 2));
      console.log(`[Auth] Token saved to ${AUTH_CONFIG.tokenFile}`);
    } catch (error) {
      console.error('[Auth] Error saving token:', error);
    }
  }

  /**
   * Build the Auth0 authorization URL
   */
  buildAuthUrl(tenant: string = AUTH_CONFIG.defaultPortal): string {
    const redirectUri = `https://${tenant}.portal.opengov.com`;
    const nonce = Math.random().toString(36).substring(2);

    const params = new URLSearchParams({
      client_id: AUTH_CONFIG.clientId,
      response_type: 'token id_token',
      redirect_uri: redirectUri,
      scope: AUTH_CONFIG.scope,
      audience: AUTH_CONFIG.audience,
      nonce: nonce,
      prompt: 'login'
    });

    return `https://${AUTH_CONFIG.auth0Domain}/authorize?${params.toString()}`;
  }

  /**
   * Parse token from URL fragment (after #)
   */
  parseTokenFromUrl(url: string): TokenData | null {
    try {
      const hash = new URL(url).hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');
      const expiresIn = parseInt(params.get('expires_in') || '86400', 10);

      if (accessToken) {
        return {
          accessToken,
          idToken: idToken || undefined,
          expiresAt: Date.now() + (expiresIn * 1000),
          issuedAt: Date.now(),
          tenant: AUTH_CONFIG.defaultPortal
        };
      }
    } catch (error) {
      console.error('[Auth] Error parsing token from URL:', error);
    }
    return null;
  }

  /**
   * Automated login with Playwright
   * Returns token if successful, or waits for manual intervention
   */
  async login(email?: string, password?: string, options: {
    headless?: boolean;
    useStoredSession?: boolean;
  } = {}): Promise<AuthResult> {
    const {
      headless = false,  // Default to visible browser for manual fallback
      useStoredSession = true
    } = options;

    console.log('\n[Auth] Starting authentication...');
    console.log(`[Auth] Headless: ${headless}`);

    // Check for existing valid token
    if (this.hasValidToken()) {
      console.log('[Auth] Using existing valid token');
      return { success: true, token: this.tokenData!.accessToken };
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless,
      slowMo: headless ? 0 : 50
    });

    // Load stored session if available
    const contextOptions: any = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1280, height: 800 }
    };

    if (useStoredSession && fs.existsSync(AUTH_CONFIG.storageStateFile)) {
      try {
        contextOptions.storageState = AUTH_CONFIG.storageStateFile;
        console.log('[Auth] Loading stored session state');
      } catch {}
    }

    this.context = await this.browser.newContext(contextOptions);
    const page = await this.context.newPage();

    try {
      // Navigate to auth URL
      const authUrl = this.buildAuthUrl();
      console.log(`[Auth] Navigating to: ${authUrl.substring(0, 80)}...`);

      // Set up token capture from redirects
      let capturedToken: TokenData | null = null;

      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          const url = frame.url();
          if (url.includes('access_token=')) {
            capturedToken = this.parseTokenFromUrl(url);
            if (capturedToken) {
              console.log('[Auth] Token captured from redirect!');
            }
          }
        }
      });

      await page.goto(authUrl, { timeout: AUTH_CONFIG.navigationTimeout });

      // Check if already logged in (redirected with token)
      if (capturedToken) {
        this.tokenData = capturedToken;
        this.saveToken(capturedToken);
        await this.saveStorageState();
        return { success: true, token: capturedToken.accessToken };
      }

      // Try automated login if credentials provided
      if (email && password) {
        console.log('[Auth] Attempting automated login...');

        try {
          // Wait for email input
          await page.waitForSelector('input[type="email"], input[name="email"], input[name="username"]', {
            timeout: 10000
          });

          // Enter email
          const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"]');
          if (emailInput) {
            await emailInput.fill(email);
            console.log('[Auth] Email entered');

            // Find and click continue/submit button
            const continueBtn = await page.$('button[type="submit"], button:has-text("Continue"), button:has-text("Log In")');
            if (continueBtn) {
              await continueBtn.click();
              await page.waitForTimeout(2000);
            }
          }

          // Wait for password input (may be on same page or next page)
          const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
          if (passwordInput) {
            await passwordInput.fill(password);
            console.log('[Auth] Password entered');

            // Click login button
            const loginBtn = await page.$('button[type="submit"], button:has-text("Log In"), button:has-text("Continue")');
            if (loginBtn) {
              await loginBtn.click();
            }
          }

          // Wait for redirect with token
          console.log('[Auth] Waiting for authentication redirect...');
          await page.waitForFunction(
            () => window.location.href.includes('access_token=') || window.location.href.includes('error='),
            { timeout: AUTH_CONFIG.loginTimeout }
          );

          // Parse token from final URL
          const finalUrl = page.url();
          capturedToken = this.parseTokenFromUrl(finalUrl);

          if (capturedToken) {
            this.tokenData = capturedToken;
            this.saveToken(capturedToken);
            await this.saveStorageState();
            console.log('[Auth] Login successful!');
            return { success: true, token: capturedToken.accessToken };
          } else if (finalUrl.includes('error=')) {
            const errorParams = new URLSearchParams(new URL(finalUrl).hash.substring(1));
            return { success: false, error: errorParams.get('error_description') || 'Login failed' };
          }

        } catch (loginError) {
          console.log('[Auth] Automated login failed, waiting for manual login...');
        }
      }

      // Manual login fallback (if headless=false)
      if (!headless) {
        console.log('\n[Auth] ========================================');
        console.log('[Auth] MANUAL LOGIN REQUIRED');
        console.log('[Auth] Please log in via the browser window.');
        console.log('[Auth] The script will continue once login is complete.');
        console.log('[Auth] ========================================\n');

        // Wait for redirect with token (longer timeout for manual)
        try {
          await page.waitForFunction(
            () => window.location.href.includes('access_token='),
            { timeout: AUTH_CONFIG.loginTimeout }
          );

          const finalUrl = page.url();
          capturedToken = this.parseTokenFromUrl(finalUrl);

          if (capturedToken) {
            this.tokenData = capturedToken;
            this.saveToken(capturedToken);
            await this.saveStorageState();
            console.log('[Auth] Manual login successful!');
            return { success: true, token: capturedToken.accessToken };
          }
        } catch {
          return { success: false, error: 'Login timeout - no token received' };
        }
      }

      return { success: false, error: 'Authentication failed' };

    } catch (error) {
      console.error('[Auth] Error during login:', error);
      return { success: false, error: String(error) };
    } finally {
      if (this.browser && headless) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
      }
    }
  }

  /**
   * Save browser storage state for session reuse
   */
  private async saveStorageState(): Promise<void> {
    if (this.context) {
      try {
        await this.context.storageState({ path: AUTH_CONFIG.storageStateFile });
        console.log(`[Auth] Storage state saved to ${AUTH_CONFIG.storageStateFile}`);
      } catch (error) {
        console.error('[Auth] Error saving storage state:', error);
      }
    }
  }

  /**
   * Close browser if open
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Get headers with authentication
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
    }
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated API request
   */
  async fetchAuthenticated(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = this.getAuthHeaders();

    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
  }
}

// ============================================
// CLI TEST
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('OpenGov Auth0 Authentication Test');
  console.log('='.repeat(60));

  const auth = new OpenGovAuth();

  // Check for existing token
  if (auth.hasValidToken()) {
    console.log('\nExisting valid token found!');
    console.log(`Token: ${auth.getAccessToken()?.substring(0, 50)}...`);

    // Test with a GraphQL call
    console.log('\nTesting GraphQL with existing token...');
    const response = await auth.fetchAuthenticated('https://search.viewpointcloud.com/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: '{ __typename }'
      })
    });
    console.log(`GraphQL response: ${response.status}`);
    const data = await response.text();
    console.log(`Response: ${data.substring(0, 200)}`);
    return;
  }

  // Try login
  const email = process.env.OPENGOV_EMAIL;
  const password = process.env.OPENGOV_PASSWORD;

  if (!email || !password) {
    console.log('\nOPENGOV_EMAIL and OPENGOV_PASSWORD not set.');
    console.log('Will open browser for manual login.\n');
  }

  const result = await auth.login(email, password, { headless: false });

  if (result.success) {
    console.log('\n✓ Authentication successful!');
    console.log(`Token: ${result.token?.substring(0, 50)}...`);

    // Test GraphQL
    console.log('\nTesting GraphQL...');
    const response = await auth.fetchAuthenticated('https://search.viewpointcloud.com/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: '{ __typename }'
      })
    });
    console.log(`GraphQL response: ${response.status}`);
    const data = await response.text();
    console.log(`Response: ${data.substring(0, 200)}`);
  } else {
    console.log('\n✗ Authentication failed:', result.error);
  }

  await auth.close();
}

// Run if called directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename || process.argv[1]?.endsWith('opengov-auth.ts')) {
  main().catch(console.error);
}

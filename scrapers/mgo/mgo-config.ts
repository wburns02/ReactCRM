/**
 * MGO Connect Configuration
 *
 * NOTE: There's a known bug/exploit that bypasses the 35-day search limit.
 * This will be discovered during network interception.
 */

import { MGOCountyConfig } from './mgo-types';

// Credentials
export const MGO_CREDENTIALS = {
  url: 'https://www.mgoconnect.org/cp/search',
  loginUrl: 'https://www.mgoconnect.org/cp/login',
  email: 'willwalterburns@gmail.com',
  password: '#Espn202512'
};

// Texas Counties to scrape
export const TEXAS_COUNTIES: MGOCountyConfig[] = [
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Travis County', projectTypes: ['OSSF', 'Septic'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Williamson County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Hays County', projectTypes: ['On-Site Sewage Facility (Septic) Permit', 'OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Bastrop County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Bell County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Cooke County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Ellis County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Fannin County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Grayson County', projectTypes: ['OSSF'] },
  { state: 'Texas', stateCode: 'TX', jurisdiction: 'Waller County', projectTypes: ['OSSF'] }
];

// All available states in MGO Connect (for future expansion)
export const MGO_STATES = [
  'Alabama', 'Arizona', 'Arkansas', 'California', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Illinois', 'Indiana',
  'Kansas', 'Louisiana', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'New York', 'North Dakota',
  'Oklahoma', 'Pennsylvania', 'Puerto Rico', 'South Carolina', 'Tennessee',
  'Texas', 'Utah', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Output directory
export const OUTPUT_DIR = './scrapers/output/mgo';

// Browser settings
export const BROWSER_CONFIG = {
  headless: false, // IMPORTANT: Keep false for interactive login
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 120000 // 2 minutes for slow pages
};

// Delays (human-like behavior + rate limit avoidance)
export const DELAYS = {
  afterLogin: 20000,      // 20 seconds after login
  betweenActions: 3000,   // 3 seconds between actions
  afterDropdown: 3000,    // 3 seconds after dropdown selection
  betweenPages: 2500,     // 2.5 seconds between pagination to avoid rate limits
  betweenPrefixes: 1000   // 1 second between search prefixes
};

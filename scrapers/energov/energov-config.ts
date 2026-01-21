/**
 * EnerGov Portal Configuration
 *
 * Each portal has slightly different API patterns.
 * This config stores discovered endpoints and settings for each jurisdiction.
 */

export interface EnerGovPortalConfig {
  id: string;
  name: string;
  state: string;
  baseUrl: string;
  apiBase?: string;
  searchEndpoint?: string;
  permitTypesEndpoint?: string;
  permitDetailsEndpoint?: string;
  authRequired: boolean;
  authEndpoint?: string;
  pageSize: number;
  paginationStyle: 'offset' | 'page';
  estimatedRecords: number;
  permitTypes?: string[];
  enabled: boolean;
  notes?: string;
}

// ============================================
// PORTAL CONFIGURATIONS
// ============================================

export const ENERGOV_PORTALS: EnerGovPortalConfig[] = [
  // TIER 1: Tyler-Hosted Portals
  {
    id: 'wake_county_nc',
    name: 'Wake County',
    state: 'NC',
    baseUrl: 'https://wakecountync-energovpub.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    searchEndpoint: '/cap/search',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 75000,
    enabled: true,
    notes: 'Raleigh metro area - high volume'
  },
  {
    id: 'atlanta_ga',
    name: 'Atlanta',
    state: 'GA',
    baseUrl: 'https://atlantaga-energov.tylerhost.net',
    apiBase: '/Apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 100000,
    enabled: false,
    notes: 'DISABLED - Uses Accela system, not EnerGov'
  },
  {
    id: 'albuquerque_nm',
    name: 'Albuquerque',
    state: 'NM',
    baseUrl: 'https://cityofalbuquerquenm-energovweb.tylerhost.net',
    apiBase: '/apps/selfservice/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 50000,
    enabled: true,
    notes: 'NM largest city'
  },
  {
    id: 'doral_fl',
    name: 'Doral',
    state: 'FL',
    baseUrl: 'https://doralfl-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 25000,
    enabled: true,
    notes: 'FL city'
  },
  {
    id: 'hartford_ct',
    name: 'Hartford',
    state: 'CT',
    baseUrl: 'https://hartfordct-energov.tylerhost.net',
    apiBase: '/Apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 40000,
    enabled: true,
    notes: 'CT state capital'
  },
  {
    id: 'new_smyrna_beach_fl',
    name: 'New Smyrna Beach',
    state: 'FL',
    baseUrl: 'https://newsmyrnabeachfl-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 15000,
    enabled: true,
    notes: 'FL coastal city'
  },
  {
    id: 'hayward_ca',
    name: 'Hayward',
    state: 'CA',
    baseUrl: 'https://haywardca-energovpub.tylerhost.net',
    apiBase: '/Apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 30000,
    enabled: true,
    notes: 'Bay Area city'
  },
  {
    id: 'yuba_county_ca',
    name: 'Yuba County',
    state: 'CA',
    baseUrl: 'https://yubacountyca-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 20000,
    enabled: true,
    notes: 'CA county'
  },
  {
    id: 'carson_ca',
    name: 'Carson',
    state: 'CA',
    baseUrl: 'https://cityofcarsonca-energovweb.tylerhost.net',
    apiBase: '/apps/selfservice/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 15000,
    enabled: true,
    notes: 'LA area city'
  },
  {
    id: 'raleigh_nc',
    name: 'Raleigh',
    state: 'NC',
    baseUrl: 'https://raleighnc-energov.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 60000,
    enabled: false,
    notes: 'DISABLED - Portal returns 403 Forbidden'
  },

  // TIER 2: Self-Hosted Portals
  {
    id: 'pickens_county_sc',
    name: 'Pickens County',
    state: 'SC',
    baseUrl: 'https://energovweb.pickenscountysc.us',
    apiBase: '/EnerGovProd/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 15000,
    enabled: true,
    notes: 'SC county - self-hosted'
  },
  {
    id: 'fort_myers_fl',
    name: 'Fort Myers',
    state: 'FL',
    baseUrl: 'https://cdservices.cityftmyers.com',
    apiBase: '/energovprod/selfservice/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 35000,
    enabled: true,
    notes: 'FL city - self-hosted'
  },

  // TIER 2: Additional Self-Hosted Portals
  {
    id: 'cape_coral_fl',
    name: 'Cape Coral',
    state: 'FL',
    baseUrl: 'https://energovweb.capecoral.gov',
    apiBase: '/EnerGovProd/selfservice/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 40000,
    enabled: true,
    notes: 'Large FL city - corrected URL'
  },
  {
    id: 'boulder_co',
    name: 'Boulder',
    state: 'CO',
    baseUrl: 'https://bouldercolorado.gov',
    apiBase: '/services/energov/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 30000,
    enabled: true,
    notes: 'CO city'
  },
  {
    id: 'st_lucie_county_fl',
    name: 'St. Lucie County',
    state: 'FL',
    baseUrl: 'https://stluciecountyfl-energovpub.tylerhost.net',
    apiBase: '/Apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 50000,
    enabled: true,
    notes: 'FL county - corrected URL'
  },
  {
    id: 'columbia_mo',
    name: 'Columbia',
    state: 'MO',
    baseUrl: 'https://columbiamo-energov.tylerhost.net',
    apiBase: '/Apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 25000,
    enabled: false,
    notes: 'DISABLED - DNS resolution failure'
  },
  {
    id: 'hialeah_fl',
    name: 'Hialeah',
    state: 'FL',
    baseUrl: 'https://hialeahfl-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 45000,
    enabled: false,
    notes: 'DISABLED - Uses custom portal, not EnerGov'
  },
  {
    id: 'elmhurst_il',
    name: 'Elmhurst',
    state: 'IL',
    baseUrl: 'https://elmhurstil-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 20000,
    enabled: true,
    notes: 'IL city'
  },
  {
    id: 'worthington_oh',
    name: 'Worthington',
    state: 'OH',
    baseUrl: 'https://worthingtonoh-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 10000,
    enabled: true,
    notes: 'OH city'
  },
  {
    id: 'princeton_tx',
    name: 'Princeton',
    state: 'TX',
    baseUrl: 'https://princetontx-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 10000,
    enabled: true,
    notes: 'TX city'
  },
  {
    id: 'rosenberg_tx',
    name: 'Rosenberg',
    state: 'TX',
    baseUrl: 'https://rosenbergtx-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 8000,
    enabled: true,
    notes: 'TX city'
  },
  {
    id: 'ormond_beach_fl',
    name: 'Ormond Beach',
    state: 'FL',
    baseUrl: 'https://ormondbeachfl-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 15000,
    enabled: true,
    notes: 'FL coastal city'
  },

  // TIER 3: Large County Deployments
  {
    id: 'riverside_ca',
    name: 'Riverside County',
    state: 'CA',
    baseUrl: 'https://rivcoplus.org',
    apiBase: '/EnerGov_Prod/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 100000,
    enabled: true,
    notes: 'CA major county'
  },
  {
    id: 'mesquite_tx',
    name: 'Mesquite',
    state: 'TX',
    baseUrl: 'https://energov.cityofmesquite.com',
    apiBase: '/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 20000,
    enabled: true,
    notes: 'TX Dallas suburb'
  },
  {
    id: 'barrow_county_ga',
    name: 'Barrow County',
    state: 'GA',
    baseUrl: 'https://barrowcountyga-energovweb.tylerhost.net',
    apiBase: '/apps/SelfService/api',
    authRequired: false,
    pageSize: 100,
    paginationStyle: 'page',
    estimatedRecords: 15000,
    enabled: true,
    notes: 'GA county'
  }
];

// ============================================
// DECODO PROXY CONFIGURATION
// ============================================

export const PROXY_CONFIG = {
  host: 'dc.decodo.com',
  ports: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
  username: 'OpusCLI',
  password: 'h+Mpb3hlLt1c5B1mpL',
  enabled: true
};

// ============================================
// EXTRACTION SETTINGS
// ============================================

export const EXTRACTION_CONFIG = {
  batchSize: 100,
  delayBetweenRequests: 2000,      // ms between API calls
  delayBetweenPortals: 5000,       // ms between portals
  checkpointInterval: 500,          // Save checkpoint every N records
  maxRetries: 5,
  cooldownOnBlock: 300000,         // 5 minutes if all proxies blocked
  outputDir: './scrapers/output/energov',
  checkpointFile: './scrapers/output/energov/checkpoint.json'
};

// ============================================
// COMMON API PATTERNS
// ============================================

// Known EnerGov API endpoints (discovered patterns)
export const API_PATTERNS = {
  // Search endpoints
  search: [
    '/api/cap/search',
    '/api/citizen/search',
    '/api/permit/search',
    '/api/cases/search',
    '/api/search',
    '/SelfService/api/Search'
  ],

  // Permit type endpoints
  permitTypes: [
    '/api/cap/types',
    '/api/permit/types',
    '/api/modules',
    '/api/lookup/permitTypes'
  ],

  // Permit details
  permitDetails: [
    '/api/cap/{id}',
    '/api/permit/{id}',
    '/api/cases/{id}'
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getPortalById(id: string): EnerGovPortalConfig | undefined {
  return ENERGOV_PORTALS.find(p => p.id === id);
}

export function getEnabledPortals(): EnerGovPortalConfig[] {
  return ENERGOV_PORTALS.filter(p => p.enabled);
}

export function getPortalsByState(state: string): EnerGovPortalConfig[] {
  return ENERGOV_PORTALS.filter(p => p.state === state && p.enabled);
}

export function getTotalEstimatedRecords(): number {
  return ENERGOV_PORTALS.filter(p => p.enabled).reduce((sum, p) => sum + p.estimatedRecords, 0);
}

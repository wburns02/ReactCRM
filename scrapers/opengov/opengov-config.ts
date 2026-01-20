/**
 * OpenGov Scraper Configuration
 */

export interface JurisdictionConfig {
  id: string;
  name: string;
  state: string;
  county?: string;
  portalUrl: string;
  enabled: boolean;
}

// Decodo Proxy Configuration
export const PROXY_CONFIG = {
  host: 'dc.decodo.com',
  ports: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
  username: process.env.DECODO_USER || 'OpusCLI',
  password: process.env.DECODO_PASS || 'h+Mpb3hlLt1c5B1mpL',
  enabled: true
};

// Extraction Configuration
export const EXTRACTION_CONFIG = {
  batchSize: 100,
  delayBetweenRequests: 2000,
  delayBetweenJurisdictions: 5000,
  checkpointInterval: 500,
  maxRetries: 5,
  timeout: 60000
};

// API Endpoints
export const API_CONFIG = {
  restBase: 'https://api-east.viewpointcloud.com/v2',
  graphql: {
    search: 'https://search.viewpointcloud.com/graphql',
    records: 'https://records.viewpointcloud.com/graphql'
  },
  auth0: {
    domain: 'accounts.viewpointcloud.com',
    clientId: 'Kne3XYPvChciFOG9DvQ01Ukm1wyBTdTQ',
    audience: 'viewpointcloud.com/api/production'
  }
};

// Output Configuration
export const OUTPUT_CONFIG = {
  dir: './scrapers/output/opengov',
  checkpointFile: './scrapers/output/opengov/checkpoint.json'
};

// Discovered Jurisdictions
export const JURISDICTIONS: JurisdictionConfig[] = [
  // Florida
  {
    id: 'stpetersburgfl',
    name: 'St. Petersburg',
    state: 'FL',
    county: 'Pinellas',
    portalUrl: 'https://stpetersburgfl.portal.opengov.com',
    enabled: true
  },
  {
    id: 'apopkafl',
    name: 'Apopka',
    state: 'FL',
    county: 'Orange',
    portalUrl: 'https://apopkafl.portal.opengov.com',
    enabled: true
  },
  {
    id: 'cocoabeachfl',
    name: 'Cocoa Beach',
    state: 'FL',
    county: 'Brevard',
    portalUrl: 'https://cocoabeachfl.portal.opengov.com',
    enabled: true
  },

  // Texas (many migrated to govoutreach)
  {
    id: 'seagovilletx',
    name: 'Seagoville',
    state: 'TX',
    county: 'Dallas',
    portalUrl: 'https://seagovilletx.portal.opengov.com',
    enabled: false // Migrated to govoutreach
  },

  // Massachusetts
  {
    id: 'arlingtonma',
    name: 'Arlington',
    state: 'MA',
    county: 'Middlesex',
    portalUrl: 'https://arlingtonma.portal.opengov.com',
    enabled: true
  },

  // Indiana
  {
    id: 'brownsburgin',
    name: 'Brownsburg',
    state: 'IN',
    county: 'Hendricks',
    portalUrl: 'https://brownsburgin.portal.opengov.com',
    enabled: true
  },

  // California
  {
    id: 'countyoflakeca',
    name: 'Lake County',
    state: 'CA',
    portalUrl: 'https://countyoflakeca.portal.opengov.com',
    enabled: true
  },

  // Rhode Island
  {
    id: 'providenceri',
    name: 'Providence',
    state: 'RI',
    county: 'Providence',
    portalUrl: 'https://providenceri.portal.opengov.com',
    enabled: true
  }
];

// Get enabled jurisdictions
export function getEnabledJurisdictions(): JurisdictionConfig[] {
  return JURISDICTIONS.filter(j => j.enabled);
}

// Get jurisdiction by ID
export function getJurisdiction(id: string): JurisdictionConfig | undefined {
  return JURISDICTIONS.find(j => j.id === id);
}

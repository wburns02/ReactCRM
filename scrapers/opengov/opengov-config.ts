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
  // ============================================
  // CALIFORNIA
  // ============================================
  {
    id: 'countyoflakeca',
    name: 'Lake County',
    state: 'CA',
    portalUrl: 'https://countyoflakeca.portal.opengov.com',
    enabled: true
  },
  {
    id: 'beniciaca',
    name: 'Benicia',
    state: 'CA',
    county: 'Solano',
    portalUrl: 'https://beniciaca.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // CONNECTICUT
  // ============================================
  {
    id: 'newcanaanct',
    name: 'New Canaan',
    state: 'CT',
    county: 'Fairfield',
    portalUrl: 'https://newcanaanct.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // FLORIDA
  // ============================================
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

  // ============================================
  // INDIANA
  // ============================================
  {
    id: 'brownsburgin',
    name: 'Brownsburg',
    state: 'IN',
    county: 'Hendricks',
    portalUrl: 'https://brownsburgin.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // MARYLAND
  // ============================================
  {
    id: 'frederickmd',
    name: 'Frederick',
    state: 'MD',
    county: 'Frederick',
    portalUrl: 'https://frederickmd.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // MASSACHUSETTS
  // ============================================
  {
    id: 'arlingtonma',
    name: 'Arlington',
    state: 'MA',
    county: 'Middlesex',
    portalUrl: 'https://arlingtonma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'needhamma',
    name: 'Needham',
    state: 'MA',
    county: 'Norfolk',
    portalUrl: 'https://needhamma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'springfieldma',
    name: 'Springfield',
    state: 'MA',
    county: 'Hampden',
    portalUrl: 'https://springfieldma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'fallriverma',
    name: 'Fall River',
    state: 'MA',
    county: 'Bristol',
    portalUrl: 'https://fallriverma.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // NEW YORK
  // ============================================
  {
    id: 'ithacacityny',
    name: 'Ithaca',
    state: 'NY',
    county: 'Tompkins',
    portalUrl: 'https://ithacacityny.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // NORTH CAROLINA
  // ============================================
  {
    id: 'countyofnashnc',
    name: 'Nash County',
    state: 'NC',
    portalUrl: 'https://countyofnashnc.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // PENNSYLVANIA
  // ============================================
  {
    id: 'scrantonpa',
    name: 'Scranton',
    state: 'PA',
    county: 'Lackawanna',
    portalUrl: 'https://scrantonpa.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // RHODE ISLAND
  // ============================================
  {
    id: 'providenceri',
    name: 'Providence',
    state: 'RI',
    county: 'Providence',
    portalUrl: 'https://providenceri.portal.opengov.com',
    enabled: true
  },
  {
    id: 'eastprovidenceri',
    name: 'East Providence',
    state: 'RI',
    county: 'Providence',
    portalUrl: 'https://eastprovidenceri.portal.opengov.com',
    enabled: true
  },
  {
    id: 'smithfieldri',
    name: 'Smithfield',
    state: 'RI',
    county: 'Providence',
    portalUrl: 'https://smithfieldri.portal.opengov.com',
    enabled: true
  },
  {
    id: 'narragansettri',
    name: 'Narragansett',
    state: 'RI',
    county: 'Washington',
    portalUrl: 'https://narragansettri.portal.opengov.com',
    enabled: true
  },
  {
    id: 'scituateri',
    name: 'Scituate',
    state: 'RI',
    county: 'Providence',
    portalUrl: 'https://scituateri.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // SOUTH CAROLINA
  // ============================================
  {
    id: 'countyofandersonsc',
    name: 'Anderson County',
    state: 'SC',
    portalUrl: 'https://countyofandersonsc.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // TENNESSEE
  // ============================================
  {
    id: 'chattanoogatn',
    name: 'Chattanooga',
    state: 'TN',
    county: 'Hamilton',
    portalUrl: 'https://chattanoogatn.portal.opengov.com',
    enabled: true
  },
  {
    id: 'hamiltontn',
    name: 'Hamilton County',
    state: 'TN',
    portalUrl: 'https://hamiltontn.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // TEXAS (many migrated to govoutreach)
  // ============================================
  {
    id: 'seagovilletx',
    name: 'Seagoville',
    state: 'TX',
    county: 'Dallas',
    portalUrl: 'https://seagovilletx.portal.opengov.com',
    enabled: false // Migrated to govoutreach
  },

  // ============================================
  // ADDITIONAL DISCOVERED JURISDICTIONS
  // ============================================

  // Colorado
  {
    id: 'brightonco',
    name: 'Brighton',
    state: 'CO',
    portalUrl: 'https://brightonco.portal.opengov.com',
    enabled: true
  },

  // Connecticut (additional)
  {
    id: 'avonct',
    name: 'Avon',
    state: 'CT',
    portalUrl: 'https://avonct.portal.opengov.com',
    enabled: true
  },

  // Kentucky
  {
    id: 'bereaky',
    name: 'Berea',
    state: 'KY',
    portalUrl: 'https://bereaky.portal.opengov.com',
    enabled: true
  },

  // Massachusetts (additional)
  {
    id: 'framinghamma',
    name: 'Framingham',
    state: 'MA',
    portalUrl: 'https://framinghamma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'lexingtonma',
    name: 'Lexington',
    state: 'MA',
    portalUrl: 'https://lexingtonma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'tewksburyma',
    name: 'Tewksbury',
    state: 'MA',
    portalUrl: 'https://tewksburyma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'bournema',
    name: 'Bourne',
    state: 'MA',
    portalUrl: 'https://bournema.portal.opengov.com',
    enabled: true
  },

  // New Hampshire
  {
    id: 'rochesternh',
    name: 'Rochester',
    state: 'NH',
    portalUrl: 'https://rochesternh.portal.opengov.com',
    enabled: true
  },

  // New Jersey
  {
    id: 'princetonnj',
    name: 'Princeton',
    state: 'NJ',
    portalUrl: 'https://princetonnj.portal.opengov.com',
    enabled: true
  },

  // North Carolina (additional)
  {
    id: 'chapelhillnc',
    name: 'Chapel Hill',
    state: 'NC',
    portalUrl: 'https://chapelhillnc.portal.opengov.com',
    enabled: true
  },
  {
    id: 'marionnc',
    name: 'Marion',
    state: 'NC',
    portalUrl: 'https://marionnc.portal.opengov.com',
    enabled: true
  },
  {
    id: 'warrencountync',
    name: 'Warren County',
    state: 'NC',
    portalUrl: 'https://warrencountync.portal.opengov.com',
    enabled: true
  },

  // Pennsylvania (additional)
  {
    id: 'cheltenhampa',
    name: 'Cheltenham Township',
    state: 'PA',
    portalUrl: 'https://cheltenhampa.portal.opengov.com',
    enabled: true
  },

  // Rhode Island (additional)
  {
    id: 'middletownri',
    name: 'Middletown',
    state: 'RI',
    portalUrl: 'https://middletownri.portal.opengov.com',
    enabled: true
  },

  // South Carolina (additional)
  {
    id: 'northmyrtlebeachsc',
    name: 'North Myrtle Beach',
    state: 'SC',
    portalUrl: 'https://northmyrtlebeachsc.portal.opengov.com',
    enabled: true
  },

  // Washington
  {
    id: 'maplevalleywa',
    name: 'Maple Valley',
    state: 'WA',
    portalUrl: 'https://maplevalleywa.portal.opengov.com',
    enabled: true
  },

  // Wisconsin
  {
    id: 'sunprairiewi',
    name: 'Sun Prairie',
    state: 'WI',
    portalUrl: 'https://sunprairiewi.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // BATCH 3 - MORE DISCOVERED JURISDICTIONS
  // ============================================

  // California (additional)
  {
    id: 'westernriversidecogca',
    name: 'Western Riverside COG',
    state: 'CA',
    portalUrl: 'https://westernriversidecogca.portal.opengov.com',
    enabled: true
  },

  // Connecticut (additional)
  {
    id: 'bloomfieldct',
    name: 'Bloomfield',
    state: 'CT',
    portalUrl: 'https://bloomfieldct.portal.opengov.com',
    enabled: true
  },

  // Florida (additional)
  {
    id: 'lauderdalelakesfl',
    name: 'Lauderdale Lakes',
    state: 'FL',
    portalUrl: 'https://lauderdalelakesfl.portal.opengov.com',
    enabled: true
  },

  // Illinois
  {
    id: 'deerfieldil',
    name: 'Deerfield',
    state: 'IL',
    portalUrl: 'https://deerfieldil.portal.opengov.com',
    enabled: true
  },

  // Massachusetts (additional batch)
  {
    id: 'peabodyma',
    name: 'Peabody',
    state: 'MA',
    portalUrl: 'https://peabodyma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'cambridgema',
    name: 'Cambridge',
    state: 'MA',
    portalUrl: 'https://cambridgema.portal.opengov.com',
    enabled: true
  },
  {
    id: 'methuenma',
    name: 'Methuen',
    state: 'MA',
    portalUrl: 'https://methuenma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'watertownma',
    name: 'Watertown',
    state: 'MA',
    portalUrl: 'https://watertownma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'beverlyma',
    name: 'Beverly',
    state: 'MA',
    portalUrl: 'https://beverlyma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'littletonma',
    name: 'Littleton',
    state: 'MA',
    portalUrl: 'https://littletonma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'brewsterma',
    name: 'Brewster',
    state: 'MA',
    portalUrl: 'https://brewsterma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'newtonma',
    name: 'Newton',
    state: 'MA',
    portalUrl: 'https://newtonma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'williamstownma',
    name: 'Williamstown',
    state: 'MA',
    portalUrl: 'https://williamstownma.portal.opengov.com',
    enabled: true
  },
  {
    id: 'boxfordma',
    name: 'Boxford',
    state: 'MA',
    portalUrl: 'https://boxfordma.portal.opengov.com',
    enabled: true
  },

  // Rhode Island (additional)
  {
    id: 'westwarwickri',
    name: 'West Warwick',
    state: 'RI',
    portalUrl: 'https://westwarwickri.portal.opengov.com',
    enabled: true
  },

  // Wyoming
  {
    id: 'cheyennewy',
    name: 'Cheyenne',
    state: 'WY',
    portalUrl: 'https://cheyennewy.portal.opengov.com',
    enabled: true
  },

  // ============================================
  // BATCH 4 - AGENT DISCOVERED JURISDICTIONS
  // ============================================

  // Alabama
  { id: 'vestaviahillsal', name: 'Vestavia Hills', state: 'AL', portalUrl: 'https://vestaviahillsal.portal.opengov.com', enabled: true },
  { id: 'orangebeachal', name: 'Orange Beach', state: 'AL', portalUrl: 'https://orangebeachal.portal.opengov.com', enabled: true },

  // California (additional)
  { id: 'camarilloca', name: 'Camarillo', state: 'CA', portalUrl: 'https://camarilloca.portal.opengov.com', enabled: true },
  { id: 'eurekaca', name: 'Eureka', state: 'CA', portalUrl: 'https://eurekaca.portal.opengov.com', enabled: true },
  { id: 'scottsvalleyca', name: 'Scotts Valley', state: 'CA', portalUrl: 'https://scottsvalleyca.portal.opengov.com', enabled: true },
  { id: 'cityofsanrafaelca', name: 'San Rafael', state: 'CA', portalUrl: 'https://cityofsanrafaelca.portal.opengov.com', enabled: true },
  { id: 'elsegundoca', name: 'El Segundo', state: 'CA', portalUrl: 'https://elsegundoca.portal.opengov.com', enabled: true },
  { id: 'americancanyonca', name: 'American Canyon', state: 'CA', portalUrl: 'https://americancanyonca.portal.opengov.com', enabled: true },
  { id: 'millvalleyca', name: 'Mill Valley', state: 'CA', portalUrl: 'https://millvalleyca.portal.opengov.com', enabled: true },
  { id: 'sonomaca', name: 'Sonoma', state: 'CA', portalUrl: 'https://sonomaca.portal.opengov.com', enabled: true },
  { id: 'lakeportca', name: 'Lakeport', state: 'CA', portalUrl: 'https://lakeportca.portal.opengov.com', enabled: true },
  { id: 'clearlakeca', name: 'Clearlake', state: 'CA', portalUrl: 'https://clearlakeca.portal.opengov.com', enabled: true },

  // Connecticut (additional)
  { id: 'stamfordct', name: 'Stamford', state: 'CT', portalUrl: 'https://stamfordct.portal.opengov.com', enabled: true },
  { id: 'danburyct', name: 'Danbury', state: 'CT', portalUrl: 'https://danburyct.portal.opengov.com', enabled: true },
  { id: 'norwichct', name: 'Norwich', state: 'CT', portalUrl: 'https://norwichct.portal.opengov.com', enabled: true },
  { id: 'glastonburyct', name: 'Glastonbury', state: 'CT', portalUrl: 'https://glastonburyct.portal.opengov.com', enabled: true },
  { id: 'ridgefieldct', name: 'Ridgefield', state: 'CT', portalUrl: 'https://ridgefieldct.portal.opengov.com', enabled: true },

  // Georgia
  { id: 'sandyspringsga', name: 'Sandy Springs', state: 'GA', portalUrl: 'https://sandyspringsga.portal.opengov.com', enabled: true },
  { id: 'dekalbcountyga', name: 'DeKalb County', state: 'GA', portalUrl: 'https://dekalbcountyga.portal.opengov.com', enabled: true },
  { id: 'chambleega', name: 'Chamblee', state: 'GA', portalUrl: 'https://chambleega.portal.opengov.com', enabled: true },
  { id: 'smyrnaga', name: 'Smyrna', state: 'GA', portalUrl: 'https://smyrnaga.portal.opengov.com', enabled: true },
  { id: 'glynncountyga', name: 'Glynn County', state: 'GA', portalUrl: 'https://glynncountyga.portal.opengov.com', enabled: true },

  // Illinois
  { id: 'champaignil', name: 'Champaign', state: 'IL', portalUrl: 'https://champaignil.portal.opengov.com', enabled: true },
  { id: 'plainfieldil', name: 'Plainfield', state: 'IL', portalUrl: 'https://plainfieldil.portal.opengov.com', enabled: true },
  { id: 'bolingbrookil', name: 'Bolingbrook', state: 'IL', portalUrl: 'https://bolingbrookil.portal.opengov.com', enabled: true },
  { id: 'schaumburgil', name: 'Schaumburg', state: 'IL', portalUrl: 'https://schaumburgil.portal.opengov.com', enabled: true },

  // Indiana (additional)
  { id: 'fishersin', name: 'Fishers', state: 'IN', portalUrl: 'https://fishersin.portal.opengov.com', enabled: true },
  { id: 'garyin', name: 'Gary', state: 'IN', portalUrl: 'https://garyin.portal.opengov.com', enabled: true },

  // Iowa
  { id: 'waukeeia', name: 'Waukee', state: 'IA', portalUrl: 'https://waukeeia.portal.opengov.com', enabled: true },
  { id: 'polkcountyia', name: 'Polk County', state: 'IA', portalUrl: 'https://polkcountyia.portal.opengov.com', enabled: true },

  // Minnesota
  { id: 'burnsvillemn', name: 'Burnsville', state: 'MN', portalUrl: 'https://burnsvillemn.portal.opengov.com', enabled: true },
  { id: 'oakdalemn', name: 'Oakdale', state: 'MN', portalUrl: 'https://oakdalemn.portal.opengov.com', enabled: true },

  // Mississippi
  { id: 'jacksonms', name: 'Jackson', state: 'MS', portalUrl: 'https://jacksonms.portal.opengov.com', enabled: true },

  // New York (additional)
  { id: 'hempsteadny', name: 'Town of Hempstead', state: 'NY', portalUrl: 'https://hempsteadny.portal.opengov.com', enabled: true },
  { id: 'valleystreamny', name: 'Valley Stream', state: 'NY', portalUrl: 'https://valleystreamny.portal.opengov.com', enabled: true },
  { id: 'mountvernonny', name: 'Mount Vernon', state: 'NY', portalUrl: 'https://mountvernonny.portal.opengov.com', enabled: true },

  // North Carolina (additional)
  { id: 'chathamcountync', name: 'Chatham County', state: 'NC', portalUrl: 'https://chathamcountync.portal.opengov.com', enabled: true },
  { id: 'countyofwilsonnc', name: 'Wilson County', state: 'NC', portalUrl: 'https://countyofwilsonnc.portal.opengov.com', enabled: true },
  { id: 'kingsmountainnc', name: 'Kings Mountain', state: 'NC', portalUrl: 'https://kingsmountainnc.portal.opengov.com', enabled: true },

  // Ohio
  { id: 'tallmadgeoh', name: 'Tallmadge', state: 'OH', portalUrl: 'https://tallmadgeoh.portal.opengov.com', enabled: true },
  { id: 'fairfieldoh', name: 'Fairfield', state: 'OH', portalUrl: 'https://fairfieldoh.portal.opengov.com', enabled: true },
  { id: 'gahannaoh', name: 'Gahanna', state: 'OH', portalUrl: 'https://gahannaoh.portal.opengov.com', enabled: true },
  { id: 'northcantonoh', name: 'North Canton', state: 'OH', portalUrl: 'https://northcantonoh.portal.opengov.com', enabled: true },
  { id: 'woosteroh', name: 'Wooster', state: 'OH', portalUrl: 'https://woosteroh.portal.opengov.com', enabled: true },

  // Pennsylvania (additional)
  { id: 'yorkpa', name: 'York', state: 'PA', portalUrl: 'https://yorkpa.portal.opengov.com', enabled: true },
  { id: 'eastonpa', name: 'Easton', state: 'PA', portalUrl: 'https://eastonpa.portal.opengov.com', enabled: true },
  { id: 'abingtonpa', name: 'Abington Township', state: 'PA', portalUrl: 'https://abingtonpa.portal.opengov.com', enabled: true },

  // Rhode Island (additional)
  { id: 'cranstonri', name: 'Cranston', state: 'RI', portalUrl: 'https://cranstonri.portal.opengov.com', enabled: true },
  { id: 'newportri', name: 'Newport', state: 'RI', portalUrl: 'https://newportri.portal.opengov.com', enabled: true },
  { id: 'westerlyri', name: 'Westerly', state: 'RI', portalUrl: 'https://westerlyri.portal.opengov.com', enabled: true },

  // South Carolina (additional)
  { id: 'goosecreeksc', name: 'Goose Creek', state: 'SC', portalUrl: 'https://goosecreeksc.portal.opengov.com', enabled: true },

  // Tennessee (additional)
  { id: 'metronashvilletn', name: 'Metro Nashville', state: 'TN', portalUrl: 'https://metronashvilletn.portal.opengov.com', enabled: true },

  // Texas
  { id: 'ennistx', name: 'City of Ennis', state: 'TX', portalUrl: 'https://ennistx.portal.opengov.com', enabled: true },
  { id: 'bedfordtx', name: 'City of Bedford', state: 'TX', portalUrl: 'https://bedfordtx.portal.opengov.com', enabled: true },
  { id: 'countyofbexartx', name: 'Bexar County', state: 'TX', portalUrl: 'https://countyofbexartx.portal.opengov.com', enabled: true },

  // Wisconsin (additional)
  { id: 'oconomowocwi', name: 'Oconomowoc', state: 'WI', portalUrl: 'https://oconomowocwi.portal.opengov.com', enabled: true }
];

// Get enabled jurisdictions
export function getEnabledJurisdictions(): JurisdictionConfig[] {
  return JURISDICTIONS.filter(j => j.enabled);
}

// Get jurisdiction by ID
export function getJurisdiction(id: string): JurisdictionConfig | undefined {
  return JURISDICTIONS.find(j => j.id === id);
}

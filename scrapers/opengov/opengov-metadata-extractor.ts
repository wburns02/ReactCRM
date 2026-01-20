/**
 * OpenGov Metadata Extractor
 *
 * Extracts categories, record types, and general settings from ALL
 * discovered OpenGov jurisdictions using the PUBLIC API (no auth required).
 *
 * Usage:
 *   npx tsx scrapers/opengov/opengov-metadata-extractor.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { JURISDICTIONS, API_CONFIG, OUTPUT_CONFIG, PROXY_CONFIG, type JurisdictionConfig } from './opengov-config.js';

// ============================================
// TYPES
// ============================================

interface RecordType {
  id: string;
  name: string;
  categoryId: number;
  viewAccess: string | null;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  isEnabled: number;
}

interface GeneralSettings {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone?: string;
}

interface JurisdictionMetadata {
  jurisdiction: string;
  state: string;
  tenant: string;
  portalUrl: string;
  recordTypes: RecordType[];
  categories: Category[];
  generalSettings?: GeneralSettings;
  extractedAt: string;
  error?: string;
}

interface ExtractionSummary {
  totalJurisdictions: number;
  successful: number;
  failed: number;
  totalRecordTypes: number;
  totalCategories: number;
  byState: Record<string, { count: number; recordTypes: number }>;
  extractedAt: string;
}

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries}...`);
      await sleep(2000 * (i + 1));
    }
  }
}

async function extractJurisdictionMetadata(jurisdiction: JurisdictionConfig): Promise<JurisdictionMetadata> {
  const tenant = jurisdiction.id;
  const baseUrl = `${API_CONFIG.restBase}/${tenant}`;

  const metadata: JurisdictionMetadata = {
    jurisdiction: jurisdiction.name,
    state: jurisdiction.state,
    tenant: tenant,
    portalUrl: jurisdiction.portalUrl,
    recordTypes: [],
    categories: [],
    extractedAt: new Date().toISOString()
  };

  try {
    // Fetch record types - API returns JSON API format with "data" array
    console.log(`  Fetching record types...`);
    const recordTypesData = await fetchWithRetry(`${baseUrl}/record_types`);
    if (recordTypesData?.data) {
      metadata.recordTypes = recordTypesData.data.map((rt: any) => ({
        id: String(rt.id),
        name: rt.attributes?.name || rt.name,
        categoryId: rt.attributes?.categoryID || rt.attributes?.category_id,
        viewAccess: rt.attributes?.ViewAccessID || rt.attributes?.view_access,
        description: rt.attributes?.descriptionLabel || rt.description,
        isEnabled: rt.attributes?.isEnabled
      }));
    }

    // Fetch categories - API returns JSON API format with "data" array
    console.log(`  Fetching categories...`);
    const categoriesData = await fetchWithRetry(`${baseUrl}/categories`);
    if (categoriesData?.data) {
      metadata.categories = categoriesData.data.map((cat: any) => ({
        id: String(cat.id),
        name: cat.attributes?.name || cat.name,
        isEnabled: cat.attributes?.isEnabled ?? 1,
        content: cat.attributes?.content?.substring(0, 500) // Truncate HTML content
      }));
    }

    // Fetch general settings
    console.log(`  Fetching general settings...`);
    try {
      const settingsData = await fetchWithRetry(`${baseUrl}/general_settings/1`);
      if (settingsData?.data) {
        const gs = settingsData.data.attributes || settingsData.data;
        metadata.generalSettings = {
          id: gs.id,
          name: gs.name,
          email: gs.email,
          phone: gs.phone,
          address: gs.address,
          timezone: gs.timezone
        };
      }
    } catch (e) {
      // General settings may not be available for all jurisdictions
    }

    console.log(`  ✓ ${metadata.recordTypes.length} record types, ${metadata.categories.length} categories`);

  } catch (error) {
    metadata.error = String(error);
    console.log(`  ✗ Error: ${error}`);
  }

  return metadata;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(70));
  console.log('OPENGOV METADATA EXTRACTOR');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Output directory: ${OUTPUT_CONFIG.dir}`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_CONFIG.dir)) {
    fs.mkdirSync(OUTPUT_CONFIG.dir, { recursive: true });
  }

  const enabledJurisdictions = JURISDICTIONS.filter(j => j.enabled);
  console.log(`\nTotal jurisdictions: ${enabledJurisdictions.length}`);
  console.log('');

  const allMetadata: JurisdictionMetadata[] = [];
  const summary: ExtractionSummary = {
    totalJurisdictions: enabledJurisdictions.length,
    successful: 0,
    failed: 0,
    totalRecordTypes: 0,
    totalCategories: 0,
    byState: {},
    extractedAt: new Date().toISOString()
  };

  for (let i = 0; i < enabledJurisdictions.length; i++) {
    const jurisdiction = enabledJurisdictions[i];
    console.log(`[${i + 1}/${enabledJurisdictions.length}] ${jurisdiction.name}, ${jurisdiction.state}`);

    const metadata = await extractJurisdictionMetadata(jurisdiction);
    allMetadata.push(metadata);

    // Update summary
    if (!metadata.error) {
      summary.successful++;
      summary.totalRecordTypes += metadata.recordTypes.length;
      summary.totalCategories += metadata.categories.length;

      if (!summary.byState[jurisdiction.state]) {
        summary.byState[jurisdiction.state] = { count: 0, recordTypes: 0 };
      }
      summary.byState[jurisdiction.state].count++;
      summary.byState[jurisdiction.state].recordTypes += metadata.recordTypes.length;

      // Save individual jurisdiction file
      const filename = `${jurisdiction.id}_metadata.json`;
      const filepath = path.join(OUTPUT_CONFIG.dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));
    } else {
      summary.failed++;
    }

    // Rate limiting
    if (i < enabledJurisdictions.length - 1) {
      await sleep(1000);
    }
  }

  // Save combined metadata
  const combinedPath = path.join(OUTPUT_CONFIG.dir, 'all_jurisdictions_metadata.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allMetadata, null, 2));

  // Save summary
  const summaryPath = path.join(OUTPUT_CONFIG.dir, 'extraction_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Successful: ${summary.successful}/${summary.totalJurisdictions}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total Record Types: ${summary.totalRecordTypes}`);
  console.log(`Total Categories: ${summary.totalCategories}`);
  console.log('\nBy State:');
  Object.entries(summary.byState)
    .sort((a, b) => b[1].recordTypes - a[1].recordTypes)
    .forEach(([state, data]) => {
      console.log(`  ${state}: ${data.count} jurisdictions, ${data.recordTypes} record types`);
    });
  console.log(`\nOutput saved to: ${OUTPUT_CONFIG.dir}`);
}

// Run
main().catch(console.error);

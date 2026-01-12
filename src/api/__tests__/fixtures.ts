/**
 * Test fixtures for API contract testing
 *
 * These fixtures represent expected API response shapes.
 * They are used in contract tests to validate Zod schemas.
 *
 * ## Schema Drift Detection
 *
 * If the backend API changes, these tests will fail CI.
 * When this happens:
 * 1. Update the Zod schema in types/prospect.ts
 * 2. Update these fixtures to match
 * 3. Run tests to verify: npm run test:contracts
 *
 * ## Future: OpenAPI Type Generation
 *
 * When backend has OpenAPI spec, generate types with:
 * ```
 * npx openapi-typescript http://localhost:5000/api/openapi.json -o src/api/types/generated.ts
 * ```
 *
 * Then compare generated types with our Zod schemas in CI.
 */

import type { Prospect, ProspectListResponse } from "../types/prospect.ts";

/**
 * Valid complete prospect - all fields populated
 */
export const validProspectComplete: Prospect = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "512-555-0100",
  company_name: "Doe Enterprises",
  address_line1: "123 Main St",
  city: "Austin",
  state: "TX",
  postal_code: "78701",
  prospect_stage: "qualified",
  lead_source: "referral",
  estimated_value: 1500,
  assigned_sales_rep: "Mike",
  next_follow_up_date: "2025-01-15",
  lead_notes: "Interested in pumping service",
  created_at: "2025-01-01T10:00:00Z",
  updated_at: "2025-01-02T15:30:00Z",
};

/**
 * Valid minimal prospect - only required fields
 */
export const validProspectMinimal: Prospect = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  first_name: "Jane",
  last_name: "Smith",
  email: null,
  phone: null,
  company_name: null,
  address_line1: null,
  city: null,
  state: null,
  postal_code: null,
  prospect_stage: "new_lead",
  lead_source: null,
  estimated_value: null,
  assigned_sales_rep: null,
  next_follow_up_date: null,
  lead_notes: null,
  created_at: "2025-01-01T10:00:00Z",
  updated_at: "2025-01-01T10:00:00Z",
};

/**
 * Prospect at each stage for pipeline tests
 * NOTE: Stages match backend enum: new_lead, contacted, qualified, quoted, negotiation, won, lost
 */
export const prospectsByStage: Record<Prospect["prospect_stage"], Prospect> = {
  new_lead: { ...validProspectMinimal, prospect_stage: "new_lead" },
  contacted: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174002",
    prospect_stage: "contacted",
  },
  qualified: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174003",
    prospect_stage: "qualified",
  },
  quoted: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174004",
    prospect_stage: "quoted",
  },
  negotiation: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174005",
    prospect_stage: "negotiation",
  },
  won: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174006",
    prospect_stage: "won",
  },
  lost: {
    ...validProspectMinimal,
    id: "123e4567-e89b-12d3-a456-426614174007",
    prospect_stage: "lost",
  },
};

/**
 * Valid paginated response
 */
export const validListResponse: ProspectListResponse = {
  page: 1,
  page_size: 20,
  total: 150,
  items: [validProspectComplete, validProspectMinimal],
};

/**
 * Empty paginated response
 */
export const emptyListResponse: ProspectListResponse = {
  page: 1,
  page_size: 20,
  total: 0,
  items: [],
};

/**
 * Invalid fixtures for negative testing
 */
export const invalidFixtures = {
  invalidStage: {
    ...validProspectMinimal,
    prospect_stage: "invalid_stage", // Not a valid enum value
  },
  invalidUuid: {
    ...validProspectMinimal,
    id: "not-a-uuid", // Invalid UUID format
  },
  missingRequired: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    // Missing first_name, last_name, etc.
  },
};

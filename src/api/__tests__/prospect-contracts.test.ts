import { describe, it, expect } from "vitest";
import {
  prospectSchema,
  prospectListResponseSchema,
} from "../types/prospect.ts";
import { prospectStageSchema, leadSourceSchema } from "../types/common.ts";
import {
  validProspectComplete,
  validProspectMinimal,
  prospectsByStage,
  validListResponse,
  emptyListResponse,
  invalidFixtures,
} from "./fixtures.ts";

/**
 * Contract tests - validate API response shapes against Zod schemas
 *
 * These tests ensure our frontend types match what the backend returns.
 * If these tests fail, it indicates API schema drift.
 *
 * Run: npm run test:contracts
 *
 * ## CI Integration
 * These tests run in CI to catch schema drift before deployment.
 * If a test fails, update the Zod schema AND fixtures to match the new API.
 */
describe("Prospect API Contracts", () => {
  describe("prospectSchema", () => {
    it("validates a complete prospect with all fields", () => {
      const result = prospectSchema.safeParse(validProspectComplete);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validProspectComplete);
      }
    });

    it("validates prospect with nullable fields as null", () => {
      const result = prospectSchema.safeParse(validProspectMinimal);
      expect(result.success).toBe(true);
    });

    it("validates all prospect stages", () => {
      Object.values(prospectsByStage).forEach((prospect) => {
        const result = prospectSchema.safeParse(prospect);
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid prospect_stage", () => {
      const result = prospectSchema.safeParse(invalidFixtures.invalidStage);
      expect(result.success).toBe(false);
      if (!result.success) {
        const stageError = result.error.issues.find((i) =>
          i.path.includes("prospect_stage"),
        );
        expect(stageError).toBeDefined();
      }
    });

    it("rejects invalid UUID for id", () => {
      const result = prospectSchema.safeParse(invalidFixtures.invalidUuid);
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const result = prospectSchema.safeParse(invalidFixtures.missingRequired);
      expect(result.success).toBe(false);
    });
  });

  describe("prospectListResponseSchema", () => {
    it("validates paginated response with items", () => {
      const result = prospectListResponseSchema.safeParse(validListResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items.length).toBe(2);
        expect(result.data.total).toBe(150);
      }
    });

    it("validates empty items array", () => {
      const result = prospectListResponseSchema.safeParse(emptyListResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toEqual([]);
        expect(result.data.total).toBe(0);
      }
    });

    it("rejects response with invalid item", () => {
      const invalidResponse = {
        ...validListResponse,
        items: [invalidFixtures.invalidStage],
      };
      const result = prospectListResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe("Enum schemas", () => {
    it("prospectStageSchema validates all stages", () => {
      // Must match backend ProspectStage enum
      const validStages = [
        "new_lead",
        "contacted",
        "qualified",
        "quoted",
        "negotiation",
        "won",
        "lost",
      ];
      validStages.forEach((stage) => {
        const result = prospectStageSchema.safeParse(stage);
        expect(result.success).toBe(true);
      });
    });

    it("leadSourceSchema validates all sources", () => {
      // Must match backend LeadSource enum
      const validSources = [
        "referral",
        "website",
        "google",
        "facebook",
        "repeat_customer",
        "door_to_door",
        "other",
      ];
      validSources.forEach((source) => {
        const result = leadSourceSchema.safeParse(source);
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid enum values", () => {
      expect(prospectStageSchema.safeParse("invalid").success).toBe(false);
      expect(leadSourceSchema.safeParse("invalid").success).toBe(false);
    });
  });
});

/**
 * FUTURE: OpenAPI Schema Validation
 *
 * When the backend provides an OpenAPI spec, add these tests:
 *
 * import { generateZodSchema } from '@openapi-ts/zod';
 *
 * describe('OpenAPI Contract Validation', () => {
 *   it('Zod schema matches OpenAPI spec', async () => {
 *     const openApiSpec = await fetch('/api/openapi.json').then(r => r.json());
 *     const generatedSchema = generateZodSchema(openApiSpec.components.schemas.Prospect);
 *     // Compare with our prospectSchema
 *   });
 * });
 */

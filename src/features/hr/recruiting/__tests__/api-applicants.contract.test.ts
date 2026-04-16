import { describe, expect, it } from "vitest";

import { applicantInputSchema, applicantSchema } from "../api-applicants";
import {
  applicationSchema,
  applicationWithApplicantSchema,
} from "../api-applications";


describe("applicantSchema", () => {
  it("parses a full applicant payload", () => {
    const a = applicantSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      phone: "+15555550100",
      resume_storage_key: "r.pdf",
      source: "careers_page",
      source_ref: null,
      sms_consent_given: true,
      created_at: "2026-04-16T00:00:00Z",
    });
    expect(a.email).toBe("jane@example.com");
  });

  it("rejects invalid email on input", () => {
    expect(() =>
      applicantInputSchema.parse({
        first_name: "J",
        last_name: "D",
        email: "not-email",
      }),
    ).toThrow();
  });
});


describe("applicationSchema", () => {
  it("parses valid stages", () => {
    const app = applicationSchema.parse({
      id: "22222222-2222-2222-2222-222222222222",
      applicant_id: "11111111-1111-1111-1111-111111111111",
      requisition_id: "33333333-3333-3333-3333-333333333333",
      stage: "ride_along",
      stage_entered_at: "2026-04-16T00:00:00Z",
      assigned_recruiter_id: null,
      rejection_reason: null,
      rating: null,
      notes: null,
      created_at: "2026-04-16T00:00:00Z",
    });
    expect(app.stage).toBe("ride_along");
  });

  it("rejects an unknown stage", () => {
    expect(() =>
      applicationSchema.parse({
        id: "22222222-2222-2222-2222-222222222222",
        applicant_id: "11111111-1111-1111-1111-111111111111",
        requisition_id: "33333333-3333-3333-3333-333333333333",
        stage: "martian",
        stage_entered_at: "x",
        assigned_recruiter_id: null,
        rejection_reason: null,
        rating: null,
        notes: null,
        created_at: "x",
      }),
    ).toThrow();
  });
});


describe("applicationWithApplicantSchema", () => {
  it("composes", () => {
    const combined = applicationWithApplicantSchema.parse({
      id: "22222222-2222-2222-2222-222222222222",
      applicant_id: "11111111-1111-1111-1111-111111111111",
      requisition_id: "33333333-3333-3333-3333-333333333333",
      stage: "applied",
      stage_entered_at: "2026-04-16T00:00:00Z",
      assigned_recruiter_id: null,
      rejection_reason: null,
      rating: null,
      notes: null,
      created_at: "2026-04-16T00:00:00Z",
      applicant: {
        id: "11111111-1111-1111-1111-111111111111",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        phone: null,
        resume_storage_key: null,
        source: "careers_page",
        source_ref: null,
        sms_consent_given: false,
        created_at: "2026-04-16T00:00:00Z",
      },
    });
    expect(combined.applicant.first_name).toBe("Jane");
  });
});

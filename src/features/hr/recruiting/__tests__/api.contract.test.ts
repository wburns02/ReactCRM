import { describe, expect, it } from "vitest";

import { requisitionInputSchema, requisitionSchema } from "../api";


describe("requisitionSchema", () => {
  it("parses a valid payload", () => {
    const parsed = requisitionSchema.parse({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "tech",
      title: "Tech",
      department: null,
      location_city: null,
      location_state: null,
      employment_type: "full_time",
      compensation_display: null,
      description_md: null,
      requirements_md: null,
      benefits_md: null,
      status: "open",
      opened_at: null,
      closed_at: null,
      hiring_manager_id: null,
      onboarding_template_id: null,
      created_at: "2026-04-15T00:00:00Z",
    });
    expect(parsed.slug).toBe("tech");
    expect(parsed.status).toBe("open");
  });

  it("rejects a bad employment_type", () => {
    expect(() =>
      requisitionSchema.parse({
        id: "11111111-1111-1111-1111-111111111111",
        slug: "tech",
        title: "Tech",
        department: null,
        location_city: null,
        location_state: null,
        employment_type: "weird",
        compensation_display: null,
        description_md: null,
        requirements_md: null,
        benefits_md: null,
        status: "open",
        opened_at: null,
        closed_at: null,
        hiring_manager_id: null,
        onboarding_template_id: null,
        created_at: "2026-04-15T00:00:00Z",
      }),
    ).toThrow();
  });
});


describe("requisitionInputSchema", () => {
  it("rejects invalid slug characters", () => {
    expect(() =>
      requisitionInputSchema.parse({
        slug: "Bad Slug!",
        title: "Tech",
        employment_type: "full_time",
        status: "open",
      }),
    ).toThrow();
  });

  it("accepts a minimal input", () => {
    const parsed = requisitionInputSchema.parse({
      slug: "field-tech",
      title: "Field Tech",
      employment_type: "full_time",
      status: "draft",
    });
    expect(parsed.slug).toBe("field-tech");
  });
});

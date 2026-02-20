import { z } from "zod";

export const integrationStatusItemSchema = z.object({
  configured: z.boolean(),
  detail: z.string().nullable().optional(),
});

export const integrationStatusResponseSchema = z.object({
  clover: integrationStatusItemSchema,
  quickbooks: integrationStatusItemSchema,
  google_ads: integrationStatusItemSchema,
  twilio: integrationStatusItemSchema,
  samsara: integrationStatusItemSchema,
  sendgrid: integrationStatusItemSchema,
  stripe: integrationStatusItemSchema,
});

export type IntegrationStatusItem = z.infer<typeof integrationStatusItemSchema>;
export type IntegrationStatusResponse = z.infer<typeof integrationStatusResponseSchema>;

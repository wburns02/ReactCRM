import { z } from 'zod';

/**
 * Paginated response wrapper
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    items: z.array(itemSchema),
  });

export type PaginatedResponse<T> = {
  page: number;
  page_size: number;
  total: number;
  items: T[];
};

/**
 * Prospect Stage enum - matches backend models.py
 */
export const ProspectStage = {
  NEW_LEAD: 'new_lead',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  QUOTED: 'quoted',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
} as const;
export type ProspectStage = (typeof ProspectStage)[keyof typeof ProspectStage];

export const prospectStageSchema = z.enum([
  'new_lead',
  'contacted',
  'qualified',
  'quoted',
  'negotiation',
  'won',
  'lost',
]);

/**
 * Lead Source enum - matches backend models.py
 */
export const LeadSource = {
  REFERRAL: 'referral',
  WEBSITE: 'website',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  REPEAT_CUSTOMER: 'repeat_customer',
  DOOR_TO_DOOR: 'door_to_door',
  OTHER: 'other',
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const leadSourceSchema = z.enum([
  'referral',
  'website',
  'google',
  'facebook',
  'repeat_customer',
  'door_to_door',
  'other',
]);

/**
 * Display labels for enums
 */
export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quoted: 'Quoted',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  referral: 'Referral',
  website: 'Website',
  google: 'Google',
  facebook: 'Facebook',
  repeat_customer: 'Repeat Customer',
  door_to_door: 'Door to Door',
  other: 'Other',
};

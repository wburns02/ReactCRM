import { z } from 'zod';
import { paginatedResponseSchema } from './common.ts';

/**
 * Ticket type enum
 */
export const ticketTypeSchema = z.enum(['bug', 'feature', 'support', 'task']);
export type TicketType = z.infer<typeof ticketTypeSchema>;

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  support: 'Support',
  task: 'Task',
};

/**
 * Ticket status enum
 */
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

/**
 * Ticket priority enum
 */
export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/**
 * Ticket schema - validates API responses
 */
export const ticketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: ticketTypeSchema,
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  rice_score: z.number().nullable(),
  reach: z.number().nullable(),
  impact: z.number().nullable(),
  confidence: z.number().nullable(),
  effort: z.number().nullable(),
  assigned_to: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
});

export type Ticket = z.infer<typeof ticketSchema>;

/**
 * Paginated ticket list response
 */
export const ticketListResponseSchema = paginatedResponseSchema(ticketSchema);
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>;

/**
 * Ticket filters for list queries
 */
export interface TicketFilters {
  page?: number;
  page_size?: number;
  search?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
}

/**
 * Create/update ticket request
 */
export const ticketFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: ticketTypeSchema,
  status: ticketStatusSchema.default('open'),
  priority: ticketPrioritySchema.default('medium'),
  reach: z.coerce.number().min(0).max(10).optional(),
  impact: z.coerce.number().min(0).max(10).optional(),
  confidence: z.coerce.number().min(0).max(100).optional(),
  effort: z.coerce.number().min(0.1).optional(),
  assigned_to: z.string().optional(),
});

export type TicketFormData = z.infer<typeof ticketFormSchema>;

/**
 * RICE Score calculation
 * Score = (Reach × Impact × Confidence) / Effort
 *
 * @param reach - Number of people/customers affected (0-10)
 * @param impact - Impact per person (0-10, where 0=minimal, 10=massive)
 * @param confidence - Confidence in estimates (0-100%)
 * @param effort - Effort in person-weeks (minimum 0.1)
 * @returns RICE score
 */
export function calculateRICEScore(
  reach: number,
  impact: number,
  confidence: number,
  effort: number
): number {
  if (effort === 0) return 0;
  return (reach * impact * (confidence / 100)) / effort;
}

/**
 * Get priority suggestion based on RICE score
 */
export function getPrioritySuggestion(riceScore: number): TicketPriority {
  if (riceScore >= 75) return 'urgent';
  if (riceScore >= 50) return 'high';
  if (riceScore >= 25) return 'medium';
  return 'low';
}

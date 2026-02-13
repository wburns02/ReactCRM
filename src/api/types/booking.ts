import { z } from "zod";

export const bookingSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  customer_first_name: z.string().nullable().optional(),
  customer_last_name: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  service_address: z.string().nullable().optional(),
  service_type: z.string().default("pumping"),
  scheduled_date: z.string().nullable().optional(),
  time_slot: z.string().nullable().optional(),
  time_window_start: z.string().nullable().optional(),
  time_window_end: z.string().nullable().optional(),
  base_price: z.union([z.number(), z.string()]).transform(Number).nullable().optional(),
  included_gallons: z.number().nullable().optional(),
  overage_rate: z.union([z.number(), z.string()]).transform(Number).nullable().optional(),
  actual_gallons: z.number().nullable().optional(),
  overage_gallons: z.number().nullable().optional(),
  overage_amount: z.union([z.number(), z.string()]).transform(Number).nullable().optional(),
  final_amount: z.union([z.number(), z.string()]).transform(Number).nullable().optional(),
  preauth_amount: z.union([z.number(), z.string()]).transform(Number).nullable().optional(),
  clover_charge_id: z.string().nullable().optional(),
  payment_status: z.string().default("pending"),
  captured_at: z.string().nullable().optional(),
  is_test: z.boolean().default(false),
  status: z.string().default("confirmed"),
  overage_acknowledged: z.boolean().nullable().optional(),
  sms_consent: z.boolean().nullable().optional(),
  customer_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

export const bookingListSchema = z.object({
  items: z.array(bookingSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export type BookingListResponse = z.infer<typeof bookingListSchema>;

export const captureResponseSchema = z.object({
  id: z.string(),
  actual_gallons: z.number(),
  overage_gallons: z.number(),
  overage_amount: z.union([z.number(), z.string()]).transform(Number),
  final_amount: z.union([z.number(), z.string()]).transform(Number),
  payment_status: z.string(),
  captured_at: z.string().nullable().optional(),
});

export type CaptureResponse = z.infer<typeof captureResponseSchema>;

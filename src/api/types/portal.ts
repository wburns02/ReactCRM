import { z } from "zod";

/**
 * Customer portal types
 */

export interface PortalCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notification_preferences?: NotificationPreferences;
  created_at?: string;
}

export interface NotificationPreferences {
  email_reminders: boolean;
  sms_reminders: boolean;
  tech_arrival_alerts: boolean;
  invoice_notifications: boolean;
}

export interface TechnicianLocation {
  technician_id: string;
  technician_name: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  eta_minutes?: number;
  status: "en_route" | "arrived" | "working" | "offline";
}

export interface PortalWorkOrder {
  id: string;
  work_order_number: string;
  service_type: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_date?: string;
  scheduled_time?: string;
  completed_date?: string;
  technician_id?: string;
  technician_name?: string;
  technician_phone?: string;
  notes?: string;
  total_amount?: number;
  service_address?: string;
  items?: WorkOrderItem[];
}

export interface WorkOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CustomerProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notification_preferences?: NotificationPreferences;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  work_order_id: string;
  amount: number;
  amount_paid: number;
  status: "pending" | "paid" | "overdue";
  due_date: string;
  created_at: string;
}

export interface ServiceRequest {
  service_type: string;
  preferred_date?: string;
  preferred_time?: "morning" | "afternoon" | "evening";
  description: string;
  urgent: boolean;
}

export interface PortalLoginInput {
  email?: string;
  phone?: string;
}

export interface PortalLoginResponse {
  success: boolean;
  message: string;
}

export interface PortalVerifyInput {
  email?: string;
  phone?: string;
  code: string;
}

export interface PortalVerifyResponse {
  customer: PortalCustomer;
  token: string;
}

// Zod validation schemas

export const portalCustomerSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  notification_preferences: z.object({
    email_reminders: z.boolean(),
    sms_reminders: z.boolean(),
    tech_arrival_alerts: z.boolean(),
    invoice_notifications: z.boolean(),
  }).optional(),
  created_at: z.string().optional(),
});

export const portalWorkOrderSchema = z.object({
  id: z.string(),
  work_order_number: z.string(),
  service_type: z.string(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  completed_date: z.string().optional(),
  technician_id: z.string().optional(),
  technician_name: z.string().optional(),
  technician_phone: z.string().optional(),
  notes: z.string().optional(),
  total_amount: z.number().optional(),
  service_address: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    total: z.number(),
  })).optional(),
});

export const portalInvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  work_order_id: z.string(),
  amount: z.number(),
  amount_paid: z.number(),
  status: z.enum(["pending", "paid", "overdue"]),
  due_date: z.string(),
  created_at: z.string(),
});

export const portalLoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const portalVerifyResponseSchema = z.object({
  customer: portalCustomerSchema,
  token: z.string(),
});

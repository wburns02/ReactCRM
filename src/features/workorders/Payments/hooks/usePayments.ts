/**
 * Payment Hooks for Work Orders
 *
 * Provides React Query hooks for payment processing, invoicing, and discounts.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import {
  type Payment,
  type PaymentFormData,
  paymentSchema,
} from "@/api/types/payment.ts";
import type { Invoice, InvoiceFormData } from "@/api/types/invoice.ts";
import { invoiceSchema } from "@/api/types/invoice.ts";
import {
  type Discount,
  type PricingLineItem,
  calculateInvoiceTotals,
} from "../utils/pricingEngine.ts";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const workOrderPaymentKeys = {
  all: ["work-order-payments"] as const,
  history: (workOrderId: string) =>
    [...workOrderPaymentKeys.all, "history", workOrderId] as const,
  invoice: (workOrderId: string) =>
    [...workOrderPaymentKeys.all, "invoice", workOrderId] as const,
  discount: (code: string) =>
    [...workOrderPaymentKeys.all, "discount", code] as const,
  paymentLink: (invoiceId: string) =>
    [...workOrderPaymentKeys.all, "payment-link", invoiceId] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessPaymentParams {
  workOrderId: string;
  amount: number;
  method: "card" | "cash" | "check" | "ach";
  details?: {
    cardLast4?: string;
    cardBrand?: string;
    checkNumber?: string;
    achAccountLast4?: string;
    transactionId?: string;
  };
  invoiceId?: string;
  notes?: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  payment?: Payment;
  transactionId?: string;
  error?: string;
}

export interface RefundParams {
  paymentId: string;
  amount: number;
  reason: string;
  fullRefund: boolean;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundedAmount?: number;
  error?: string;
}

export interface PaymentLinkResult {
  url: string;
  expiresAt: string;
  qrCodeDataUrl?: string;
}

export interface DiscountValidationResult {
  isValid: boolean;
  discount?: Discount;
  message?: string;
}

export interface CreateInvoiceParams {
  workOrderId: string;
  customerId: string;
  lineItems: PricingLineItem[];
  taxRate?: number;
  dueDate?: string;
  notes?: string;
  terms?: string;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Process a payment for a work order
 */
export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: ProcessPaymentParams,
    ): Promise<ProcessPaymentResult> => {
      try {
        const paymentData: PaymentFormData = {
          customer_id: "", // Will be populated from work order on server
          amount: params.amount,
          payment_method:
            params.method === "ach" ? "bank_transfer" : params.method,
          status: "completed",
          invoice_id: params.invoiceId,
          transaction_id: params.details?.transactionId,
          reference_number: params.details?.checkNumber,
          notes: params.notes,
          payment_date: new Date().toISOString().split("T")[0],
        };

        const { data } = await apiClient.post(
          `/work-orders/${params.workOrderId}/payments`,
          paymentData,
        );

        if (import.meta.env.DEV) {
          const result = paymentSchema.safeParse(data);
          if (!result.success) {
            console.warn("Payment response validation failed:", result.error);
          }
        }

        return {
          success: true,
          payment: data,
          transactionId: data.transaction_id || data.id,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Payment processing failed",
        };
      }
    },
    onSuccess: (result, params) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: workOrderPaymentKeys.history(params.workOrderId),
        });
        queryClient.invalidateQueries({
          queryKey: workOrderPaymentKeys.invoice(params.workOrderId),
        });
        queryClient.invalidateQueries({ queryKey: ["work-orders"] });
        queryClient.invalidateQueries({ queryKey: ["payments"] });
      }
    },
  });
}

/**
 * Fetch payment history for a work order
 */
export function usePaymentHistory(workOrderId: string | undefined) {
  return useQuery({
    queryKey: workOrderPaymentKeys.history(workOrderId!),
    queryFn: async (): Promise<Payment[]> => {
      const { data } = await apiClient.get(
        `/work-orders/${workOrderId}/payments`,
      );
      return Array.isArray(data) ? data : data.items || [];
    },
    enabled: !!workOrderId,
    staleTime: 30_000,
  });
}

/**
 * Create an invoice for a work order
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateInvoiceParams): Promise<Invoice> => {
      // Calculate totals
      const totals = calculateInvoiceTotals(
        params.lineItems,
        params.taxRate ?? 0.0825,
      );

      const invoiceData: InvoiceFormData = {
        customer_id: params.customerId,
        work_order_id: params.workOrderId,
        status: "draft",
        line_items: params.lineItems.map((item) => ({
          service: item.service,
          description: item.description,
          quantity: item.quantity,
          rate: item.unitPrice,
        })),
        tax_rate: (params.taxRate ?? 0.0825) * 100, // Convert to percentage
        due_date: params.dueDate,
        notes: params.notes,
        terms: params.terms ?? "Payment due within 30 days of invoice date.",
      };

      const { data } = await apiClient.post("/invoices", {
        ...invoiceData,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      });

      if (import.meta.env.DEV) {
        const result = invoiceSchema.safeParse(data);
        if (!result.success) {
          console.warn("Invoice response validation failed:", result.error);
        }
      }

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: workOrderPaymentKeys.invoice(params.workOrderId),
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
    },
  });
}

/**
 * Validate and apply a discount code
 */
export function useApplyDiscount() {
  return useMutation({
    mutationFn: async (code: string): Promise<DiscountValidationResult> => {
      try {
        const { data } = await apiClient.get(
          `/discounts/validate/${encodeURIComponent(code.toUpperCase())}`,
        );

        if (data.valid) {
          return {
            isValid: true,
            discount: {
              code: data.code,
              type: data.type,
              value: data.value,
              description: data.description,
              minPurchase: data.min_purchase,
              maxDiscount: data.max_discount,
              expiresAt: data.expires_at,
            },
          };
        }

        return {
          isValid: false,
          message: data.message || "Invalid discount code",
        };
      } catch {
        // Return mock discount for demo/development
        if (import.meta.env.DEV) {
          const mockDiscounts: Record<string, Discount> = {
            SAVE10: {
              code: "SAVE10",
              type: "percentage",
              value: 10,
              description: "10% off your order",
            },
            SAVE20: {
              code: "SAVE20",
              type: "percentage",
              value: 20,
              description: "20% off your order",
            },
            FLAT50: {
              code: "FLAT50",
              type: "fixed",
              value: 50,
              description: "$50 off your order",
              minPurchase: 200,
            },
            LOYAL15: {
              code: "LOYAL15",
              type: "percentage",
              value: 15,
              description: "Loyalty discount - 15% off",
            },
          };

          const normalizedCode = code.toUpperCase();
          if (mockDiscounts[normalizedCode]) {
            return { isValid: true, discount: mockDiscounts[normalizedCode] };
          }
        }

        return {
          isValid: false,
          message: "Invalid or expired discount code",
        };
      }
    },
  });
}

/**
 * Generate a payment link for an invoice
 */
export function useGeneratePaymentLink() {
  return useMutation({
    mutationFn: async (invoiceId: string): Promise<PaymentLinkResult> => {
      try {
        const { data } = await apiClient.post(
          `/invoices/${invoiceId}/payment-link`,
        );
        return {
          url: data.url,
          expiresAt: data.expires_at,
          qrCodeDataUrl: data.qr_code,
        };
      } catch {
        // Generate mock payment link for development
        if (import.meta.env.DEV) {
          const baseUrl = window.location.origin;
          const token = btoa(`invoice:${invoiceId}:${Date.now()}`);
          return {
            url: `${baseUrl}/pay/${token}`,
            expiresAt: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 7 days
          };
        }
        throw new Error("Failed to generate payment link");
      }
    },
  });
}

/**
 * Process a refund for a payment
 */
export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RefundParams): Promise<RefundResult> => {
      try {
        const { data } = await apiClient.post(
          `/payments/${params.paymentId}/refund`,
          {
            amount: params.amount,
            reason: params.reason,
            full_refund: params.fullRefund,
          },
        );

        return {
          success: true,
          refundId: data.refund_id || data.id,
          refundedAmount: data.amount || params.amount,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Refund processing failed",
        };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: workOrderPaymentKeys.all });
      }
    },
  });
}

/**
 * Send invoice via email
 */
export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      email,
      includePaymentLink = true,
    }: {
      invoiceId: string;
      email: string;
      includePaymentLink?: boolean;
    }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/send`, {
        email,
        include_payment_link: includePaymentLink,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

/**
 * Send payment link via SMS
 */
export function useSendPaymentLinkSMS() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      phoneNumber,
    }: {
      invoiceId: string;
      phoneNumber: string;
    }) => {
      const { data } = await apiClient.post(`/invoices/${invoiceId}/send-sms`, {
        phone_number: phoneNumber,
      });
      return data;
    },
  });
}

/**
 * Get invoice for a work order
 */
export function useWorkOrderInvoice(workOrderId: string | undefined) {
  return useQuery({
    queryKey: workOrderPaymentKeys.invoice(workOrderId!),
    queryFn: async (): Promise<Invoice | null> => {
      try {
        const { data } = await apiClient.get(
          `/work-orders/${workOrderId}/invoice`,
        );
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!workOrderId,
    staleTime: 30_000,
  });
}

/**
 * Apply for financing
 */
export function useApplyForFinancing() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      customerId,
      planMonths,
      applicationData,
    }: {
      invoiceId: string;
      customerId: string;
      planMonths: number;
      applicationData: {
        ssn_last4?: string;
        dob?: string;
        income?: number;
        consent: boolean;
      };
    }) => {
      const { data } = await apiClient.post("/financing/apply", {
        invoice_id: invoiceId,
        customer_id: customerId,
        plan_months: planMonths,
        ...applicationData,
      });
      return data;
    },
  });
}

/**
 * Download receipt for a payment
 */
export function useDownloadReceipt() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiClient.get(`/payments/${paymentId}/receipt`, {
        responseType: "blob",
      });

      // Create download link
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}

/**
 * Generate PDF invoice preview
 */
export function useGenerateInvoicePDF() {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      return { url, invoiceId };
    },
  });
}

/**
 * Auto-generate invoice from a completed work order (one-click)
 */
export function useAutoGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data } = await apiClient.post(
        `/work-orders/${workOrderId}/generate-invoice`,
      );
      return data;
    },
    onSuccess: (_data, workOrderId) => {
      queryClient.invalidateQueries({
        queryKey: workOrderPaymentKeys.invoice(workOrderId),
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
    },
  });
}

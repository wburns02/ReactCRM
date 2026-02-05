import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Stripe Payment Types
 */
export interface CreatePaymentIntentRequest {
  invoice_id: string;
  amount: number; // in cents
  currency?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}


export interface PaymentResult {
  success: boolean;
  payment_id: string;
  invoice_id: string;
  amount: number;
  status: "succeeded" | "processing" | "failed";
  error_message?: string;
}

export interface StripeConfig {
  publishable_key: string;
  connected_account_id?: string;
}

/**
 * Get Stripe publishable key from backend
 */
export function useStripeConfig() {
  return useQuery({
    queryKey: ["stripe", "config"],
    queryFn: async (): Promise<StripeConfig> => {
      const { data } = await apiClient.get("/payments/stripe/config");
      return data;
    },
    staleTime: Infinity, // Key doesn't change
  });
}

/**
 * Create a payment intent for an invoice
 */
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (
      request: CreatePaymentIntentRequest,
    ): Promise<CreatePaymentIntentResponse> => {
      const { data } = await apiClient.post(
        "/payments/stripe/create-intent",
        request,
      );
      return data;
    },
  });
}

/**
 * Confirm payment and mark invoice as paid
 */
export function useConfirmPayment() {
  return useMutation({
    mutationFn: async (params: {
      payment_intent_id: string;
      invoice_id: string;
    }): Promise<PaymentResult> => {
      const { data } = await apiClient.post("/payments/stripe/confirm", params);
      return data;
    },
  });
}

// NOTE: Saved payment method hooks (useCustomerPaymentMethods, useSavePaymentMethod,
// useDeletePaymentMethod, useSetDefaultPaymentMethod) removed 2026-02-05.
// Stripe saved payments deprecated in favor of Clover POS integration.

/**
 * Process a payment using a saved payment method
 */
export function useChargePaymentMethod() {
  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      payment_method_id: string;
      amount: number;
    }): Promise<PaymentResult> => {
      const { data } = await apiClient.post("/payments/stripe/charge", params);
      return data;
    },
  });
}

/**
 * Get payment history for an invoice
 */
export function useInvoicePaymentHistory(invoiceId: string) {
  return useQuery({
    queryKey: ["payments", "invoice", invoiceId],
    queryFn: async (): Promise<{
      payments: {
        id: string;
        amount: number;
        status: string;
        created_at: string;
        method: string;
      }[];
    }> => {
      const { data } = await apiClient.get(
        `/payments/invoice/${invoiceId}/history`,
      );
      return data;
    },
    enabled: !!invoiceId,
  });
}

/**
 * Request ACH payment setup for a customer
 */
export function useSetupACHPayment() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: string;
      email: string;
    }): Promise<{
      setup_intent_client_secret: string;
    }> => {
      const { data } = await apiClient.post(
        "/payments/stripe/setup-ach",
        params,
      );
      return data;
    },
  });
}

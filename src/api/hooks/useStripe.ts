import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

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

export interface PaymentMethod {
  id: string;
  type: 'card' | 'us_bank_account' | 'ach_debit';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  bank_account?: {
    bank_name: string;
    last4: string;
    account_type: string;
  };
  created: number;
  is_default: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  type: string;
  last4: string;
  brand?: string;
  is_default: boolean;
}

export interface PaymentResult {
  success: boolean;
  payment_id: string;
  invoice_id: string;
  amount: number;
  status: 'succeeded' | 'processing' | 'failed';
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
    queryKey: ['stripe', 'config'],
    queryFn: async (): Promise<StripeConfig> => {
      const { data } = await apiClient.get('/payments/stripe/config');
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
    mutationFn: async (request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
      const { data } = await apiClient.post('/payments/stripe/create-intent', request);
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
      const { data } = await apiClient.post('/payments/stripe/confirm', params);
      return data;
    },
  });
}

/**
 * Get saved payment methods for a customer
 */
export function useCustomerPaymentMethods(customerId: number) {
  return useQuery({
    queryKey: ['stripe', 'payment-methods', customerId],
    queryFn: async (): Promise<SavedPaymentMethod[]> => {
      const { data } = await apiClient.get(`/payments/stripe/customer/${customerId}/payment-methods`);
      return data.payment_methods || [];
    },
    enabled: !!customerId,
  });
}

/**
 * Save a new payment method for customer
 */
export function useSavePaymentMethod() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: number;
      payment_method_id: string;
      set_as_default?: boolean;
    }): Promise<SavedPaymentMethod> => {
      const { data } = await apiClient.post('/payments/stripe/save-payment-method', params);
      return data;
    },
  });
}

/**
 * Delete a saved payment method
 */
export function useDeletePaymentMethod() {
  return useMutation({
    mutationFn: async (paymentMethodId: string): Promise<void> => {
      await apiClient.delete(`/payments/stripe/payment-methods/${paymentMethodId}`);
    },
  });
}

/**
 * Set default payment method
 */
export function useSetDefaultPaymentMethod() {
  return useMutation({
    mutationFn: async (params: {
      customer_id: number;
      payment_method_id: string;
    }): Promise<void> => {
      await apiClient.post('/payments/stripe/set-default-payment-method', params);
    },
  });
}

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
      const { data } = await apiClient.post('/payments/stripe/charge', params);
      return data;
    },
  });
}

/**
 * Get payment history for an invoice
 */
export function useInvoicePaymentHistory(invoiceId: string) {
  return useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: async (): Promise<{
      payments: {
        id: string;
        amount: number;
        status: string;
        created_at: string;
        method: string;
      }[];
    }> => {
      const { data } = await apiClient.get(`/payments/invoice/${invoiceId}/history`);
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
      customer_id: number;
      email: string;
    }): Promise<{
      setup_intent_client_secret: string;
    }> => {
      const { data } = await apiClient.post('/payments/stripe/setup-ach', params);
      return data;
    },
  });
}

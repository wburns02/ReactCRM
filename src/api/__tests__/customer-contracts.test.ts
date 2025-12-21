import { describe, it, expect } from 'vitest';
import {
  customerSchema,
  customerListResponseSchema,
  customerTypeSchema,
} from '../types/customer.ts';


/**
 * Contract tests for Customer API
 *
 * Validates Zod schemas against expected API response shapes.
 * If these fail, it indicates API schema drift.
 */

// Test fixtures
const validCustomerComplete = {
  id: '123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '512-555-0100',
  address_line1: '123 Main St',
  address_line2: 'Suite 100',
  city: 'Austin',
  state: 'TX',
  postal_code: '78701',
  latitude: 30.2672,
  longitude: -97.7431,
  default_payment_terms: 'Net 30',
  is_active: true,
  customer_type: 'residential',
  prospect_stage: 'won',
  lead_source: 'referral',
  estimated_value: 1500.00,
  assigned_sales_rep: 'Mike Sales',
  next_follow_up_date: '2025-01-15',
  lead_notes: 'Regular pumping customer',
  quickbooks_customer_id: 'QB-12345',
  hubspot_contact_id: 'HS-67890',
  servicenow_ticket_ref: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-02T15:30:00Z',
};

const validCustomerMinimal = {
  id: '456',
  first_name: 'Jane',
  last_name: 'Smith',
  email: null,
  phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  latitude: null,
  longitude: null,
  default_payment_terms: null,
  is_active: true,
  customer_type: null,
  prospect_stage: null,
  lead_source: null,
  estimated_value: null,
  assigned_sales_rep: null,
  next_follow_up_date: null,
  lead_notes: null,
  quickbooks_customer_id: null,
  hubspot_contact_id: null,
  servicenow_ticket_ref: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: null,
};

describe('Customer API Contracts', () => {
  describe('customerSchema', () => {
    it('validates a complete customer with all fields', () => {
      const result = customerSchema.safeParse(validCustomerComplete);
      expect(result.success).toBe(true);
    });

    it('validates customer with nullable fields as null', () => {
      const result = customerSchema.safeParse(validCustomerMinimal);
      expect(result.success).toBe(true);
    });

    it('validates customer with integer ID as string', () => {
      const customer = { ...validCustomerMinimal, id: '999' };
      const result = customerSchema.safeParse(customer);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const invalid = {
        id: '123',
        // Missing first_name, last_name, is_active
      };
      const result = customerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('customerListResponseSchema', () => {
    it('validates paginated response with items', () => {
      const response = {
        page: 1,
        page_size: 20,
        total: 150,
        items: [validCustomerComplete, validCustomerMinimal],
      };
      const result = customerListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items.length).toBe(2);
      }
    });

    it('validates empty items array', () => {
      const response = {
        page: 1,
        page_size: 20,
        total: 0,
        items: [],
      };
      const result = customerListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('customerTypeSchema', () => {
    it('validates all customer types', () => {
      const validTypes = [
        'residential',
        'commercial',
        'hoa',
        'municipal',
        'property_management',
      ];
      validTypes.forEach((type) => {
        const result = customerTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid customer type', () => {
      const result = customerTypeSchema.safeParse('invalid_type');
      expect(result.success).toBe(false);
    });
  });
});

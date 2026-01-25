import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Document Summary Result
 */
export interface DocumentSummaryResult {
  summary: string;
  key_points: string[];
  document_type: string;
  extracted_data: Record<string, string | number | null>;
  entities: ExtractedEntity[];
  dates_mentioned: DateMention[];
  monetary_values: MonetaryValue[];
  confidence: number;
}

export interface ExtractedEntity {
  type: "person" | "organization" | "location" | "service" | "product";
  value: string;
  context?: string;
}

export interface DateMention {
  date: string;
  context: string;
  type: "deadline" | "appointment" | "expiration" | "created" | "other";
}

export interface MonetaryValue {
  amount: number;
  currency: string;
  context: string;
}

/**
 * Get AI-generated summary for a document
 */
export function useDocumentSummary(documentId: string | undefined) {
  return useQuery({
    queryKey: ["document-summary", documentId],
    queryFn: async (): Promise<DocumentSummaryResult> => {
      if (!documentId) throw new Error("Document ID required");

      try {
        const response = await apiClient.get(
          `/ai/documents/${documentId}/summary`,
        );
        return response.data;
      } catch {
        // Demo fallback
        return generateDemoDocumentSummary(documentId);
      }
    },
    enabled: !!documentId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Search documents using natural language
 */
export function useDocumentSearch() {
  return useMutation({
    mutationFn: async (params: {
      query: string;
      entityId?: string;
      entityType?: string;
    }): Promise<{
      results: Array<{
        document_id: string;
        file_name: string;
        relevance_score: number;
        snippet: string;
      }>;
      answer?: string;
    }> => {
      try {
        const response = await apiClient.post("/ai/documents/search", params);
        return response.data;
      } catch {
        return {
          results: [],
          answer: "Document search requires AI backend connection.",
        };
      }
    },
  });
}

/**
 * Extract text from document
 */
export function useDocumentOCR() {
  return useMutation({
    mutationFn: async (
      documentId: string,
    ): Promise<{
      text: string;
      pages: number;
      confidence: number;
    }> => {
      try {
        const response = await apiClient.post(
          `/ai/documents/${documentId}/ocr`,
        );
        return response.data;
      } catch {
        return {
          text: "OCR extraction requires AI backend connection.",
          pages: 1,
          confidence: 0,
        };
      }
    },
  });
}

/**
 * Compare two documents
 */
export function useDocumentComparison() {
  return useMutation({
    mutationFn: async (params: {
      documentId1: string;
      documentId2: string;
    }): Promise<{
      similarity_score: number;
      key_differences: string[];
      common_elements: string[];
    }> => {
      try {
        const response = await apiClient.post("/ai/documents/compare", params);
        return response.data;
      } catch {
        return {
          similarity_score: 0,
          key_differences: [],
          common_elements: [],
        };
      }
    },
  });
}

/**
 * Auto-categorize a document
 */
export function useDocumentCategorization() {
  return useMutation({
    mutationFn: async (
      documentId: string,
    ): Promise<{
      category: string;
      subcategory?: string;
      confidence: number;
      suggested_tags: string[];
    }> => {
      try {
        const response = await apiClient.post(
          `/ai/documents/${documentId}/categorize`,
        );
        return response.data;
      } catch {
        return {
          category: "Uncategorized",
          confidence: 0,
          suggested_tags: [],
        };
      }
    },
  });
}

/**
 * Generate demo document summary
 */
function generateDemoDocumentSummary(
  documentId: string,
): DocumentSummaryResult {
  // Simulate different document types based on ID patterns
  const types = [
    "invoice",
    "contract",
    "estimate",
    "permit",
    "photo",
    "report",
  ];
  const type = types[Math.abs(documentId.charCodeAt(0)) % types.length];

  const summaries: Record<string, DocumentSummaryResult> = {
    invoice: {
      summary:
        "This document appears to be an invoice for services rendered. It contains billing details, service descriptions, and payment terms.",
      key_points: [
        "Invoice for septic services",
        "Payment due within 30 days",
        "Includes itemized service breakdown",
      ],
      document_type: "Invoice",
      extracted_data: {
        invoice_number: "INV-2024-001",
        due_date: "2024-02-15",
        total_amount: 1250.0,
        payment_status: "pending",
      },
      entities: [
        { type: "organization", value: "ABC Septic Services" },
        { type: "person", value: "John Smith" },
      ],
      dates_mentioned: [
        { date: "2024-01-15", context: "Service date", type: "appointment" },
        { date: "2024-02-15", context: "Payment due", type: "deadline" },
      ],
      monetary_values: [
        { amount: 850, currency: "USD", context: "Service charge" },
        { amount: 400, currency: "USD", context: "Parts" },
      ],
      confidence: 85,
    },
    contract: {
      summary:
        "This is a service agreement document outlining terms and conditions for ongoing maintenance services.",
      key_points: [
        "12-month service agreement",
        "Quarterly maintenance included",
        "Automatic renewal clause",
      ],
      document_type: "Service Contract",
      extracted_data: {
        contract_id: "CTR-2024-001",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        monthly_fee: 150.0,
      },
      entities: [
        { type: "organization", value: "Property Management LLC" },
        { type: "service", value: "Preventive Maintenance" },
      ],
      dates_mentioned: [
        { date: "2024-01-01", context: "Contract start", type: "created" },
        { date: "2024-12-31", context: "Contract end", type: "expiration" },
      ],
      monetary_values: [
        { amount: 150, currency: "USD", context: "Monthly fee" },
        { amount: 1800, currency: "USD", context: "Annual total" },
      ],
      confidence: 90,
    },
    estimate: {
      summary:
        "This estimate document provides a cost breakdown for proposed repair work.",
      key_points: [
        "Repair estimate for drainage system",
        "Valid for 30 days",
        "Includes labor and materials",
      ],
      document_type: "Estimate",
      extracted_data: {
        estimate_number: "EST-2024-001",
        valid_until: "2024-02-15",
        total_estimate: 3500.0,
        labor_hours: 8,
      },
      entities: [
        { type: "service", value: "Drain Line Repair" },
        { type: "location", value: "123 Main Street" },
      ],
      dates_mentioned: [
        {
          date: "2024-02-15",
          context: "Estimate validity",
          type: "expiration",
        },
      ],
      monetary_values: [
        { amount: 2000, currency: "USD", context: "Labor" },
        { amount: 1500, currency: "USD", context: "Materials" },
      ],
      confidence: 88,
    },
    permit: {
      summary:
        "This is a permit document for septic system installation or repair work.",
      key_points: [
        "County permit for septic installation",
        "Approved by health department",
        "Valid for 6 months",
      ],
      document_type: "Permit",
      extracted_data: {
        permit_number: "PRM-2024-001",
        issue_date: "2024-01-10",
        expiration_date: "2024-07-10",
        property_address: "456 Oak Lane",
      },
      entities: [
        { type: "organization", value: "County Health Department" },
        { type: "location", value: "456 Oak Lane" },
      ],
      dates_mentioned: [
        { date: "2024-01-10", context: "Permit issued", type: "created" },
        { date: "2024-07-10", context: "Permit expires", type: "expiration" },
      ],
      monetary_values: [
        { amount: 250, currency: "USD", context: "Permit fee" },
      ],
      confidence: 92,
    },
    photo: {
      summary:
        "This image appears to be a job site photo documenting work performed or site conditions.",
      key_points: [
        "Site documentation photo",
        "Shows current conditions",
        "Part of service record",
      ],
      document_type: "Photo Documentation",
      extracted_data: {
        photo_type: "site_documentation",
        captured_date: new Date().toISOString().split("T")[0],
      },
      entities: [],
      dates_mentioned: [],
      monetary_values: [],
      confidence: 75,
    },
    report: {
      summary:
        "This is a service report documenting work completed and findings.",
      key_points: [
        "Inspection findings documented",
        "Recommendations provided",
        "Follow-up action required",
      ],
      document_type: "Service Report",
      extracted_data: {
        report_type: "inspection",
        technician: "Tech A",
        completion_date: new Date().toISOString().split("T")[0],
      },
      entities: [
        { type: "person", value: "Service Technician" },
        { type: "service", value: "System Inspection" },
      ],
      dates_mentioned: [
        {
          date: new Date().toISOString().split("T")[0],
          context: "Report date",
          type: "created",
        },
      ],
      monetary_values: [],
      confidence: 80,
    },
  };

  return summaries[type] || summaries.report;
}

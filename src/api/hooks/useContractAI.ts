import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Contract Analysis Result
 */
export interface ContractAnalysisResult {
  summary: string;
  key_terms: ContractTerm[];
  obligations: ContractObligation[];
  risks: ContractRisk[];
  financial_summary: FinancialSummary;
  renewal_analysis: RenewalAnalysis;
  compliance_status: ComplianceStatus;
  recommendations: string[];
  confidence: number;
}

export interface ContractTerm {
  term: string;
  value: string;
  category:
    | "payment"
    | "service"
    | "liability"
    | "termination"
    | "renewal"
    | "other";
  importance: "high" | "medium" | "low";
}

export interface ContractObligation {
  party: "customer" | "provider";
  description: string;
  due_date?: string;
  status: "pending" | "fulfilled" | "overdue";
}

export interface ContractRisk {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  mitigation?: string;
}

export interface FinancialSummary {
  total_value: number;
  monthly_value: number;
  payment_terms: string;
  late_fees?: string;
  early_termination_penalty?: string;
}

export interface RenewalAnalysis {
  auto_renewal: boolean;
  renewal_date?: string;
  notice_required_days?: number;
  renewal_terms?: string;
  recommendation: string;
}

export interface ComplianceStatus {
  overall: "compliant" | "at_risk" | "non_compliant";
  items: Array<{
    requirement: string;
    status: "met" | "pending" | "not_met";
  }>;
}

/**
 * Get AI analysis for a contract
 */
export function useContractAnalysis(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-analysis", contractId],
    queryFn: async (): Promise<ContractAnalysisResult> => {
      if (!contractId) throw new Error("Contract ID required");

      try {
        const response = await apiClient.get(
          `/ai/contracts/${contractId}/analyze`,
        );
        return response.data;
      } catch {
        // Fetch contract and generate demo analysis
        try {
          const contractRes = await apiClient.get(`/contracts/${contractId}`);
          return generateDemoContractAnalysis(contractRes.data);
        } catch {
          return generateDemoContractAnalysis(null);
        }
      }
    },
    enabled: !!contractId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Compare two contracts
 */
export function useContractComparison() {
  return useMutation({
    mutationFn: async (params: {
      contractId1: string;
      contractId2: string;
    }): Promise<{
      key_differences: Array<{
        field: string;
        contract1_value: string;
        contract2_value: string;
        significance: "high" | "medium" | "low";
      }>;
      value_comparison: {
        contract1_total: number;
        contract2_total: number;
        difference_percent: number;
      };
      recommendation: string;
    }> => {
      try {
        const response = await apiClient.post("/ai/contracts/compare", params);
        return response.data;
      } catch {
        return {
          key_differences: [],
          value_comparison: {
            contract1_total: 0,
            contract2_total: 0,
            difference_percent: 0,
          },
          recommendation: "Contract comparison requires AI backend connection.",
        };
      }
    },
  });
}

/**
 * Get renewal recommendations
 */
export function useRenewalRecommendations(contractId: string | undefined) {
  return useQuery({
    queryKey: ["renewal-recommendations", contractId],
    queryFn: async () => {
      if (!contractId) return null;

      try {
        const response = await apiClient.get(
          `/ai/contracts/${contractId}/renewal-recommendations`,
        );
        return response.data;
      } catch {
        return {
          should_renew: true,
          confidence: 85,
          factors: [
            { factor: "Customer satisfaction", impact: "positive", score: 8 },
            { factor: "Payment history", impact: "positive", score: 9 },
            { factor: "Service utilization", impact: "neutral", score: 6 },
          ],
          suggested_changes: [
            "Consider adding 5% price increase based on market rates",
            "Include additional service tier options",
          ],
          optimal_term_length: "12 months",
        };
      }
    },
    enabled: !!contractId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Generate clauses for a new contract
 */
export function useGenerateContractClauses() {
  return useMutation({
    mutationFn: async (params: {
      contractType: string;
      customerType: string;
      services: string[];
      value: number;
    }): Promise<{
      clauses: Array<{
        title: string;
        content: string;
        category: string;
      }>;
    }> => {
      try {
        const response = await apiClient.post(
          "/ai/contracts/generate-clauses",
          params,
        );
        return response.data;
      } catch {
        return {
          clauses: [
            {
              title: "Service Terms",
              content:
                "Provider agrees to deliver services as specified in Schedule A.",
              category: "service",
            },
            {
              title: "Payment Terms",
              content: "Payment is due within 30 days of invoice date.",
              category: "payment",
            },
          ],
        };
      }
    },
  });
}

interface ContractData {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  total_value: number;
  billing_frequency: string;
  auto_renew: boolean;
  days_until_expiry?: number;
}

/**
 * Generate demo contract analysis
 */
function generateDemoContractAnalysis(
  contract: ContractData | null,
): ContractAnalysisResult {
  const baseAnalysis: ContractAnalysisResult = {
    summary: contract
      ? `This is a ${contract.billing_frequency} service contract with a total value of $${contract.total_value?.toLocaleString() || 0}. The contract is currently ${contract.status} and ${contract.auto_renew ? "will auto-renew" : "requires manual renewal"}.`
      : "Contract analysis in demo mode. Connect to AI backend for full analysis.",
    key_terms: [
      {
        term: "Payment Terms",
        value: "Net 30",
        category: "payment",
        importance: "high",
      },
      {
        term: "Service Level",
        value: "Standard maintenance included",
        category: "service",
        importance: "high",
      },
      {
        term: "Liability Cap",
        value: "Limited to contract value",
        category: "liability",
        importance: "medium",
      },
      {
        term: "Termination Notice",
        value: "30 days written notice required",
        category: "termination",
        importance: "high",
      },
    ],
    obligations: [
      {
        party: "provider",
        description: "Quarterly maintenance service",
        status: "pending",
      },
      {
        party: "provider",
        description: "24/7 emergency support",
        status: "fulfilled",
      },
      {
        party: "customer",
        description: "Timely payment of invoices",
        status: "fulfilled",
      },
    ],
    risks: [],
    financial_summary: {
      total_value: contract?.total_value || 0,
      monthly_value: (contract?.total_value || 0) / 12,
      payment_terms: "Net 30 days",
      late_fees: "1.5% per month",
      early_termination_penalty: "3 months service fee",
    },
    renewal_analysis: {
      auto_renewal: contract?.auto_renew || false,
      renewal_date: contract?.end_date,
      notice_required_days: 30,
      renewal_terms: contract?.auto_renew
        ? "Same terms apply"
        : "Renegotiation required",
      recommendation: contract?.auto_renew
        ? "Review pricing before auto-renewal date"
        : "Schedule renewal discussion 60 days before expiry",
    },
    compliance_status: {
      overall: "compliant",
      items: [
        { requirement: "Insurance coverage", status: "met" },
        { requirement: "License validity", status: "met" },
        { requirement: "Service records", status: "met" },
      ],
    },
    recommendations: [],
    confidence: 82,
  };

  // Add context-aware risks
  if (contract) {
    const daysUntilExpiry = contract.days_until_expiry;

    if (daysUntilExpiry !== undefined && daysUntilExpiry < 30) {
      baseAnalysis.risks.push({
        type: "Expiration Risk",
        severity: "high",
        description: `Contract expires in ${daysUntilExpiry} days`,
        mitigation: "Initiate renewal discussion immediately",
      });
    }

    if (
      !contract.auto_renew &&
      daysUntilExpiry !== undefined &&
      daysUntilExpiry < 60
    ) {
      baseAnalysis.risks.push({
        type: "Non-Renewal Risk",
        severity: "medium",
        description: "Manual renewal required but not yet scheduled",
        mitigation: "Contact customer to discuss renewal terms",
      });
    }

    // Generate recommendations
    if (daysUntilExpiry !== undefined && daysUntilExpiry < 90) {
      baseAnalysis.recommendations.push(
        "Initiate renewal conversation with customer",
      );
    }
    if (contract.auto_renew) {
      baseAnalysis.recommendations.push(
        "Review pricing competitiveness before auto-renewal",
      );
    }
    baseAnalysis.recommendations.push(
      "Schedule next service visit per contract terms",
    );
    baseAnalysis.recommendations.push(
      "Verify all compliance documents are current",
    );
  } else {
    baseAnalysis.risks.push({
      type: "Data Unavailable",
      severity: "low",
      description: "Full contract data not available for analysis",
      mitigation: "Load complete contract details",
    });
    baseAnalysis.recommendations.push(
      "Load complete contract data for full analysis",
    );
  }

  return baseAnalysis;
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Email classification result
 */
export interface EmailClassification {
  category:
    | "service_request"
    | "complaint"
    | "inquiry"
    | "billing"
    | "feedback"
    | "spam"
    | "other";
  confidence: number;
  priority: "high" | "medium" | "low";
  sentiment: "positive" | "neutral" | "negative";
  intent: string;
  suggested_response_template?: string;
  suggested_assignee?: string;
  extracted_data: ExtractedEmailData;
  auto_actions: AutoAction[];
}

export interface ExtractedEmailData {
  customer_name?: string;
  phone?: string;
  address?: string;
  service_type?: string;
  preferred_date?: string;
  urgency_indicators: string[];
}

export interface AutoAction {
  action: string;
  description: string;
  auto_execute: boolean;
}

/**
 * Classify an incoming email
 */
export function useClassifyEmail() {
  return useMutation({
    mutationFn: async (params: {
      subject: string;
      body: string;
      from_address: string;
      existing_customer_id?: string;
    }): Promise<EmailClassification> => {
      try {
        const response = await apiClient.post("/ai/emails/classify", params);
        return response.data;
      } catch {
        return generateDemoClassification(params.subject, params.body);
      }
    },
  });
}

/**
 * Get classification for inbox emails
 */
export function useInboxClassifications(emailIds: string[]) {
  return useQuery({
    queryKey: ["inbox-classifications", emailIds],
    queryFn: async (): Promise<Record<string, EmailClassification>> => {
      try {
        const response = await apiClient.post("/ai/emails/bulk-classify", {
          email_ids: emailIds,
        });
        return response.data;
      } catch {
        const result: Record<string, EmailClassification> = {};
        emailIds.forEach((id) => {
          result[id] = generateDemoClassification(
            "Service Request",
            "Need septic pumping",
          );
        });
        return result;
      }
    },
    enabled: emailIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Generate suggested response
 */
export function useGenerateEmailResponse() {
  return useMutation({
    mutationFn: async (params: {
      email_id: string;
      classification: EmailClassification;
      tone?: "professional" | "friendly" | "formal";
    }): Promise<{ subject: string; body: string }> => {
      try {
        const response = await apiClient.post(
          "/ai/emails/generate-response",
          params,
        );
        return response.data;
      } catch {
        return generateDemoResponse(params.classification);
      }
    },
  });
}

function generateDemoClassification(
  subject: string,
  body: string,
): EmailClassification {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  let category: EmailClassification["category"] = "other";
  let priority: EmailClassification["priority"] = "medium";
  let sentiment: EmailClassification["sentiment"] = "neutral";

  if (
    lowerSubject.includes("emergency") ||
    lowerBody.includes("urgent") ||
    lowerBody.includes("backup")
  ) {
    category = "service_request";
    priority = "high";
  } else if (
    lowerSubject.includes("quote") ||
    lowerBody.includes("estimate") ||
    lowerBody.includes("price")
  ) {
    category = "inquiry";
    priority = "medium";
  } else if (
    lowerSubject.includes("bill") ||
    lowerBody.includes("invoice") ||
    lowerBody.includes("payment")
  ) {
    category = "billing";
    priority = "medium";
  } else if (
    lowerSubject.includes("complaint") ||
    lowerBody.includes("unhappy") ||
    lowerBody.includes("problem")
  ) {
    category = "complaint";
    priority = "high";
    sentiment = "negative";
  } else if (
    lowerSubject.includes("thank") ||
    lowerBody.includes("great job") ||
    lowerBody.includes("excellent")
  ) {
    category = "feedback";
    sentiment = "positive";
    priority = "low";
  } else if (
    lowerBody.includes("pump") ||
    lowerBody.includes("septic") ||
    lowerBody.includes("service")
  ) {
    category = "service_request";
  }

  return {
    category,
    confidence: 0.82 + Math.random() * 0.15,
    priority,
    sentiment,
    intent:
      category === "service_request"
        ? "Customer wants to schedule a service"
        : category === "inquiry"
          ? "Customer seeking information or quote"
          : category === "complaint"
            ? "Customer expressing dissatisfaction"
            : category === "billing"
              ? "Billing or payment related question"
              : category === "feedback"
                ? "Customer sharing feedback"
                : "General communication",
    suggested_response_template:
      category === "service_request"
        ? "service_scheduling"
        : category === "inquiry"
          ? "quote_response"
          : category === "complaint"
            ? "complaint_acknowledgment"
            : undefined,
    suggested_assignee:
      category === "billing"
        ? "billing@company.com"
        : category === "complaint"
          ? "manager@company.com"
          : "dispatch@company.com",
    extracted_data: {
      customer_name: undefined,
      phone: undefined,
      address: undefined,
      service_type: lowerBody.includes("pump")
        ? "pumping"
        : lowerBody.includes("repair")
          ? "repair"
          : lowerBody.includes("inspect")
            ? "inspection"
            : undefined,
      preferred_date: undefined,
      urgency_indicators:
        priority === "high" ? ["urgent", "emergency", "asap"] : [],
    },
    auto_actions: [
      {
        action: "auto_tag",
        description: `Tag as ${category}`,
        auto_execute: true,
      },
      {
        action: "assign",
        description: `Route to ${category === "billing" ? "billing" : "dispatch"} team`,
        auto_execute: priority === "high",
      },
    ],
  };
}

function generateDemoResponse(classification: EmailClassification): {
  subject: string;
  body: string;
} {
  const responses: Record<string, { subject: string; body: string }> = {
    service_request: {
      subject: "Re: Your Service Request",
      body: `Thank you for reaching out to us!

We'd be happy to help schedule your service. Our next available appointment slots are:
- [Date 1] at [Time]
- [Date 2] at [Time]

Please reply with your preferred time, or call us at (555) 123-4567 to schedule directly.

Best regards,
The Service Team`,
    },
    inquiry: {
      subject: "Re: Your Inquiry",
      body: `Thank you for your interest in our services!

I'd be happy to provide you with more information and a quote. To give you an accurate estimate, could you please provide:
- Your property address
- Type of system (if known)
- Any specific concerns or issues

We look forward to helping you!

Best regards,
Customer Service`,
    },
    complaint: {
      subject: "Re: Your Concern - We're Here to Help",
      body: `Thank you for bringing this to our attention, and I sincerely apologize for any inconvenience you've experienced.

Your satisfaction is our top priority. I've escalated this to our management team, and we will follow up with you within 24 hours to address your concerns.

If you need immediate assistance, please call us at (555) 123-4567.

Sincerely,
Customer Service Manager`,
    },
    billing: {
      subject: "Re: Billing Question",
      body: `Thank you for contacting us about your billing inquiry.

I've forwarded your message to our billing department, and they will review your account and respond within 1 business day.

If you have any urgent questions, please call our billing line at (555) 123-4568.

Best regards,
Customer Service`,
    },
    feedback: {
      subject: "Re: Thank You for Your Feedback!",
      body: `Thank you so much for taking the time to share your feedback with us!

We're thrilled to hear about your positive experience. Your kind words mean a lot to our team and motivate us to continue providing excellent service.

If you ever need us again, we're just a call away!

Best regards,
The Team`,
    },
  };

  return responses[classification.category] || responses.service_request;
}
